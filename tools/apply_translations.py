#!/usr/bin/env python3
"""Fill in Georgian and Arabic text from the translation agents' files.

    python3 -X utf8 tools/apply_translations.py

Reads backend/data/research/round5/translate/out-*.json
({id: {field: {"ka": ..., "ar": ...}}}) and writes the values into
backend/data/programs.json, never overwriting text that is already there.
"""
import glob
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROGRAMS = os.path.join(ROOT, "backend", "data", "programs.json")
OUT = [os.path.join(ROOT, "backend", "data", "research", r, "translate", "out-*.json") for r in ("round5", "round6")]


def main():
    done = {}
    for path in sorted(p for pattern in OUT for p in glob.glob(pattern)):
        try:
            done.update(json.load(open(path, encoding="utf-8")))
        except ValueError as exc:
            print("skip %s: %s" % (os.path.basename(path), exc))
    programs = json.load(open(PROGRAMS, encoding="utf-8"))
    filled = 0
    for record in programs:
        fields = done.get(record["id"]) or {}
        for field, langs in fields.items():
            if not isinstance(langs, dict):
                continue
            target = record.get(field)
            if not isinstance(target, dict):
                continue
            en = target.get("en")
            for lang in ("ka", "ar"):
                value = langs.get(lang)
                if not value or target.get(lang):
                    continue
                # lists must keep their shape so bullets line up across languages
                if isinstance(en, list) and (not isinstance(value, list) or len(value) != len(en)):
                    continue
                target[lang] = value
                filled += 1
    tmp = PROGRAMS + ".tmp"
    json.dump(programs, open(tmp, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    os.replace(tmp, PROGRAMS)
    print("translated records available: %d · fields filled: %d" % (len(done), filled))


if __name__ == "__main__":
    main()
