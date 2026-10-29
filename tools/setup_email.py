#!/usr/bin/env python3
"""Connect Meridian to a real mailbox so verification codes, password resets
and receipts arrive in people's inboxes.

    python3 tools/setup_email.py

Works with Gmail / Google Workspace out of the box (and any SMTP server).

For Gmail you need an *App Password* — not your normal password:
  1. Turn on 2-Step Verification:  https://myaccount.google.com/security
  2. Create an App Password:       https://myaccount.google.com/apppasswords
     (name it "Meridian", copy the 16 characters)

Your password is typed hidden, stored only in Meridian/.env on this computer,
and .env is excluded from git.
"""
import getpass
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV = os.path.join(ROOT, ".env")
sys.path.insert(0, os.path.join(ROOT, "backend"))

PRESETS = {
    "gmail.com": ("smtp.gmail.com", 587),
    "googlemail.com": ("smtp.gmail.com", 587),
    "outlook.com": ("smtp.office365.com", 587),
    "hotmail.com": ("smtp.office365.com", 587),
    "yahoo.com": ("smtp.mail.yahoo.com", 587),
}


def read_env():
    values = {}
    if os.path.exists(ENV):
        with open(ENV, encoding="utf-8") as fh:
            for line in fh:
                if "=" in line and not line.strip().startswith("#"):
                    k, _, v = line.strip().partition("=")
                    values[k.strip()] = v.strip()
    return values


def write_env(updates):
    lines = []
    seen = set()
    if os.path.exists(ENV):
        with open(ENV, encoding="utf-8") as fh:
            for line in fh:
                key = line.split("=", 1)[0].strip()
                if key in updates:
                    lines.append("%s=%s\n" % (key, updates[key]))
                    seen.add(key)
                else:
                    lines.append(line)
    if not lines:
        lines.append("# Meridian settings — created by tools/setup_email.py\n")
    for key, value in updates.items():
        if key not in seen:
            lines.append("%s=%s\n" % (key, value))
    with open(ENV, "w", encoding="utf-8") as fh:
        fh.writelines(lines)
    os.chmod(ENV, 0o600)


def ask(prompt, default=""):
    shown = " [%s]" % default if default else ""
    answer = input("  %s%s: " % (prompt, shown)).strip()
    return answer or default


def main():
    print(__doc__)
    current = read_env()

    email = ask("Email address Meridian sends from", current.get("MERIDIAN_SMTP_USER", ""))
    if not re.match(r"^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$", email):
        sys.exit("  That does not look like an email address.")
    domain = email.split("@")[1].lower()
    host, port = PRESETS.get(domain, ("", 587))
    if not host:
        print("  (Google Workspace addresses like you@meridian.ge use smtp.gmail.com)")
        host = ask("SMTP server", current.get("MERIDIAN_SMTP_HOST", "smtp.gmail.com"))
        port = int(ask("SMTP port", str(current.get("MERIDIAN_SMTP_PORT", 587))))

    password = getpass.getpass("  App Password (typing is hidden): ").replace(" ", "")
    if not password:
        sys.exit("  No password entered — nothing changed.")
    inbox = ask("Where should partnership & tutor-application emails go", current.get("MERIDIAN_TEAM_INBOX", email))

    print("\n  Testing the connection...")
    import smtplib
    import ssl
    try:
        with smtplib.SMTP(host, port, timeout=20) as server:
            server.ehlo()
            server.starttls(context=ssl.create_default_context())
            server.ehlo()
            server.login(email, password)
    except smtplib.SMTPAuthenticationError:
        sys.exit("\n  ✗ The server rejected that login.\n"
                 "    For Gmail: use an App Password (https://myaccount.google.com/apppasswords),\n"
                 "    not your normal password, and make sure 2-Step Verification is on.")
    except Exception as exc:
        sys.exit("\n  ✗ Could not connect: %s" % exc)
    print("  ✓ Login works.")

    write_env({
        "MERIDIAN_SMTP_HOST": host,
        "MERIDIAN_SMTP_PORT": str(port),
        "MERIDIAN_SMTP_USER": email,
        "MERIDIAN_SMTP_PASSWORD": password,
        "MERIDIAN_SMTP_STARTTLS": "true",
        "MERIDIAN_MAIL_FROM": "Meridian <%s>" % email,
        "MERIDIAN_TEAM_INBOX": inbox,
        "MERIDIAN_DEV_CODES": "false",
    })
    print("  ✓ Saved to %s (readable only by you)." % ENV)

    for key in list(os.environ):
        if key.startswith("MERIDIAN_"):
            del os.environ[key]
    import config
    config.load_env()
    import importlib
    importlib.reload(config)
    import mailer
    importlib.reload(mailer)
    if mailer.send_test(email):
        print("  ✓ Test email sent to %s — check the inbox (and spam, the first time)." % email)
    else:
        print("  ✗ Test email failed: %s" % mailer.last_error)

    print("\n  Restart Meridian (close its window and double-click 'Start Meridian.command')")
    print("  and verification codes will go to real inboxes from now on.\n")


if __name__ == "__main__":
    main()
