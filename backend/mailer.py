"""Outbound email.

With SMTP credentials in .env the message is really sent. Without them it is
written to backend/outbox/ as a .eml file and printed to the console, so every
flow can be tested with no mail server at all.

Set it up in one step:   python3 tools/setup_email.py
"""
import os
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import make_msgid, formataddr, parseaddr
from datetime import datetime

from config import Config, OUTBOX_DIR, FRONTEND_DIR

LOGO_PATH = os.path.join(FRONTEND_DIR, "assets", "brand", "meridian-logo.png")
last_error = None


def site_url(path=""):
    base = os.environ.get("MERIDIAN_PUBLIC_URL", "http://%s:%d" % (Config.HOST, Config.PORT)).rstrip("/")
    return base + path


def _deliver(message, to_address):
    """Returns True if handed to a real SMTP server, False if written to the outbox."""
    global last_error
    if not Config.smtp_configured():
        _to_outbox(message, to_address)
        return False
    try:
        context = ssl.create_default_context()
        if Config.SMTP_PORT == 465:
            with smtplib.SMTP_SSL(Config.SMTP_HOST, Config.SMTP_PORT, context=context, timeout=20) as server:
                server.login(Config.SMTP_USER, Config.SMTP_PASSWORD)
                server.send_message(message)
        else:
            with smtplib.SMTP(Config.SMTP_HOST, Config.SMTP_PORT, timeout=20) as server:
                server.ehlo()
                if Config.SMTP_STARTTLS:
                    server.starttls(context=context)
                    server.ehlo()
                server.login(Config.SMTP_USER, Config.SMTP_PASSWORD)
                server.send_message(message)
        last_error = None
        print("[mail] sent to %s | %s" % (to_address, message["Subject"]))
        return True
    except Exception as exc:  # never let a mail outage break sign-up
        last_error = "%s: %s" % (type(exc).__name__, exc)
        print("[mail] SMTP FAILED (%s) — kept a copy in backend/outbox/" % last_error)
        _to_outbox(message, to_address)
        return False


def _to_outbox(message, to_address):
    os.makedirs(OUTBOX_DIR, exist_ok=True)
    stamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S-%f")
    safe = "".join(c if c.isalnum() or c in ".-_@" else "_" for c in to_address)
    path = os.path.join(OUTBOX_DIR, "%s_%s.eml" % (stamp, safe))
    with open(path, "wb") as fh:
        fh.write(bytes(message))
    print("[mail] outbox -> %s | %s" % (to_address, message["Subject"]))


def _sender():
    name, address = parseaddr(Config.MAIL_FROM)
    # Gmail and most providers reject a From address that is not the account itself
    if Config.smtp_configured() and Config.SMTP_USER and "@" in Config.SMTP_USER:
        if address.lower() != Config.SMTP_USER.lower():
            address = Config.SMTP_USER
    return formataddr((name or "Meridian", address or "no-reply@meridian.ge"))


def _message(to_address, subject, text, title, intro, body_html, footer=None, reply_to=None):
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = _sender()
    message["To"] = to_address
    if reply_to:
        message["Reply-To"] = reply_to
    message.set_content(text)

    logo_cid = make_msgid(domain="meridian.ge")
    html = _shell(title, intro, body_html, footer, logo_cid[1:-1])
    message.add_alternative(html, subtype="html")
    if os.path.exists(LOGO_PATH):
        with open(LOGO_PATH, "rb") as fh:
            message.get_payload()[1].add_related(fh.read(), "image", "png", cid=logo_cid)
    return message


def _shell(title, intro, body_html, footer, logo_cid):
    return """<!doctype html>
<html><body style="margin:0;padding:0;background:#eef3fb;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background:#eef3fb;padding:32px 14px;">
    <tr><td align="center">
      <table role="presentation" width="100%%" cellpadding="0" cellspacing="0"
             style="max-width:540px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 12px 40px -18px rgba(6,18,41,.35);">
        <tr><td style="height:4px;background:linear-gradient(90deg,#0071bc,#29a9e0);font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td align="center" style="padding:30px 32px 6px;">
          <img src="cid:%s" width="132" alt="Meridian" style="display:block;width:132px;height:auto;border:0;">
        </td></tr>
        <tr><td style="padding:18px 36px 4px;">
          <h1 style="margin:0 0 10px;font-size:22px;line-height:1.3;color:#061229;font-weight:700;">%s</h1>
          <p style="margin:0;font-size:15px;line-height:1.65;color:#46608f;">%s</p>
        </td></tr>
        <tr><td style="padding:20px 36px 30px;">%s</td></tr>
        <tr><td style="padding:18px 36px 26px;border-top:1px solid #e6edf8;">
          <p style="margin:0;font-size:12px;line-height:1.6;color:#7489b5;">%s</p>
          <p style="margin:8px 0 0;font-size:12px;color:#9aabcb;">Meridian &middot; Education Without Borders &middot; Doha, Qatar</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>""" % (logo_cid, title, intro, body_html,
                     footer or "You are receiving this because of activity on your Meridian account.")


def _code_block(code, label):
    return (
        '<div style="text-align:center;padding:22px;border-radius:14px;background:#f2f7ff;border:1px solid #dbe7fb;">'
        '<div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#6c82ab;">%s</div>'
        '<div style="font-size:36px;letter-spacing:12px;font-weight:700;color:#0071bc;margin-top:8px;'
        'font-family:Menlo,Consolas,monospace;">%s</div>'
        '<div style="font-size:12px;color:#7489b5;margin-top:10px;">Expires in %d minutes</div>'
        "</div>" % (label, code, Config.CODE_TTL_MINUTES)
    )


def _button(href, label):
    return ('<a href="%s" style="display:inline-block;padding:13px 26px;border-radius:999px;background:#0071bc;'
            'color:#ffffff;font-weight:600;font-size:15px;text-decoration:none;">%s</a>' % (href, label))


def _rows(pairs):
    return '<table role="presentation" width="100%%" style="border-collapse:collapse;">%s</table>' % "".join(
        '<tr><td style="padding:9px 0;font-size:13px;color:#6c82ab;border-bottom:1px solid #eef3fb;">%s</td>'
        '<td style="padding:9px 0;font-size:14px;color:#0d2148;text-align:right;border-bottom:1px solid #eef3fb;">%s</td></tr>'
        % (k, v) for k, v in pairs
    )


# ---------------------------------------------------------------- messages
def send_verification_code(to_address, first_name, code):
    return _deliver(_message(
        to_address, "%s is your Meridian code" % code,
        "Hi %s,\n\nYour Meridian verification code is %s. It expires in %d minutes.\n\n— Meridian"
        % (first_name, code, Config.CODE_TTL_MINUTES),
        "Confirm your email",
        "Hi %s — one step left. Enter this code on the verification screen." % first_name,
        _code_block(code, "Verification code"),
        "If you did not create a Meridian account, you can ignore this email.",
    ), to_address)


def send_reset_code(to_address, first_name, code):
    return _deliver(_message(
        to_address, "Reset your Meridian password",
        "Hi %s,\n\nYour password reset code is %s. It expires in %d minutes.\n"
        "If you did not ask to reset your password, ignore this email — nothing changes.\n\n— Meridian"
        % (first_name, code, Config.CODE_TTL_MINUTES),
        "Reset your password",
        "Hi %s — use this code to choose a new password." % first_name,
        _code_block(code, "Reset code"),
        "If you did not ask to reset your password, ignore this email. Your password stays the same.",
    ), to_address)


def send_password_changed(to_address, first_name):
    return _deliver(_message(
        to_address, "Your Meridian password was changed",
        "Hi %s,\n\nYour password was just changed and every other device was signed out.\n"
        "If this was not you, reset it again straight away.\n\n— Meridian" % first_name,
        "Password changed",
        "Hi %s — your password was just changed and other devices were signed out." % first_name,
        _button(site_url("/login?mode=forgot"), "Not you? Reset it"),
    ), to_address)


def send_welcome(to_address, first_name):
    return _deliver(_message(
        to_address, "Welcome to Meridian",
        "Hi %s,\n\nYour Meridian account is active. The full programme database and every "
        "tutor profile are now open to you.\n\n— Meridian" % first_name,
        "Your account is live",
        "Hi %s — the full programme database, every deadline and every tutor profile are now open to you." % first_name,
        _button(site_url("/programs"), "Explore programmes"),
    ), to_address)


def send_receipt(to_address, first_name, order, money):
    rows = [("Order", order["id"]), ("Item", order["description"]),
            ("Paid with", order.get("method_detail") or order.get("method") or "—")]
    if order["kind"] == "lesson":
        rows += [("Tutor price", money(order["base_minor"])), ("Meridian fee", money(order["fee_minor"]))]
    rows += [("<b>Total</b>", "<b>%s</b>" % money(order["total_minor"]))]
    return _deliver(_message(
        to_address, "Receipt — %s" % order["description"],
        "Hi %s,\n\nThanks for your payment of %s for %s.\nOrder %s\n\n— Meridian"
        % (first_name, money(order["total_minor"]), order["description"], order["id"]),
        "Payment received",
        "Hi %s — thank you. Here is your receipt." % first_name,
        _rows(rows),
    ), to_address)


def send_booking_confirmed(to_address, first_name, tutor_name, when, service):
    return _deliver(_message(
        to_address, "Lesson booked with %s" % tutor_name,
        "Hi %s,\n\nYour lesson with %s on %s (%s) is booked.\n\n— Meridian" % (first_name, tutor_name, when, service),
        "Your lesson is booked",
        "Hi %s — it is in the tutor's calendar." % first_name,
        _rows([("Tutor", tutor_name), ("When", when), ("Service", service)]) +
        '<p style="margin:22px 0 0;">%s</p>' % _button(site_url("/account"), "View my lessons"),
    ), to_address)


def send_tutor_new_booking(to_address, tutor_first, student_name, when, service, note, payout):
    return _deliver(_message(
        to_address, "New lesson booked — %s" % when,
        "Hi %s,\n\n%s booked %s on %s. You receive %s.\n\nNote: %s\n\n— Meridian"
        % (tutor_first, student_name, service, when, payout, note or "—"),
        "New lesson booked",
        "Hi %s — a student booked one of the times you opened." % tutor_first,
        _rows([("Student", student_name), ("When", when), ("Service", service), ("You receive", payout),
               ("Note", note or "—")]) +
        '<p style="margin:22px 0 0;">%s</p>' % _button(site_url("/tutor"), "Open my dashboard"),
    ), to_address)


def send_booking_cancelled(to_address, first_name, tutor_name, when):
    return _deliver(_message(
        to_address, "Lesson cancelled — refund issued",
        "Hi %s,\n\nYour lesson with %s on %s was cancelled by the tutor. Your payment has been refunded in full.\n\n— Meridian"
        % (first_name, tutor_name, when),
        "Lesson cancelled",
        "Hi %s — %s had to cancel %s. Your payment has been refunded in full." % (first_name, tutor_name, when),
        _button(site_url("/teachers"), "Find another time"),
    ), to_address)


def send_partnership_inquiry(company, contact_name, email, kind, body):
    return _deliver(_message(
        Config.TEAM_INBOX, "[Partnership] %s — %s" % (company, kind or "general"),
        "Company: %s\nContact: %s\nEmail: %s\nType: %s\n\n%s" % (company, contact_name, email, kind, body),
        "New partnership enquiry", "Submitted through the Engage page.",
        _rows([("Company", company), ("Contact", contact_name), ("Email", email), ("Type", kind or "—")]) +
        '<div style="margin-top:16px;padding:16px;border-radius:12px;background:#f2f7ff;font-size:14px;'
        'line-height:1.7;color:#0d2148;white-space:pre-wrap;">%s</div>' % body,
        "Reply directly to this email to reach %s." % email, reply_to=email,
    ), Config.TEAM_INBOX)


def send_tutor_application(name, email, headline):
    return _deliver(_message(
        Config.TEAM_INBOX, "[Tutor application] %s" % name,
        "%s (%s) applied to teach: %s\nReview it at %s" % (name, email, headline, site_url("/admin")),
        "New tutor application", "Review and approve it from the admin page.",
        _rows([("Name", name), ("Email", email), ("Teaches", headline)]) +
        '<p style="margin:22px 0 0;">%s</p>' % _button(site_url("/admin"), "Review application"),
        reply_to=email,
    ), Config.TEAM_INBOX)


def send_tutor_approved(to_address, first_name):
    return _deliver(_message(
        to_address, "You are now a Meridian tutor",
        "Hi %s,\n\nYour profile is approved and live. Open your dashboard to choose the times you teach.\n\n— Meridian"
        % first_name,
        "Welcome to the team",
        "Hi %s — your profile is approved and live. Choose the times you want to teach and students can book them." % first_name,
        _button(site_url("/tutor"), "Open my dashboard"),
    ), to_address)


def send_test(to_address):
    return _deliver(_message(
        to_address, "Meridian email is working",
        "If you can read this, Meridian can send email. Verification codes will now arrive in inboxes.",
        "Email is working",
        "Verification codes, password resets and receipts will now arrive in real inboxes.",
        _rows([("SMTP server", Config.SMTP_HOST), ("Sent from", Config.SMTP_USER)]),
    ), to_address)


def send_application_review(name, email, item_name):
    return _deliver(_message(
        Config.TEAM_INBOX, "[Application ready] %s → %s" % (name, item_name),
        "%s (%s) finished the checklist for %s and sent it for review.\nOpen %s"
        % (name, email, item_name, site_url("/admin")),
        "An application is ready for review", "Check the documents and submit it with the student.",
        _rows([("Student", name), ("Email", email), ("Applying to", item_name)]) +
        '<p style="margin:22px 0 0;">%s</p>' % _button(site_url("/admin"), "Open the admin page"),
        reply_to=email,
    ), Config.TEAM_INBOX)


def send_weekly_report(subject, text, html_body):
    return _deliver(_message(
        Config.TEAM_INBOX, subject, text,
        "Weekly activity report", "What happened on Meridian in the last seven days.",
        html_body,
    ), Config.TEAM_INBOX)


def send_counsellor_application(name, email, school, title):
    return _deliver(_message(
        Config.TEAM_INBOX, "[Counsellor application] %s — %s" % (name, school),
        "%s (%s), %s at %s, applied to join Meridian as a college counsellor.\nReview it at %s"
        % (name, email, title or "counsellor", school, site_url("/admin")),
        "New college counsellor application", "Approve only staff of schools we partner with.",
        _rows([("Name", name), ("Email", email), ("School", school), ("Role", title or "—")]) +
        '<p style="margin:22px 0 0;">%s</p>' % _button(site_url("/admin"), "Review application"),
        reply_to=email,
    ), Config.TEAM_INBOX)
