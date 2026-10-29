#!/bin/bash
# ============================================================
#  Double-click this file to open the Meridian website.
#  It starts the server, opens your browser, and stays running.
#  To stop the site: close this Terminal window, or press Ctrl+C.
# ============================================================

cd "$(dirname "$0")" || exit 1

PORT=5001
URL="http://127.0.0.1:$PORT"

printf '\n\033[1;34m  MERIDIAN\033[0m\n'
printf '  The meridian line to connect your goals\n\n'

# --- 1. make sure Python is available -----------------------
if ! command -v python3 >/dev/null 2>&1; then
  echo "  Python 3 is not installed."
  echo "  Install it from https://www.python.org/downloads/ and try again."
  echo
  read -r -p "  Press Return to close..." _
  exit 1
fi

# --- 2. set up the virtual environment the first time -------
if [ ! -x ".venv/bin/python" ]; then
  echo "  First run — setting up (this takes about 20 seconds)..."
  python3 -m venv .venv || { echo "  Could not create .venv"; read -r -p "  Press Return..." _; exit 1; }
  ./.venv/bin/pip install --quiet --upgrade pip
  ./.venv/bin/pip install --quiet -r requirements.txt || {
    echo "  Could not install Flask."; read -r -p "  Press Return..." _; exit 1; }
  echo "  Done."
  echo
fi

# --- 3. if it is already running, just open the browser -----
if curl -s -o /dev/null --max-time 2 "$URL"; then
  echo "  Meridian is already running."
  echo "  Opening $URL"
  open "$URL"
  echo
  read -r -p "  Press Return to close this window..." _
  exit 0
fi

# --- 4. start the server, then open the browser -------------
echo "  Starting the server..."
( sleep 2; open "$URL" ) &

exec ./.venv/bin/python run.py
