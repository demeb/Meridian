"""Meridian — Flask application.

Serves the static frontend and a JSON API.

Auth        POST /api/auth/register | verify | resend | login | logout | forgot | reset
            GET  /api/auth/me          PATCH /api/auth/profile
Content     GET  /api/programs[/<id>]  GET /api/universities[/<id>]  GET /api/teachers[/<id>]
            GET  /api/pricing  GET /api/research
Tracker     GET|POST /api/applications  PATCH|DELETE /api/applications/<id>  (see tracker.py)
Activity    POST /api/events            GET /api/admin/report  (see analytics.py)
Lessons     POST /api/bookings         GET /api/bookings
Payments    POST /api/checkout/plan    GET /api/orders[/<id>]    POST /api/orders/<id>/pay
Tutors      POST /api/tutor/apply      GET|PATCH /api/tutor/me   POST /api/tutor/photo
            POST /api/tutor/slots      POST /api/tutor/bookings/<id>/cancel
Other       POST /api/saved            POST /api/engage
Admin       GET  /api/admin/overview   POST /api/admin/tutors/<id>/<approve|reject>
"""
import gzip
import io
import json
import os
import re
import secrets
import sys
from datetime import date, datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, jsonify, request, send_from_directory, make_response, abort

import analytics
import assistant
import catalog
import counselling
import db
import mailer
import payments
import tracker
import xlsx
from config import Config, DATA_DIR, FRONTEND_DIR, STORAGE_DIR

UPLOAD_DIR = os.path.join(STORAGE_DIR, "uploads")

app = Flask(__name__, static_folder=None)
app.config["SECRET_KEY"] = Config.SECRET_KEY
app.config["MAX_CONTENT_LENGTH"] = 9 * 1024 * 1024
app.register_blueprint(tracker.bp)
app.register_blueprint(analytics.bp)
app.register_blueprint(assistant.bp)
app.register_blueprint(counselling.bp)


@app.before_request
def housekeeping():
    # cheap: each runs its real work at most once an hour
    catalog.sweep_expired()
    if request.path.startswith("/api/"):
        try:
            analytics.maybe_weekly_report()
        except Exception as exc:          # a failed report must never break a page
            print("weekly report failed:", exc)

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$")
SLOT_RE = re.compile(r"^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$")

STAGES = {"grade-7", "grade-8", "grade-9", "grade-10", "grade-11", "grade-12",
          "bachelor", "master", "phd", "graduate", "parent", "educator", "other",
          # older accounts
          "10", "11", "12", "uni"}

# ---------------------------------------------------------------- content
_cache = {}


def content(name):
    """Load and cache a JSON content file, reloading when it changes on disk."""
    path = os.path.join(DATA_DIR, name + ".json")
    stamp = os.path.getmtime(path)
    hit = _cache.get(name)
    if hit and hit[0] == stamp:
        return hit[1]
    with open(path, "r", encoding="utf-8") as fh:
        data = json.load(fh)
    _cache[name] = (stamp, data)
    return data


# ---------------------------------------------------------------- helpers
def current_user():
    return db.session_user(request.cookies.get(Config.COOKIE_NAME))


def fail(error, status=400, **extra):
    payload = {"ok": False, "error": error}
    payload.update(extra)
    return jsonify(payload), status


def require_user():
    user = current_user()
    if not user:
        abort(make_response(jsonify({"ok": False, "error": "auth_required"}), 401))
    return user


def money(minor):
    value = minor / 100.0
    text = ("%.2f" % value).rstrip("0").rstrip(".")
    return "$%s" % text


def split_list(value, limit=12):
    if isinstance(value, list):
        items = value
    else:
        items = str(value or "").split(",")
    return [str(v).strip()[:40] for v in items if str(v).strip()][:limit]


def public_user(user):
    tutor = db.tutor_for_user(user["id"])
    return {
        "id": user["id"],
        "first_name": user["first_name"],
        "last_name": user["last_name"],
        "email": user["email"],
        "phone": user["phone"],
        "verified": bool(user["verified"]),
        "plan": user["plan"],
        "plan_cycle": user.get("plan_cycle"),
        "plan_renews_at": user.get("plan_renews_at"),
        "role": user.get("role") or "student",
        "grade": user.get("grade"),
        "country": user.get("country"),
        "city": user.get("city"),
        "school": user.get("school"),
        "birth_year": user.get("birth_year"),
        "birth_date": user.get("birth_date"),
        "interests": split_list(user.get("interests")),
        "target_regions": split_list(user.get("target_regions")),
        "locale": user["locale"],
        "initials": (user["first_name"][:1] + user["last_name"][:1]).upper(),
        "created_at": user["created_at"],
        "tutor": {"id": tutor["id"], "status": tutor["status"]} if tutor else None,
    }


def attach_session(payload, user_id, status=200):
    token = db.create_session(user_id, request.headers.get("User-Agent", ""))
    response = make_response(jsonify(payload), status)
    response.set_cookie(
        Config.COOKIE_NAME, token,
        max_age=Config.SESSION_DAYS * 86400,
        httponly=True, samesite="Lax", secure=Config.cookie_secure(request.host), path="/",
    )
    return response


def body():
    return request.get_json(silent=True) or {}


def clean(value, limit=200):
    return (str(value or "").strip())[:limit]


def code_payload(payload, code, delivered, sensitive=False):
    """Only reveal a code on screen when no real mail server is configured.
    Password-reset codes are `sensitive`: showing one would let anyone take
    over any account, so they are only revealed while running in debug mode."""
    payload["delivered"] = delivered
    if not delivered and Config.expose_dev_codes() and (Config.DEBUG or not sensitive):
        payload["dev_code"] = code
    if not delivered and Config.smtp_configured():
        payload["mail_error"] = True
    return payload


def profile_from(data):
    stage = clean(data.get("grade"), 30)
    return {
        "phone": clean(data.get("phone"), 40) or None,
        "grade": stage if stage in STAGES else None,
        "country": clean(data.get("country"), 4).upper() or None,
        "city": clean(data.get("city"), 80) or None,
        "school": clean(data.get("school"), 120) or None,
        "interests": ",".join(split_list(data.get("interests"))) or None,
        "target_regions": ",".join(split_list(data.get("target_regions"))) or None,
        "locale": data.get("locale") if data.get("locale") in ("ka", "ar") else "en",
        "birth_year": birth_year_from(data.get("birth_year")),
        "birth_date": birth_date_from(data.get("birth_date")),
    }


def birth_date_from(value):
    """"2008-04-17" -> the same string if it is a real date between 1940 and today."""
    try:
        born = datetime.strptime(str(value or "").strip(), "%Y-%m-%d").date()
    except ValueError:
        return None
    return born.isoformat() if date(1940, 1, 1) <= born <= date.today() else None


def birth_year_from(value):
    try:
        year = int(value)
    except (TypeError, ValueError):
        return None
    return year if 1940 <= year <= 2020 else None


# ---------------------------------------------------------------- pages
PAGES = {
    "": "index.html",
    "programs": "programs.html",
    "teachers": "teachers.html",
    "teacher": "teacher.html",
    "pricing": "pricing.html",
    "checkout": "checkout.html",
    "tutor": "tutor.html",
    "tutors/apply": "apply.html",
    "about": "about.html",
    "about/leadership": "leadership.html",
    "about/faq": "faq.html",
    "about/offerings": "offerings.html",
    "about/global-teachers": "global-teachers.html",
    "about/research": "research.html",
    "universities": "universities.html",
    "counselling": "counselling.html",
    "prep": "prep.html",
    "engage": "engage.html",
    "login": "login.html",
    "account": "account.html",
    "admin": "admin.html",
}


SITE_URL = "https://meridiangoal.com"


@app.get("/robots.txt")
def robots():
    body = "User-agent: *\nDisallow: /api/\nDisallow: /admin\nDisallow: /account\nSitemap: %s/sitemap.xml\n" % SITE_URL
    return app.response_class(body, mimetype="text/plain")


@app.get("/sitemap.xml")
def sitemap():
    """Every public page, programme and university, so search engines find them."""
    pages = ["", "programs", "programs?s=scholarships", "universities", "teachers", "counselling", "prep",
             "pricing", "about", "about/research", "faq", "engage"]
    urls = ["%s/%s" % (SITE_URL, p) for p in pages]
    urls += ["%s/programs/%s" % (SITE_URL, p["id"]) for p in catalog.programs()]
    full, rest = catalog.directory()
    urls += ["%s/universities/%s" % (SITE_URL, u["id"]) for u in list(full) + list(rest) if u.get("id")]
    body = ('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
            "".join("<url><loc>%s</loc></url>\n" % u.replace("&", "&amp;") for u in urls) + "</urlset>\n")
    return app.response_class(body, mimetype="application/xml")


@app.route("/uploads/<path:name>")
def uploads(name):
    return send_from_directory(UPLOAD_DIR, name, max_age=3600)


@app.route("/")
@app.route("/<path:route>")
def page(route=""):
    route = route.rstrip("/")
    if route in PAGES:
        return send_from_directory(FRONTEND_DIR, PAGES[route])
    # every opportunity and university has its own page
    if re.match(r"^programs/[A-Za-z0-9_-]+$", route):
        return send_from_directory(FRONTEND_DIR, "program.html")
    if re.match(r"^universities/[A-Za-z0-9_-]+$", route):
        return send_from_directory(FRONTEND_DIR, "university.html")
    candidate = os.path.join(FRONTEND_DIR, route)
    if route and os.path.isfile(candidate):
        response = static_gzip(candidate) or send_from_directory(FRONTEND_DIR, route)
        if request.args.get("v") and request.host.split(":")[0] not in ("127.0.0.1", "localhost"):
            # versioned links (?v=r7) never change: let the browser keep them a week
            response.headers["Cache-Control"] = "public, max-age=604800, immutable"
        return response
    return send_from_directory(FRONTEND_DIR, "404.html"), 404


GZIP_TYPES = {".js": "application/javascript", ".css": "text/css", ".geojson": "application/geo+json",
              ".json": "application/json", ".svg": "image/svg+xml"}
_gzip_cache = {}


def static_gzip(path):
    """Scripts, styles and map data gzipped once and kept in memory (globe.gl
    1.7 MB -> 0.5 MB, the country shapes 1.4 MB -> 0.4 MB)."""
    kind = GZIP_TYPES.get(os.path.splitext(path)[1].lower())
    if not kind or "gzip" not in request.headers.get("Accept-Encoding", ""):
        return None
    stamp = os.path.getmtime(path)
    cached = _gzip_cache.get(path)
    if not cached or cached[0] != stamp:
        with open(path, "rb") as fh:
            cached = (stamp, gzip.compress(fh.read(), compresslevel=6))
        _gzip_cache[path] = cached
    etag = '"%x-%x"' % (int(stamp), len(cached[1]))
    if request.headers.get("If-None-Match") == etag:
        response = make_response("", 304)
    else:
        response = make_response(cached[1])
        response.headers["Content-Encoding"] = "gzip"
        response.headers["Content-Length"] = str(len(cached[1]))
    response.mimetype = kind
    response.headers["ETag"] = etag
    response.headers["Cache-Control"] = "no-cache"
    response.vary.add("Accept-Encoding")
    return response


# ---------------------------------------------------------------- auth
@app.post("/api/auth/register")
def register():
    data = body()
    first = clean(data.get("first_name"), 60)
    last = clean(data.get("last_name"), 60)
    email = clean(data.get("email"), 160).lower()
    password = str(data.get("password") or "")
    profile = profile_from(data)
    if profile["birth_date"]:
        profile["birth_year"] = int(profile["birth_date"][:4])

    if not first or not last:
        return fail("name_required")
    if not profile["birth_date"]:
        return fail("birth_required")
    if not EMAIL_RE.match(email):
        return fail("invalid_email")
    if len(password) < 8:
        return fail("weak_password")

    existing = db.get_user_by_email(email)
    if existing:
        if existing["verified"]:
            return fail("email_taken", 409)
        user_id = existing["id"]
        db.refresh_unverified(user_id, first, last, password, **profile)
    else:
        user_id = db.create_user(first, last, email, password, **profile)

    if db.codes_sent_last_hour(user_id, "signup") >= Config.CODE_RESEND_LIMIT:
        return fail("rate_limited", 429)

    code = db.issue_code(user_id, "signup")
    delivered = mailer.send_verification_code(email, first, code)
    return jsonify(code_payload({"ok": True, "step": "verify", "email": email}, code, delivered))


@app.post("/api/auth/verify")
def verify():
    data = body()
    email = clean(data.get("email"), 160).lower()
    user = db.get_user_by_email(email)
    if not user:
        return fail("unknown_email", 404)
    ok, reason = db.check_code(user["id"], clean(data.get("code"), 10), "signup")
    if not ok:
        return fail(reason)
    db.mark_verified(user["id"])
    db.touch_login(user["id"])
    mailer.send_welcome(user["email"], user["first_name"])
    return attach_session({"ok": True, "user": public_user(db.get_user(user["id"]))}, user["id"])


@app.post("/api/auth/resend")
def resend():
    email = clean(body().get("email"), 160).lower()
    user = db.get_user_by_email(email)
    if not user:
        return fail("unknown_email", 404)
    if db.codes_sent_last_hour(user["id"], "signup") >= Config.CODE_RESEND_LIMIT:
        return fail("rate_limited", 429)
    code = db.issue_code(user["id"], "signup")
    delivered = mailer.send_verification_code(user["email"], user["first_name"], code)
    return jsonify(code_payload({"ok": True}, code, delivered))


@app.post("/api/auth/login")
def login():
    data = body()
    email = clean(data.get("email"), 160).lower()
    password = str(data.get("password") or "")
    user = db.get_user_by_email(email)
    if not user or not db.verify_password(password, user["password_hash"]):
        return fail("bad_credentials", 401)

    if not user["verified"]:
        code = db.issue_code(user["id"], "signup")
        delivered = mailer.send_verification_code(user["email"], user["first_name"], code)
        return jsonify(code_payload({"ok": True, "step": "verify", "email": user["email"]}, code, delivered))

    db.touch_login(user["id"])
    return attach_session({"ok": True, "user": public_user(user)}, user["id"])


@app.post("/api/auth/forgot")
def forgot():
    """Always answers the same way, so the form cannot be used to find out
    which emails have accounts."""
    email = clean(body().get("email"), 160).lower()
    if not EMAIL_RE.match(email):
        return fail("invalid_email")
    payload = {"ok": True, "step": "reset", "email": email}
    user = db.get_user_by_email(email)
    if user and db.codes_sent_last_hour(user["id"], "reset") < Config.CODE_RESEND_LIMIT:
        code = db.issue_code(user["id"], "reset")
        delivered = mailer.send_reset_code(user["email"], user["first_name"], code)
        code_payload(payload, code, delivered, sensitive=True)
    return jsonify(payload)


@app.post("/api/auth/reset")
def reset_password():
    data = body()
    email = clean(data.get("email"), 160).lower()
    password = str(data.get("password") or "")
    user = db.get_user_by_email(email)
    if not user:
        return fail("wrong_code")
    if len(password) < 8:
        return fail("weak_password")
    ok, reason = db.check_code(user["id"], clean(data.get("code"), 10), "reset")
    if not ok:
        return fail(reason)
    db.set_password(user["id"], password)
    db.mark_verified(user["id"])          # proving the inbox also proves the email
    db.touch_login(user["id"])
    mailer.send_password_changed(user["email"], user["first_name"])
    return attach_session({"ok": True, "user": public_user(db.get_user(user["id"]))}, user["id"])


@app.post("/api/auth/logout")
def logout():
    token = request.cookies.get(Config.COOKIE_NAME)
    if token:
        db.destroy_session(token)
    response = make_response(jsonify({"ok": True}))
    response.delete_cookie(Config.COOKIE_NAME, path="/")
    return response


@app.get("/api/auth/me")
def me():
    user = current_user()
    if not user:
        return jsonify({"ok": True, "user": None})
    return jsonify({"ok": True, "user": public_user(user), "saved": db.list_saved(user["id"])})


@app.patch("/api/auth/profile")
def update_profile():
    user = require_user()
    data = body()
    fields = {k: v for k, v in profile_from(data).items() if k in data or (k == "grade" and "grade" in data)}
    for key in ("first_name", "last_name"):
        if clean(data.get(key), 60):
            fields[key] = clean(data.get(key), 60)
    db.update_profile(user["id"], **fields)
    return jsonify({"ok": True, "user": public_user(db.get_user(user["id"]))})


# ---------------------------------------------------------------- programmes
LOCKED_FIELDS = ("summary", "about", "highlights", "eligibility", "how_to_apply", "costs", "url", "apply_url", "opens")


def gate_program(program, unlocked):
    if unlocked or not program.get("premium"):
        item = dict(program)
        item["locked"] = False
        return item
    item = {k: v for k, v in program.items() if k not in LOCKED_FIELDS}
    item["locked"] = True
    return item


# What the lists, the globe and the search need. The long texts (about, how to
# apply, eligibility…) load with the single programme, so the list stays light:
# all fields in three languages for 2000 programmes would be ~35 MB.
PROGRAM_CARD = ("id", "section", "family", "type", "org", "name", "country", "city", "iso", "flag", "region",
                "lat", "lon", "cost", "duration", "grades", "deadline", "event_dates", "summary", "keywords",
                "score", "premium", "level", "fields", "coverage", "coverage_pct")


_LIST_CACHE = {}


@app.get("/api/programs")
def api_programs():
    """The whole list, built and gzipped once per catalogue version and access level
    (with ~2,400 programmes, compressing on every request would cost ~0.2 s)."""
    user = current_user()
    catalogue = catalog.programs()
    key = (bool(user), id(catalogue), len(catalogue))
    hit = _LIST_CACHE.get(key)
    if not hit:
        items = []
        for program in catalogue:
            locked = gate_program(program, bool(user))["locked"]
            items.append(dict({k: program[k] for k in PROGRAM_CARD
                               if k in program and not (locked and k in LOCKED_FIELDS)}, locked=locked))
        body = json.dumps({
            "ok": True,
            "programs": items,
            "access": {"authed": bool(user), "locked": sum(1 for i in items if i["locked"])},
        }, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        for stale in [k for k in _LIST_CACHE if k[0] != "unis" and k[1:] != key[1:]]:   # a newer catalogue replaces old copies
            _LIST_CACHE.pop(stale, None)
        hit = _LIST_CACHE[key] = (body, gzip.compress(body, compresslevel=6))
    zipped = "gzip" in request.headers.get("Accept-Encoding", "")
    response = make_response(hit[1] if zipped else hit[0])
    response.mimetype = "application/json"
    if zipped:
        response.headers["Content-Encoding"] = "gzip"
    response.vary.add("Accept-Encoding")
    return response


@app.get("/api/programs/<program_id>")
def api_program(program_id):
    user = current_user()
    program = catalog.find_program(program_id)
    if program:
        return jsonify({"ok": True, "program": gate_program(program, bool(user))})
    if any(p["id"] == program_id for p in catalog.archived()):
        return fail("closed", 410)
    return fail("not_found", 404)


# ---------------------------------------------------------------- universities
UNI_CARD = ("id", "name", "country", "city", "iso", "flag", "region", "lat", "lon", "type", "rank_qs", "tier",
            "platform", "deadline", "tuition_intl", "acceptance_rate", "languages", "summary", "keywords", "aid_intl",
            "sat", "act", "ielts_min", "toefl_min", "duolingo_min", "logo", "students", "intl_pct", "website",
            "fields", "qualifications", "english_bachelors")
BASIC_CARD = ("id", "name", "country", "city", "iso", "flag", "region", "rank_qs", "tier", "website")


LOGO_DIR = os.path.join(FRONTEND_DIR, "img", "unis")
LOGOS = set(name[:-4] for name in os.listdir(LOGO_DIR)) if os.path.isdir(LOGO_DIR) else set()


def logo_for(u):
    """Our own downloaded copy (tools/fetch_logos.py) first, else the profile's link."""
    return "/img/unis/%s.png" % u["id"] if u.get("id") in LOGOS else u.get("logo")


OTHER_TESTS = ("GMAT", "GRE", "LSAT", "MCAT", "UCAT", "GAMSAT", "LNAT", "TMUA", "ESAT", "TSA", "STEP", "MAT",
               "PAT", "HAT", "BMAT", "TestDaF", "DSH", "DELF", "DALF", "TCF", "DELE",
               "HSK", "JLPT", "TOPIK", "YÖS", "Qudurat", "Tahsili", "EmSAT")


def other_tests(u):
    """Admission tests beyond SAT/ACT and English that a university names:
    the researched list when there is one, else the names found in its test notes."""
    if u.get("other_tests"):
        return [str(x) for x in u["other_tests"]]
    text = " ".join(str((u.get(k) or {}).get("en", "")) if isinstance(u.get(k), dict) else str(u.get(k) or "")
                    for k in ("tests", "gpa_note"))
    found = []
    for name in OTHER_TESTS:
        if re.search(r"(?<![A-Za-z])%s(?![A-Za-z])" % re.escape(name), text) and name not in found:
            found.append(name)
    return found


def study_text(u):
    """What a university is known for, in English, for the "major" filter."""
    parts = []
    for key in ("strengths", "top_programs"):
        value = u.get(key)
        value = value.get("en") if isinstance(value, dict) else value
        if isinstance(value, list):
            parts.extend(str(v) for v in value)
        elif value:
            parts.append(str(value))
    return " ".join(parts)[:600]


@app.get("/api/universities")
def api_universities():
    """The whole catalogue in one response: full profiles carry the admission
    data the filters use; basic QS entries carry just enough for a card."""
    full, rest = catalog.directory()
    key = ("unis", id(full), len(full), id(rest), len(rest))
    hit = _LIST_CACHE.get(key)
    if not hit:
        cards = [dict({k: u.get(k) for k in UNI_CARD}, profile="full", logo=logo_for(u),
                      scholarships=len(u.get("scholarships") or []), study=study_text(u)) for u in full]
        cards += [dict({k: u.get(k) for k in BASIC_CARD}, profile="basic", logo=logo_for(u))
                  for u in rest if isinstance(u.get("name"), dict)]
        body = json.dumps({
            "ok": True,
            "universities": cards,
            "full_count": len(full),
            "directory_count": len(rest),
        }, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        for stale in [k for k in _LIST_CACHE if k[0] == "unis"]:
            _LIST_CACHE.pop(stale, None)
        hit = _LIST_CACHE[key] = (body, gzip.compress(body, compresslevel=6))
    zipped = "gzip" in request.headers.get("Accept-Encoding", "")
    response = make_response(hit[1] if zipped else hit[0])
    response.mimetype = "application/json"
    if zipped:
        response.headers["Content-Encoding"] = "gzip"
    response.vary.add("Accept-Encoding")
    return response


@app.get("/api/universities/directory")
def api_university_directory():
    """The basic list (name, country, website), searchable — kept for old links."""
    _full, rest = catalog.directory()
    q = clean(request.args.get("q"), 80).lower()
    iso = clean(request.args.get("country"), 4).upper()
    def name(d):
        return (d["name"].get("en") if isinstance(d["name"], dict) else d["name"]) or ""
    hits = [d for d in rest if (not iso or d.get("iso") == iso) and (not q or q in name(d).lower())]
    page = max(0, int(request.args.get("page") or 0))
    return jsonify({"ok": True, "total": len(hits), "items": hits[page * 60:(page + 1) * 60]})


@app.get("/api/universities/<uni_id>")
def api_university(uni_id):
    uni = catalog.find_university(uni_id)
    if not uni:
        return fail("not_found", 404)
    return jsonify({"ok": True, "university": dict(uni, logo=logo_for(uni), other_tests=other_tests(uni))})


# ---------------------------------------------------------------- research
@app.get("/api/research")
def api_research():
    """The cited research behind Meridian, plus live counts from our own data."""
    programs = catalog.programs()
    tutors = db.list_tutors()
    return jsonify({
        "ok": True,
        "research": content("research"),
        "live": {
            "programs": len(programs),
            "countries": len({p["iso"] for p in programs}),
            "verified": sum(1 for p in programs if p.get("verified_at") or p.get("found_by")),
            "families": len({p["family"] for p in programs}),
            "scholarships": sum(1 for p in programs if p.get("section") == "scholarship"),
            "projects": sum(1 for p in programs if p.get("section") != "scholarship"),
            "universities": sum(len(part) for part in catalog.directory()),
            "tutors": sum(1 for t in tutors if t.get("user_id")),
        },
    })


# ---------------------------------------------------------------- tutors
def first_sentence(text):
    text = (text or "").strip()
    match = re.match(r"(.+?[.!?])(\s|$)", text)
    return (match.group(1) if match else text)[:220]


def localized(value):
    if isinstance(value, dict):
        return value
    return {"en": value or "", "ka": value or ""}


def tutor_card(tutor, locked):
    bio = localized(tutor.get("bio"))
    intro = tutor.get("intro") or {k: first_sentence(v) for k, v in bio.items()}
    base = payments.to_minor(tutor.get("price") or 0)
    card = {
        "id": tutor["id"],
        "initials": tutor.get("initials") or "".join(w[:1] for w in localized(tutor.get("name"))["en"].split()[:2]).upper(),
        "photo": tutor.get("photo"),
        "flag": tutor.get("flag", ""),
        "iso": tutor.get("iso"),
        "verified": bool(tutor.get("user_id")) and tutor.get("status") == "approved",
        "name": localized(tutor.get("name")),
        "headline": localized(tutor.get("headline")),
        "country": localized(tutor.get("country")),
        "city": localized(tutor.get("city")),
        "subjects": tutor.get("subjects", []),
        "regions": tutor.get("regions", []),
        "languages": tutor.get("languages", []),
        # Seeded demo tutors (no Meridian account behind them) are labelled as samples,
        # and their illustrative ratings are never shown as if they were real reviews.
        "sample": not tutor.get("user_id"),
        "rating": None if not tutor.get("user_id") else tutor.get("rating"),
        "reviews": 0 if not tutor.get("user_id") else tutor.get("reviews", 0),
        "experience": tutor.get("experience", 0),
        "students": 0 if not tutor.get("user_id") else tutor.get("students", 0),
        "price": base / 100,
        "price_display": payments.student_price(base) / 100,
        "intro": localized(intro) if not locked else None,
        "bio": bio if not locked else None,
        "locked": locked,
    }
    return card


@app.get("/api/teachers")
def api_teachers():
    user = current_user()
    tutors = db.list_tutors()
    limit = Config.FREE_TEACHER_LIMIT
    items = [tutor_card(t, locked=(not user and index >= limit)) for index, t in enumerate(tutors)]
    return jsonify({
        "ok": True,
        "teachers": items,
        "fee_rate": payments.PLATFORM_FEE_RATE,
        "access": {"authed": bool(user), "plan": user["plan"] if user else None,
                   "free_limit": limit, "locked": sum(1 for i in items if i["locked"])},
    })


def services_for(tutor):
    services = tutor.get("services") or [{
        "name": {"en": "1:1 lesson", "ka": "ინდივიდუალური გაკვეთილი"},
        "price": tutor.get("price") or 0, "unit": {"en": "60 min", "ka": "60 წთ"},
    }]
    out = []
    for index, service in enumerate(services):
        q = payments.quote(payments.to_minor(service.get("price") or 0))
        out.append({
            "index": index, "name": localized(service.get("name")), "unit": localized(service.get("unit")),
            "price": q["base_minor"] / 100, "price_display": q["total_minor"] / 100, "fee": q["fee_minor"] / 100,
        })
    return out


@app.get("/api/teachers/<teacher_id>")
def api_teacher(teacher_id):
    user = current_user()
    tutor = db.get_tutor(teacher_id)
    if not tutor or tutor["status"] != "approved":
        return fail("not_found", 404)
    if not user:
        return jsonify({"ok": True, "teacher": tutor_card(tutor, locked=True), "access": {"authed": False}})
    full = dict(tutor)
    full.update(tutor_card(tutor, locked=False))
    full["services"] = services_for(tutor)
    full["education"] = tutor.get("education", [])
    full["track"] = tutor.get("track", [])
    windows = db.taken_windows(teacher_id)
    full["slots"] = [
        {"id": s["id"], "starts_at": s["starts_at"], "duration": s["duration_min"],
         "available": s["status"] == "open" and not db.overlaps(s["starts_at"], s["duration_min"], windows)}
        for s in db.list_slots(teacher_id)
    ]
    full.pop("contact_email", None)
    return jsonify({"ok": True, "teacher": full, "fee_rate": payments.PLATFORM_FEE_RATE,
                    "access": {"authed": True}})


# ---------------------------------------------------------------- bookings
@app.post("/api/bookings")
def api_create_booking():
    """Holds the slot for 15 minutes and creates an order to pay."""
    user = require_user()
    data = body()
    tutor = db.get_tutor(clean(data.get("teacher_id"), 80))
    if not tutor or tutor["status"] != "approved":
        return fail("unknown_teacher", 404)
    if tutor.get("user_id") and tutor["user_id"] == user["id"]:
        return fail("own_profile")

    try:
        slot_id = int(data.get("slot_id"))
        service_index = int(data.get("service_index") or 0)
    except (TypeError, ValueError):
        return fail("invalid_slot")
    services = services_for(tutor)
    if not 0 <= service_index < len(services):
        return fail("invalid_service")
    service = services[service_index]

    ok, slot = db.hold_slot(slot_id, tutor["id"])
    if not ok:
        return fail("slot_taken", 409)

    base = payments.to_minor(service["price"])
    fee = payments.fee_for(base)
    date_s, time_s = slot["starts_at"].split(" ")
    tutor_name = localized(tutor.get("name"))["en"]
    service_name = service["name"]["en"]
    order_id = db.create_order(
        user["id"], "lesson", "%s — %s" % (service_name, tutor_name), base, fee,
        meta={"tutor_id": tutor["id"], "slot_id": slot_id, "starts_at": slot["starts_at"],
              "service": service_name, "tutor_name": tutor_name},
    )
    booking_id = db.create_booking(
        user["id"], tutor["id"], service_name, date_s, time_s, clean(data.get("note"), 1200),
        slot_id=slot_id, base_minor=base, fee_minor=fee, total_minor=base + fee,
        order_id=order_id, status="pending_payment",
    )
    order = db.get_order(order_id)
    order["meta"]["booking_id"] = booking_id
    conn = db.connect()
    with conn:
        conn.execute("UPDATE orders SET meta = ? WHERE id = ?", (json.dumps(order["meta"]), order_id))
    conn.close()
    return jsonify({"ok": True, "order_id": order_id, "booking_id": booking_id})


@app.get("/api/bookings")
def api_list_bookings():
    user = require_user()
    tutors = {t["id"]: t for t in db.list_tutors(include_pending=True)}
    rows = db.list_bookings(user["id"])
    for row in rows:
        tutor = tutors.get(row["teacher_id"])
        row["teacher"] = {
            "name": localized(tutor.get("name")) if tutor else {"en": row["teacher_id"], "ka": row["teacher_id"]},
            "initials": (tutor or {}).get("initials", "?"),
            "photo": (tutor or {}).get("photo"),
        }
    return jsonify({"ok": True, "bookings": rows})


# ---------------------------------------------------------------- pricing & checkout
@app.get("/api/pricing")
def api_pricing():
    return jsonify({"ok": True, "plans": payments.PLANS, "fee_rate": payments.PLATFORM_FEE_RATE,
                    "currency": payments.CURRENCY, "provider": payments.PROVIDER})


@app.post("/api/checkout/plan")
def api_checkout_plan():
    user = require_user()
    data = body()
    plan = clean(data.get("plan"), 20)
    cycle = "yearly" if data.get("cycle") == "yearly" else "monthly"
    if plan not in payments.PLANS:
        return fail("unknown_plan")
    if plan == "free":
        db.set_plan(user["id"], "free")
        return jsonify({"ok": True, "plan": "free"})
    price = payments.PLANS[plan][cycle]
    label = "%s membership (%s)" % (plan.capitalize(), cycle)
    order_id = db.create_order(user["id"], "plan", label, price, 0, meta={"plan": plan, "cycle": cycle})
    return jsonify({"ok": True, "order_id": order_id})


def order_view(order):
    view = {k: order[k] for k in ("id", "kind", "description", "currency", "base_minor", "fee_minor",
                                  "total_minor", "status", "method_detail", "created_at", "paid_at")}
    view["meta"] = order["meta"]
    view["fee_rate"] = payments.PLATFORM_FEE_RATE
    view["provider"] = payments.PROVIDER
    if order["kind"] == "lesson":
        tutor = db.get_tutor(order["meta"].get("tutor_id"))
        if tutor:
            view["tutor"] = {"id": tutor["id"], "name": localized(tutor.get("name")),
                             "initials": tutor.get("initials"), "photo": tutor.get("photo"),
                             "headline": localized(tutor.get("headline"))}
    return view


@app.get("/api/orders/<order_id>")
def api_order(order_id):
    user = require_user()
    order = db.get_order(order_id)
    if not order or order["user_id"] != user["id"]:
        return fail("not_found", 404)
    if order["status"] == "pending" and order["kind"] == "lesson":
        slot_alive = any(s["id"] == order["meta"].get("slot_id") for s in db.list_slots(order["meta"]["tutor_id"]))
        booking = db.get_booking(order["meta"].get("booking_id") or 0)
        if not slot_alive or (booking and booking["status"] != "pending_payment"):
            return fail("order_expired", 410)
    return jsonify({"ok": True, "order": order_view(order)})


@app.get("/api/orders")
def api_orders():
    user = require_user()
    return jsonify({"ok": True, "orders": db.list_orders(user["id"])})


@app.post("/api/orders/<order_id>/pay")
def api_pay(order_id):
    user = require_user()
    order = db.get_order(order_id)
    if not order or order["user_id"] != user["id"]:
        return fail("not_found", 404)
    if order["status"] != "pending":
        return fail("already_paid", 409)

    if order["kind"] == "lesson":
        conn = db.connect()
        slot = conn.execute("SELECT * FROM tutor_slots WHERE id = ?", (order["meta"]["slot_id"],)).fetchone()
        conn.close()
        if not slot or slot["status"] != "held" or db.is_past(slot["held_until"] or ""):
            return fail("hold_expired", 410)

    data = body()
    try:
        provider, ref, detail = payments.charge(order, clean(data.get("method"), 20), data.get("card") or {})
    except payments.PaymentError as error:
        return fail(error.code, 402)

    db.mark_order_paid(order_id, data.get("method"), detail, provider, ref, payments.splits_for(order))
    order = db.get_order(order_id)

    if order["kind"] == "lesson":
        meta = order["meta"]
        db.set_booking_status(meta["booking_id"], "confirmed")
        tutor = db.get_tutor(meta["tutor_id"])
        when = meta["starts_at"]
        mailer.send_booking_confirmed(user["email"], user["first_name"], meta["tutor_name"], when, meta["service"])
        tutor_email = (tutor or {}).get("contact_email")
        if not tutor_email and tutor and tutor.get("user_id"):
            tutor_user = db.get_user(tutor["user_id"])
            tutor_email = tutor_user["email"] if tutor_user else None
        if tutor_email:
            booking = db.get_booking(meta["booking_id"])
            mailer.send_tutor_new_booking(
                tutor_email, localized(tutor.get("name"))["en"].split(" ")[0],
                "%s %s" % (user["first_name"], user["last_name"]), when, meta["service"],
                booking.get("note") if booking else "", money(order["base_minor"]))
    else:
        db.set_plan(user["id"], order["meta"]["plan"], order["meta"]["cycle"],
                    payments.renewal_date(order["meta"]["cycle"]))

    mailer.send_receipt(user["email"], user["first_name"], order, money)
    return jsonify({"ok": True, "order": order_view(order)})


# ---------------------------------------------------------------- tutor accounts
def slugify(text):
    base = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-") or "tutor"
    return "%s-%s" % (base[:40], secrets.token_hex(2))


def save_photo(tutor_id, upload):
    """Normalise to a 640px square JPEG and drop all metadata (location, device)."""
    if not upload or not upload.filename:
        return None
    raw = upload.read()
    if len(raw) > 6 * 1024 * 1024:
        raise ValueError("photo_too_large")
    try:
        from PIL import Image, ImageOps
        image = Image.open(io.BytesIO(raw))
        image = ImageOps.exif_transpose(image).convert("RGB")
        side = min(image.size)
        left = (image.width - side) // 2
        top = (image.height - side) // 3          # bias upward: faces sit high in portraits
        image = image.crop((left, top, left + side, top + side)).resize((640, 640), Image.LANCZOS)
    except Exception:
        raise ValueError("photo_invalid")
    os.makedirs(os.path.join(UPLOAD_DIR, "tutors"), exist_ok=True)
    name = "tutors/%s-%s.jpg" % (tutor_id, secrets.token_hex(3))
    image.save(os.path.join(UPLOAD_DIR, name), "JPEG", quality=86, optimize=True, progressive=True)
    return "/uploads/" + name


def tutor_profile_from(form, user, existing=None):
    profile = dict(existing or {})
    text = lambda key, limit=400: clean(form.get(key), limit)
    name = "%s %s" % (user["first_name"], user["last_name"])
    profile.update({
        "name": {"en": name, "ka": text("name_ka", 80) or name},
        "initials": (user["first_name"][:1] + user["last_name"][:1]).upper(),
        "headline": localized(text("headline", 90)),
        "intro": localized(text("intro", 280)),
        "bio": localized(text("bio", 2400)),
        "country": localized(text("country_name", 60)),
        "iso": text("country", 2).upper(),
        "city": localized(text("city", 60)),
        "subjects": split_list(form.get("subjects"), 10),
        "regions": split_list(form.get("regions"), 6),
        "languages": split_list(form.get("languages"), 8),
        "experience": int(text("experience", 3) or 0) if text("experience", 3).isdigit() else 0,
        "contact_email": user["email"],
    })
    iso = profile["iso"]
    if len(iso) == 2 and iso.isalpha():
        profile["flag"] = "".join(chr(0x1F1E6 + ord(c) - 65) for c in iso)
    try:
        price = float(text("price", 8) or 0)
    except ValueError:
        price = 0
    profile["price"] = max(0, min(price, 2000))
    education = []
    for line in str(form.get("education") or "").splitlines()[:6]:
        parts = [p.strip() for p in line.split("|")]
        if parts and parts[0]:
            education.append({"school": parts[0][:80], "degree": localized((parts[1] if len(parts) > 1 else "")[:80]),
                              "years": (parts[2] if len(parts) > 2 else "")[:20]})
    if education or "education" in form:
        profile["education"] = education
    profile.setdefault("services", [{
        "name": {"en": "1:1 lesson", "ka": "ინდივიდუალური გაკვეთილი"},
        "price": profile["price"], "unit": {"en": "60 min", "ka": "60 წთ"},
    }])
    profile["services"][0]["price"] = profile["price"]
    profile.setdefault("reviews", 0)
    profile.setdefault("students", 0)
    return profile


@app.post("/api/tutor/apply")
def api_tutor_apply():
    user = require_user()
    existing = db.tutor_for_user(user["id"])
    if existing and existing["status"] in ("pending", "approved"):
        return fail("already_applied", 409, status=existing["status"])
    form = request.form
    if not clean(form.get("headline")) or not clean(form.get("intro")) or not split_list(form.get("subjects")):
        return fail("missing_fields")
    tutor_id = slugify("%s %s" % (user["first_name"], user["last_name"]))
    try:
        photo = save_photo(tutor_id, request.files.get("photo"))
    except ValueError as error:
        return fail(str(error))
    if not photo:
        return fail("photo_required")
    profile = tutor_profile_from(form, user)
    db.save_tutor(tutor_id, profile, user_id=user["id"], status="pending", photo=photo)
    mailer.send_tutor_application("%s %s" % (user["first_name"], user["last_name"]),
                                  user["email"], profile["headline"]["en"])
    return jsonify({"ok": True, "tutor_id": tutor_id, "status": "pending"})


def require_tutor():
    user = require_user()
    tutor = db.tutor_for_user(user["id"])
    if not tutor:
        abort(make_response(jsonify({"ok": False, "error": "not_a_tutor"}), 403))
    return user, tutor


@app.get("/api/tutor/me")
def api_tutor_me():
    user, tutor = require_tutor()
    bookings = db.tutor_bookings(tutor["id"])
    for b in bookings:
        b["student"] = {"name": "%s %s" % (b.pop("first_name"), b.pop("last_name")),
                        "email": b.pop("email"), "phone": b.pop("phone"), "grade": b.pop("grade")}
    profile = dict(tutor)
    profile["services"] = services_for(tutor)
    return jsonify({
        "ok": True,
        "tutor": profile,
        "slots": db.list_slots(tutor["id"], include_closed=True),
        "bookings": bookings,
        "earnings": db.tutor_earnings(tutor["id"]),
        "fee_rate": payments.PLATFORM_FEE_RATE,
    })


@app.patch("/api/tutor/me")
def api_tutor_update():
    user, tutor = require_tutor()
    profile = tutor_profile_from(body(), user, existing=tutor)
    db.save_tutor(tutor["id"], profile)
    return jsonify({"ok": True})


@app.post("/api/tutor/photo")
def api_tutor_photo():
    user, tutor = require_tutor()
    try:
        photo = save_photo(tutor["id"], request.files.get("photo"))
    except ValueError as error:
        return fail(str(error))
    if not photo:
        return fail("photo_required")
    db.set_tutor_photo(tutor["id"], photo)
    return jsonify({"ok": True, "photo": photo})


@app.post("/api/tutor/slots")
def api_tutor_slots():
    """{"open": true, "slots": ["2026-11-02 16:00", ...]}"""
    user, tutor = require_tutor()
    data = body()
    want_open = bool(data.get("open"))
    results = {}
    floor = db.datetime.now().strftime("%Y-%m-%d %H:%M")
    for starts_at in (data.get("slots") or [])[:200]:
        starts_at = clean(starts_at, 16)
        if not SLOT_RE.match(starts_at) or starts_at < floor:
            results[starts_at] = "invalid"
            continue
        ok, state = db.set_slot(tutor["id"], starts_at, want_open)
        results[starts_at] = state
    return jsonify({"ok": True, "results": results, "slots": db.list_slots(tutor["id"], include_closed=True)})


@app.post("/api/tutor/bookings/<int:booking_id>/cancel")
def api_tutor_cancel(booking_id):
    user, tutor = require_tutor()
    booking = db.get_booking(booking_id)
    if not booking or booking["teacher_id"] != tutor["id"] or booking["status"] != "confirmed":
        return fail("not_found", 404)
    db.set_booking_status(booking_id, "cancelled", clean(body().get("reason"), 400))
    if booking.get("order_id"):
        db.refund_order(booking["order_id"])
    student = db.get_user(booking["user_id"])
    if student:
        mailer.send_booking_cancelled(student["email"], student["first_name"],
                                      localized(tutor.get("name"))["en"], "%s %s" % (booking["date"], booking["time"]))
    return jsonify({"ok": True})


# ---------------------------------------------------------------- saved & engage
@app.post("/api/saved")
def api_saved():
    user = require_user()
    program_id = clean(body().get("program_id"), 120)
    if not catalog.find_program(program_id) and not catalog.find_university(program_id):
        return fail("not_found", 404)
    saved = db.toggle_saved(user["id"], program_id)
    return jsonify({"ok": True, "saved": saved, "all": db.list_saved(user["id"])})


@app.get("/api/saved/universities")
def api_saved_universities():
    user = require_user()
    out = []
    for item_id in db.list_saved(user["id"]):
        u = catalog.find_university(item_id)
        if u and isinstance(u.get("name"), dict):
            out.append({k: u.get(k) for k in ("id", "name", "flag", "city", "country", "deadline", "rank_qs", "logo")})
    return jsonify({"ok": True, "universities": out})


@app.get("/api/saved/universities.xlsx")
def api_saved_universities_xlsx():
    """The student's saved universities as one tidy Excel sheet."""
    user = require_user()
    lang = clean(request.args.get("lang"), 2) or "en"

    def t(value):
        if isinstance(value, dict):
            return value.get(lang) or value.get("en") or ""
        if isinstance(value, list):
            return ", ".join(str(v) for v in value)
        return value or ""

    def span(r):
        return "%s–%s" % (r["low"], r["high"]) if isinstance(r, dict) and r.get("low") and r.get("high") else ""

    rows = []
    for item_id in db.list_saved(user["id"]):
        u = catalog.find_university(item_id)
        if not u:
            continue
        tuition = u.get("tuition_intl") or {}
        rate = assistant.USD_RATES.get((tuition.get("currency") or "USD").upper())
        tuition_text = ""
        if isinstance(tuition.get("amount"), (int, float)):
            per = tuition.get("per") or "year"
            yearly = tuition["amount"] * (2 if per == "semester" else 1)
            if rate:
                tuition_text = "$%s / year" % "{:,}".format(int(round(yearly * rate, -2)))
                if (tuition.get("currency") or "USD").upper() != "USD":
                    tuition_text += "\n(%s %s / %s)" % ("{:,}".format(tuition["amount"]), tuition.get("currency", ""), per)
            else:
                tuition_text = "%s %s / %s" % ("{:,}".format(tuition["amount"]), tuition.get("currency", ""), per)
        english = " · ".join(x for x in [
            "IELTS %s" % u["ielts_min"] if u.get("ielts_min") else "",
            "TOEFL %s" % u["toefl_min"] if u.get("toefl_min") else "",
            "Duolingo %s" % u["duolingo_min"] if u.get("duolingo_min") else ""] if x)
        sat = span(u.get("sat"))
        if isinstance(u.get("sat"), dict) and u["sat"].get("required") in ("optional", "not-considered"):
            sat = (sat + " " if sat else "") + "(%s)" % u["sat"]["required"].replace("-", " ")
        schol = "\n".join("%s%s%s" % (sc.get("name", ""), " (%s)" % sc["coverage"] if sc.get("coverage") else "",
                                        " — " + sc["url"] if sc.get("url") else "")
                           for sc in (u.get("scholarships") or []) if isinstance(sc, dict))
        reqs = "\n".join("• " + t(r.get("label")) for r in (u.get("requirements") or []) if isinstance(r, dict))
        deadline = u.get("deadline") or ""
        if u.get("deadline_note"):
            deadline = (deadline + "\n" if deadline else "") + u["deadline_note"]
        rows.append(([
            t(u.get("name")),
            u.get("rank_label") or u.get("rank_qs") or "",
            sat, span(u.get("act")), english, deadline,
            t(u.get("top_programs")) or t(u.get("strengths")),
            ", ".join(x for x in [u.get("city") or "", t(u.get("country"))] if x),
            ", ".join(other_tests(u)),
            reqs or t(u.get("tests")),
            tuition_text,
            t(u.get("aid_intl")),
            schol,
            "%d%%" % round(u["acceptance_rate"] * 100) if u.get("acceptance_rate") else "",
            u.get("platform") or "",
            ("link", u.get("application_url") or u.get("website"), "Official site") if (u.get("application_url") or u.get("website")) else "",
            ("link", (os.environ.get("MERIDIAN_PUBLIC_URL") or request.host_url).rstrip("/") + "/universities/" + u["id"], "Meridian page"),
        ], t(u.get("country")) or "—"))
    def rank_key(row):
        head = str(row[1]).lstrip("=").split("-")[0]
        return int(head) if head.isdigit() else 99999

    # countries with five or more saved universities get their own section
    by_country = {}
    for row, country in rows:
        by_country.setdefault(country, []).append(row)
    big = sorted((c for c in by_country if len(by_country[c]) >= 5), key=lambda c: (-len(by_country[c]), c))
    rest = sorted((r for c in by_country if c not in big for r in by_country[c]), key=rank_key)
    sheet_rows = []
    for country in big:
        sheet_rows.append(("group", "%s (%d)" % (country, len(by_country[country]))))
        sheet_rows.extend(sorted(by_country[country], key=rank_key))
    if rest:
        if big:
            sheet_rows.append(("group", "%s (%d)" % ({"ka": "სხვა ქვეყნები", "ar": "دول أخرى"}.get(lang, "Other countries"), len(rest))))
        sheet_rows.extend(rest)
    header = ["University", "QS ranking", "SAT (middle 50%)", "ACT (middle 50%)", "English test minimums",
              "Application deadline", "Best-known programmes", "City / country", "Other required tests", "Requirements",
              "Tuition per year (USD)", "Financial aid", "Scholarships (links)", "Acceptance rate",
              "Apply through", "Official website", "Meridian"]
    widths = [34, 11, 16, 14, 26, 30, 34, 24, 20, 44, 22, 40, 48, 12, 16, 16, 16]
    data = xlsx.write_sheet("My universities", header, sheet_rows, widths)
    response = make_response(data)
    response.headers["Content-Type"] = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    response.headers["Content-Disposition"] = 'attachment; filename="meridian-universities.xlsx"'
    response.headers["Cache-Control"] = "no-store"
    return response


@app.post("/api/engage")
def api_engage():
    data = body()
    company = clean(data.get("company"), 140)
    name = clean(data.get("name"), 120)
    email = clean(data.get("email"), 160)
    kind = clean(data.get("kind"), 60)
    message = clean(data.get("message"), 4000)
    if not company or not name or not message:
        return fail("missing_fields")
    if not EMAIL_RE.match(email):
        return fail("invalid_email")
    db.create_inquiry(company, name, email, kind, message)
    delivered = mailer.send_partnership_inquiry(company, name, email, kind, message)
    return jsonify({"ok": True, "delivered": delivered, "inbox": Config.TEAM_INBOX})


# ---------------------------------------------------------------- admin
def admin_ok():
    token = request.args.get("token") or request.headers.get("X-Admin-Token", "")
    return token and secrets.compare_digest(token, Config.ADMIN_TOKEN)


@app.get("/api/admin/overview")
def api_admin():
    if not admin_ok():
        return fail("forbidden", 403)
    snapshot = db.admin_snapshot()
    snapshot["mail"] = {"configured": Config.smtp_configured(), "last_error": mailer.last_error}
    return jsonify({"ok": True, "data": snapshot})


# ---------------------------------------------------------------- discoveries
DISCOVERY_DIR = os.path.join(DATA_DIR, "discoveries")
DECISIONS = os.path.join(DISCOVERY_DIR, "decisions.json")


def load_decisions():
    try:
        with open(DECISIONS, encoding="utf-8") as fh:
            return json.load(fh)
    except (OSError, ValueError):
        return {}


def pending_discoveries():
    """Every record an agent run found that no person has approved or rejected yet."""
    decided = load_decisions()
    known = {p["id"] for p in catalog.programs()} | {p["id"] for p in catalog.archived()}
    out = []
    if not os.path.isdir(DISCOVERY_DIR):
        return out
    for name in sorted(os.listdir(DISCOVERY_DIR), reverse=True):
        if not name.endswith(".json") or name == "decisions.json":
            continue
        with open(os.path.join(DISCOVERY_DIR, name), encoding="utf-8") as fh:
            run = json.load(fh)
        for record in run.get("records", []):
            if record["id"] in decided or record["id"] in known:
                continue
            record = dict(record)
            record["run"] = run.get("run", name[:-5])
            out.append(record)
    return out


@app.get("/api/admin/discoveries")
def api_admin_discoveries():
    if not admin_ok():
        return fail("forbidden", 403)
    return jsonify({"ok": True, "pending": pending_discoveries(), "decided": len(load_decisions())})


@app.post("/api/admin/discoveries/<record_id>/<action>")
def api_admin_discovery_decide(record_id, action):
    if not admin_ok() or action not in ("approve", "reject"):
        return fail("forbidden", 403)
    record = next((r for r in pending_discoveries() if r["id"] == record_id), None)
    if not record:
        return fail("not_found", 404)
    if action == "approve":
        clean_record = {k: v for k, v in record.items() if k != "run"}
        if catalog.is_expired(clean_record):
            return fail("expired", 400)
        catalog.add_programs([clean_record], record.get("found_by") or record["run"])
    decisions = load_decisions()
    decisions[record_id] = {"action": action, "at": db.now()}
    os.makedirs(DISCOVERY_DIR, exist_ok=True)
    with open(DECISIONS, "w", encoding="utf-8") as fh:
        json.dump(decisions, fh, indent=1)
    return jsonify({"ok": True})


@app.get("/api/admin/tutors/<tutor_id>")
def api_admin_tutor_detail(tutor_id):
    """The full application, exactly as the tutor submitted it."""
    if not admin_ok():
        return fail("forbidden", 403)
    tutor = db.get_tutor(tutor_id)
    if not tutor:
        return fail("not_found", 404)
    owner = db.get_user(tutor["user_id"]) if tutor.get("user_id") else None
    conn = db.connect()
    row = conn.execute("SELECT created_at, updated_at FROM tutors WHERE id = ?", (tutor_id,)).fetchone()
    conn.close()
    tutor["submitted_at"] = row["created_at"] if row else None
    tutor["account"] = {"name": "%s %s" % (owner["first_name"], owner["last_name"]), "email": owner["email"],
                        "phone": owner["phone"], "joined": owner["created_at"]} if owner else None
    return jsonify({"ok": True, "tutor": tutor})


@app.post("/api/admin/tutors/<tutor_id>/<action>")
def api_admin_tutor(tutor_id, action):
    if not admin_ok():
        return fail("forbidden", 403)
    tutor = db.get_tutor(tutor_id)
    if not tutor or action not in ("approve", "reject"):
        return fail("not_found", 404)
    db.set_tutor_status(tutor_id, "approved" if action == "approve" else "rejected")
    if action == "approve":
        # open a sensible default week so the profile is bookable on day one;
        # the tutor edits it from their dashboard
        if not db.list_slots(tutor_id):
            db.open_weekly(tutor_id, {"1": ["17:00", "18:30"], "3": ["17:00", "18:30"], "6": ["11:00", "12:30"]}, weeks=3)
        if tutor.get("user_id"):
            owner = db.get_user(tutor["user_id"])
            if owner:
                mailer.send_tutor_approved(owner["email"], owner["first_name"])
    return jsonify({"ok": True})


# ---------------------------------------------------------------- errors & headers
@app.errorhandler(404)
def not_found(_error):
    if request.path.startswith("/api/"):
        return fail("not_found", 404)
    return send_from_directory(FRONTEND_DIR, "404.html"), 404


@app.errorhandler(413)
def too_large(_error):
    return fail("photo_too_large", 413)


@app.after_request
def compress(response):
    """gzip JSON and text answers (the programme and university lists shrink ~8x)."""
    if (response.direct_passthrough or response.status_code != 200 or "Content-Encoding" in response.headers
            or "gzip" not in request.headers.get("Accept-Encoding", "")
            or not (response.mimetype or "").startswith(("application/json", "text/"))):
        return response
    data = response.get_data()
    if len(data) < 1400:
        return response
    response.set_data(gzip.compress(data, compresslevel=5))
    response.headers["Content-Encoding"] = "gzip"
    response.headers["Content-Length"] = str(len(response.get_data()))
    response.vary.add("Accept-Encoding")
    return response


@app.after_request
def security_headers(response):
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
    if request.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
    return response


def create_app():
    db.init_db()
    return app
