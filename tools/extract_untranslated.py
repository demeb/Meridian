#!/usr/bin/env python3
"""Collect every text that still lacks Georgian or Arabic into batches for the
translation agents.

    python3 -X utf8 tools/extract_untranslated.py [batch size, default 60]

Writes backend/data/research/round6/translate/in-NN.json  ({id: {field: english}})
for programmes, and uni-in-NN.json for university profiles. The agents write
out-NN.json / uni-out-NN.json ({id: {field: {"ka": ..., "ar": ...}}}), applied by
tools/apply_translations.py and tools/merge_universities.py.
"""
import glob
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "backend", "data")
OUT = os.path.join(DATA, "research", "round6", "translate")
PROGRAM_FIELDS = ("name", "country", "summary", "duration", "about", "highlights", "eligibility", "how_to_apply", "costs")
UNI_FIELDS = ("name", "summary", "about", "aid_intl", "tests", "strengths", "top_programs", "gpa_note")


def missing(record, fields):
    out = {}
    for field in fields:
        value = record.get(field)
        if not isinstance(value, dict) or not value.get("en"):
            continue
        if not value.get("ka") or not value.get("ar"):
            out[field] = value["en"]
    if record.get("requirements"):
        labels = [r["label"] for r in record["requirements"] if isinstance(r, dict) and isinstance(r.get("label"), dict)]
        if labels and any(not l.get("ka") or not l.get("ar") for l in labels):
            out["requirements"] = [l.get("en", "") for l in labels]
    return out


def write(prefix, items, size):
    for path in glob.glob(os.path.join(OUT, prefix + "-[0-9]*.json")):
        os.remove(path)
    ids = sorted(items)
    for n, start in enumerate(range(0, len(ids), size), start=1):
        chunk = {i: items[i] for i in ids[start:start + size]}
        with open(os.path.join(OUT, "%s-%02d.json" % (prefix, n)), "w", encoding="utf-8") as fh:
            json.dump(chunk, fh, ensure_ascii=False, indent=1)
    return (len(ids) + size - 1) // size


def main():
    size = int(sys.argv[1]) if len(sys.argv) > 1 else 60
    os.makedirs(OUT, exist_ok=True)
    programs = json.load(open(os.path.join(DATA, "programs.json"), encoding="utf-8"))
    todo = {p["id"]: m for p in programs for m in [missing(p, PROGRAM_FIELDS)] if m}
    unis = json.load(open(os.path.join(DATA, "universities.json"), encoding="utf-8"))
    uni_todo = {u["id"]: m for u in unis for m in [missing(u, UNI_FIELDS)] if m}
    print("programmes needing ka/ar: %d -> %d batches" % (len(todo), write("in", todo, size)))
    print("universities needing ka/ar: %d -> %d batches" % (len(uni_todo), write("uni-in", uni_todo, max(10, size // 3))))


if __name__ == "__main__":
    main()
