# Round 5 research brief (30 Oct 2026)

Read `tools/agents/SCHEMA.md` first: it defines the programme and university
records. This file adds the round-5 rules. Today is **2026-10-30**.

## Hard rules

1. **Verify everything on the organiser's own website.** Open the official page and
   check the programme exists, runs again and is open (or opens soon). The John Locke
   essay competition was listed while its 2026 round had closed, so do not repeat that
   mistake. If a deadline has passed and no next cycle is published, **skip it**.
2. **Never mention or link aggregator sites** (mymun.com, opportunitydesk, youthop,
   scholars4dev, opportunitiescircle, afterschoolafrica, etc.). You may use them to
   discover leads, but every `url`, `apply_url` and `sources` entry must be the
   organiser's or university's own page. Never write the word "mymun" anywhere.
3. Add `"verified_at": "2026-10-30"` to every record, and put the pages you
   actually opened in `sources`.
4. **Save as you go** so nothing is lost if you hit a rate limit: after every
   5–10 new records, rewrite your output file as a JSON array of all records so far
   (valid JSON, UTF-8, `ensure_ascii=False`). Write with Python
   (`python3 -X utf8`), never a shell heredoc with Georgian/Arabic in it.
   Before you start, read your output file if it exists and continue from it.
5. Do not duplicate ids in `backend/data/research/round5/EXISTING_IDS.txt`, or
   records already in your own file. Ids: kebab-case, include the year for annual
   events (`thimun-qatar-2027`).
6. **Languages, to save time:** every text field must have full English (`en`).
   For `name`, `country`, `summary` and `duration`, also give `ka` (Georgian) and `ar`
   (Arabic). For the longer fields (`about`, `highlights`, `eligibility`,
   `how_to_apply`, `costs`), give `en` only; they are translated later.
7. **Quality before quantity.** A smaller set of verified, detailed records beats a
   long list of thin ones. Still, aim high: your target is in your task.
8. `about` must be rich enough that a student only needs the external site to
   register: what it is, who it is for, dates, location, format, what is covered,
   selection and why it is worth it.
9. Do not edit any file other than your own output file.

## Programme families (filters)

`family` must be one of:
`mun | erasmus | exchange | flex | uwc | summer | competition | startup | youth |
volunteering | stem | training | scholarship`

- **exchange**: school or university exchanges (YES, CBYX, AFS, Kizuna, etc.)
- **flex**: the FLEX programme only
- **uwc**: UWC schools, short courses and national-committee selections
- **youth**: youth forums, leadership programmes, youth councils and camps
- **stem**: STEM programmes, research internships and olympiad-style training camps
- **training**: trainings, online courses and webinars
- **volunteering**: European Solidarity Corps, UN Volunteers, local volunteering
- **competition**: olympiads, essay, debate, science fairs and hackathons
- **startup**: incubators, accelerators and youth entrepreneurship programmes

## Scholarship extras

For `section: "scholarship"`, also add:
- `"level": ["bachelor"]`, `["masters"]`, `["phd"]` or any mix
- `"coverage": "full" | "partial" | "tuition"`
- `"coverage_pct": 100` (or an estimate, e.g. 50)

## University extras (round 5)

On top of the SCHEMA university record, add:

```json
"sat": {"low": 1480, "high": 1570, "required": "required | optional | not-considered"},
"act": {"low": 33, "high": 35},
"ielts_min": 7.0, "toefl_min": 100, "duolingo_min": 125,
"gpa_note": {"en": "typical grades of admitted students"},
"top_programs": {"en": ["Computer Science", "Economics", "..."]},
"scholarships": [{"name": "...", "url": "official page", "coverage": "full | partial"}],
"students": 24000, "intl_pct": 0.25,
"logo": "https://upload.wikimedia.org/... (the university's logo or seal on Wikimedia Commons, if you find it; else null)",
"application_url": "official undergraduate international admissions page"
```

Use `null` for anything you cannot verify. Never guess test scores: take them from
the university's own admissions page or Common Data Set, and name the page in `sources`.
