"""College counselling — counsellors, partner schools and their private board.

    GET    /api/counselling                    courses, self-tests, approved counsellors, my status, my school board
    GET    /api/prep                           test-prep exams and resources
    POST   /api/counsellors/apply              a logged-in user asks to join as a counsellor (we review)
    POST   /api/school/posts                   an approved counsellor posts to their school's students
    DELETE /api/school/posts/<id>              ... and removes it
    GET    /api/admin/counselling              counsellors and partner schools (admin token)
    POST   /api/admin/counsellors/<id>/<approve|reject>
    POST   /api/admin/schools                  {"name", "domain", "emails": "a@x.ge, b@x.ge"} add or update a partner school
    GET    /api/counsellor/students            an approved school counsellor's students, with progress
    GET    /api/counsellor/students/<id>       one student's full file (profile, GPA, applications, saved items)
    GET    /api/meetings                       my meetings (as student or as counsellor)
    POST   /api/meetings                       ask for a meeting: student → their counsellor, counsellor → their student
    PATCH  /api/meetings/<id>                  {"status": "confirmed" | "cancelled"}

Counsellors join only after review, and only staff of partner schools. A
student sees their school's board when their account email is on the list the
school gave us, or ends with the school's email domain.
"""
import json
import os
import re
import secrets

from flask import Blueprint, jsonify, request, abort, make_response

import db
import mailer
from config import Config, DATA_DIR

bp = Blueprint("counselling", __name__)

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
POST_KINDS = ("webinar", "project", "deadline", "news", "event")


def _read(name, default):
    try:
        with open(os.path.join(DATA_DIR, name + ".json"), encoding="utf-8") as fh:
            return json.load(fh)
    except (OSError, ValueError):
        return default


def _clean(value, limit=200):
    return str(value or "").strip()[:limit]


def _user(required=False):
    user = db.session_user(request.cookies.get(Config.COOKIE_NAME))
    if required and not user:
        abort(make_response(jsonify({"ok": False, "error": "auth_required"}), 401))
    return user


def _admin():
    token = request.args.get("token") or request.headers.get("X-Admin-Token", "")
    if not (token and secrets.compare_digest(token, Config.ADMIN_TOKEN)):
        abort(make_response(jsonify({"ok": False, "error": "forbidden"}), 403))


# Accounts that are counsellors without going through the application form
# (founders checking the counsellor view). They are linked to a demo school.
BUILTIN_COUNSELLORS = {"pl857@georgetown.edu": "Meridian Demo School"}


def ensure_builtin(user):
    school = BUILTIN_COUNSELLORS.get((user or {}).get("email", "").lower()) if user else None
    if not school:
        return
    conn = db.connect()
    with conn:
        sid = _school_id(conn, school)
        row = conn.execute("SELECT id, status FROM counsellors WHERE user_id = ?", (user["id"],)).fetchone()
        if not row:
            conn.execute("""INSERT INTO counsellors (user_id, school, school_id, title, status, created_at)
                            VALUES (?, ?, ?, 'School counsellor', 'approved', datetime('now'))""",
                         (user["id"], school, sid))
        elif row["status"] != "approved":
            conn.execute("UPDATE counsellors SET status = 'approved', school_id = COALESCE(school_id, ?) WHERE id = ?",
                         (sid, row["id"]))
    conn.close()


def _domain(email):
    return (email or "").rsplit("@", 1)[-1].lower()


# ---------------------------------------------------------------- queries
def _counsellor_of(user_id):
    conn = db.connect()
    row = conn.execute("SELECT * FROM counsellors WHERE user_id = ?", (user_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def _schools_for(user):
    """Partner schools whose board this user may read."""
    if not user:
        return []
    email = (user["email"] or "").lower()
    conn = db.connect()
    rows = conn.execute(
        """SELECT DISTINCT s.* FROM schools s LEFT JOIN school_members m ON m.school_id = s.id
           WHERE lower(m.email) = ? OR (s.domain IS NOT NULL AND s.domain != '' AND lower(s.domain) = ?)""",
        (email, _domain(email))).fetchall()
    schools = [dict(r) for r in rows]
    mine = _counsellor_of(user["id"])
    if mine and mine["status"] == "approved" and mine.get("school_id") and \
            not any(s["id"] == mine["school_id"] for s in schools):
        row = conn.execute("SELECT * FROM schools WHERE id = ?", (mine["school_id"],)).fetchone()
        if row:
            schools.append(dict(row))
    conn.close()
    return schools


FOCUS = ("general", "eu", "us", "asia")


def _approved_counsellors(school_ids=None):
    """Everyone sees the independent counsellors (no partner school; any school or
    university they name is shown on their profile as an affiliation). A partner
    school's own counsellors are listed only for that school's students."""
    conn = db.connect()
    where = "c.school_id IS NULL"
    args = []
    if school_ids is not None:
        if not school_ids:
            conn.close()
            return []
        where = "c.school_id IN (%s)" % ",".join("?" * len(school_ids))
        args = list(school_ids)
    rows = conn.execute(
        """SELECT c.id, c.school, c.title, c.bio, c.expertise, c.languages, c.focus, u.first_name, u.last_name, u.country
           FROM counsellors c JOIN users u ON u.id = c.user_id WHERE c.status = 'approved' AND %s
           ORDER BY c.created_at""" % where, args).fetchall()
    conn.close()
    out = []
    for row in rows:
        item = dict(row)
        item["focus"] = [f for f in (item.get("focus") or "").split(",") if f in FOCUS] or ["general"]
        out.append(item)
    return out


def _board(schools):
    if not schools:
        return []
    conn = db.connect()
    marks = ",".join("?" * len(schools))
    rows = conn.execute(
        """SELECT p.*, s.name AS school, u.first_name, u.last_name FROM school_posts p
           JOIN schools s ON s.id = p.school_id JOIN counsellors c ON c.id = p.counsellor_id
           JOIN users u ON u.id = c.user_id
           WHERE p.school_id IN (%s) ORDER BY COALESCE(p.starts_at, p.created_at) DESC LIMIT 60""" % marks,
        [s["id"] for s in schools]).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ---------------------------------------------------------------- public
@bp.get("/api/prep")
def prep():
    return jsonify({"ok": True, "prep": _read("prep", {"exams": []})})


@bp.get("/api/counselling")
def counselling():
    ensure_builtin(_user())
    user = _user()
    mine = _counsellor_of(user["id"]) if user else None
    schools = _schools_for(user)
    return jsonify({
        "ok": True,
        "courses": _read("courses", []),
        "quizzes": _read("quizzes", {}),
        "counsellors": _approved_counsellors(),
        "school_counsellors": _approved_counsellors([s["id"] for s in schools]) if schools else [],
        "me": {
            "authed": bool(user),
            "counsellor": {k: mine[k] for k in ("status", "school", "title", "school_id")} if mine else None,
            "schools": [{"id": s["id"], "name": s["name"]} for s in schools],
        },
        "board": _board(schools),
    })


@bp.post("/api/counsellors/apply")
def apply():
    user = _user(required=True)
    data = request.get_json(silent=True) or {}
    # empty = an independent counsellor; otherwise the school or university they work for
    school = _clean(data.get("school"), 140)
    focus = ",".join(f for f in (data.get("focus") or []) if f in FOCUS) or "general"
    if _counsellor_of(user["id"]):
        return jsonify({"ok": False, "error": "already_applied"}), 409
    conn = db.connect()
    with conn:
        conn.execute(
            """INSERT INTO counsellors (user_id, school, school_domain, title, bio, expertise, languages, focus, status, created_at)
               VALUES (?,?,?,?,?,?,?,?, 'pending', datetime('now'))""",
            (user["id"], school, _domain(user["email"]) if school else None, _clean(data.get("title"), 120),
             _clean(data.get("bio"), 1500), _clean(data.get("expertise"), 300), _clean(data.get("languages"), 120), focus))
    conn.close()
    try:
        mailer.send_counsellor_application("%s %s" % (user["first_name"], user["last_name"]), user["email"],
                                           school or "Independent", _clean(data.get("title"), 120))
    except Exception:          # the application is saved either way
        pass
    return jsonify({"ok": True, "status": "pending"})


@bp.post("/api/school/posts")
def create_post():
    user = _user(required=True)
    mine = _counsellor_of(user["id"])
    if not mine or mine["status"] != "approved" or not mine.get("school_id"):
        return jsonify({"ok": False, "error": "not_counsellor"}), 403
    data = request.get_json(silent=True) or {}
    title = _clean(data.get("title"), 160)
    kind = _clean(data.get("kind"), 20) if data.get("kind") in POST_KINDS else "news"
    link = _clean(data.get("link"), 400)
    if link and not re.match(r"^https?://", link):
        link = ""
    if not title:
        return jsonify({"ok": False, "error": "missing_fields"}), 400
    conn = db.connect()
    with conn:
        conn.execute(
            """INSERT INTO school_posts (school_id, counsellor_id, kind, title, body, link, starts_at, created_at)
               VALUES (?,?,?,?,?,?,?, datetime('now'))""",
            (mine["school_id"], mine["id"], kind, title, _clean(data.get("body"), 3000), link,
             _clean(data.get("starts_at"), 20) or None))
    conn.close()
    return jsonify({"ok": True, "board": _board(_schools_for(user))})


@bp.delete("/api/school/posts/<int:post_id>")
def delete_post(post_id):
    user = _user(required=True)
    mine = _counsellor_of(user["id"])
    if not mine:
        return jsonify({"ok": False, "error": "not_counsellor"}), 403
    conn = db.connect()
    with conn:
        conn.execute("DELETE FROM school_posts WHERE id = ? AND counsellor_id = ?", (post_id, mine["id"]))
    conn.close()
    return jsonify({"ok": True, "board": _board(_schools_for(user))})


# ---------------------------------------------------------------- admin
@bp.get("/api/admin/counselling")
def admin_overview():
    _admin()
    conn = db.connect()
    counsellors = [dict(r) for r in conn.execute(
        """SELECT c.*, u.first_name, u.last_name, u.email FROM counsellors c JOIN users u ON u.id = c.user_id
           ORDER BY c.status = 'pending' DESC, c.created_at DESC""")]
    schools = [dict(r) for r in conn.execute(
        """SELECT s.*, (SELECT COUNT(*) FROM school_members m WHERE m.school_id = s.id) AS members
           FROM schools s ORDER BY s.name""")]
    conn.close()
    return jsonify({"ok": True, "counsellors": counsellors, "schools": schools})


def _school_id(conn, name, domain=None):
    row = conn.execute("SELECT id FROM schools WHERE lower(name) = lower(?)", (name,)).fetchone()
    if row:
        if domain:
            conn.execute("UPDATE schools SET domain = ? WHERE id = ?", (domain, row["id"]))
        return row["id"]
    cur = conn.execute("INSERT INTO schools (name, domain, created_at) VALUES (?, ?, datetime('now'))", (name, domain))
    return cur.lastrowid


@bp.post("/api/admin/counsellors/<int:cid>/<action>")
def admin_review(cid, action):
    _admin()
    if action not in ("approve", "reject"):
        return jsonify({"ok": False, "error": "bad_action"}), 400
    conn = db.connect()
    with conn:
        row = conn.execute("SELECT * FROM counsellors WHERE id = ?", (cid,)).fetchone()
        if not row:
            conn.close()
            return jsonify({"ok": False, "error": "not_found"}), 404
        # link to a partner school only if the admin has registered that school;
        # anyone else stays an independent counsellor visible to every student
        school_id = row["school_id"]
        if action == "approve" and row["school"]:
            match = conn.execute("SELECT id FROM schools WHERE lower(name) = lower(?)", (row["school"],)).fetchone()
            school_id = match["id"] if match else None
        conn.execute("UPDATE counsellors SET status = ?, school_id = ? WHERE id = ?",
                     ("approved" if action == "approve" else "rejected", school_id, cid))
    conn.close()
    return admin_overview()


@bp.post("/api/admin/schools")
def admin_school():
    _admin()
    data = request.get_json(silent=True) or {}
    name = _clean(data.get("name"), 140)
    domain = _clean(data.get("domain"), 120).lower().lstrip("@") or None
    if not name:
        return jsonify({"ok": False, "error": "missing_fields"}), 400
    emails = [e.strip().lower() for e in re.split(r"[\s,;]+", str(data.get("emails") or "")) if EMAIL_RE.match(e.strip())]
    conn = db.connect()
    with conn:
        sid = _school_id(conn, name, domain)
        conn.executemany("INSERT OR IGNORE INTO school_members (school_id, email) VALUES (?, ?)",
                         [(sid, e) for e in emails[:5000]])
    conn.close()
    return admin_overview()


# ---------------------------------------------------------------- counsellor view
def _approved_counsellor(user):
    """The user's approved, school-linked counsellor record, or None."""
    ensure_builtin(user)
    mine = _counsellor_of(user["id"])
    return mine if mine and mine["status"] == "approved" and mine.get("school_id") else None


def _students_of(school_id):
    """Students of a partner school: emails the school gave us, or its email domain.
    Counsellors themselves are never listed as students."""
    conn = db.connect()
    school = conn.execute("SELECT * FROM schools WHERE id = ?", (school_id,)).fetchone()
    if not school:
        conn.close()
        return []
    rows = conn.execute(
        """SELECT u.* FROM users u
           WHERE (lower(u.email) IN (SELECT lower(email) FROM school_members WHERE school_id = ?)
                  OR (? != '' AND lower(substr(u.email, instr(u.email, '@') + 1)) = ?))
             AND u.id NOT IN (SELECT user_id FROM counsellors WHERE status = 'approved')
           ORDER BY u.last_name, u.first_name""",
        (school_id, (school["domain"] or "").lower(), (school["domain"] or "").lower())).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def _student_summary(conn, u):
    apps = conn.execute("SELECT kind, stage, checklist FROM applications WHERE user_id = ?", (u["id"],)).fetchall()
    unis = [a for a in apps if a["kind"] == "university"]
    done = total = 0
    for a in apps:
        items = json.loads(a["checklist"] or "[]")
        done += sum(1 for c in items if c.get("done"))
        total += len(items)
    saved = conn.execute("SELECT COUNT(*) AS n FROM saved_programs WHERE user_id = ?", (u["id"],)).fetchone()["n"]
    return {
        "id": u["id"], "name": "%s %s" % (u["first_name"], u["last_name"]), "email": u["email"],
        "grade": u.get("grade"), "gpa": u.get("gpa"), "test_scores": u.get("test_scores"),
        "country": u.get("country"), "city": u.get("city"), "plan": u.get("plan"),
        "verified": bool(u.get("verified")), "last_login_at": u.get("last_login_at"),
        "applications": len(apps), "universities": len(unis),
        "submitted": sum(1 for a in apps if a["stage"] in ("review", "submitted", "result")),
        "progress": {"done": done, "total": total}, "saved": saved,
    }


@bp.get("/api/counsellor/students")
def counsellor_students():
    user = _user(required=True)
    mine = _approved_counsellor(user)
    if not mine:
        return jsonify({"ok": False, "error": "not_counsellor"}), 403
    students = _students_of(mine["school_id"])
    conn = db.connect()
    out = [_student_summary(conn, u) for u in students]
    school = conn.execute("SELECT name FROM schools WHERE id = ?", (mine["school_id"],)).fetchone()
    conn.close()
    return jsonify({"ok": True, "school": school["name"] if school else mine["school"], "students": out})


@bp.get("/api/counsellor/students/<int:student_id>")
def counsellor_student(student_id):
    user = _user(required=True)
    mine = _approved_counsellor(user)
    if not mine:
        return jsonify({"ok": False, "error": "not_counsellor"}), 403
    student = next((u for u in _students_of(mine["school_id"]) if u["id"] == student_id), None)
    if not student:
        return jsonify({"ok": False, "error": "not_found"}), 404
    import tracker, catalog
    conn = db.connect()
    with conn:
        conn.execute("INSERT INTO counsellor_access (counsellor_id, student_id, at) VALUES (?, ?, datetime('now'))",
                     (mine["id"], student_id))
    rows = conn.execute("SELECT * FROM applications WHERE user_id = ? ORDER BY updated_at DESC", (student_id,)).fetchall()
    apps = [tracker._row(r, with_files=True) for r in rows]
    saved_ids = [r["program_id"] for r in conn.execute(
        "SELECT program_id FROM saved_programs WHERE user_id = ? ORDER BY created_at DESC", (student_id,))]
    meetings = [dict(r) for r in conn.execute(
        "SELECT * FROM meetings WHERE counsellor_id = ? AND student_id = ? ORDER BY starts_at DESC", (mine["id"], student_id))]
    summary = _student_summary(conn, student)
    conn.close()
    saved = []
    for item_id in saved_ids:
        p = catalog.find_program(item_id)
        u = None if p else catalog.find_university(item_id)
        item = p or u
        if item:
            saved.append({"id": item["id"], "kind": "program" if p else "university", "name": item.get("name"),
                          "flag": item.get("flag"), "deadline": item.get("deadline"),
                          "url": "/%s/%s" % ("programs" if p else "universities", item["id"])})
    profile = {k: student.get(k) for k in ("phone", "school", "birth_date", "interests", "target_regions", "created_at")}
    return jsonify({"ok": True, "student": dict(summary, profile=profile), "applications": apps,
                    "saved": saved, "meetings": meetings})


# ---------------------------------------------------------------- meetings
MEETING_STATUSES = ("requested", "confirmed", "cancelled")


def _meeting_row(conn, m):
    item = dict(m)
    c = conn.execute("""SELECT u.first_name, u.last_name, u.email FROM counsellors c JOIN users u ON u.id = c.user_id
                        WHERE c.id = ?""", (m["counsellor_id"],)).fetchone()
    st = conn.execute("SELECT first_name, last_name, email FROM users WHERE id = ?", (m["student_id"],)).fetchone()
    item["counsellor"] = "%s %s" % (c["first_name"], c["last_name"]) if c else ""
    item["student"] = "%s %s" % (st["first_name"], st["last_name"]) if st else ""
    return item, c, st


@bp.get("/api/meetings")
def my_meetings():
    user = _user(required=True)
    mine = _approved_counsellor(user)
    conn = db.connect()
    if mine:
        rows = conn.execute("SELECT * FROM meetings WHERE counsellor_id = ? ORDER BY starts_at", (mine["id"],)).fetchall()
    else:
        rows = conn.execute("SELECT * FROM meetings WHERE student_id = ? ORDER BY starts_at", (user["id"],)).fetchall()
    out = [_meeting_row(conn, r)[0] for r in rows]
    conn.close()
    return jsonify({"ok": True, "meetings": out, "role": "counsellor" if mine else "student"})


@bp.post("/api/meetings")
def ask_meeting():
    user = _user(required=True)
    data = request.get_json(silent=True) or {}
    starts = _clean(data.get("starts_at"), 16)
    if not re.match(r"^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}$", starts):
        return jsonify({"ok": False, "error": "bad_time"}), 400
    minutes = int(data.get("minutes") or 30)
    minutes = minutes if minutes in (15, 30, 45, 60) else 30
    topic = _clean(data.get("topic"), 200)
    mine = _approved_counsellor(user)
    if mine:
        student_id = int(data.get("student_id") or 0)
        if not any(u["id"] == student_id for u in _students_of(mine["school_id"])):
            return jsonify({"ok": False, "error": "not_your_student"}), 403
        counsellor_id, by = mine["id"], "counsellor"
    else:
        counsellor_id = int(data.get("counsellor_id") or 0)
        allowed = {c["id"] for c in _approved_counsellors([s["id"] for s in _schools_for(user)])}
        if counsellor_id not in allowed:
            return jsonify({"ok": False, "error": "not_your_counsellor"}), 403
        student_id, by = user["id"], "student"
    conn = db.connect()
    with conn:
        cur = conn.execute("""INSERT INTO meetings (counsellor_id, student_id, starts_at, minutes, topic, status, requested_by, created_at)
                              VALUES (?, ?, ?, ?, ?, 'requested', ?, datetime('now'))""",
                           (counsellor_id, student_id, starts.replace(" ", "T"), minutes, topic, by))
    row = conn.execute("SELECT * FROM meetings WHERE id = ?", (cur.lastrowid,)).fetchone()
    item, c, st = _meeting_row(conn, row)
    conn.close()
    other = st if by == "counsellor" else c
    if other:
        mailer.send_meeting_notice(other["email"], other["first_name"], item["counsellor"] if by == "student" else item["student"],
                                   item["starts_at"].replace("T", " "), topic, "requested")
    return jsonify({"ok": True, "meeting": item})


@bp.patch("/api/meetings/<int:meeting_id>")
def update_meeting(meeting_id):
    user = _user(required=True)
    status = _clean((request.get_json(silent=True) or {}).get("status"), 20)
    if status not in ("confirmed", "cancelled"):
        return jsonify({"ok": False, "error": "bad_status"}), 400
    mine = _approved_counsellor(user)
    conn = db.connect()
    row = conn.execute("SELECT * FROM meetings WHERE id = ?", (meeting_id,)).fetchone()
    if not row or not ((mine and row["counsellor_id"] == mine["id"]) or row["student_id"] == user["id"]):
        conn.close()
        return jsonify({"ok": False, "error": "not_found"}), 404
    # the side that asked can only cancel; the other side confirms
    side = "counsellor" if mine and row["counsellor_id"] == mine["id"] else "student"
    if status == "confirmed" and row["requested_by"] == side:
        conn.close()
        return jsonify({"ok": False, "error": "other_side_confirms"}), 400
    with conn:
        conn.execute("UPDATE meetings SET status = ? WHERE id = ?", (status, meeting_id))
    row = conn.execute("SELECT * FROM meetings WHERE id = ?", (meeting_id,)).fetchone()
    item, c, st = _meeting_row(conn, row)
    conn.close()
    other = st if side == "counsellor" else c
    if other:
        mailer.send_meeting_notice(other["email"], other["first_name"], item["counsellor"] if side == "student" else item["student"],
                                   item["starts_at"].replace("T", " "), item.get("topic"), status)
    return jsonify({"ok": True, "meeting": item})
