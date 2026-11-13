#!/usr/bin/env python3
"""Tidy the round-8 programme files before tools/merge_round5.py reads them.

    python3 -X utf8 tools/clean_round8.py

- drops empty "ka"/"ar" strings, so the site falls back to English instead of a blank
- drops records that repeat a live programme or another round-8 record (same name)
- drops records that are not internships/exchanges/scholarships (prize competitions)
"""
import glob
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R8 = os.path.join(ROOT, "backend", "data", "research", "round8")
LIVE = os.path.join(ROOT, "backend", "data", "programs.json")
NOT_PROGRAMMES = re.compile(r"\bprize competition\b|sanger-prize", re.I)


def key(name):
    name = re.sub(r"\(.*?\)|\b20\d\d(-\d\d)?\b|programme|program|internships?|traineeships?", " ", (name or "").lower())
    return re.sub(r"[^a-z0-9]+", " ", name).strip()


def strip_empty(value):
    if isinstance(value, dict):
        out = {k: strip_empty(v) for k, v in value.items() if not (k in ("ka", "ar") and v in ("", [], None))}
        return out
    if isinstance(value, list):
        return [strip_empty(v) for v in value]
    return value


def main():
    live = json.load(open(LIVE, encoding="utf-8"))
    seen = {key(p["name"].get("en")) for p in live} | {p["id"] for p in live}
    for path in sorted(glob.glob(os.path.join(R8, "*.json"))):
        name = os.path.basename(path)
        if not name.startswith(("internships-", "exchanges-", "scholarships-")):
            continue
        rows = json.load(open(path, encoding="utf-8"))
        kept = []
        for r in rows:
            k = key((r.get("name") or {}).get("en"))
            if NOT_PROGRAMMES.search(r.get("id", "")) or NOT_PROGRAMMES.search(r.get("type") or ""):
                print("  drop (not a programme) %s" % r["id"])
                continue
            if r.get("id") in seen or (k and k in seen):
                print("  drop (duplicate) %s" % r["id"])
                continue
            seen.update({r.get("id"), k})
            kept.append(strip_empty(r))
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(kept, fh, ensure_ascii=False, indent=0)
        print("%-28s %3d -> %3d" % (name, len(rows), len(kept)))


if __name__ == "__main__":
    main()
