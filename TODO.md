# Oct 30 Website — overnight checklist (31 Oct 2026)

Legend: [ ] open · [x] done and verified · [!] blocked (reason)

## Data (research agents → round6, merged with tools/merge_round5.py)
- [x] 2000 projects / 500 scholarships — 2,067 / 588
- [!] 30% of new projects in Georgia — 167 Georgian records (146 new of 1,947 new = 7.5%): most Georgian calls are on Facebook (login wall) or sites that block automated reading, and autumn calls had closed
- [x] More exchanges + FLEX (FLEX also shown under Exchange) — exchange 85 + FLEX 32 (was 5 + 2)
- [!] Facebook pages as sources — logged-out Facebook shows no posts; the linked post's 4 visible items were already in Meridian, 4 more images need a login
- [x] Universities: more full profiles + other tests (GMAT, LSAT, UCAT…) — 338 full profiles (was 222)
- [x] Prep: Georgian national exams (NAEC past papers), official materials per section, all university tests — 36 exams, 323 links
- [x] Georgian/Arabic for new records + the 47 English-only university profiles — all 2,655 programmes and 338 profiles
  - programme batches in round6/translate/in-01…in-27 (Georgia → Gulf → scholarships → rest): 01–06 running; queue 07–27
  - do NOT re-run extract_untranslated.py while translators run (it rewrites in-NN); new research after the 31 Oct merge → separate prefix

## Navigation and layout
- [x] Home link back in the nav
- [x] "Mentorship" dropdown = Teachers + Prep; Counselling stays separate
- [x] Language picker as a dropdown (default English)
- [x] Log in / Create account fit in the header in every language
- [x] Back button returns to the filtered list (e.g. Qatar projects), not just "All results"
- [x] Collapse button (top right) on long panels: my applications, saved universities, etc.

## Home
- [x] Earth fills the hero again (bigger), animation kept
- [x] Highlights: button to switch to "Top 10 in my country" (from sign-up country)

## Filters and lists
- [x] Country filter searchable ("qa" → Qatar); review every filter
- [x] Major / field filter (programmes, scholarships, universities)
- [x] Saved button fills blue when saved
- [x] Scholarships page filter row broken until clicked; general lag
- [x] Smoother programme opening and globe dragging

## Programmes
- [x] Tutor suggestion on programme pages (e.g. UWC → teachers filtered to UWC)

## Universities
- [x] Logos in the small box on every university card (downloaded files)
- [x] Other required tests shown on the page and in Excel

## Excel export
- [x] All money in USD, better structure, countries with 5+ universities grouped
- [x] Other tests column

## Sign-up and account
- [x] Date of birth required (day, month, year)
- [x] Email codes reach Gmail: Gmail SMTP sender (user adds app password on Render) — code ready; user adds app password on Render

## Pricing
- [x] Compass $7.99, Navigator $14.99, everything in USD (no GEL)

## Counselling
- [x] No general mention of partner-school counsellors; school members see their school's counsellors, webinars and programmes
- [x] Independent counsellors for everyone; affiliation shown on profile
- [x] Counsellor filter: General, EU, US, Asian university counselling
- [x] Mini-courses: a picture for each course (Europass template etc.)

## Prep
- [x] Less text, cleaner structure

## Finish
- [x] Smoke test passes, browser check EN/KA/AR, light/dark, mobile
- [ ] Commit + push (approved) → verify meridiangoal.com
- [ ] Morning report incl. what the user must do on Render (Gmail app password, ANTHROPIC_API_KEY)
