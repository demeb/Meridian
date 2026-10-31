# Meridian round 7 — university profiles (brief for research agents)

Meridian (meridiangoal.com) helps high-school students in Georgia, Qatar and the
Gulf apply to universities abroad. Each university page must give an applicant
from Georgia or Qatar the facts they need to apply to a **bachelor's** programme.

You get one batch file `batches/bNNN.json` (about 12 universities: id, name, iso,
city, website, QS rank). Research each one and write **one JSON array** to
`backend/data/research/round7/universities-bNNN.json` (same NNN). Write the file
after every 3–4 universities so work is never lost (rewrite the whole array).

## Rules
1. **Only official sources**: the university's own site (admissions, fees,
   international, programmes pages), government study portals (Universitaly,
   Study in Spain/Czechia, DAAD, Campus France, UCAS, etc.). Never invent a
   number. If a fact is not published, use `null` — an empty field is fine, a
   wrong one is not.
2. Use **WebFetch only** — the shared WebSearch budget is used up, so do NOT call
   WebSearch. Start from the `website` you were given, read its navigation, and
   follow links to the admissions / international / fees / programmes pages
   (typical paths: /en, /admissions, /international, /study, /apply, /fees).
3. Never mention or link aggregator sites (mastersportal, bachelorsportal,
   topuniversities profile pages, studyportals, univ blogs, etc.).
4. Data for the **2027/28 intake** where published; otherwise the latest
   published year, and say which year in the note.
5. Plain, short sentences. No marketing language.
6. `qualifications`: set a value only when the university's page or the national
   admissions portal (UCAS, UNEDasiss, Universitaly/CIMEA, uni-assist,
   Studielink…) states it. Otherwise `null`. Never fill it from general knowledge.
7. `lat`/`lon`: the main campus; 3 decimals are enough.
8. `sat.required`: "not-considered" only for systems that admit on school
   grades/national exams (most of Europe, Asia) or when the page says so; for
   US-style admissions with no statement use null.
9. If a site blocks WebFetch (403/TLS errors), try its English subpages or the
   national portal, then move on. Don't spend more than ~10 fetches per university.

## Record (keep `id`, `name.en`, `iso`, `website` exactly as given)
```json
{
 "id": "universita-di-padova",
 "name": {"en": "Università di Padova", "ka": "პადუის უნივერსიტეტი", "ar": "جامعة بادوفا"},
 "iso": "IT", "city": "Padova", "lat": 45.407, "lon": 11.877,
 "type": "public",                       // public | private
 "website": "https://www.unipd.it",
 "platform": "Direct (Apply@Unipd) + Universitaly pre-enrolment",
 "application_url": "https://...",       // official how-to-apply page for international bachelor applicants
 "intakes": ["September"],
 "deadline": "2027-03-31",               // first/main bachelor deadline for non-EU applicants, ISO date, or null
 "deadline_note": "One sentence: rounds, which year, who it applies to.",
 "tuition_intl": {"amount": 2600, "currency": "EUR", "per": "year", "note": "short note (income-based, range, EU vs non-EU)"},
 "acceptance_rate": null,                // percent number only if officially published
 "students": 66000,                      // total students if published, else null
 "intl_pct": null,
 "languages": ["Italian", "English"],    // languages of bachelor teaching
 "english_bachelors": "some",            // all | some | none  — bachelor programmes taught fully in English
 "qualifications": {                     // how school-leaving qualifications are treated for bachelor entry
   "national": "accepted",               // a foreign national school diploma (e.g. Georgian or Qatari certificate)
   "a-level": "accepted",
   "ib": "accepted",
   "us-diploma": "with-extra"            // accepted | with-extra (needs AP/SAT/foundation year) | not-accepted | null (not published)
 },
 "qualifications_note": {"en": "e.g. 12 years of schooling required; A-level: 3 subjects; IB Diploma 30+; US diploma needs 3 APs."},
 "sat": {"low": null, "high": null, "required": "not-considered"},   // required | optional | not-considered
 "ielts_min": 6.0, "toefl_min": 80, "duolingo_min": null,
 "other_tests": ["TOLC", "IMAT"],        // entrance/other tests (national entrance exams, UCAT, TMUA, language exams like DELE B2, Czech B2...)
 "fields": ["engineering", "medicine-health", "natural-sciences"],   // 2–6 study fields the university is strongest in, strongest first, keys from the list below
 "strengths": {"en": ["Medicine", "Engineering", "Psychology"], "ka": [...], "ar": [...]},   // 3–6 subject names
 "summary": {"en": "Two sentences: what it is, why it stands out, cost.", "ka": "...", "ar": "..."},
 "about": {"en": "One paragraph (60–90 words): size, campus/city, how international bachelor admission works, language of teaching, cost.", "ka": "...", "ar": "..."},
 "aid_intl": {"en": "One sentence on scholarships/fee waivers international bachelor students can get, or 'No dedicated aid for international bachelor students is published.'", "ka": "...", "ar": "..."},
 "tests": {"en": "One–two sentences: entrance tests and language proof needed.", "ka": "...", "ar": "..."},
 "gpa_note": {"en": "One sentence on academic requirements (grades, prerequisite subjects).", "ka": "...", "ar": "..."},
 "requirements": [ {"key": "transcript", "label": {"en": "Secondary school transcripts", "ka": "...", "ar": "..."}} ],
 "scholarships": [ {"name": "...", "url": "https://official page", "coverage": "full|partial"} ],
 "keywords": ["italy", "padova", "medicine", "low tuition"],
 "sources": ["https://official pages you used"],
 "verified_at": "2026-11-01"
}
```
Requirement keys (use these): transcript, diploma, english, language, passport,
application_fee, financial_docs, recommendations, personal_statement, essay,
interview, sat_act, entrance_exam, equivalency (diploma recognition / dichiarazione
di valore / nostrification / homologación), portfolio, cv, photo, supplements.

Field keys: business, economics, computer-science, engineering, mathematics,
natural-sciences, medicine-health, law, international-relations, social-sciences,
humanities, arts-design, education, environment, languages.

## Languages
`ka` = Georgian, `ar` = Modern Standard Arabic, natural and correct. Keep
university and programme proper names, test names (IELTS, TOLC, IMAT) and URLs
in Latin script. Georgian: use standard terms (ბაკალავრიატი, სწავლის საფასური,
მისაღები გამოცდა). Fill ka/ar for: name, summary, about, aid_intl, tests,
gpa_note, qualifications_note, strengths, every requirement label.

## Country hints
- Italy: non-EU applicants pre-enrol on Universitaly; many need a declaration of
  value or CIMEA statement; fees are often income-based (ISEE) — give the max.
  Entrance tests: TOLC (CISIA), IMAT/medicine tests, own tests.
- Spain: foreign diplomas need homologación or UNEDassists accreditation;
  public tuition is per credit (≈60 credits/year) — convert to a yearly
  estimate and say so; many degrees are in Spanish (DELE B2 often required).
- Czechia: Czech-taught study is free for everyone (needs Czech B2); English
  programmes charge fees; nostrification of the school diploma is required.

Finish with a one-line report: how many universities written, how many had
no usable official data.
