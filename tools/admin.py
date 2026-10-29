#!/usr/bin/env python3
"""Read the Meridian database from the command line.

    python3 tools/admin.py users
    python3 tools/admin.py bookings
    python3 tools/admin.py inquiries
    python3 tools/admin.py stats
    python3 tools/admin.py export users.csv --table users
    python3 tools/admin.py reset --yes

Everything comes out of backend/meridian.db — the same file the website writes to.
Passwords are never printed: only their hashes exist, and they cannot be reversed.
"""
import csv
import os
import sqlite3
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB = os.environ.get("MERIDIAN_DB", os.path.join(ROOT, "backend", "meridian.db"))

VIEWS = {
    "users": (
        "SELECT id, first_name, last_name, email, phone, verified, plan, grade, "
        "created_at, last_login_at FROM users ORDER BY id"
    ),
    "bookings": (
        "SELECT b.id, u.email, b.teacher_id, b.date, b.time, b.service, b.status, b.created_at "
        "FROM bookings b LEFT JOIN users u ON u.id = b.user_id ORDER BY b.date, b.time"
    ),
    "inquiries": (
        "SELECT id, company, contact_name, email, kind, created_at, handled "
        "FROM partnership_inquiries ORDER BY id DESC"
    ),
    "saved": (
        "SELECT u.email, s.program_id, s.created_at FROM saved_programs s "
        "JOIN users u ON u.id = s.user_id ORDER BY s.created_at DESC"
    ),
}


def connect():
    if not os.path.exists(DB):
        sys.exit("No database yet at %s — start the site once and create an account." % DB)
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn


def show(rows):
    if not rows:
        print("(nothing yet)")
        return
    headers = rows[0].keys()
    widths = [len(h) for h in headers]
    body = []
    for row in rows:
        cells = ["" if row[h] is None else str(row[h]) for h in headers]
        body.append(cells)
        for index, cell in enumerate(cells):
            widths[index] = max(widths[index], min(len(cell), 46))

    line = "  ".join(h.upper().ljust(widths[i])[: widths[i]] for i, h in enumerate(headers))
    print(line)
    print("-" * len(line))
    for cells in body:
        print("  ".join(c.ljust(widths[i])[: widths[i]] for i, c in enumerate(cells)))
    print("\n%d row(s)" % len(rows))


def stats():
    conn = connect()
    pairs = [
        ("accounts", "SELECT COUNT(*) FROM users"),
        ("verified", "SELECT COUNT(*) FROM users WHERE verified = 1"),
        ("compass members", "SELECT COUNT(*) FROM users WHERE plan = 'compass'"),
        ("lesson requests", "SELECT COUNT(*) FROM bookings"),
        ("saved programmes", "SELECT COUNT(*) FROM saved_programs"),
        ("partnership enquiries", "SELECT COUNT(*) FROM partnership_inquiries"),
        ("active sessions", "SELECT COUNT(*) FROM sessions"),
    ]
    print("Meridian — %s\n" % DB)
    for label, query in pairs:
        print("  %-24s %s" % (label, conn.execute(query).fetchone()[0]))
    conn.close()


def export(path, table):
    if table not in VIEWS:
        sys.exit("Unknown table %r. Choose from: %s" % (table, ", ".join(VIEWS)))
    conn = connect()
    rows = conn.execute(VIEWS[table]).fetchall()
    conn.close()
    if not rows:
        sys.exit("Nothing to export.")
    with open(path, "w", newline="", encoding="utf-8") as fh:
        writer = csv.writer(fh)
        writer.writerow(rows[0].keys())
        writer.writerows([tuple(r) for r in rows])
    print("Wrote %d row(s) to %s" % (len(rows), path))


def reset(confirmed):
    """Wipe every visitor-submitted record. Content JSON is untouched."""
    if not confirmed:
        sys.exit(
            "This deletes every account, lesson request and enquiry in\n  %s\n"
            "Re-run with --yes if that is what you want." % DB
        )
    conn = connect()
    with conn:
        for table in ("sessions", "verification_codes", "saved_programs",
                      "bookings", "partnership_inquiries", "users"):
            conn.execute("DELETE FROM %s" % table)
    conn.close()
    print("Cleared. The database is empty and ready for real sign-ups.")


def main():
    args = sys.argv[1:]
    if not args or args[0] in ("-h", "--help", "help"):
        print(__doc__)
        return
    command = args[0]

    if command == "stats":
        stats()
    elif command in VIEWS:
        conn = connect()
        show(conn.execute(VIEWS[command]).fetchall())
        conn.close()
    elif command == "export":
        if len(args) < 2:
            sys.exit("Usage: python3 tools/admin.py export <file.csv> [--table users]")
        table = "users"
        if "--table" in args:
            table = args[args.index("--table") + 1]
        export(args[1], table)
    elif command == "reset":
        reset("--yes" in args)
    elif command == "sql":
        if len(args) < 2:
            sys.exit('Usage: python3 tools/admin.py sql "SELECT ..."')
        conn = connect()
        show(conn.execute(args[1]).fetchall())
        conn.close()
    else:
        sys.exit("Unknown command %r. Try: %s, stats, export, reset, sql"
                 % (command, ", ".join(VIEWS)))


if __name__ == "__main__":
    main()
