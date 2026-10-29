"""Configuration. Everything is read from the environment, with a tiny .env loader
so you do not need python-dotenv installed."""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(ROOT, "backend")
FRONTEND_DIR = os.path.join(ROOT, "frontend")
DATA_DIR = os.path.join(BACKEND_DIR, "data")


def load_env(path=None):
    """Read KEY=value lines out of a .env file into os.environ (existing vars win)."""
    path = path or os.path.join(ROOT, ".env")
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as fh:
        for raw in fh:
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            os.environ.setdefault(key, value)


load_env()

# Where runtime data lives: the database, uploads, the email outbox and weekly
# reports. Defaults to backend/; on a host, point it at a persistent disk.
STORAGE_DIR = os.environ.get("MERIDIAN_STORAGE", BACKEND_DIR)
OUTBOX_DIR = os.path.join(STORAGE_DIR, "outbox")


def _bool(name, default=False):
    return os.environ.get(name, str(default)).strip().lower() in ("1", "true", "yes", "on")


class Config:
    # --- server ---
    HOST = os.environ.get("MERIDIAN_HOST", "127.0.0.1")
    PORT = int(os.environ.get("MERIDIAN_PORT", "5001"))
    DEBUG = _bool("MERIDIAN_DEBUG", True)
    SECRET_KEY = os.environ.get("MERIDIAN_SECRET_KEY", "dev-only-change-me")

    # --- storage ---
    DB_PATH = os.environ.get("MERIDIAN_DB", os.path.join(STORAGE_DIR, "meridian.db"))

    # --- auth ---
    SESSION_DAYS = int(os.environ.get("MERIDIAN_SESSION_DAYS", "30"))
    CODE_TTL_MINUTES = int(os.environ.get("MERIDIAN_CODE_TTL", "15"))
    CODE_MAX_ATTEMPTS = 5
    CODE_RESEND_LIMIT = 5          # per email, per hour
    COOKIE_NAME = "meridian_session"
    COOKIE_SECURE = _bool("MERIDIAN_COOKIE_SECURE", False)

    # --- email ---
    SMTP_HOST = os.environ.get("MERIDIAN_SMTP_HOST", "")
    SMTP_PORT = int(os.environ.get("MERIDIAN_SMTP_PORT", "587"))
    SMTP_USER = os.environ.get("MERIDIAN_SMTP_USER", "")
    SMTP_PASSWORD = os.environ.get("MERIDIAN_SMTP_PASSWORD", "")
    SMTP_STARTTLS = _bool("MERIDIAN_SMTP_STARTTLS", True)
    MAIL_FROM = os.environ.get("MERIDIAN_MAIL_FROM", "Meridian <no-reply@meridian.ge>")
    TEAM_INBOX = os.environ.get("MERIDIAN_TEAM_INBOX", "hello@meridian.ge")

    # When no SMTP server is configured the code is written to backend/outbox/
    # and returned in the API response so you can test the whole flow offline.
    @classmethod
    def smtp_configured(cls):
        return bool(cls.SMTP_HOST and cls.SMTP_USER)

    @classmethod
    def expose_dev_codes(cls):
        return _bool("MERIDIAN_DEV_CODES", not cls.smtp_configured())

    # --- admin ---
    ADMIN_TOKEN = os.environ.get("MERIDIAN_ADMIN_TOKEN", "meridian-admin")

    # --- membership ---
    FREE_PROGRAM_LIMIT = int(os.environ.get("MERIDIAN_FREE_PROGRAMS", "6"))
    FREE_TEACHER_LIMIT = int(os.environ.get("MERIDIAN_FREE_TEACHERS", "4"))
