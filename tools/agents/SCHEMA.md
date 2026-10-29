# Meridian data schema (v2, 26 Oct 2026)

Meridian is a **global** platform. Write for students anywhere in the world: never
assume the reader is Georgian. Georgia and Qatar are our starting markets, so make
sure their citizens' eligibility is stated where a programme publishes it, but do not
frame text around them.

Every human-readable field is trilingual: `{"en": "...", "ka": "...", "ar": "..."}`
(English, Georgian, Arabic). Write natural, accurate Georgian and Arabic, not
word-for-word translations. Keep proper names (organisations, universities) in their
usual Latin form inside ka/ar text when that is what students would search for.

Never include anything whose deadline has already passed (today is 2026-10-26),
unless the record is rolling or has a confirmed next cycle (then give that date).
Never mention or link to aggregator websites (mymun.com, opportunitydesk,
youthop, scholars4dev, etc.). Link only to the organiser's own official page.

## Programme record (projects and scholarships) → backend/data/programs.json

```json
{
  "id": "kebab-case-unique-id",
  "section": "project | scholarship",
  "family": "uwc | flex | erasmus | summer | youth | startup | competition | mun | university | scholarship",
  "type": "free text, e.g. 'youth exchange', 'training course', 'conference', 'government scholarship'",
  "org": "Organising body (official name)",
  "name":    {"en": "", "ka": "", "ar": ""},
  "country": {"en": "", "ka": "", "ar": ""},        // where it takes place / host country
  "city": "City",                                     // or "Online"
  "iso": "GB",                                         // ISO 3166-1 alpha-2 of host country ("EU" not allowed: pick the host)
  "flag": "🇬🇧",
  "region": "europe | americas | asia | oceania | africa | middle-east | global",
  "lat": 51.5, "lon": -0.12,                           // the city, 2–3 decimals
  "cost": "fully-funded | scholarship | tuition-free | funded | paid | free",
  "duration": {"en": "", "ka": "", "ar": ""},
  "grades": "e.g. '9-12', 'university', 'any', '18-30'",
  "opens": "YYYY-MM-DD or null",
  "deadline": "YYYY-MM-DD (next application deadline) or null if rolling",
  "deadline_note": "short English note on how sure the date is",
  "event_dates": "YYYY-MM-DD to YYYY-MM-DD or null (when the programme/conference itself happens)",
  "summary":    {"en": "2 sentences", "ka": "", "ar": ""},
  "about":      {"en": "2–3 short paragraphs separated by \n\n: what it is, who it is for, what it covers, what makes it worth it", "ka": "", "ar": ""},
  "highlights": {"en": ["3 bullets"], "ka": ["..."], "ar": ["..."]},
  "eligibility":{"en": "who can apply: nationality rules, age/level, language", "ka": "", "ar": ""},
  "how_to_apply": {"en": ["step 1", "step 2", "3–6 steps"], "ka": ["..."], "ar": ["..."]},
  "costs": {"en": "what is covered / fees in original currency", "ka": "", "ar": ""},
  "keywords": ["lowercase search words students might type: 'exchange', 'erasmus', 'mun', 'debate', 'stem', 'free', 'usa', 'masters', ..."],
  "url": "official programme page",
  "apply_url": "official registration / application form link (or same as url)",
  "sources": ["pages you actually checked"],
  "score": 1-10,                                       // how good + how reachable + how soon
  "score_reason": "one line",
  "premium": false
}
```

`section`: **scholarship** = money to study (government, university, foundation
scholarships, fellowships that fund a degree). **project** = everything else
(exchanges, Erasmus+ projects, MUN conferences, summer schools, competitions,
olympiads, hackathons, startup programmes, volunteering).

## University record → backend/data/universities.json

```json
{
  "id": "kebab-case",
  "name": {"en": "", "ka": "", "ar": ""},
  "country": {"en": "", "ka": "", "ar": ""},
  "city": "", "iso": "US", "flag": "🇺🇸", "region": "americas",
  "lat": 0, "lon": 0,
  "type": "public | private",
  "rank_qs": 12,                 // QS World University Rankings 2026 position, or null if unranked/unknown
  "tier": "top-50 | top-200 | top-500 | other",
  "website": "https://",
  "platform": "Common App | UCAS | Studielink | Uni-Assist | Direct | OUAC | UAC | ...",
  "intakes": ["September"],
  "deadline": "YYYY-MM-DD next main international undergraduate deadline, or null",
  "deadline_note": "",
  "tuition_intl": {"amount": 60000, "currency": "USD", "per": "year", "note": "undergraduate, international"},
  "aid_intl": {"en": "need-blind / need-aware / merit scholarships available / none", "ka": "", "ar": ""},
  "acceptance_rate": 0.05,       // or null
  "languages": ["English"],
  "tests": {"en": "SAT/ACT policy, English test minimums (IELTS/TOEFL/Duolingo)", "ka": "", "ar": ""},
  "strengths": {"en": ["notable fields"], "ka": [], "ar": []},
  "summary": {"en": "2 sentences", "ka": "", "ar": ""},
  "about": {"en": "2 short paragraphs", "ka": "", "ar": ""},
  "requirements": [               // what an applicant must prepare — drives the Common-App-style checklist
    {"key": "transcript", "label": {"en": "Secondary school transcript", "ka": "", "ar": ""}},
    {"key": "english", "label": {"en": "English test (IELTS 7.0 / TOEFL 100)", "ka": "", "ar": ""}}
  ],
  "keywords": ["..."],
  "sources": ["..."]
}
```

Use these requirement keys where they fit (add others if needed): `transcript`,
`diploma`, `english`, `sat_act`, `essay`, `personal_statement`, `recommendations`,
`cv`, `portfolio`, `interview`, `financial_docs`, `passport`, `application_fee`,
`supplements`.
