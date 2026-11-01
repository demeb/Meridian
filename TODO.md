# Oct 31 Website — overnight checklist (1 Nov 2026)

Legend: [ ] open · [x] done and verified · [!] blocked (reason)
Stop rule from the user: if the weekly limit reaches 90%, stop all work.

## 1. Universities (first goal)
- [x] Research all 1,197 basic universities (100 batches) → 679 new full profiles; 1,017 of 1,535 now full
  - [x] Czech, Italian, Spanish first (b001–b009) — 105 universities researched
  - [x] the rest by QS rank (b010–b100)
  - [!] 518 stay basic pages: their sites blocked automated reading (403/bot checks, certificate errors, image-only PDFs); listed in research/round7/THIN.txt. A curl retry with a browser user agent was refused as bot-check circumvention, so not attempted.
- [x] New fields: school qualification (national / A level / IB / US diploma), teaching language, English-taught bachelors, study fields
- [x] Same new fields for the 338 existing profiles (fields for all; diploma rules only where an official page or our text states them)
- [x] Filters: school qualification, teaching language, study field search ("best universities in my field")
- [x] Merge (tools/merge_universities.py reads round7, quality gate, past deadlines hidden) + Georgian/Arabic on all 1,017

## 2. Home
- [x] Research block: smaller, only 4 findings tied to the problem (1 in 15 · $6 · 372:1 · 22% vs 51%)
- [x] "New on the platform": small cards (name, organiser, country), whole card is the link

## 3. Programmes page (most important: speed)
- [x] Programmes page lag → minimum (globe 43 ms → 0.5 ms a frame: countries painted into the Earth texture; scripts/map data gzipped: 4.5 MB → 1.5 MB)
- [x] Globe turns black when zooming in close (map-tile engine removed)
- [x] Left/right arrow buttons for the type chips row

## 4. Filters (everywhere)
- [x] Filter panel background matches the site colours
- [x] No plain white boxes: every select is a site-styled dropdown; checkboxes, radios, sliders restyled
- [x] Teachers: remove counselling subjects (US/UK/Europe admissions, essays, CVs…) from the subject filter
- [x] Teachers: target region = continents only
- [x] Teachers: nicer max-price-per-hour slider

## 5. Menus
- [x] Dropdowns (Mentorship, About, language) readable — no transparent background

## 6. Prep
- [x] Polish once more, add more information (who needs it, scores, 3 tips per exam), exam search + free-only + type filters

## 7. Counselling
- [x] Self-test boxes smaller and attractive (with pictures — images from the course agent)
- [x] Mini-courses: 3 more (recommendation letters, scholarships, university list) = 10, two full rows, pictures in the same style

## 8. Packages
- [x] Rethink Explorer / Compass / Navigator contents (Explorer decent, paid clearly better)

## 9. About us
- [x] Polish: mission/vision, live numbers, 4 principles, who we are — no repeated stats

## 10. Languages
- [x] Finish Arabic (all 1,020 UI strings + 251 page texts that were English/Georgian only), new Georgian strings written for every change

## 11. Sign-up / sign-in
- [!] Verification code sent automatically to email on sign-up — code already sends it; real delivery needs the Gmail app password in Render (user)

## 12. Search engine
- [x] Google description: new titles/descriptions on every page, og tags, sitemap.xml (4,189 URLs), robots.txt, structured data — Google updates on its next crawl

## 13. AI (when the key exists)
- [x] Meridian AI recommends universities, projects and scholarships from the student's CV (new "Recommend from my CV" tool + instructions); goes live with ANTHROPIC_API_KEY

## Finish
- [x] Smoke test (31/31), browser check EN/KA/AR, light/dark, mobile; server peak memory 215 MB
- [ ] Commit (push only after the user confirms in the morning)
- [ ] Morning report
