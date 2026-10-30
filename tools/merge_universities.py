#!/usr/bin/env python3
"""Build the university catalogue from the research agents' files.

    python3 -X utf8 tools/merge_universities.py

Reads
  backend/data/research/incoming/universities-*.json    (round 4 profiles)
  backend/data/research/round5/universities-*.json      (round 5 profiles)
  backend/data/research/round5/universities-qs-list.json (the QS ranking list)
Writes
  backend/data/universities.json      full profiles (one page each, with all the data)
  backend/data/universities-qs.json   every other QS-ranked university (basic page)
"""
import glob
import json
import os
import re
import unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "backend", "data")
RESEARCH = os.path.join(DATA, "research")
REGIONS = json.load(open(os.path.join(DATA, "iso-regions.json"), encoding="utf-8"))


def load(path):
    try:
        data = json.load(open(path, encoding="utf-8"))
    except (OSError, ValueError) as exc:
        print("  skip %s (%s)" % (os.path.relpath(path, ROOT), exc))
        return []
    return data if isinstance(data, list) else data.get("universities", [])


def slug(text):
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:70]


def norm(name):
    name = re.sub(r"\(.*?\)", "", name or "")
    return slug(name.replace("&", "and")).replace("the-", "")


def domain(url):
    host = re.sub(r"^https?://", "", url or "").split("/")[0].lower()
    return host[4:] if host.startswith("www.") else host


def flag(iso):
    if not iso or len(iso) != 2 or not iso.isalpha():
        return ""
    return "".join(chr(0x1F1E6 + ord(c) - 65) for c in iso.upper())


def tier(rank):
    if not rank:
        return "other"
    return "top-50" if rank <= 50 else "top-200" if rank <= 200 else "top-500" if rank <= 500 else "other"


def country_of(iso, fallback=None):
    info = REGIONS.get(iso or "")
    if info:
        return {"en": info["en"], "ka": info["ka"], "ar": info["ar"]}
    return fallback or {"en": iso or ""}


def enrich(u):
    """Fill structured filter fields from the verified 'tests' text when the
    agent left them empty: SAT policy and English-test minimums."""
    text = u.get("tests", {}).get("en", "") if isinstance(u.get("tests"), dict) else ""
    if not text:
        return
    sat = u.get("sat") if isinstance(u.get("sat"), dict) else {}
    if not sat.get("required"):
        low = text.lower()
        if re.search(r"\b(no sat|sat/act (are )?not (required|considered)|does not (require|consider) (the )?sat)", low):
            sat["required"] = "not-considered"
        elif re.search(r"test[- ]optional|sat[^.]{0,40}optional|optional[^.]{0,30}sat", low):
            sat["required"] = "optional"
        elif re.search(r"sat or act (is |are )?required|sat/act required|requires? (the )?sat", low):
            sat["required"] = "required"
        if sat.get("required"):
            u["sat"] = sat
    def first(pattern, cast):
        m = re.search(pattern, text, re.I)
        return cast(m.group(1)) if m else None
    if not u.get("ielts_min"):
        u["ielts_min"] = first(r"IELTS(?: Academic)?\s*(?:of\s*|minimum\s*)?([4-9](?:\.[05])?)\b", float)
    if not u.get("toefl_min"):
        u["toefl_min"] = first(r"TOEFL(?: iBT)?\s*(?:of\s*|~|minimum\s*)?(\d{2,3})\b", int)
    if not u.get("duolingo_min"):
        u["duolingo_min"] = first(r"Duolingo(?: English Test)?\s*(?:of\s*)?(\d{2,3})\b", int)
    # drop values outside each test's real scale (sub-scores, paper TOEFL, typos)
    for key, lo, hi in (("ielts_min", 4, 9), ("toefl_min", 40, 120), ("duolingo_min", 60, 160)):
        if u.get(key) is not None and not (lo <= u[key] <= hi):
            u[key] = None


def translate(unis):
    """Georgian and Arabic from the translation agent (research/round5/translate/uni-out.json)."""
    done = {}
    paths = [os.path.join(RESEARCH, "round5", "translate", "uni-out.json")] + \
        sorted(glob.glob(os.path.join(RESEARCH, "round6", "translate", "uni-out-*.json")))
    for path in paths:
        try:
            part = json.load(open(path, encoding="utf-8"))
        except (OSError, ValueError):
            continue
        for uid, fields in (part.items() if isinstance(part, dict) else []):
            done.setdefault(uid, {}).update(fields if isinstance(fields, dict) else {})
    filled = 0
    for u in unis:
        for field, langs in (done.get(u["id"]) or {}).items():
            if not isinstance(langs, dict):
                continue
            if field == "requirements":
                for lang in ("ka", "ar"):
                    values = langs.get(lang) or []
                    reqs = [r for r in (u.get("requirements") or []) if isinstance(r, dict) and isinstance(r.get("label"), dict)]
                    if len(values) == len(reqs):
                        for r, v in zip(reqs, values):
                            if v and not r["label"].get(lang):
                                r["label"][lang] = v
                                filled += 1
                continue
            target = u.get(field)
            if not isinstance(target, dict):
                continue
            for lang in ("ka", "ar"):
                value = langs.get(lang)
                if value and not target.get(lang) and (not isinstance(target.get("en"), list) or
                                                         (isinstance(value, list) and len(value) == len(target["en"]))):
                    target[lang] = value
                    filled += 1
    print("  translations applied: %d fields" % filled)


def main():
    qs = []
    qs_path = os.path.join(RESEARCH, "round5", "universities-qs-list.json")
    best_path = os.path.join(RESEARCH, "round5", "universities-qs-list.best.json")
    if os.path.exists(qs_path):
        qs = [row for row in load(qs_path) if row.get("name")]
    # the agent rewrites its file as it goes; never let a shorter pass shrink the catalogue
    best = [row for row in load(best_path) if row.get("name")] if os.path.exists(best_path) else []
    if len(best) > len(qs):
        qs = best
    elif qs:
        json.dump(qs, open(best_path, "w", encoding="utf-8"), ensure_ascii=False)
    qs_by_name = {norm(r["name"]): r for r in qs}
    qs_by_domain = {domain(r.get("website")): r for r in qs if r.get("website")}

    full = {}
    files = sorted(glob.glob(os.path.join(RESEARCH, "incoming", "universities-*.json"))) + \
        sorted(p for p in glob.glob(os.path.join(RESEARCH, "round5", "universities-*.json")) if "qs-list" not in p) + \
        sorted(glob.glob(os.path.join(RESEARCH, "round6", "universities-*.json")))
    for path in files:
        rows = load(path)
        for u in rows:
            if not isinstance(u, dict) or not u.get("id") or not u.get("name"):
                continue
            if isinstance(u["name"], str):
                u["name"] = {"en": u["name"]}
            u["iso"] = (u.get("iso") or "").upper()
            match = qs_by_domain.get(domain(u.get("website"))) or qs_by_name.get(norm(u["name"].get("en")))
            if match:
                u["_qs"] = norm(match["name"])
                if match.get("rank_qs"):
                    u["rank_qs"] = match["rank_qs"]
                    u["rank_label"] = match.get("rank_label") or str(match["rank_qs"])
            u["tier"] = tier(u.get("rank_qs"))
            u.setdefault("flag", flag(u["iso"]))
            u.setdefault("region", REGIONS.get(u["iso"], {}).get("region", "global"))
            if not isinstance(u.get("country"), dict):
                u["country"] = country_of(u["iso"], {"en": u.get("country") or ""})
            u["profile"] = "full"
            old = full.get(u["id"])
            # a later, richer record wins; keep fields the newer one lacks
            if old:
                merged = dict(old)
                merged.update({k: v for k, v in u.items() if v not in (None, "", [], {})})
                u = merged
            full[u["id"]] = u
        print("  %-60s %4d" % (os.path.relpath(path, ROOT), len(rows)))

    taken = {u.get("_qs") for u in full.values() if u.get("_qs")}
    taken_domains = {domain(u.get("website")) for u in full.values()}
    basic, seen = [], set(full)
    for row in qs:
        key = norm(row["name"])
        if key in taken or (row.get("website") and domain(row["website"]) in taken_domains):
            continue
        iso = (row.get("iso") or "").upper()
        uid = slug(row["name"])
        if uid in seen:
            uid = "%s-%s" % (uid, iso.lower())
        seen.add(uid)
        basic.append({
            "id": uid, "name": {"en": row["name"]}, "iso": iso, "flag": flag(iso),
            "country": country_of(iso, {"en": row.get("country") or ""}),
            "region": REGIONS.get(iso, {}).get("region", "global"),
            "city": row.get("city") or "", "rank_qs": row.get("rank_qs"),
            "rank_label": row.get("rank_label") or (str(row["rank_qs"]) if row.get("rank_qs") else None),
            "tier": tier(row.get("rank_qs")), "website": row.get("website") or "", "profile": "basic",
        })

    out = sorted(full.values(), key=lambda u: (u.get("rank_qs") or 99999, u["name"].get("en", "")))
    for u in out:
        enrich(u)
    translate(out)
    for u in out:
        u.pop("_qs", None)
    json.dump(out, open(os.path.join(DATA, "universities.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump(basic, open(os.path.join(DATA, "universities-qs.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print("full profiles: %d   basic QS pages: %d   total: %d" % (len(out), len(basic), len(out) + len(basic)))


if __name__ == "__main__":
    main()
