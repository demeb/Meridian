# Meridian round 9 — the last 380 university profiles (16 Nov 2026)

Read `backend/data/research/round7/BRIEF-unis.md` (record format, field list,
Georgian/Arabic rules, country hints) and `backend/data/research/round8/BRIEF-unis.md`
(how to find facts legitimately, quality bar, PDF reader). Everything there applies.

These universities were tried before and came back thin. Each entry in your batch
`backend/data/research/round9/batches/dNNN.json` names `previous_attempt`: the file
holding the earlier record for that `id`. **Load it, keep every verified fact, and
spend your effort only on what is missing** to reach the quality bar (at least 4,
ideally 6, of: tuition amount · deadline or deadline_note · `tests` text >60 chars ·
`application_url` different from the homepage · `qualifications` · English minimum
or `other_tests` · `gpa_note` >40 chars · 3+ `requirements`).

## Search
WebSearch works again but the budget is shared by the whole team: **use at most 15
WebSearch calls for your batch** (about 1–2 per university). Best queries are
`site:<university domain> international undergraduate admission`, `site:<domain>
tuition fee international`, `site:<domain> IELTS`, or the national portal (e.g.
`site:studyinkorea.go.kr <university>`, `site:campuschina.org <university>`,
`site:studyinindia.gov.in <university>`, `site:studyinjapan.go.jp <university>`).
A fact in a search-result snippet from the university's own domain or an official
national portal counts; put that page in `sources`. Then WebFetch one page at a time.

## Typical official facts that are easy to miss
- Most national systems publish document lists (transcript, diploma, passport, photo,
  language certificate, recognition/equivalence) → `requirements` (3+).
- A sentence on academic entry (minimum average, prerequisite subjects, national
  exam equivalence) → `gpa_note`.
- The international/foreign-student application page or portal → `application_url`.
- Language rules (e.g. HSK 4, TOPIK 3, B2 Turkish/Russian, IELTS 6.0) → `tests` text and
  `ielts_min` / `other_tests`.

Write `backend/data/research/round9/universities-dNNN.json` (same NNN): one JSON array,
one complete record per university (previous facts + new ones), `verified_at`
"2026-11-16". Save after every 3 universities with Python (`python3 -X utf8`,
`ensure_ascii=False`). Helper scripts only in your own scratch folder. Never invent:
unknown = `null`; never write "not found" text into fields. Finish with one line:
`dNNN: X written, Y still below the bar`.
