#!/usr/bin/env python3
"""End-to-end check of the Meridian API against a running server.

    python3 tools/smoke_test.py            # uses http://127.0.0.1:5001

Creates throwaway accounts (smoke-*@example.test), books a lesson, pays,
applies as a tutor, approves, opens and closes slots, cancels with refund.
Exits non-zero on the first failure. Safe to run in test payment mode only.
"""
import io
import json
import os
import secrets
import sys
import urllib.request
import urllib.error
from http.cookiejar import CookieJar

BASE = os.environ.get("MERIDIAN_URL", "http://127.0.0.1:5001")
ADMIN = os.environ.get("MERIDIAN_ADMIN_TOKEN", "meridian-admin")


class Client:
    def __init__(self):
        self.jar = CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))

    def local_cookies(self):
        # production sets Secure cookies; Python's cookie jar would never send them back
        # over plain http to 127.0.0.1, so relax the flag when testing a local server
        if BASE.startswith("http://"):
            for cookie in self.jar:
                cookie.secure = False

    def call(self, method, path, data=None, form=None, files=None):
        headers = {}
        payload = None
        if files or form:
            boundary = "----meridian" + secrets.token_hex(8)
            buf = io.BytesIO()
            for key, value in (form or {}).items():
                buf.write(("--%s\r\nContent-Disposition: form-data; name=\"%s\"\r\n\r\n%s\r\n"
                           % (boundary, key, value)).encode("utf-8"))
            for key, (name, blob, ctype) in (files or {}).items():
                buf.write(("--%s\r\nContent-Disposition: form-data; name=\"%s\"; filename=\"%s\"\r\n"
                           "Content-Type: %s\r\n\r\n" % (boundary, key, name, ctype)).encode("utf-8"))
                buf.write(blob + b"\r\n")
            buf.write(("--%s--\r\n" % boundary).encode())
            payload = buf.getvalue()
            headers["Content-Type"] = "multipart/form-data; boundary=" + boundary
        elif data is not None:
            payload = json.dumps(data).encode("utf-8")
            headers["Content-Type"] = "application/json"
        req = urllib.request.Request(BASE + path, data=payload, headers=headers, method=method)
        try:
            with self.opener.open(req, timeout=20) as resp:
                self.local_cookies()
                return resp.status, json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as err:
            self.local_cookies()
            return err.code, json.loads(err.read().decode("utf-8") or "{}")


def check(label, condition, detail=""):
    print("  %s %s %s" % ("✓" if condition else "✗", label, detail))
    if not condition:
        sys.exit(1)


def signup(client, first):
    email = "smoke-%s@example.test" % secrets.token_hex(4)
    status, r = client.call("POST", "/api/auth/register", {
        "first_name": first, "last_name": "Smoke", "email": email, "password": "smoke-pass-123",
        "grade": "grade-11", "country": "GE", "interests": ["uwc", "sat"], "birth_date": "2008-04-17"})
    check("register %s" % first, r.get("ok") and r.get("dev_code"), email)
    status, r = client.call("POST", "/api/auth/verify", {"email": email, "code": r["dev_code"]})
    check("verify", r.get("ok"))
    return email


def tiny_jpeg():
    from PIL import Image
    buf = io.BytesIO()
    Image.new("RGB", (900, 1200), (40, 90, 180)).save(buf, "JPEG")
    return buf.getvalue()


def outbox_code(email):
    """The newest 6-digit code mailed to this address (dev outbox, no SMTP)."""
    import glob
    import re
    root = os.environ.get("MERIDIAN_STORAGE") or os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend")
    files = sorted(glob.glob(os.path.join(root, "outbox", "*%s*.eml" % email)))
    for path in reversed(files):
        text = open(path, encoding="utf-8", errors="ignore").read()
        match = re.search(r"Subject: (\d{6}) ", text) or re.search(r"code is (\d{6})", text)
        if match:
            return match.group(1)
    return None


def cleanup():
    """Remove every throwaway account this script (or a manual test) created."""
    import sqlite3
    path = os.environ.get("MERIDIAN_DB", os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                                                      "backend", "meridian.db"))
    conn = sqlite3.connect(path)
    conn.execute("PRAGMA foreign_keys = ON")
    ids = [r[0] for r in conn.execute("SELECT id FROM users WHERE email LIKE '%@example.test'")]
    tutors = [r[0] for r in conn.execute(
        "SELECT id FROM tutors WHERE user_id IN (%s)" % ",".join("?" * len(ids)), ids)] if ids else []
    with conn:
        for tid in tutors:
            conn.execute("DELETE FROM tutor_slots WHERE tutor_id = ?", (tid,))
            conn.execute("DELETE FROM tutors WHERE id = ?", (tid,))
        if ids:
            marks = ",".join("?" * len(ids))
            orders = [r[0] for r in conn.execute("SELECT id FROM orders WHERE user_id IN (%s)" % marks, ids)]
            for oid in orders:
                conn.execute("DELETE FROM ledger WHERE order_id = ?", (oid,))
            slot_ids = [r[0] for r in conn.execute(
                "SELECT slot_id FROM bookings WHERE user_id IN (%s) AND slot_id IS NOT NULL" % marks, ids)]
            for sid in slot_ids:
                conn.execute("UPDATE tutor_slots SET status = 'open', held_until = NULL WHERE id = ?", (sid,))
            for table in ("bookings", "orders", "saved_programs", "sessions", "verification_codes"):
                conn.execute("DELETE FROM %s WHERE user_id IN (%s)" % (table, marks), ids)
            conn.execute("DELETE FROM users WHERE id IN (%s)" % marks, ids)
    conn.close()
    print("  cleaned up %d test account(s), %d test tutor(s)" % (len(ids), len(tutors)))


def main():
    if "--cleanup" in sys.argv:
        cleanup()
        return
    print("Meridian smoke test against %s" % BASE)

    print("\nStudent")
    student = Client()
    email = signup(student, "Student")
    _, r = student.call("POST", "/api/auth/forgot", {"email": email})
    # outside debug mode the reset code is never shown on screen (it would let anyone
    # take over an account), so read it from the outbox the way the student's inbox would
    code = r.get("dev_code") or outbox_code(email)
    check("forgot sends reset code", r.get("ok") and code)
    _, bad = student.call("POST", "/api/auth/reset", {"email": email, "code": "000000", "password": "another-pass"})
    check("wrong reset code refused", not bad.get("ok"), bad.get("error", ""))
    _, r = student.call("POST", "/api/auth/reset", {"email": email, "code": code, "password": "another-pass"})
    check("reset with right code", r.get("ok"))
    _, r = student.call("POST", "/api/auth/login", {"email": email, "password": "another-pass"})
    check("login with new password", r.get("ok"))

    print("\nBooking + payment")
    _, t = student.call("GET", "/api/teachers/nino-kvaratskhelia")
    teacher = t["teacher"]
    service = teacher["services"][0]
    check("price shown = tutor price + 10%", abs(service["price_display"] - service["price"] * 1.1) < 0.01,
          "%s -> %s" % (service["price"], service["price_display"]))
    slot = next(s for s in teacher["slots"] if s["available"])
    _, r = student.call("POST", "/api/bookings", {"teacher_id": teacher["id"], "slot_id": slot["id"],
                                                    "service_index": 0, "note": "smoke"})
    check("slot held, order created", r.get("ok"), r.get("order_id", ""))
    order_id = r["order_id"]
    other = Client()
    signup(other, "Rival")
    _, r2 = other.call("POST", "/api/bookings", {"teacher_id": teacher["id"], "slot_id": slot["id"], "service_index": 0})
    check("same slot cannot be held twice", r2.get("error") == "slot_taken")
    _, r = student.call("POST", "/api/orders/%s/pay" % order_id, {"method": "card", "card": {"brand": "Visa", "last4": "0002"}})
    check("test decline card refused", r.get("error") == "card_declined")
    _, r = student.call("POST", "/api/orders/%s/pay" % order_id, {"method": "card", "card": {"brand": "Visa", "last4": "4242"}})
    order = r.get("order", {})
    check("payment accepted", order.get("status") == "paid", order.get("method_detail", ""))
    check("fee is 10% of tutor price", order["fee_minor"] == round(order["base_minor"] * 0.10),
          "%d + %d = %d" % (order["base_minor"], order["fee_minor"], order["total_minor"]))
    _, b = student.call("GET", "/api/bookings")
    check("booking confirmed", any(x["status"] == "confirmed" for x in b["bookings"]))

    print("\nTutor application")
    tutor = Client()
    signup(tutor, "Tutor")
    _, r = tutor.call("POST", "/api/tutor/apply", form={
        "headline": "IELTS Speaking Coach", "intro": "I help students reach band 7.", "bio": "Longer bio.",
        "subjects": "ielts,english", "regions": "uk,europe", "languages": "ka,en", "price": "20",
        "experience": "4", "country": "GE", "country_name": "Georgia", "city": "Tbilisi",
        "education": "Tbilisi State University | BA English | 2016–2020"},
        files={"photo": ("me.jpg", tiny_jpeg(), "image/jpeg")})
    check("application stored as pending", r.get("status") == "pending", r.get("tutor_id", ""))
    tutor_id = r["tutor_id"]
    admin = Client()
    _, r = admin.call("POST", "/api/admin/tutors/%s/approve?token=%s" % (tutor_id, ADMIN))
    check("admin approves", r.get("ok"))
    _, me = tutor.call("GET", "/api/tutor/me")
    check("tutor dashboard loads", me.get("ok"), "%d slots" % len(me["slots"]))
    check("photo saved as square jpeg", me["tutor"]["photo"].endswith(".jpg"))
    target = me["slots"][0]["starts_at"][:11] + "21:00"
    _, r = tutor.call("POST", "/api/tutor/slots", {"open": True, "slots": [target]})
    check("tutor opens a slot", r["results"].get(target) == "open", target)
    _, t2 = student.call("GET", "/api/teachers/%s" % tutor_id)
    s20 = t2["teacher"]["services"][0]
    check("20 becomes 22 for students", s20["price_display"] == 22, "%s -> %s" % (s20["price"], s20["price_display"]))
    new_slot = next(s for s in t2["teacher"]["slots"] if s["starts_at"] == target)
    _, r = student.call("POST", "/api/bookings", {"teacher_id": tutor_id, "slot_id": new_slot["id"], "service_index": 0})
    _, r = student.call("POST", "/api/orders/%s/pay" % r["order_id"], {"method": "card", "card": {"brand": "Mastercard", "last4": "4444"}})
    check("student books the new tutor", r.get("order", {}).get("status") == "paid")
    _, me = tutor.call("GET", "/api/tutor/me")
    booking = next(b for b in me["bookings"] if b["status"] == "confirmed")
    check("tutor sees the booking in-platform", booking["student"]["name"].startswith("Student"))
    check("tutor payout recorded", me["earnings"]["payout_minor"] == 2000, "%d" % me["earnings"]["payout_minor"])
    _, r = tutor.call("POST", "/api/tutor/bookings/%d/cancel" % booking["id"], {"reason": "smoke"})
    check("tutor cancels -> refund", r.get("ok"))
    _, me = tutor.call("GET", "/api/tutor/me")
    check("payout reversed", me["earnings"]["payout_minor"] == 0)

    print("\nMembership")
    _, r = student.call("POST", "/api/checkout/plan", {"plan": "navigator", "cycle": "yearly"})
    order_id = r["order_id"]
    _, r = student.call("POST", "/api/orders/%s/pay" % order_id, {"method": "apple_pay"})
    check("non-card method refused", r.get("error") == "unknown_method")
    _, r = student.call("POST", "/api/orders/%s/pay" % order_id, {"method": "card", "card": {"brand": "Amex", "last4": "0005"}})
    check("non Visa/Mastercard brand refused", r.get("error") == "card_brand")
    _, r = student.call("POST", "/api/orders/%s/pay" % order_id, {"method": "card", "card": {"brand": "Visa", "last4": "4242"}})
    _, me = student.call("GET", "/api/auth/me")
    check("navigator yearly active", me["user"]["plan"] == "navigator", me["user"].get("plan_renews_at", ""))

    print("\nAll checks passed.")
    cleanup()


if __name__ == "__main__":
    main()
