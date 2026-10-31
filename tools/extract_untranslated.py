#!/usr/bin/env python3
"""Collect every text that still lacks Georgian or Arabic into batches for the
translation agents.

    python3 -X utf8 tools/extract_untranslated.py [batch size, default 60] [--new]

--new keeps the batches already written and adds batches only for records not
in any of them (use it while translators are still working).

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


def write(prefix, items, size, order=None, append=False):
    """append=True keeps the existing batches (translators may be reading them),
    skips ids already in one, and numbers the new batches after them."""
    existing = sorted(glob.glob(os.path.join(OUT, prefix + "-[0-9]*.json")))
    first = 1
    if append:
        for path in existing:
            for key in json.load(open(path, encoding="utf-8")):
                items.pop(key, None)
            first = max(first, int(os.path.basename(path)[len(prefix) + 1:-5]) + 1)
    else:
        for path in existing:
            os.remove(path)
    ids = sorted(items, key=order) if order else sorted(items)
    for n, start in enumerate(range(0, len(ids), size), start=first):
        chunk = {i: items[i] for i in ids[start:start + size]}
        with open(os.path.join(OUT, "%s-%02d.json" % (prefix, n)), "w", encoding="utf-8") as fh:
            json.dump(chunk, fh, ensure_ascii=False, indent=1)
    return "%d (from %02d)" % ((len(ids) + size - 1) // size, first)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    append = "--new" in sys.argv
    size = int(args[0]) if args else 60
    os.makedirs(OUT, exist_ok=True)
    programs = json.load(open(os.path.join(DATA, "programs.json"), encoding="utf-8"))
    todo = {p["id"]: m for p in programs for m in [missing(p, PROGRAM_FIELDS)] if m}
    # Georgia first, then Qatar and the Gulf, then scholarships, then everything else
    rank = {}
    for p in programs:
        rank[p["id"]] = (0 if p.get("iso") == "GE" else 1 if p.get("iso") in ("QA", "AE", "SA", "KW", "BH", "OM")
                         else 2 if p.get("section") == "scholarship" else 3, p["id"])
    unis = json.load(open(os.path.join(DATA, "universities.json"), encoding="utf-8"))
    uni_todo = {u["id"]: m for u in unis for m in [missing(u, UNI_FIELDS)] if m}
    print("programmes needing ka/ar: %d -> %s batches" % (len(todo), write("in", todo, size, rank.get, append)))
    print("universities needing ka/ar: %d -> %s batches" % (len(uni_todo), write("uni-in", uni_todo, max(10, size // 3), None, append)))


if __name__ == "__main__":
    main()
