"""SQLite storage layer.

Every row a visitor creates lands in one file: backend/meridian.db

    users                  accounts (students, tutors, admins)
    verification_codes     hashed 6-digit codes for sign-up and password reset
    sessions               login tokens
    tutors                 tutor profiles (seeded from data/teachers.json, then live)
    tutor_slots            the exact times each tutor has opened for booking
    bookings               a student's lesson on a tutor's slot
    orders                 anything a student pays for: a lesson or a membership
    ledger                 money movements per order: tutor payout, platform fee
    saved_programs         programmes a student saved
    partnership_inquiries  messages from the Engage page
    applications           a student's tracked applications (projects, scholarships, universities)
    application_files      documents uploaded against an application checklist
    events                 anonymous-by-default activity for the weekly report
    reports                generated weekly reports

Money is stored in minor units (tetri / cents) as integers, never floats.
Read it with `python3 tools/admin.py`, the /admin page, or any SQLite browser.
"""
import os
import json
import sqlite3
import secrets
import hashlib
import binascii
from datetime import datetime, timedelta, date

from config import Config, DATA_DIR

SCHEMA = """
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name    TEXT    NOT NULL,
    last_name     TEXT    NOT NULL,
    email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    phone         TEXT,
    password_hash TEXT    NOT NULL,
    verified      INTEGER NOT NULL DEFAULT 0,
    plan          TEXT    NOT NULL DEFAULT 'free',
    locale        TEXT    NOT NULL DEFAULT 'en',
    grade         TEXT,
    created_at    TEXT    NOT NULL,
    last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS verification_codes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash  TEXT    NOT NULL,
    purpose    TEXT    NOT NULL DEFAULT 'signup',
    attempts   INTEGER NOT NULL DEFAULT 0,
    consumed   INTEGER NOT NULL DEFAULT 0,
    expires_at TEXT    NOT NULL,
    created_at TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_agent TEXT,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tutors (
    id           TEXT PRIMARY KEY,
    user_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status       TEXT    NOT NULL DEFAULT 'approved',
    profile      TEXT    NOT NULL,
    photo        TEXT,
    created_at   TEXT    NOT NULL,
    updated_at   TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS tutor_slots (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    tutor_id     TEXT    NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
    starts_at    TEXT    NOT NULL,
    duration_min INTEGER NOT NULL DEFAULT 60,
    status       TEXT    NOT NULL DEFAULT 'open',
    held_until   TEXT,
    UNIQUE (tutor_id, starts_at)
);

CREATE TABLE IF NOT EXISTS bookings (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    teacher_id  TEXT    NOT NULL,
    service     TEXT,
    date        TEXT    NOT NULL,
    time        TEXT    NOT NULL,
    note        TEXT,
    status      TEXT    NOT NULL DEFAULT 'requested',
    created_at  TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
    id             TEXT PRIMARY KEY,
    user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind           TEXT    NOT NULL,
    description    TEXT    NOT NULL,
    currency       TEXT    NOT NULL DEFAULT 'GEL',
    base_minor     INTEGER NOT NULL,
    fee_minor      INTEGER NOT NULL DEFAULT 0,
    total_minor    INTEGER NOT NULL,
    status         TEXT    NOT NULL DEFAULT 'pending',
    method         TEXT,
    method_detail  TEXT,
    provider       TEXT,
    provider_ref   TEXT,
    meta           TEXT,
    created_at     TEXT    NOT NULL,
    paid_at        TEXT
);

CREATE TABLE IF NOT EXISTS ledger (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id     TEXT    NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    party        TEXT    NOT NULL,
    party_id     TEXT,
    amount_minor INTEGER NOT NULL,
    currency     TEXT    NOT NULL DEFAULT 'GEL',
    memo         TEXT,
    created_at   TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS saved_programs (
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    program_id TEXT    NOT NULL,
    created_at TEXT    NOT NULL,
    PRIMARY KEY (user_id, program_id)
);

CREATE TABLE IF NOT EXISTS partnership_inquiries (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    company      TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    email        TEXT NOT NULL,
    kind         TEXT,
    message      TEXT NOT NULL,
    created_at   TEXT NOT NULL,
    handled      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS applications (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind         TEXT    NOT NULL,              -- program | university
    item_id      TEXT    NOT NULL,
    stage        TEXT    NOT NULL DEFAULT 'planning',
    checklist    TEXT    NOT NULL DEFAULT '[]', -- [{key, label, done}]
    notes        TEXT,
    created_at   TEXT    NOT NULL,
    updated_at   TEXT    NOT NULL,
    submitted_at TEXT,
    UNIQUE (user_id, kind, item_id)
);

CREATE TABLE IF NOT EXISTS application_files (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    req_key        TEXT    NOT NULL,
    filename       TEXT    NOT NULL,
    stored_name    TEXT    NOT NULL,
    size           INTEGER NOT NULL,
    uploaded_at    TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    at       TEXT NOT NULL,
    user_id  INTEGER,
    visitor  TEXT,
    kind     TEXT NOT NULL,
    item     TEXT,
    meta     TEXT
);

CREATE TABLE IF NOT EXISTS reports (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    period_end TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    data       TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_codes_user ON verification_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_apps_user ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_events_at ON events(at);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_slots_tutor ON tutor_slots(tutor_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_order ON ledger(order_id);
"""

# Columns added after the first release. init_db() adds any that are missing,
# so an existing meridian.db upgrades in place without losing a row.
MIGRATIONS = {
    "users": {
        "role": "TEXT NOT NULL DEFAULT 'student'",
        "country": "TEXT",
        "city": "TEXT",
        "school": "TEXT",
        "interests": "TEXT",
        "target_regions": "TEXT",
        "plan_cycle": "TEXT",
        "plan_renews_at": "TEXT",
        "birth_year": "INTEGER",
    },
    "bookings": {
        "slot_id": "INTEGER",
        "order_id": "TEXT",
        "base_minor": "INTEGER",
        "fee_minor": "INTEGER",
        "total_minor": "INTEGER",
        "duration_min": "INTEGER NOT NULL DEFAULT 60",
        "tutor_note": "TEXT",
    },
}


def now():
    return datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def in_minutes(minutes):
    return (datetime.utcnow() + timedelta(minutes=minutes)).replace(microsecond=0).isoformat() + "Z"


def in_days(days):
    return (datetime.utcnow() + timedelta(days=days)).replace(microsecond=0).isoformat() + "Z"


def is_past(iso):
    try:
        return datetime.utcnow() > datetime.fromisoformat(iso.rstrip("Z"))
    except (ValueError, AttributeError):
        return True


def connect():
    os.makedirs(os.path.dirname(Config.DB_PATH), exist_ok=True)
    conn = sqlite3.connect(Config.DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = connect()
    with conn:
        conn.executescript(SCHEMA)
        for table, columns in MIGRATIONS.items():
            have = {row["name"] for row in conn.execute("PRAGMA table_info(%s)" % table)}
            for name, ddl in columns.items():
                if name not in have:
                    conn.execute("ALTER TABLE %s ADD COLUMN %s %s" % (table, name, ddl))
    conn.close()
    seed_tutors()


# ---------------------------------------------------------------- passwords
def hash_password(password):
    """PBKDF2-HMAC-SHA256, 240k iterations, per-user salt. Stored as salt$hash."""
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 240000)
    return "%s$%s" % (binascii.hexlify(salt).decode(), binascii.hexlify(digest).decode())


def verify_password(password, stored):
    try:
        salt_hex, digest_hex = stored.split("$", 1)
    except ValueError:
        return False
    salt = binascii.unhexlify(salt_hex)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 240000)
    return secrets.compare_digest(binascii.hexlify(digest).decode(), digest_hex)


def hash_code(code):
    return hashlib.sha256(("meridian:" + str(code)).encode("utf-8")).hexdigest()


# ---------------------------------------------------------------- users
PROFILE_FIELDS = ("phone", "grade", "country", "city", "school", "interests", "target_regions", "locale",
                  "birth_year")


def create_user(first_name, last_name, email, password, **profile):
    fields = {k: profile.get(k) for k in PROFILE_FIELDS}
    fields["locale"] = fields["locale"] or "en"
    conn = connect()
    with conn:
        cur = conn.execute(
            """INSERT INTO users (first_name, last_name, email, password_hash, created_at,
                                  phone, grade, country, city, school, interests, target_regions, locale,
                                  birth_year)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (first_name, last_name, email, hash_password(password), now(),
             fields["phone"], fields["grade"], fields["country"], fields["city"], fields["school"],
             fields["interests"], fields["target_regions"], fields["locale"], fields["birth_year"]),
        )
        user_id = cur.lastrowid
    conn.close()
    return user_id


def refresh_unverified(user_id, first_name, last_name, password, **profile):
    """A visitor redoing sign-up on an unverified account: take the new details."""
    fields = {k: profile.get(k) for k in PROFILE_FIELDS}
    conn = connect()
    with conn:
        conn.execute(
            """UPDATE users SET first_name = ?, last_name = ?, password_hash = ?,
                   phone = ?, grade = ?, country = ?, city = ?, school = ?, interests = ?,
                   target_regions = ?, locale = COALESCE(?, locale), birth_year = ?
               WHERE id = ? AND verified = 0""",
            (first_name, last_name, hash_password(password),
             fields["phone"], fields["grade"], fields["country"], fields["city"], fields["school"],
             fields["interests"], fields["target_regions"], fields["locale"], fields["birth_year"], user_id),
        )
    conn.close()


def update_profile(user_id, **fields):
    allowed = {k: v for k, v in fields.items() if k in PROFILE_FIELDS + ("first_name", "last_name")}
    if not allowed:
        return
    conn = connect()
    with conn:
        conn.execute(
            "UPDATE users SET %s WHERE id = ?" % ", ".join("%s = ?" % k for k in allowed),
            tuple(allowed.values()) + (user_id,),
        )
    conn.close()


def set_password(user_id, password):
    conn = connect()
    with conn:
        conn.execute("UPDATE users SET password_hash = ? WHERE id = ?", (hash_password(password), user_id))
        # a password change signs out every other device
        conn.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))
    conn.close()


def get_user_by_email(email):
    conn = connect()
    row = conn.execute("SELECT * FROM users WHERE email = ? COLLATE NOCASE", (email,)).fetchone()
    conn.close()
    return dict(row) if row else None


def get_user(user_id):
    conn = connect()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def mark_verified(user_id):
    conn = connect()
    with conn:
        conn.execute("UPDATE users SET verified = 1 WHERE id = ?", (user_id,))
    conn.close()


def touch_login(user_id):
    conn = connect()
    with conn:
        conn.execute("UPDATE users SET last_login_at = ? WHERE id = ?", (now(), user_id))
    conn.close()


def set_plan(user_id, plan, cycle=None, renews_at=None):
    conn = connect()
    with conn:
        conn.execute("UPDATE users SET plan = ?, plan_cycle = ?, plan_renews_at = ? WHERE id = ?",
                     (plan, cycle, renews_at, user_id))
    conn.close()


def set_role(user_id, role):
    conn = connect()
    with conn:
        conn.execute("UPDATE users SET role = ? WHERE id = ?", (role, user_id))
    conn.close()


# ---------------------------------------------------------------- codes
def issue_code(user_id, purpose="signup"):
    code = "%06d" % secrets.randbelow(1000000)
    conn = connect()
    with conn:
        conn.execute("UPDATE verification_codes SET consumed = 1 WHERE user_id = ? AND purpose = ?",
                     (user_id, purpose))
        conn.execute(
            """INSERT INTO verification_codes (user_id, code_hash, purpose, expires_at, created_at)
               VALUES (?,?,?,?,?)""",
            (user_id, hash_code(code), purpose, in_minutes(Config.CODE_TTL_MINUTES), now()),
        )
    conn.close()
    return code


def codes_sent_last_hour(user_id, purpose=None):
    cutoff = (datetime.utcnow() - timedelta(hours=1)).isoformat()
    conn = connect()
    if purpose:
        row = conn.execute(
            "SELECT COUNT(*) AS n FROM verification_codes WHERE user_id = ? AND purpose = ? AND created_at > ?",
            (user_id, purpose, cutoff)).fetchone()
    else:
        row = conn.execute(
            "SELECT COUNT(*) AS n FROM verification_codes WHERE user_id = ? AND created_at > ?",
            (user_id, cutoff)).fetchone()
    conn.close()
    return row["n"]


def check_code(user_id, code, purpose="signup", consume=True):
    """Returns (ok, reason)."""
    conn = connect()
    row = conn.execute(
        """SELECT * FROM verification_codes
           WHERE user_id = ? AND purpose = ? AND consumed = 0
           ORDER BY id DESC LIMIT 1""",
        (user_id, purpose),
    ).fetchone()
    if not row:
        conn.close()
        return False, "no_code"
    if is_past(row["expires_at"]):
        conn.close()
        return False, "expired"
    if row["attempts"] >= Config.CODE_MAX_ATTEMPTS:
        conn.close()
        return False, "too_many_attempts"

    ok = secrets.compare_digest(row["code_hash"], hash_code(code))
    with conn:
        if ok and consume:
            conn.execute("UPDATE verification_codes SET consumed = 1 WHERE id = ?", (row["id"],))
        elif not ok:
            conn.execute("UPDATE verification_codes SET attempts = attempts + 1 WHERE id = ?", (row["id"],))
    conn.close()
    return (True, "ok") if ok else (False, "wrong_code")


# ---------------------------------------------------------------- sessions
def create_session(user_id, user_agent=""):
    token = secrets.token_urlsafe(40)
    conn = connect()
    with conn:
        conn.execute(
            "INSERT INTO sessions (token, user_id, user_agent, created_at, expires_at) VALUES (?,?,?,?,?)",
            (token, user_id, (user_agent or "")[:250], now(), in_days(Config.SESSION_DAYS)),
        )
    conn.close()
    return token


def session_user(token):
    if not token:
        return None
    conn = connect()
    row = conn.execute(
        """SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
           WHERE s.token = ? AND s.expires_at > ?""",
        (token, now()),
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def destroy_session(token):
    conn = connect()
    with conn:
        conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
    conn.close()


# ---------------------------------------------------------------- tutors
def _tutor_row(row):
    if not row:
        return None
    profile = json.loads(row["profile"])
    profile["id"] = row["id"]
    profile["status"] = row["status"]
    profile["user_id"] = row["user_id"]
    profile["photo"] = row["photo"]
    return profile


def list_tutors(include_pending=False):
    conn = connect()
    if include_pending:
        rows = conn.execute("SELECT * FROM tutors ORDER BY created_at").fetchall()
    else:
        rows = conn.execute("SELECT * FROM tutors WHERE status = 'approved' ORDER BY created_at").fetchall()
    conn.close()
    return [_tutor_row(r) for r in rows]


def get_tutor(tutor_id):
    conn = connect()
    row = conn.execute("SELECT * FROM tutors WHERE id = ?", (tutor_id,)).fetchone()
    conn.close()
    return _tutor_row(row)


def tutor_for_user(user_id):
    conn = connect()
    row = conn.execute("SELECT * FROM tutors WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
                       (user_id,)).fetchone()
    conn.close()
    return _tutor_row(row)


def save_tutor(tutor_id, profile, user_id=None, status="approved", photo=None):
    stored = {k: v for k, v in profile.items() if k not in ("id", "status", "user_id", "photo")}
    conn = connect()
    with conn:
        exists = conn.execute("SELECT 1 FROM tutors WHERE id = ?", (tutor_id,)).fetchone()
        if exists:
            conn.execute(
                "UPDATE tutors SET profile = ?, updated_at = ?%s WHERE id = ?" % (", photo = ?" if photo else ""),
                ((json.dumps(stored, ensure_ascii=False), now()) + ((photo,) if photo else ()) + (tutor_id,)),
            )
        else:
            conn.execute(
                """INSERT INTO tutors (id, user_id, status, profile, photo, created_at, updated_at)
                   VALUES (?,?,?,?,?,?,?)""",
                (tutor_id, user_id, status, json.dumps(stored, ensure_ascii=False), photo, now(), now()),
            )
    conn.close()


def set_tutor_status(tutor_id, status):
    conn = connect()
    with conn:
        conn.execute("UPDATE tutors SET status = ?, updated_at = ? WHERE id = ?", (status, now(), tutor_id))
        row = conn.execute("SELECT user_id FROM tutors WHERE id = ?", (tutor_id,)).fetchone()
        if row and row["user_id"] and status == "approved":
            conn.execute("UPDATE users SET role = 'tutor' WHERE id = ?", (row["user_id"],))
    conn.close()


def set_tutor_photo(tutor_id, photo):
    conn = connect()
    with conn:
        conn.execute("UPDATE tutors SET photo = ?, updated_at = ? WHERE id = ?", (photo, now(), tutor_id))
    conn.close()


def seed_tutors():
    """First run only: copy data/teachers.json into the tutors table and open
    slots for the next six weeks from each tutor's weekly pattern."""
    conn = connect()
    count = conn.execute("SELECT COUNT(*) c FROM tutors").fetchone()["c"]
    conn.close()
    if count:
        return
    path = os.path.join(DATA_DIR, "teachers.json")
    if not os.path.exists(path):
        return
    with open(path, encoding="utf-8") as fh:
        teachers = json.load(fh)
    for teacher in teachers:
        weekly = teacher.pop("availability", {}) or {}
        busy = set(teacher.pop("busy", []) or [])
        save_tutor(teacher["id"], teacher, status="approved")
        open_weekly(teacher["id"], weekly, weeks=6, skip_dates=busy)


# ---------------------------------------------------------------- slots
def open_weekly(tutor_id, weekly, weeks=6, skip_dates=()):
    """weekly = {"1": ["16:00", "17:30"], ...} with 0 = Sunday."""
    today = date.today()
    conn = connect()
    with conn:
        for offset in range(1, weeks * 7 + 1):
            day = today + timedelta(days=offset)
            key = str((day.weekday() + 1) % 7)
            if day.isoformat() in skip_dates:
                continue
            for time in weekly.get(key, []):
                conn.execute(
                    "INSERT OR IGNORE INTO tutor_slots (tutor_id, starts_at) VALUES (?, ?)",
                    (tutor_id, "%s %s" % (day.isoformat(), time)),
                )
    conn.close()


def _release_stale_holds(conn):
    conn.execute(
        "UPDATE tutor_slots SET status = 'open', held_until = NULL WHERE status = 'held' AND held_until < ?",
        (now(),),
    )


def list_slots(tutor_id, include_closed=False):
    conn = connect()
    with conn:
        _release_stale_holds(conn)
    floor = datetime.now().strftime("%Y-%m-%d %H:%M")
    query = "SELECT * FROM tutor_slots WHERE tutor_id = ? AND starts_at >= ?"
    if not include_closed:
        query += " AND status IN ('open', 'held', 'booked')"
    rows = conn.execute(query + " ORDER BY starts_at", (tutor_id, floor)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def set_slot(tutor_id, starts_at, open_it):
    """The tutor toggles a time on their calendar. Booked slots cannot be closed here."""
    conn = connect()
    with conn:
        row = conn.execute("SELECT * FROM tutor_slots WHERE tutor_id = ? AND starts_at = ?",
                           (tutor_id, starts_at)).fetchone()
        if row and row["status"] in ("booked", "held"):
            conn.close()
            return False, row["status"]
        if open_it:
            if row:
                conn.execute("UPDATE tutor_slots SET status = 'open' WHERE id = ?", (row["id"],))
            else:
                conn.execute("INSERT INTO tutor_slots (tutor_id, starts_at) VALUES (?, ?)", (tutor_id, starts_at))
        elif row:
            conn.execute("DELETE FROM tutor_slots WHERE id = ?", (row["id"],))
    conn.close()
    return True, "open" if open_it else "closed"


def _minutes(starts_at):
    return datetime.strptime(starts_at, "%Y-%m-%d %H:%M")


def taken_windows(tutor_id, conn=None):
    """Start times already committed (booked or being paid for)."""
    own = conn is None
    conn = conn or connect()
    rows = conn.execute(
        "SELECT starts_at, duration_min FROM tutor_slots WHERE tutor_id = ? AND status IN ('booked', 'held')",
        (tutor_id,),
    ).fetchall()
    if own:
        conn.close()
    return [(_minutes(r["starts_at"]), r["duration_min"]) for r in rows]


def overlaps(starts_at, duration, windows):
    """A lesson cannot start inside, or run into, one that is already taken."""
    start = _minutes(starts_at)
    end = start + timedelta(minutes=duration)
    for other_start, other_duration in windows:
        if other_start == start:
            continue
        if start < other_start + timedelta(minutes=other_duration) and other_start < end:
            return True
    return False


def hold_slot(slot_id, tutor_id, minutes=15):
    conn = connect()
    with conn:
        _release_stale_holds(conn)
        row = conn.execute("SELECT * FROM tutor_slots WHERE id = ? AND tutor_id = ?", (slot_id, tutor_id)).fetchone()
        if not row or overlaps(row["starts_at"], row["duration_min"], taken_windows(tutor_id, conn)):
            conn.close()
            return False, dict(row) if row else None
        cur = conn.execute(
            """UPDATE tutor_slots SET status = 'held', held_until = ?
               WHERE id = ? AND tutor_id = ? AND status = 'open'""",
            (in_minutes(minutes), slot_id, tutor_id),
        )
        ok = cur.rowcount == 1
        row = conn.execute("SELECT * FROM tutor_slots WHERE id = ?", (slot_id,)).fetchone()
    conn.close()
    return ok, (dict(row) if row else None)


def release_slot(slot_id):
    conn = connect()
    with conn:
        conn.execute("UPDATE tutor_slots SET status = 'open', held_until = NULL WHERE id = ? AND status = 'held'",
                     (slot_id,))
    conn.close()


# ---------------------------------------------------------------- bookings
def create_booking(user_id, teacher_id, service, date_s, time_s, note, slot_id=None,
                   base_minor=None, fee_minor=None, total_minor=None, order_id=None, status="requested"):
    conn = connect()
    with conn:
        cur = conn.execute(
            """INSERT INTO bookings (user_id, teacher_id, service, date, time, note, status, created_at,
                                     slot_id, order_id, base_minor, fee_minor, total_minor)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (user_id, teacher_id, service, date_s, time_s, note, status, now(),
             slot_id, order_id, base_minor, fee_minor, total_minor),
        )
        booking_id = cur.lastrowid
    conn.close()
    return booking_id


def get_booking(booking_id):
    conn = connect()
    row = conn.execute("SELECT * FROM bookings WHERE id = ?", (booking_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def set_booking_status(booking_id, status, tutor_note=None):
    conn = connect()
    with conn:
        conn.execute("UPDATE bookings SET status = ?, tutor_note = COALESCE(?, tutor_note) WHERE id = ?",
                     (status, tutor_note, booking_id))
        row = conn.execute("SELECT slot_id FROM bookings WHERE id = ?", (booking_id,)).fetchone()
        if row and row["slot_id"]:
            if status == "confirmed":
                conn.execute("UPDATE tutor_slots SET status = 'booked', held_until = NULL WHERE id = ?",
                             (row["slot_id"],))
            elif status in ("cancelled", "declined", "expired"):
                conn.execute("UPDATE tutor_slots SET status = 'open', held_until = NULL WHERE id = ?",
                             (row["slot_id"],))
    conn.close()


def list_bookings(user_id):
    conn = connect()
    rows = conn.execute(
        """SELECT * FROM bookings WHERE user_id = ? AND status != 'pending_payment'
           ORDER BY date ASC, time ASC""", (user_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def tutor_bookings(tutor_id):
    conn = connect()
    rows = conn.execute(
        """SELECT b.*, u.first_name, u.last_name, u.email, u.phone, u.grade
           FROM bookings b JOIN users u ON u.id = b.user_id
           WHERE b.teacher_id = ? AND b.status IN ('confirmed', 'completed', 'cancelled', 'requested')
           ORDER BY b.date ASC, b.time ASC""",
        (tutor_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def booking_taken(teacher_id, date_s, time_s):
    conn = connect()
    row = conn.execute(
        """SELECT 1 FROM bookings WHERE teacher_id = ? AND date = ? AND time = ?
           AND status IN ('confirmed', 'requested', 'pending_payment') LIMIT 1""",
        (teacher_id, date_s, time_s),
    ).fetchone()
    conn.close()
    return bool(row)


# ---------------------------------------------------------------- orders & ledger
def create_order(user_id, kind, description, base_minor, fee_minor, meta=None, currency="GEL"):
    order_id = "ord_" + secrets.token_hex(8)
    conn = connect()
    with conn:
        conn.execute(
            """INSERT INTO orders (id, user_id, kind, description, currency, base_minor, fee_minor,
                                   total_minor, meta, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?)""",
            (order_id, user_id, kind, description, currency, base_minor, fee_minor,
             base_minor + fee_minor, json.dumps(meta or {}, ensure_ascii=False), now()),
        )
    conn.close()
    return order_id


def get_order(order_id):
    conn = connect()
    row = conn.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
    conn.close()
    if not row:
        return None
    order = dict(row)
    order["meta"] = json.loads(order["meta"] or "{}")
    return order


def mark_order_paid(order_id, method, method_detail, provider, provider_ref, splits):
    """splits = [(party, party_id, amount_minor, memo), ...] — must sum to the order total."""
    conn = connect()
    with conn:
        conn.execute(
            """UPDATE orders SET status = 'paid', method = ?, method_detail = ?, provider = ?,
                                 provider_ref = ?, paid_at = ?
               WHERE id = ? AND status = 'pending'""",
            (method, method_detail, provider, provider_ref, now(), order_id),
        )
        for party, party_id, amount, memo in splits:
            conn.execute(
                """INSERT INTO ledger (order_id, party, party_id, amount_minor, memo, created_at)
                   VALUES (?,?,?,?,?,?)""",
                (order_id, party, party_id, amount, memo, now()),
            )
    conn.close()


def mark_order_status(order_id, status):
    conn = connect()
    with conn:
        conn.execute("UPDATE orders SET status = ? WHERE id = ?", (status, order_id))
    conn.close()


def refund_order(order_id):
    conn = connect()
    with conn:
        conn.execute("UPDATE orders SET status = 'refunded' WHERE id = ? AND status = 'paid'", (order_id,))
        rows = conn.execute("SELECT * FROM ledger WHERE order_id = ?", (order_id,)).fetchall()
        for r in rows:
            conn.execute(
                """INSERT INTO ledger (order_id, party, party_id, amount_minor, memo, created_at)
                   VALUES (?,?,?,?,?,?)""",
                (order_id, r["party"], r["party_id"], -r["amount_minor"], "refund", now()),
            )
    conn.close()


def list_orders(user_id):
    conn = connect()
    rows = conn.execute(
        "SELECT * FROM orders WHERE user_id = ? AND status != 'pending' ORDER BY created_at DESC", (user_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def tutor_earnings(tutor_id):
    conn = connect()
    row = conn.execute(
        "SELECT COALESCE(SUM(amount_minor), 0) s, COUNT(DISTINCT order_id) n FROM ledger WHERE party = 'tutor' AND party_id = ?",
        (tutor_id,),
    ).fetchone()
    conn.close()
    return {"payout_minor": row["s"], "orders": row["n"]}


# ---------------------------------------------------------------- saved
def toggle_saved(user_id, program_id):
    conn = connect()
    existing = conn.execute(
        "SELECT 1 FROM saved_programs WHERE user_id = ? AND program_id = ?", (user_id, program_id)
    ).fetchone()
    with conn:
        if existing:
            conn.execute("DELETE FROM saved_programs WHERE user_id = ? AND program_id = ?",
                         (user_id, program_id))
            saved = False
        else:
            conn.execute("INSERT INTO saved_programs (user_id, program_id, created_at) VALUES (?,?,?)",
                         (user_id, program_id, now()))
            saved = True
    conn.close()
    return saved


def list_saved(user_id):
    conn = connect()
    rows = conn.execute(
        "SELECT program_id FROM saved_programs WHERE user_id = ? ORDER BY created_at DESC", (user_id,)
    ).fetchall()
    conn.close()
    return [r["program_id"] for r in rows]


# ---------------------------------------------------------------- partnerships
def create_inquiry(company, contact_name, email, kind, message):
    conn = connect()
    with conn:
        cur = conn.execute(
            """INSERT INTO partnership_inquiries (company, contact_name, email, kind, message, created_at)
               VALUES (?,?,?,?,?,?)""",
            (company, contact_name, email, kind, message, now()),
        )
        inquiry_id = cur.lastrowid
    conn.close()
    return inquiry_id


# ---------------------------------------------------------------- admin
def admin_snapshot():
    conn = connect()
    one = lambda q: conn.execute(q).fetchone()[0]
    snapshot = {
        "counts": {
            "users": one("SELECT COUNT(*) FROM users"),
            "verified": one("SELECT COUNT(*) FROM users WHERE verified = 1"),
            "bookings": one("SELECT COUNT(*) FROM bookings WHERE status != 'pending_payment'"),
            "inquiries": one("SELECT COUNT(*) FROM partnership_inquiries"),
            "tutors": one("SELECT COUNT(*) FROM tutors WHERE status = 'approved'"),
            "pending_tutors": one("SELECT COUNT(*) FROM tutors WHERE status = 'pending'"),
            "revenue_minor": one("SELECT COALESCE(SUM(amount_minor),0) FROM ledger WHERE party = 'platform'"),
            "payouts_minor": one("SELECT COALESCE(SUM(amount_minor),0) FROM ledger WHERE party = 'tutor'"),
            "gross_minor": one("SELECT COALESCE(SUM(total_minor),0) FROM orders WHERE status = 'paid'"),
        },
        "users": [dict(r) for r in conn.execute(
            """SELECT id, first_name, last_name, email, phone, verified, plan, role, grade, country,
                      interests, created_at, last_login_at FROM users ORDER BY id DESC""")],
        "bookings": [dict(r) for r in conn.execute(
            "SELECT * FROM bookings WHERE status != 'pending_payment' ORDER BY id DESC LIMIT 200")],
        "inquiries": [dict(r) for r in conn.execute(
            "SELECT * FROM partnership_inquiries ORDER BY id DESC LIMIT 200")],
        "orders": [dict(r) for r in conn.execute(
            "SELECT * FROM orders WHERE status != 'pending' ORDER BY created_at DESC LIMIT 200")],
        "tutors": [],
    }
    for row in conn.execute("SELECT * FROM tutors ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END, created_at DESC"):
        tutor = _tutor_row(row)
        snapshot["tutors"].append({
            "id": tutor["id"], "status": tutor["status"], "photo": tutor["photo"],
            "name": tutor.get("name"), "headline": tutor.get("headline"),
            "price": tutor.get("price"), "email": tutor.get("contact_email"),
        })
    conn.close()
    return snapshot
