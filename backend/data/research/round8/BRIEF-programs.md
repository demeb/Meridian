# Round 8 research brief — scholarships, exchanges, internships (14 Nov 2026)

Read `tools/agents/SCHEMA.md` (the programme record) and
`backend/data/research/round6/BRIEF.md` (hard rules 1–10, families, fields,
scholarship extras). **All of those rules apply**, with these changes:

- Today is **2026-11-14**: no deadline before that date. `"verified_at": "2026-11-14"`.
- Duplicate check: `backend/data/research/round8/EXISTING_NAMES.txt`
  (`id | family | country | name`, 2,605 live records). Also do not repeat what
  another round-8 agent is likely to cover: stay inside your own assignment.
- WebSearch: up to ~20 searches each. Prefer directory pages that list many
  official opportunities at once, then open each official page to verify.
- Output: one JSON array at the path in your assignment. Save after every 5–10
  records with Python (`python3 -X utf8`, `ensure_ascii=False`). If the file
  exists, load it and continue.
- Languages: `name`, `country`, `summary`, `duration` and `highlights` in
  `en` + `ka` (Georgian) + `ar` (Arabic). `about`, `eligibility`, `how_to_apply`,
  `costs` in `en` only (translated later).
- Never mention or link aggregator sites; leads only. Every `url`, `apply_url`
  and `sources` entry is the organiser's own page or an official portal.
- Quality over padding: every record real, open (or annual with the next cycle
  published / a known yearly pattern), and verified on the official page.

## Scholarships (`section: "scholarship"`, `family: "scholarship"`)
`level`, `coverage`, `coverage_pct` as in round 6. State clearly who can apply
(nationalities), and whether citizens of Georgia and Qatar are eligible when the
page says so. Bachelor-level and fully funded first, then master's.

## Exchanges (`section: "project"`, `family: "exchange"`)
School and university exchanges, semester/year abroad, government exchange
programmes, cultural exchanges for 15–25 year-olds. **One record per programme**,
not one per sending country: e.g. a single "AFS Intercultural Programs" entry that
says which countries send students, not 40 copies. Host country = where students
go (or the organiser's country if many hosts; then say so).

## Internships (`section: "internship"`, `family: "internship"`) — NEW
Real internships, traineeships and work placements open to high-school students,
university students or recent graduates. Paid first; well-known, prestigious and
reachable for international applicants. Extra fields:
- `"type"`: e.g. "paid summer internship (undergraduate)", "traineeship (graduates)",
  "research internship", "high-school internship".
- `"paid"`: true | false;  `"stipend"`: `{"en": "e.g. USD 7,000/month; housing covered"}` or null.
- `"level"`: any of `["high-school", "bachelor", "master", "graduate"]`.
- `"fields"`: from the round-6 field list (not `any` unless truly any field).
- `"remote"`: true when it is fully remote.
- `"eligibility"` must say who can apply (nationality / work-permit rules,
  year of study, language).
- `"deadline"`: next application deadline; for rolling or "applications open in
  <month>" use `null` and explain in `deadline_note`.
- `cost`: `"funded"` when paid, otherwise `"free"`.
- `lat`/`lon`: the city of the internship (organisation HQ for remote ones).
Do not list generic "careers" pages: each record must be a specific programme with
its own official page (e.g. "Google STEP Internship", "European Commission Blue
Book Traineeship", "CERN Summer Student Programme").

Finish with one line: `<file>: X written`.
