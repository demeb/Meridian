"""The catalogue: projects, scholarships and universities.

    programs.json        what the website shows (projects + scholarships)
    universities.json    full university profiles (own page, checklist, apply)
    archive/programs-archive.json
                         everything taken off the site: deadline passed,
                         replaced by something more specific, or moved to the
                         universities section. Kept for the team, never shown.

Expired programmes leave the site on their own: sweep_expired() runs at most
once an hour and moves anything whose deadline has passed into the archive.
"""
import json
import os
import threading
import time
from datetime import date, datetime

from config import DATA_DIR

PROGRAMS = os.path.join(DATA_DIR, "programs.json")
UNIVERSITIES = os.path.join(DATA_DIR, "universities.json")
DIRECTORY = os.path.join(DATA_DIR, "universities-directory.json")
# Every other QS-ranked university (built by tools/merge_universities.py); when it
# exists it replaces the old 10k directory, so the catalogue is the QS list only.
QS_LIST = os.path.join(DATA_DIR, "universities-qs.json")
ARCHIVE_DIR = os.path.join(DATA_DIR, "archive")
ARCHIVE = os.path.join(ARCHIVE_DIR, "programs-archive.json")

SECTIONS = ("project", "scholarship")

# Words students type that don't appear in a programme's own name
SYNONYMS = {
    "exchange": ["exchange", "flex", "erasmus", "youth exchange", "ugrad", "semester abroad", "mobility"],
    "scholarship": ["scholarship", "funding", "fully-funded", "grant", "fellowship", "bursary"],
    "mun": ["mun", "model united nations", "un", "diplomacy", "debate"],
    "summer": ["summer", "summer school", "pre-college", "camp"],
    "masters": ["master", "masters", "msc", "ma", "mphil", "postgraduate", "graduate"],
    "phd": ["phd", "doctorate", "doctoral"],
    "bachelor": ["bachelor", "undergraduate", "ba", "bsc", "degree"],
    "competition": ["competition", "olympiad", "contest", "prize", "hackathon", "challenge"],
    "startup": ["startup", "accelerator", "founder", "entrepreneur", "incubator", "investor"],
    "volunteer": ["volunteer", "volunteering", "solidarity", "esc"],
}

_lock = threading.Lock()
_cache = {}
_last_sweep = [0.0]


def _read(path, default):
    try:
        stamp = os.path.getmtime(path)
    except OSError:
        return default
    hit = _cache.get(path)
    if hit and hit[0] == stamp:
        return hit[1]
    with open(path, "r", encoding="utf-8") as fh:
        data = json.load(fh)
    _cache[path] = (stamp, data)
    return data


def _write(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)
    os.replace(tmp, path)
    _cache.pop(path, None)


def today():
    return date.today().isoformat()


def is_expired(record, on=None):
    deadline = record.get("deadline")
    return bool(deadline) and deadline < (on or today())


def archive(records, reason):
    """Append records to the internal archive with a reason and a timestamp."""
    if not records:
        return
    stamp = datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
    existing = _read(ARCHIVE, [])
    kept = {r["id"]: r for r in existing}
    for record in records:
        item = dict(record)
        item["archived_at"] = stamp
        item["archived_reason"] = reason
        kept[item["id"]] = item
    _write(ARCHIVE, list(kept.values()))


def sweep_expired(force=False):
    """Move programmes whose deadline has passed off the site. Returns how many moved."""
    if not force and time.time() - _last_sweep[0] < 3600:
        return 0
    with _lock:
        _last_sweep[0] = time.time()
        programs = _read(PROGRAMS, [])
        expired = [p for p in programs if is_expired(p)]
        if not expired:
            return 0
        archive(expired, "deadline passed")
        _write(PROGRAMS, [p for p in programs if not is_expired(p)])
        return len(expired)


def programs():
    sweep_expired()
    return _read(PROGRAMS, [])


def archived():
    return _read(ARCHIVE, [])


def universities():
    return _read(UNIVERSITIES, [])


def directory():
    """Every university we know of: full profiles first, then the basic list."""
    full = universities()
    if os.path.exists(QS_LIST):
        return full, _read(QS_LIST, [])
    have = {(u.get("website") or "").split("//")[-1].strip("/").replace("www.", "") for u in full}
    rest = [d for d in _read(DIRECTORY, [])
            if d.get("domain", "").replace("www.", "") not in have]
    return full, rest


def find_program(program_id):
    for p in programs():
        if p["id"] == program_id:
            return p
    return None


def find_university(uni_id):
    for u in universities():
        if u["id"] == uni_id:
            return u
    for d in directory()[1]:
        if d["id"] == uni_id:
            return d
    return None


def add_programs(records, found_by):
    """Append approved records, skipping duplicates and anything already expired."""
    with _lock:
        current = _read(PROGRAMS, [])
        ids = {p["id"] for p in current}
        added = []
        for record in records:
            if record["id"] in ids or is_expired(record):
                continue
            record.setdefault("found_by", found_by)
            current.append(record)
            ids.add(record["id"])
            added.append(record["id"])
        _write(PROGRAMS, current)
        return added
