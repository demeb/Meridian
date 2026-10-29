"""Application tracker — the Common-App-style part of a student's profile.

A student "starts" an application from any project, scholarship or university
page. It then lives in their account with a stage and a checklist:

    programmes    planning → preparing → submitted → result
    universities  checklist of required documents (from the university's
                  requirements), uploads against each item, then
                  "send to Meridian for review" → our team submits with them

Uploaded files go to backend/uploads/applications/<user id>/ and are only ever
served to their owner (or the admin token).
"""
import json
import os
import re
import secrets

from flask import Blueprint, jsonify, request, send_from_directory, abort, make_response

import catalog
import db
import mailer
from config import Config, BACKEND_DIR

bp = Blueprint("tracker", __name__)

FILES_DIR = os.path.join(BACKEND_DIR, "uploads", "applications")
ALLOWED_EXT = {".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx", ".txt"}
MAX_FILE = 8 * 1024 * 1024

PROGRAM_STAGES = ("planning", "preparing", "submitted", "result")
UNI_STAGES = ("planning", "preparing", "review", "submitted", "result")

PROGRAM_STEPS = [
    {"key": "read", "label": {"en": "Read the eligibility rules", "ka": "წაიკითხე უფლებამოსილების წესები", "ar": "اقرأ شروط الأهلية"}},
    {"key": "documents", "label": {"en": "Gather the documents it asks for", "ka": "მოამზადე საჭირო დოკუმენტები", "ar": "جهّز المستندات المطلوبة"}},
    {"key": "essay", "label": {"en": "Write the essays or motivation letter", "ka": "დაწერე ესეები ან სამოტივაციო წერილი", "ar": "اكتب المقالات أو خطاب الدافع"}},
    {"key": "review", "label": {"en": "Have someone review it", "ka": "მიეცი ვინმეს გადასახედად", "ar": "اطلب من أحد مراجعته"}},
    {"key": "submit", "label": {"en": "Submit before the deadline", "ka": "გააგზავნე ვადის ამოწურვამდე", "ar": "أرسل الطلب قبل الموعد النهائي"}},
]

DEFAULT_UNI_REQS = [
    {"key": "transcript", "label": {"en": "Secondary school transcript", "ka": "სკოლის ნიშნების ფურცელი", "ar": "كشف درجات المدرسة الثانوية"}},
    {"key": "english", "label": {"en": "English test score", "ka": "ინგლისურის გამოცდის ქულა", "ar": "نتيجة اختبار اللغة الإنجليزية"}},
    {"key": "personal_statement", "label": {"en": "Personal statement or essay", "ka": "პირადი ესე", "ar": "البيان الشخصي أو المقال"}},
    {"key": "recommendations", "label": {"en": "Recommendation letters", "ka": "სარეკომენდაციო წერილები", "ar": "رسائل التوصية"}},
    {"key": "passport", "label": {"en": "Passport copy", "ka": "პასპორტის ასლი", "ar": "نسخة من جواز السفر"}},
]


def _user():
    user = db.session_user(request.cookies.get(Config.COOKIE_NAME))
    if not user:
        abort(make_response(jsonify({"ok": False, "error": "auth_required"}), 401))
    return user


def _admin():
    token = request.args.get("token") or request.headers.get("X-Admin-Token", "")
    return bool(token) and secrets.compare_digest(token, Config.ADMIN_TOKEN)


def _item(kind, item_id):
    if kind == "program":
        return catalog.find_program(item_id) or next(
            (p for p in catalog.archived() if p["id"] == item_id), None)
    return catalog.find_university(item_id)


def _summary(kind, item):
    if not item:
        return None
    return {
        "id": item["id"],
        "name": item.get("name"),
        "country": item.get("country"),
        "flag": item.get("flag"),
        "iso": item.get("iso"),
        "deadline": item.get("deadline"),
        "section": item.get("section") or ("university" if kind == "university" else None),
        "url": "/%s/%s" % ("programs" if kind == "program" else "universities", item["id"]),
    }


def _row(row, with_files=True):
    app = dict(row)
    app["checklist"] = json.loads(app["checklist"] or "[]")
    app["item"] = _summary(app["kind"], _item(app["kind"], app["item_id"]))
    if with_files:
        conn = db.connect()
        app["files"] = [dict(f) for f in conn.execute(
            "SELECT id, req_key, filename, size, uploaded_at FROM application_files "
            "WHERE application_id = ? ORDER BY id", (app["id"],))]
        conn.close()
    done = sum(1 for c in app["checklist"] if c.get("done"))
    app["progress"] = {"done": done, "total": len(app["checklist"])}
    return app


def _get(app_id, user_id):
    conn = db.connect()
    row = conn.execute("SELECT * FROM applications WHERE id = ? AND user_id = ?", (app_id, user_id)).fetchone()
    conn.close()
    if not row:
        abort(make_response(jsonify({"ok": False, "error": "not_found"}), 404))
    return row


@bp.get("/api/applications")
def list_applications():
    user = _user()
    conn = db.connect()
    rows = conn.execute("SELECT * FROM applications WHERE user_id = ? ORDER BY updated_at DESC", (user["id"],)).fetchall()
    conn.close()
    return jsonify({"ok": True, "applications": [_row(r) for r in rows]})


@bp.post("/api/applications")
def start_application():
    user = _user()
    data = request.get_json(silent=True) or {}
    kind = data.get("kind")
    item_id = str(data.get("item_id") or "")[:120]
    if kind not in ("program", "university"):
        return jsonify({"ok": False, "error": "bad_kind"}), 400
    item = _item(kind, item_id)
    if not item:
        return jsonify({"ok": False, "error": "not_found"}), 404
    if kind == "program":
        checklist = [dict(step, done=False) for step in PROGRAM_STEPS]
    else:
        reqs = item.get("requirements") or DEFAULT_UNI_REQS
        checklist = [{"key": r["key"], "label": r["label"], "done": False} for r in reqs]
    stamp = db.now()
    conn = db.connect()
    with conn:
        conn.execute(
            "INSERT OR IGNORE INTO applications (user_id, kind, item_id, checklist, created_at, updated_at) "
            "VALUES (?,?,?,?,?,?)", (user["id"], kind, item_id, json.dumps(checklist, ensure_ascii=False), stamp, stamp))
        row = conn.execute("SELECT * FROM applications WHERE user_id = ? AND kind = ? AND item_id = ?",
                           (user["id"], kind, item_id)).fetchone()
    conn.close()
    return jsonify({"ok": True, "application": _row(row)})


@bp.patch("/api/applications/<int:app_id>")
def update_application(app_id):
    user = _user()
    row = _get(app_id, user["id"])
    data = request.get_json(silent=True) or {}
    checklist = json.loads(row["checklist"] or "[]")
    stages = PROGRAM_STAGES if row["kind"] == "program" else UNI_STAGES
    stage = data.get("stage") if data.get("stage") in stages else row["stage"]
    if stage == "review" and row["kind"] == "university":
        stage = row["stage"]                      # only the submit endpoint can send for review
    toggles = data.get("done") or {}
    for item in checklist:
        if item["key"] in toggles:
            item["done"] = bool(toggles[item["key"]])
    notes = data.get("notes", row["notes"])
    conn = db.connect()
    with conn:
        conn.execute("UPDATE applications SET stage = ?, checklist = ?, notes = ?, updated_at = ? WHERE id = ?",
                     (stage, json.dumps(checklist, ensure_ascii=False), (notes or "")[:4000], db.now(), app_id))
    conn.close()
    return jsonify({"ok": True, "application": _row(_get(app_id, user["id"]))})


@bp.delete("/api/applications/<int:app_id>")
def delete_application(app_id):
    user = _user()
    _get(app_id, user["id"])
    conn = db.connect()
    files = conn.execute("SELECT stored_name FROM application_files WHERE application_id = ?", (app_id,)).fetchall()
    with conn:
        conn.execute("DELETE FROM applications WHERE id = ?", (app_id,))
    conn.close()
    for f in files:
        try:
            os.remove(os.path.join(FILES_DIR, str(user["id"]), f["stored_name"]))
        except OSError:
            pass
    return jsonify({"ok": True})


@bp.post("/api/applications/<int:app_id>/files")
def upload_file(app_id):
    user = _user()
    row = _get(app_id, user["id"])
    upload = request.files.get("file")
    req_key = re.sub(r"[^a-z0-9_]", "", (request.form.get("req_key") or "")[:40])
    if not upload or not req_key:
        return jsonify({"ok": False, "error": "file_required"}), 400
    ext = os.path.splitext(upload.filename or "")[1].lower()
    if ext not in ALLOWED_EXT:
        return jsonify({"ok": False, "error": "file_type"}), 400
    blob = upload.read(MAX_FILE + 1)
    if len(blob) > MAX_FILE:
        return jsonify({"ok": False, "error": "file_too_large"}), 400
    folder = os.path.join(FILES_DIR, str(user["id"]))
    os.makedirs(folder, exist_ok=True)
    stored = "%d-%s-%s%s" % (app_id, req_key, secrets.token_hex(6), ext)
    with open(os.path.join(folder, stored), "wb") as fh:
        fh.write(blob)
    checklist = json.loads(row["checklist"] or "[]")
    for item in checklist:
        if item["key"] == req_key:
            item["done"] = True
    conn = db.connect()
    with conn:
        conn.execute("INSERT INTO application_files (application_id, req_key, filename, stored_name, size, uploaded_at) "
                     "VALUES (?,?,?,?,?,?)",
                     (app_id, req_key, os.path.basename(upload.filename)[:120], stored, len(blob), db.now()))
        conn.execute("UPDATE applications SET checklist = ?, updated_at = ?, stage = CASE WHEN stage = 'planning' "
                     "THEN 'preparing' ELSE stage END WHERE id = ?",
                     (json.dumps(checklist, ensure_ascii=False), db.now(), app_id))
    conn.close()
    return jsonify({"ok": True, "application": _row(_get(app_id, user["id"]))})


@bp.get("/api/applications/<int:app_id>/files/<int:file_id>")
def download_file(app_id, file_id):
    user = _user()
    _get(app_id, user["id"])
    conn = db.connect()
    f = conn.execute("SELECT * FROM application_files WHERE id = ? AND application_id = ?", (file_id, app_id)).fetchone()
    conn.close()
    if not f:
        abort(404)
    return send_from_directory(os.path.join(FILES_DIR, str(user["id"])), f["stored_name"],
                               as_attachment=True, download_name=f["filename"])


@bp.delete("/api/applications/<int:app_id>/files/<int:file_id>")
def delete_file(app_id, file_id):
    user = _user()
    _get(app_id, user["id"])
    conn = db.connect()
    f = conn.execute("SELECT * FROM application_files WHERE id = ? AND application_id = ?", (file_id, app_id)).fetchone()
    if f:
        with conn:
            conn.execute("DELETE FROM application_files WHERE id = ?", (file_id,))
        try:
            os.remove(os.path.join(FILES_DIR, str(user["id"]), f["stored_name"]))
        except OSError:
            pass
    conn.close()
    return jsonify({"ok": True, "application": _row(_get(app_id, user["id"]))})


@bp.post("/api/applications/<int:app_id>/submit")
def submit_for_review(app_id):
    """University applications: hand the file to the Meridian team."""
    user = _user()
    row = _get(app_id, user["id"])
    app = _row(row)
    missing = [c for c in app["checklist"] if not c.get("done")]
    if missing:
        return jsonify({"ok": False, "error": "checklist_incomplete", "missing": [m["key"] for m in missing]}), 400
    stamp = db.now()
    conn = db.connect()
    with conn:
        conn.execute("UPDATE applications SET stage = 'review', submitted_at = ?, updated_at = ? WHERE id = ?",
                     (stamp, stamp, app_id))
    conn.close()
    item = app["item"] or {}
    name = (item.get("name") or {}).get("en", app["item_id"]) if isinstance(item.get("name"), dict) else app["item_id"]
    try:
        mailer.send_application_review("%s %s" % (user["first_name"], user["last_name"]), user["email"], name)
    except Exception:
        pass
    return jsonify({"ok": True, "application": _row(_get(app_id, user["id"]))})


@bp.get("/api/admin/applications")
def admin_applications():
    if not _admin():
        return jsonify({"ok": False, "error": "forbidden"}), 403
    conn = db.connect()
    rows = conn.execute(
        "SELECT a.*, u.first_name, u.last_name, u.email FROM applications a JOIN users u ON u.id = a.user_id "
        "ORDER BY a.updated_at DESC LIMIT 300").fetchall()
    conn.close()
    out = []
    for r in rows:
        app = _row(r)
        app["student"] = {"name": "%s %s" % (r["first_name"], r["last_name"]), "email": r["email"]}
        out.append(app)
    return jsonify({"ok": True, "applications": out})


@bp.post("/api/admin/applications/<int:app_id>/stage")
def admin_set_stage(app_id):
    if not _admin():
        return jsonify({"ok": False, "error": "forbidden"}), 403
    stage = (request.get_json(silent=True) or {}).get("stage")
    if stage not in UNI_STAGES:
        return jsonify({"ok": False, "error": "bad_stage"}), 400
    conn = db.connect()
    with conn:
        conn.execute("UPDATE applications SET stage = ?, updated_at = ? WHERE id = ?", (stage, db.now(), app_id))
    conn.close()
    return jsonify({"ok": True})
