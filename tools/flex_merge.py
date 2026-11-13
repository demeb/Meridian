#!/usr/bin/env python3
"""One FLEX Global entry instead of one copy per sending country.

    python3 -X utf8 tools/flex_merge.py

The per-country records (flex-global-<country>-<round>) move to the archive and
become the `rounds` list of a single `flex-global` record: each country's round,
deadline and application link stay on the programme page.
"""
import json
import os
import re
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "backend", "data")
PROGRAMS = os.path.join(DATA, "programs.json")
ARCHIVE = os.path.join(DATA, "archive", "programs-archive.json")


def write_lines(path, data):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        fh.write("[\n" + ",\n".join(json.dumps(r, ensure_ascii=False, separators=(",", ":")) for r in data) + "\n]\n")
    os.replace(tmp, path)


def main():
    live = json.load(open(PROGRAMS, encoding="utf-8"))
    archive = json.load(open(ARCHIVE, encoding="utf-8"))
    copies = [p for p in live if re.match(r"flex-global-.+-20\d\d-\d\d$", p["id"])]
    main_rec = next((p for p in live if p["id"] == "flex-global"), None)
    if not copies:
        print("nothing to merge")
        return
    rounds = sorted(({
        "iso": p["iso"], "country": p["country"],
        "round": re.search(r"(20\d\d-\d\d)$", p["id"]).group(1).replace("-", "–"),
        "deadline": p.get("deadline"), "apply_url": p.get("apply_url") or p.get("url"), "url": p.get("url"),
    } for p in copies), key=lambda r: (r["deadline"] or "9999", r["country"]["en"]))
    if main_rec:
        known = {r["iso"] for r in rounds}
        rounds += [r for r in main_rec.get("rounds", []) if r["iso"] not in known]
    names = ", ".join(r["country"]["en"] for r in rounds)
    dated = [r for r in rounds if r["deadline"]]
    note = "Each country has its own round. " + ("Open now: " + "; ".join(
        "%s %s" % (r["country"]["en"], r["deadline"]) for r in dated) + ". " if dated else "") + \
        "Other countries: next round (2028–29) expected to open around September 2027."
    base = next((p for p in copies if p["iso"] == "GE"), copies[0])
    record = {
        "id": "flex-global", "section": "project", "family": "flex",
        "type": "high-school exchange year in the USA (U.S. government)",
        "org": base.get("org"),
        "name": {"en": "FLEX Global (Future Leaders Exchange)", "ka": "FLEX Global (მომავალი ლიდერების გაცვლითი პროგრამა)",
                 "ar": "FLEX Global (برنامج تبادل قادة المستقبل)"},
        "country": {"en": "United States", "ka": "ამერიკის შეერთებული შტატები", "ar": "الولايات المتحدة"},
        "city": "Across the USA", "iso": "US", "flag": "🇺🇸", "region": "americas", "lat": 38.9, "lon": -77.04,
        "cost": "fully-funded", "grades": base.get("grades"),
        "duration": {"en": "One U.S. school year (August to May/June)", "ka": "ერთი სასწავლო წელი აშშ-ში (აგვისტოდან მაის-ივნისამდე)",
                     "ar": "عام دراسي واحد في الولايات المتحدة (من أغسطس إلى مايو/يونيو)"},
        "opens": None, "deadline": None, "deadline_note": note,   # one date would mislead: each country has its own
        "event_dates": None,
        "summary": {
            "en": "The U.S. Department of State's fully funded high-school year in the USA with a host family, for students from %d countries. Each country runs its own round with its own deadline: find yours in the list on this page." % len(rounds),
            "ka": "აშშ-ის სახელმწიფო დეპარტამენტის სრულად დაფინანსებული სასკოლო წელი ამერიკაში მასპინძელ ოჯახთან, %d ქვეყნის მოსწავლეებისთვის. თითოეულ ქვეყანას საკუთარი რაუნდი და ვადა აქვს — შენი იპოვე ამ გვერდის სიაში." % len(rounds),
            "ar": "عام دراسي ثانوي ممول بالكامل من وزارة الخارجية الأمريكية في الولايات المتحدة مع عائلة مضيفة، لطلاب من %d دولة. لكل دولة جولتها وموعدها النهائي الخاص: ابحث عن دولتك في القائمة في هذه الصفحة." % len(rounds),
        },
        "about": {"en": "FLEX Global is the U.S. Department of State's merit-based high-school exchange, which brings together the Future Leaders Exchange (FLEX) and the Kennedy-Lugar Youth Exchange and Study (YES). It is run by American Councils for International Education with AFS, Amideast and iEARN.\n\nFinalists spend a full school year with a screened volunteer host family, attend a U.S. high school, do community service and take part in leadership activities. Everything is paid for: flights, a monthly allowance, school, insurance and orientations.\n\nSelection is free and merit-based: an English test, proctored essays and an interview. Recruitment runs separately in each participating country (%s), so the dates and the birth-date window depend on where you apply from." % names},
        "eligibility": {"en": "Citizens of a participating country who are enrolled in secondary school there, usually in grade 9, 10 or 11 (each country's round publishes the exact birth-date window). Good academic standing, previous English study, U.S. J-1 visa eligibility and an international passport. Students whose family has applied or plans to emigrate to the U.S. are not eligible."},
        "how_to_apply": {"en": ["Find your country in the list of countries and deadlines on this page",
                                "Open your country's FLEX Global page to check the round dates and birth-date window",
                                "Register on ais.americancouncils.org/flexglobal and take the English test",
                                "Write the proctored essays and attend the interview if you advance",
                                "Submit the full application; finalists are announced in spring"]},
        "costs": base.get("costs"),
        "highlights": {"en": ["A full school year in the U.S. with a host family, fully funded",
                              "U.S. State Department programme (FLEX + YES) in %d countries" % len(rounds),
                              "Free, merit-based selection: English test, essays, interview"],
                       "ka": ["სრული სასწავლო წელი აშშ-ში მასპინძელ ოჯახთან, სრულად დაფინანსებული",
                              "აშშ-ის სახელმწიფო დეპარტამენტის პროგრამა (FLEX + YES) %d ქვეყანაში" % len(rounds),
                              "უფასო, დამსახურებაზე დაფუძნებული შერჩევა: ინგლისურის ტესტი, ესეები, გასაუბრება"],
                       "ar": ["عام دراسي كامل في الولايات المتحدة مع عائلة مضيفة، ممول بالكامل",
                              "برنامج لوزارة الخارجية الأمريكية (FLEX + YES) في %d دولة" % len(rounds),
                              "اختيار مجاني قائم على الجدارة: اختبار إنجليزي ومقالات ومقابلة"]},
        "keywords": sorted(set(["exchange", "flex", "flex global", "yes", "usa", "high school", "host family", "fully funded",
                                "american councils", "free"] + [r["country"]["en"].lower() for r in rounds])),
        "url": "https://www.discoverflexglobal.org/", "apply_url": "https://ais.americancouncils.org/flexglobal",
        "sources": sorted({u for r in rounds for u in (r["url"], r["apply_url"]) if u}),
        "fields": ["any"], "tutor_tags": ["flex", "essay", "interview"],
        "score": 8, "premium": False, "rounds": rounds,
        "verified_at": max(p.get("verified_at") or "" for p in copies),
    }
    stamp = datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
    for p in copies:
        archive.append(dict(p, archived_at=stamp, archived_reason="merged into flex-global (one FLEX entry, per-country rounds)"))
    live = [p for p in live if p not in copies and p["id"] != "flex-global"]
    live.append(record)
    write_lines(PROGRAMS, live)
    write_lines(ARCHIVE, archive)
    print("merged %d FLEX country records into flex-global" % len(copies))


if __name__ == "__main__":
    main()
