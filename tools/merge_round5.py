#!/usr/bin/env python3
"""Bring the round-4/5 research into the live catalogue. Safe to run again.

    python3 -X utf8 tools/merge_round5.py            # write
    python3 -X utf8 tools/merge_round5.py --dry-run  # only report

1. Applies the fact-checker (research/round5/verification.json) to live and
   incoming records: "closed", "dead-link" and "generic" go to the archive with
   the reason; "update" corrects the deadline, dates and links.
2. Adds every incoming record (research/incoming/*.json and research/round5/*)
   that is complete, not expired, not a duplicate, and links only to the
   organiser's own site.
3. Rebuilds the university catalogue (tools/merge_universities.py) and copies
   the prep, course and self-test content next to the live data.
"""
import glob
import json
import os
import re
import shutil
import subprocess
import sys
from datetime import date, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "backend", "data")
RESEARCH = os.path.join(DATA, "research")
PROGRAMS = os.path.join(DATA, "programs.json")
ARCHIVE = os.path.join(DATA, "archive", "programs-archive.json")
TODAY = date.today().isoformat()
DRY = "--dry-run" in sys.argv

FAMILIES = {"mun", "erasmus", "exchange", "flex", "uwc", "summer", "competition", "startup", "youth",
            "volunteering", "stem", "training", "scholarship"}
FAMILY_ALIASES = {"university": "scholarship", "hackathon": "competition", "olympiad": "competition",
                  "volunteer": "volunteering", "webinar": "training", "course": "training", "camp": "summer",
                  "entrepreneurship": "startup", "research": "stem"}
AGGREGATORS = re.compile(r"mymun|opportunitydesk|youthop\.|youthopportunities|scholars4dev|opportunitiescircle|"
                         r"afterschoolafrica|scholarshipportal|opportunitiesforafricans|worldscholarshipforum", re.I)
REQUIRED = ("id", "name", "iso", "url")


def load(path, default=None):
    try:
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    except (OSError, ValueError) as exc:
        print("  ! skip %s (%s)" % (os.path.relpath(path, ROOT), exc))
        return default


def save(path, data):
    if DRY:
        return
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)
    os.replace(tmp, path)


def flag(iso):
    return "".join(chr(0x1F1E6 + ord(c) - 65) for c in iso.upper()) if iso and len(iso) == 2 and iso.isalpha() else ""


def tri(value):
    """Make sure a text field is {"en", "ka", "ar"}; missing languages fall back to English on the site."""
    if isinstance(value, dict):
        return value
    if isinstance(value, list):
        return {"en": value}
    return {"en": value or ""}


def normalise(r, source):
    r = dict(r)
    r["iso"] = (r.get("iso") or "").upper()
    if r["iso"] in ("EU", "XX", ""):
        return None, "no host country"
    for key in REQUIRED:
        if not r.get(key):
            return None, "missing %s" % key
    if r.get("lat") is None or r.get("lon") is None:
        return None, "no coordinates"
    fam = (r.get("family") or "").lower()
    fam = FAMILY_ALIASES.get(fam, fam)
    if r.get("section") == "scholarship":
        fam = "scholarship" if fam not in ("erasmus",) else fam
    if fam not in FAMILIES:
        return None, "unknown family %s" % fam
    r["family"] = fam
    r["section"] = "scholarship" if (r.get("section") == "scholarship" or fam == "scholarship") else "project"
    if r["section"] == "scholarship" and isinstance(r.get("level"), str):
        r["level"] = [r["level"]]
    for key in ("name", "country", "summary", "duration", "about", "eligibility", "costs"):
        if key in r:
            r[key] = tri(r[key])
    for key in ("highlights", "how_to_apply"):
        if key in r and not isinstance(r[key], dict):
            r[key] = {"en": r[key] if isinstance(r[key], list) else [r[key]]}
    links = [r.get("url") or "", r.get("apply_url") or ""] + list(r.get("sources") or [])
    if any(AGGREGATORS.search(str(l)) for l in links) or AGGREGATORS.search(json.dumps(r.get("about", ""))):
        # the "Youthopia Center" venue legitimately contains "youthop"
        if not re.search(r"youthopia", json.dumps(r, ensure_ascii=False), re.I):
            return None, "aggregator link"
    if r.get("deadline") and r["deadline"] < TODAY:
        return None, "deadline passed"
    if not r.get("deadline") and r.get("event_dates"):
        end = str(r["event_dates"])[-10:]
        if re.match(r"\d{4}-\d{2}-\d{2}$", end) and end < TODAY:
            return None, "already happened"
    r.setdefault("flag", flag(r["iso"]))
    r.setdefault("cost", "paid")
    r.setdefault("score", 5)
    r.setdefault("found_by", "round5:" + os.path.basename(source))
    r.setdefault("verified_at", TODAY)
    return r, None


def main():
    live = load(PROGRAMS, [])
    archive = load(ARCHIVE, []) or []
    archived_ids = {a["id"] for a in archive}
    verdicts = {v["id"]: v for v in (load(os.path.join(RESEARCH, "round5", "verification.json"), []) or [])
                if isinstance(v, dict) and v.get("id")}
    stamp = datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
    moved, updated = [], []

    def retire(record, reason):
        item = dict(record, archived_at=stamp, archived_reason=reason)
        archive.append(item)
        archived_ids.add(record["id"])
        moved.append((record["id"], reason))

    def apply_verdict(record):
        v = verdicts.get(record["id"])
        if not v:
            return record
        status = v.get("status")
        if status in ("closed", "dead-link", "generic"):
            retire(record, "%s (fact-check %s): %s" % (status, TODAY, (v.get("note") or "")[:300]))
            return None
        if status == "update":
            for key in ("deadline", "event_dates", "url", "apply_url"):
                if v.get(key):
                    record[key] = v[key]
            if v.get("note"):
                record["deadline_note"] = v["note"][:400]
            record["verified_at"] = TODAY
            updated.append(record["id"])
        elif status == "ok":
            record["verified_at"] = TODAY
        return record

    kept = []
    for record in live:
        record = apply_verdict(record)
        if record is not None:
            kept.append(record)
    ids = {p["id"] for p in kept}

    sources = sorted(glob.glob(os.path.join(RESEARCH, "incoming", "*.json"))) + \
        sorted(glob.glob(os.path.join(RESEARCH, "round5", "*.json")))
    skip_files = ("global-facts", "i18n", "universities", "verification", "prep", "courses", "quizzes", "EXISTING")
    added, rejected = [], {}
    by_file = {}
    for path in sources:
        name = os.path.basename(path)
        if any(name.startswith(s) for s in skip_files):
            continue
        rows = load(path, [])
        if not isinstance(rows, list):
            continue
        count = 0
        for raw in rows:
            if not isinstance(raw, dict) or not raw.get("id"):
                continue
            if raw["id"] in ids or raw["id"] in archived_ids:
                continue
            record, why = normalise(raw, path)
            if record is None:
                rejected[why] = rejected.get(why, 0) + 1
                continue
            record = apply_verdict(record)
            if record is None:
                continue
            kept.append(record)
            ids.add(record["id"])
            added.append(record["id"])
            count += 1
        by_file[name] = (len(rows), count)

    print("\nprogrammes by source file (rows → added)")
    for name, (rows, count) in by_file.items():
        print("  %-48s %4d → %4d" % (name, rows, count))
    print("\nlive before %d · archived now %d · corrected %d · added %d · live after %d"
          % (len(live), len(moved), len(updated), len(added), len(kept)))
    if rejected:
        print("rejected: " + ", ".join("%s %d" % kv for kv in sorted(rejected.items(), key=lambda kv: -kv[1])))
    sections = {}
    regions = {}
    for p in kept:
        sections[p["section"] + ":" + p["family"]] = sections.get(p["section"] + ":" + p["family"], 0) + 1
        bucket = "qatar+gulf" if p["iso"] in ("QA", "AE", "SA", "KW", "BH", "OM") else "georgia" if p["iso"] == "GE" else "world"
        regions[bucket] = regions.get(bucket, 0) + 1
    print("by family: " + ", ".join("%s %d" % kv for kv in sorted(sections.items())))
    print("by region: " + ", ".join("%s %d" % kv for kv in sorted(regions.items())))

    save(PROGRAMS, kept)
    save(ARCHIVE, archive)

    for name in ("prep", "courses", "quizzes"):
        src = os.path.join(RESEARCH, "round5", name + ".json")
        if os.path.exists(src) and load(src) is not None and not DRY:
            shutil.copyfile(src, os.path.join(DATA, name + ".json"))
            print("copied %s.json" % name)

    if not DRY:
        subprocess.run([sys.executable, "-X", "utf8", os.path.join(ROOT, "tools", "merge_universities.py")], check=False)


if __name__ == "__main__":
    main()
