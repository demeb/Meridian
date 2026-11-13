# 1 Nov Website — overnight checklist (14 Nov 2026)

Legend: [ ] open · [x] done and verified · [~] partly done · [!] blocked (reason)
Stop rule from the user: weekly usage must not go over 50%.

## A. Research (agents, round 8)
- [~] Universities: the last 518 basic pages → full profiles (40 batches + 25 US from College Navigator). Web search budget (200/turn, shared) ran out in the first minutes; most remaining sites block automated reading — see research/round8/THIN.txt
- [~] Internships: new section (third tab on Programmes + menu) with verified internships; short of 200 because company careers pages are JavaScript-only and search was used up
- [~] More scholarships: grantradar.ge had no concrete leads beyond ones already listed; a few new ones verified
- [x] More exchange programmes (21 verified) ; FLEX is one entry with a per-country rounds table
- [x] Translate new records (ka/ar) and merge — every programme and university has Georgian and Arabic

## B. 1 Nov doc
- [x] Globe: zooms to the chosen country; US state borders; State filter with counts; chosen state raised
- [x] Globe pins drawn above the top menu when scrolling (globe is its own layer now)
- [x] Hovering a big country freezes the page (raised shape uses a light outline: Canada 11,573 → ~2,000 points)
- [x] Tracker: collapsible cards (one line with stage and progress; remembered per browser)
- [x] FAQ: pay answer matches the plans; research and apply answers corrected; contact question added
- [x] Leadership: Instagram removed; LinkedIn + Gmail; key-point bios from the doc
- [x] Counselling: "Make my CV with AI" form (CV, Europass, activities list, letters, brag sheet) in tools and in the CV/letter courses
- [x] Prep: OMPT (omptest.org) added from the official pages
- [x] Counsellors see their booked students' universities (new tab on the tutor dashboard)
- [x] Excel export for saved programmes
- [x] Security: login / sign-up / reset rate limits, HSTS, CSP frame-ancestors, Permissions-Policy
- [x] Programmes: Research and Olympiads chips (olympiads no longer under Competitions)
- [x] Universities: next round shown after a deadline passes (IE University → 15 Jan 2027); rolling label
- [x] contact.meridiangoal@gmail.com everywhere (also the team inbox for tutor applications and partner messages)

## C. Finish
- [x] Smoke test (all passed), browser check EN/KA/AR, server memory 187 MB
- [ ] Push (waiting for the user's OK) and morning report


---

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
