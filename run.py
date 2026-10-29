#!/usr/bin/env python3
"""Start Meridian.

    python3 -m venv .venv && source .venv/bin/activate
    pip install -r requirements.txt
    python3 run.py

Then open http://127.0.0.1:5001
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend"))

from app import create_app          # noqa: E402
from config import Config           # noqa: E402

application = create_app()

if __name__ == "__main__":
    banner = """
  ┌──────────────────────────────────────────────┐
  │  MERIDIAN                                    │
  │  The meridian line to connect your goals     │
  ├──────────────────────────────────────────────┤
  │  site    http://{host}:{port}{pad1}│
  │  admin   http://{host}:{port}/admin{pad2}│
  │  data    backend/meridian.db                 │
  │  mail    {mail}{pad3}│
  └──────────────────────────────────────────────┘
"""
    host = Config.HOST
    port = Config.PORT
    mail = "live SMTP" if Config.smtp_configured() else "console + backend/outbox/"
    base = "%s:%d" % (host, port)
    print(banner.format(
        host=host, port=port, mail=mail,
        pad1=" " * max(1, 29 - len(base)),
        pad2=" " * max(1, 23 - len(base)),
        pad3=" " * max(1, 36 - len(mail)),
    ))
    application.run(host=host, port=port, debug=Config.DEBUG, use_reloader=Config.DEBUG)
