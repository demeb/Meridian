"""Activity tracking and the weekly report.

The browser sends small events (a programme page opened, an official link
clicked, a search, an application started). They land in the `events` table
with the user id when someone is signed in, otherwise a random visitor id.
No IP addresses, no third-party trackers.

Every seven days the first request after the week ends builds a report
(maybe_weekly_report), stores it in the `reports` table, writes
backend/reports/<date>.html and emails it to the team inbox. The admin page
shows the latest week live.
"""
import json
import os
import secrets
import threading
from collections import Counter
from datetime import datetime, timedelta, date

from flask import Blueprint, jsonify, request

import catalog
import db
import mailer
from config import Config, STORAGE_DIR

bp = Blueprint("analytics", __name__)

REPORT_DIR = os.path.join(STORAGE_DIR, "reports")
KINDS = {"view_program", "view_university", "official_click", "apply_click", "search",
         "save", "start_application", "page"}
STAGE_AGE = {"grade-7": "12–13", "grade-8": "13–14", "grade-9": "14–15", "grade-10": "15–16",
             "grade-11": "16–17", "grade-12": "17–18", "10": "15–16", "11": "16–17", "12": "17–18",
             "bachelor": "18–22", "uni": "18–22", "master": "22–26", "phd": "24+", "graduate": "22+",
             "parent": "parent", "educator": "educator", "other": "other"}

_lock = threading.Lock()
_checked = [None]


def _visitor():
    return (request.cookies.get("meridian_v") or "")[:32] or None


@bp.post("/api/events")
def track():
    data = request.get_json(silent=True) or {}
    kind = data.get("kind")
    if kind not in KINDS:
        return jsonify({"ok": False}), 400
    user = db.session_user(request.cookies.get(Config.COOKIE_NAME))
    visitor = _visitor() or secrets.token_hex(8)
    meta = data.get("meta") if isinstance(data.get("meta"), dict) else {}
    conn = db.connect()
    with conn:
        conn.execute("INSERT INTO events (at, user_id, visitor, kind, item, meta) VALUES (?,?,?,?,?,?)",
                     (db.now(), user["id"] if user else None, visitor, kind,
                      str(data.get("item") or "")[:160] or None,
                      json.dumps(meta, ensure_ascii=False)[:600]))
    conn.close()
    resp = jsonify({"ok": True})
    if not _visitor():
        resp.set_cookie("meridian_v", visitor, max_age=365 * 86400, httponly=True, samesite="Lax",
                        secure=Config.cookie_secure(request.host))
    return resp


def _names():
    names = {p["id"]: p["name"]["en"] for p in catalog.programs()}
    names.update({p["id"]: p["name"]["en"] for p in catalog.archived()})
    names.update({u["id"]: (u["name"]["en"] if isinstance(u["name"], dict) else u["name"]) for u in catalog.universities()})
    return names


def build_report(end=None, days=7):
    end = end or datetime.utcnow()
    start = end - timedelta(days=days)
    s, e = start.replace(microsecond=0).isoformat() + "Z", end.replace(microsecond=0).isoformat() + "Z"
    conn = db.connect()
    events = conn.execute("SELECT * FROM events WHERE at >= ? AND at < ?", (s, e)).fetchall()
    signups = conn.execute("SELECT grade, country, birth_year FROM users WHERE created_at >= ? AND created_at < ?",
                           (s, e)).fetchall()
    all_users = conn.execute("SELECT grade, country, birth_year FROM users WHERE verified = 1").fetchall()
    apps = conn.execute("SELECT kind, item_id, stage, created_at, submitted_at FROM applications "
                        "WHERE created_at >= ? OR (submitted_at IS NOT NULL AND submitted_at >= ?)", (s, s)).fetchall()
    total_users = conn.execute("SELECT COUNT(*) FROM users WHERE verified = 1").fetchone()[0]
    conn.close()

    names = _names()
    by_kind = Counter(ev["kind"] for ev in events)

    def top(kind, n=10):
        c = Counter(ev["item"] for ev in events if ev["kind"] == kind and ev["item"])
        return [{"id": k, "name": names.get(k, k), "count": v} for k, v in c.most_common(n)]

    def ages(rows):
        out = Counter()
        this_year = date.today().year
        for r in rows:
            if r["birth_year"]:
                age = this_year - int(r["birth_year"])
                band = "under 15" if age < 15 else "15–17" if age < 18 else "18–21" if age < 22 else "22–25" if age < 26 else "26+"
                out[band] += 1
            else:
                out[STAGE_AGE.get(r["grade"] or "", "unknown")] += 1
        return dict(out.most_common())

    searches = Counter((json.loads(ev["meta"] or "{}").get("q") or "").strip().lower()
                       for ev in events if ev["kind"] == "search")
    searches.pop("", None)
    return {
        "period": {"start": s, "end": e},
        "visitors": len({ev["visitor"] for ev in events if ev["visitor"]}),
        "signed_in_users_active": len({ev["user_id"] for ev in events if ev["user_id"]}),
        "events": dict(by_kind),
        "signups": len(signups),
        "total_users": total_users,
        "signup_ages": ages(signups),
        "all_user_ages": ages(all_users),
        "signup_countries": dict(Counter(r["country"] or "unknown" for r in signups).most_common(10)),
        "top_programs": top("view_program"),
        "top_universities": top("view_university"),
        "top_official_clicks": top("official_click"),
        "top_apply_clicks": top("apply_click"),
        "top_saves": top("save"),
        "applications_started": len([a for a in apps if a["created_at"] >= s]),
        "applications_sent_for_review": len([a for a in apps if a["submitted_at"] and a["submitted_at"] >= s]),
        "applications_by_kind": dict(Counter(a["kind"] for a in apps)),
        "top_searches": [{"q": q, "count": c} for q, c in searches.most_common(12)],
        "catalog": {"programs_live": len(catalog.programs()), "archived": len(catalog.archived()),
                    "universities": len(catalog.universities())},
    }


def report_html(rep):
    def table(title, rows, cols):
        if not rows:
            return "<h3>%s</h3><p style='color:#5a6b8c'>Nothing yet.</p>" % title
        head = "".join("<th align='left' style='padding:4px 10px;border-bottom:1px solid #dde'>%s</th>" % c for c in cols)
        body = "".join("<tr>%s</tr>" % "".join("<td style='padding:4px 10px'>%s</td>" % v for v in r) for r in rows)
        return "<h3>%s</h3><table style='border-collapse:collapse;font-size:14px'><tr>%s</tr>%s</table>" % (title, head, body)
    ev = rep["events"]
    summary = [("Visitors", rep["visitors"]), ("New sign-ups", rep["signups"]), ("Total users", rep["total_users"]),
               ("Programme views", ev.get("view_program", 0)), ("University views", ev.get("view_university", 0)),
               ("Official-link clicks", ev.get("official_click", 0)), ("Searches", ev.get("search", 0)),
               ("Applications started", rep["applications_started"]),
               ("Sent for review", rep["applications_sent_for_review"])]
    parts = [table("This week", [(k, v) for k, v in summary], ("Metric", "Value")),
             table("Most viewed programmes", [(r["name"], r["count"]) for r in rep["top_programs"]], ("Programme", "Views")),
             table("Most viewed universities", [(r["name"], r["count"]) for r in rep["top_universities"]], ("University", "Views")),
             table("Most clicked registrations", [(r["name"], r["count"]) for r in rep["top_apply_clicks"] + rep["top_official_clicks"]], ("Programme", "Clicks")),
             table("New users by age", list(rep["signup_ages"].items()), ("Age", "Users")),
             table("All users by age", list(rep["all_user_ages"].items()), ("Age", "Users")),
             table("New users by country", list(rep["signup_countries"].items()), ("Country", "Users")),
             table("Top searches", [(r["q"], r["count"]) for r in rep["top_searches"]], ("Search", "Times"))]
    return "".join(parts)


def save_report(rep):
    os.makedirs(REPORT_DIR, exist_ok=True)
    day = rep["period"]["end"][:10]
    html = report_html(rep)
    with open(os.path.join(REPORT_DIR, "%s.html" % day), "w", encoding="utf-8") as fh:
        fh.write("<!doctype html><meta charset='utf-8'><title>Meridian weekly report %s</title>"
                 "<body style='font-family:system-ui;max-width:760px;margin:40px auto;color:#0d2148'>"
                 "<h1>Meridian — week ending %s</h1>%s</body>" % (day, day, html))
    conn = db.connect()
    with conn:
        conn.execute("INSERT OR REPLACE INTO reports (period_end, created_at, data) VALUES (?,?,?)",
                     (day, db.now(), json.dumps(rep, ensure_ascii=False)))
    conn.close()
    return day, html


def maybe_weekly_report():
    """Called on requests; builds at most one report per week, at most one check per hour."""
    stamp = datetime.utcnow()
    if _checked[0] and stamp - _checked[0] < timedelta(hours=1):
        return
    with _lock:
        _checked[0] = stamp
        conn = db.connect()
        last = conn.execute("SELECT period_end FROM reports ORDER BY period_end DESC LIMIT 1").fetchone()
        first_event = conn.execute("SELECT MIN(at) FROM events").fetchone()[0]
        conn.close()
        if not first_event:
            return
        due_after = (datetime.fromisoformat(last["period_end"]) if last
                     else datetime.fromisoformat(first_event[:10])) + timedelta(days=7)
        if stamp < due_after:
            return
        rep = build_report(end=stamp)
        day, html = save_report(rep)
        try:
            mailer.send_weekly_report("Meridian weekly report — week ending %s" % day,
                                      "Weekly report for the week ending %s. Open /admin for details." % day, html)
        except Exception:
            pass


def _admin():
    token = request.args.get("token") or request.headers.get("X-Admin-Token", "")
    return bool(token) and secrets.compare_digest(token, Config.ADMIN_TOKEN)


@bp.get("/api/admin/report")
def admin_report():
    if not _admin():
        return jsonify({"ok": False, "error": "forbidden"}), 403
    conn = db.connect()
    past = [dict(r) for r in conn.execute("SELECT period_end, created_at FROM reports ORDER BY period_end DESC LIMIT 12")]
    conn.close()
    return jsonify({"ok": True, "live": build_report(), "past": past})
