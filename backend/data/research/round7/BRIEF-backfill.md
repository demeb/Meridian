# Meridian round 7 — backfill for existing university profiles

Each university in your batch file already has a full profile. Add four fields
that are missing. You get: id, name, iso, website, application_url, and the
English `tests` / `gpa_note` / `languages` / `strengths` we already have.

For each university output:
```json
"<id>": {
  "qualifications": {"national": "accepted|with-extra|not-accepted|null", "a-level": ..., "ib": ..., "us-diploma": ...},
  "qualifications_note": {"en": "One–two sentences, e.g. 'A levels: A*AA–AAA; IB 38–40 points; national diplomas usually need a foundation year or SAT/AP.'", "ka": "...", "ar": "..."},
  "english_bachelors": "all|some|none|null",
  "fields": ["computer-science", "engineering"]
}
```
- `national` = a foreign national school diploma (e.g. Georgian or Qatari).
  "with-extra" = accepted only with an extra step (SAT/AP, foundation year,
  entrance exam, recognition). `us-diploma` = American high school diploma.
- Values only from the university's official international-entry / country
  pages, or what the existing `tests`/`gpa_note` text already states. Unknown → null.
- `fields`: 2–6 keys, strongest first, from: business, economics,
  computer-science, engineering, mathematics, natural-sciences, medicine-health,
  law, international-relations, social-sciences, humanities, arts-design,
  education, environment, languages. (You may infer these from `strengths`.)
- `english_bachelors`: "all" for English-speaking countries' universities.
- Georgian (ka) and Arabic (ar) must be natural; keep test names in Latin script.
- WebFetch only (no WebSearch). At most ~4 fetches per university; if pages are
  blocked, fill what you can from the given text and leave the rest null.

Write ONE JSON object {id: {...}} to the output file named in your prompt;
rewrite it after every ~8 universities. Final answer: one line.
