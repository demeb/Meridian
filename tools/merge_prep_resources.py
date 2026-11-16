#!/usr/bin/env python3
"""Add the round-9 prep resources (research/round9/prep-resources-p*.json) to prep.json.

    python3 -X utf8 tools/merge_prep_resources.py

Each file is {exam_id: [resource, ...]}; a resource whose URL is already listed
for that exam is skipped, and empty Georgian/Arabic strings are dropped.
"""
import glob
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PREP = os.path.join(ROOT, "backend", "data", "prep.json")
KINDS = {"official", "practice-test", "course", "video", "app", "book"}


def norm(url):
    return (url or "").strip().rstrip("/").replace("http://", "https://").replace("://www.", "://").lower()


def main():
    prep = json.load(open(PREP, encoding="utf-8"))
    exams = {e["id"]: e for e in prep["exams"]}
    added = 0
    for path in sorted(glob.glob(os.path.join(ROOT, "backend", "data", "research", "round9", "prep-resources-p*.json"))):
        for exam_id, items in json.load(open(path, encoding="utf-8")).items():
            exam = exams.get(exam_id)
            if not exam or not isinstance(items, list):
                continue
            have = {norm(r.get("url")) for r in exam["resources"]}
            for r in items:
                if not isinstance(r, dict) or not r.get("url") or norm(r["url"]) in have:
                    continue
                if r.get("kind") not in KINDS or not isinstance(r.get("title"), dict) or not r["title"].get("en"):
                    continue
                r["title"] = {k: v for k, v in r["title"].items() if v}
                r.setdefault("free", True)
                r.setdefault("section", "All")
                exam["resources"].append(r)
                have.add(norm(r["url"]))
                added += 1
    with open(PREP, "w", encoding="utf-8") as fh:
        json.dump(prep, fh, ensure_ascii=False, indent=1)
    print("added %d resources" % added)


if __name__ == "__main__":
    main()
