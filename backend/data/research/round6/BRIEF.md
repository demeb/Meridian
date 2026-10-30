# Round 6 research brief (31 Oct 2026)

Read `tools/agents/SCHEMA.md` first: it defines the programme record. This file adds
the round-6 rules. Today is **2026-10-31**.

Goal of the round: grow Meridian from 543 projects / 165 scholarships to
**2000 projects / 500 scholarships**, with **30% of the new projects in Georgia**.

## Hard rules

1. **Verify on the organiser's own page.** Open the official page and check the
   programme exists and is open or opens again (next cycle published, or annual and
   recurring with a known pattern). If a deadline has passed and no next cycle is
   known, **skip it**. Today is 2026-10-31: no deadlines before that date.
2. **Never mention or link aggregator sites** (mymun.com, opportunitydesk, youthop,
   scholars4dev, opportunitiescircle, afterschoolafrica, scholarshipportal,
   worldscholarshipforum, opportunities.ge-style re-posters…). You may use them only to
   discover leads; every `url`, `apply_url` and `sources` entry must be the organiser's
   own page. Never write the word "mymun" anywhere.
   - Allowed as the organiser's own page: the organiser's website, its **official
     Facebook / Instagram page** (when that is the only official channel, common for
     Georgian MUNs, clubs and NGOs), an official government portal, and official EU
     portals that list the organiser's own call (European Youth Portal, SALTO-YOUTH
     training calendar, Erasmus+ national agency sites).
3. Add `"verified_at": "2026-10-31"` and put the pages you actually opened in `sources`.
4. **Save as you go.** After every 5–10 new records rewrite your output file as a JSON
   array of all records so far (valid JSON, UTF-8, `ensure_ascii=False`), using Python
   (`python3 -X utf8`), never a shell heredoc containing Georgian/Arabic. If your file
   already exists when you start, load it and continue from it.
5. **No duplicates.** Check `backend/data/research/round6/EXISTING_NAMES.txt`
   (`id | family | country | name`) and `EXISTING_IDS.txt` before adding. A different
   year's edition of the same event is a duplicate unless the existing one has ended.
   Ids: kebab-case, with the year for annual events (`thimun-qatar-2027`).
6. **Languages, to save time:** full English (`en`) for every text field. For `name`,
   `country`, `summary` and `duration`, also `ka` (Georgian) and `ar` (Arabic). Longer
   fields (`about`, `highlights`, `eligibility`, `how_to_apply`, `costs`) in `en` only;
   they are translated later.
7. **Search budget is shared and small.** Web *searches* are limited for the whole team.
   Use at most ~12 WebSearch calls yourself. Prefer **WebFetch on directory pages** that
   list many official programmes at once (an agency's "calls" page, a ministry's
   programmes page, a university's summer-school list, the SALTO calendar, the European
   Youth Portal volunteering database, a national committee list), then open each
   official page to verify.
8. `about` must let a student register with only the external link: what it is, who it
   is for, dates, place, format, what is covered, selection, why it is worth it.
   2–3 short paragraphs. Be accurate rather than long.
9. Do not edit any file other than your own output file.
10. Quantity matters this round, but every record must be real, verified and open.
   A thin-but-correct record is fine; an invented or closed one is not.

## Fields added in round 6

- `"fields": [...]` — subject areas the opportunity suits, from this list only:
  `any, business, economics, engineering, computer-science, medicine-health,
  natural-sciences, mathematics, law, social-sciences, humanities, arts-design,
  education, environment, international-relations, languages`.
  Use `["any"]` when it is open to every subject.
- `"tutor_tags": [...]` — optional; what a tutor could help with: `"uwc"`, `"flex"`,
  `"sat"`, `"ielts"`, `"essay"`, `"interview"`, `"olympiad"`, `"mun"`, `"debate"`.

## Families (`family`)

`mun | erasmus | exchange | flex | uwc | summer | competition | startup | youth |
volunteering | stem | training | scholarship` — see round-5 meanings:
exchange = school/university exchanges (YES, CBYX, AFS, Kizuna, Rotary, school
partnerships); flex = the FLEX programme only; youth = forums, leadership programmes,
councils and camps; stem = STEM programmes, research internships, olympiad camps;
training = trainings, online courses, webinars; volunteering = ESC, UNV, local
volunteering; competition = olympiads, essay, debate, science fairs, hackathons;
startup = incubators, accelerators, youth entrepreneurship.

## Scholarship extras (`section: "scholarship"`)

`"level": ["bachelor"|"masters"|"phd", ...]`, `"coverage": "full"|"partial"|"tuition"`,
`"coverage_pct": 100` (or an estimate). State nationality eligibility clearly, and
whether citizens of Georgia and Qatar can apply when the page says so.
