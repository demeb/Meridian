# Oct 31 Website — overnight checklist (1 Nov 2026)

Legend: [ ] open · [x] done and verified · [!] blocked (reason)
Stop rule from the user: if the weekly limit reaches 90%, stop all work.

## 1. Universities (first goal)
- [ ] Research all 1,197 basic universities → full profiles (round7, 100 batches of 12; Sonnet agents)
  - [ ] Czech, Italian, Spanish first (b001–b009)
  - [ ] the rest by QS rank (b010–b100)
- [ ] New fields: school qualification (national / A level / IB / US diploma), teaching language, English-taught bachelors, study fields
- [ ] Same new fields for the 338 existing profiles
- [x] Filters: school qualification, teaching language, study field search ("best universities in my field")
- [ ] Merge (tools/merge_universities.py reads round7) + Georgian/Arabic complete

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
- [ ] Mini-courses: 3 more (two full rows), polish; pictures style reused

## 8. Packages
- [x] Rethink Explorer / Compass / Navigator contents (Explorer decent, paid clearly better)

## 9. About us
- [x] Polish: mission/vision, live numbers, 4 principles, who we are — no repeated stats

## 10. Languages
- [ ] Finish Arabic, polish Georgian

## 11. Sign-up / sign-in
- [!] Verification code sent automatically to email on sign-up — code already sends it; real delivery needs the Gmail app password in Render (user)

## 12. Search engine
- [x] Google description: new titles/descriptions on every page, og tags, sitemap.xml (4,189 URLs), robots.txt, structured data — Google updates on its next crawl

## 13. AI (when the key exists)
- [ ] Meridian AI recommends universities and projects from the student's CV / achievements

## Finish
- [ ] Smoke test, browser check EN/KA/AR, light/dark, mobile
- [ ] Commit (push only after the user confirms in the morning)
- [ ] Morning report
