#!/bin/bash
# Double-click to connect Meridian to Gmail so verification codes reach real inboxes.
cd "$(dirname "$0")" || exit 1
if [ ! -x ".venv/bin/python" ]; then
  python3 -m venv .venv && ./.venv/bin/pip install --quiet -r requirements.txt
fi
./.venv/bin/python tools/setup_email.py
echo
read -r -p "  Press Return to close this window..." _
