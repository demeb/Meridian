<div align="center">

# Meridian

**The meridian line to connect your goals.**

A unified education platform for students in Georgia — international programmes,
scholarships, exchanges, tutors and college counselling in one place.

</div>

---

## Run it

**The easy way:** open the `Meridian` folder in Finder and double-click

```
Start Meridian.command
```

It sets everything up on first run, starts the server and opens your browser.
Leave the Terminal window it opens running — closing that window stops the site.

**From the terminal**, if you prefer:

```bash
cd ~/Desktop/Meridian
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 run.py
```

Either way the site is at **http://127.0.0.1:5001**

That is the whole setup. There is no build step, no bundler and no database server —
Flask serves the site and SQLite stores the data in a single file.

---

## What is in the box

| Page | Route | What it does |
|---|---|---|
| Home | `/` | Hero with a live rotating globe, the deadlines closing soonest, why Meridian exists, the four-step journey, newest programmes, student outcomes |
| Programs | `/programs` | Interactive globe with a pin per programme. Filter by family, region and funding; click a pin and the globe flies to it and opens the full brief |
| Teachers | `/teachers` | Tutor directory with photos, short intros, filters, prices shown with the fee included |
| Tutor profile | `/teacher?id=…` | Photo, intro, experience, services, and a calendar of the exact times the tutor opened |
| Pricing | `/pricing` | Explorer / Compass / Navigator memberships, the tutoring fee explained, comparison, FAQ |
| Checkout | `/checkout?order=…` | Card, Apple Pay, Google Pay, Bank of Georgia, TBC Pay |
| Become a tutor | `/tutors/apply` | Tutor application with photo upload |
| Tutor dashboard | `/tutor` | Weekly availability calendar, booked lessons, earnings, profile editing |
| About us | `/about` | Mission and vision, plus four sub-pages below |
| — Leadership | `/about/leadership` | The co-founders, and the roles we are hiring for |
| — Programs & universities | `/about/offerings` | The six programme families in the database |
| — Teachers around the world | `/about/global-teachers` | Where our tutors are, grouped by country |
| — FAQ | `/about/faq` | Straight answers on cost, eligibility, data and counselling |
| Engage | `/engage` | Partnership enquiry form — sends straight to the team inbox |
| Log in / Sign up | `/login` | Registration (stage from grade 7 to PhD, country, interests), email verification, forgot password |
| My account | `/account` | Saved programmes, lesson requests, Compass membership |
| Admin | `/admin` | Everything stored, behind an admin token |

Every page has the dark/light switch, the English/ქართული switch and the full footer.

---

## Where the data lives — and how you read it

This is the part worth understanding properly.

### The file

Everything a visitor submits goes into **one file**:

```
backend/meridian.db
```

It is a standard SQLite database. No server to install, nothing running in the
background — just a file you can copy, back up or email to yourself. It is created
automatically the first time you start the site.

### What is in it

| Table | Holds |
|---|---|
| `users` | First name, last name, email, optional phone, hashed password, verified flag, plan, stage of study, created/last-login timestamps |
| `verification_codes` | Hashed 6-digit codes, attempt counter, expiry |
| `sessions` | Login tokens and their expiry |
| `tutors` | Tutor profiles: photo, headline, intro, bio, subjects, price, status (pending / approved) |
| `tutor_slots` | Every time a tutor opened, and whether it is open, held during checkout, or booked |
| `bookings` | Lessons: student, tutor, time, service, note, price paid, status |
| `orders` | Every payment: lesson or membership, tutor price, fee, total, method (brand + last 4 only) |
| `ledger` | Where each payment's money goes: the tutor's share and Meridian's fee, plus refunds |
| `saved_programs` | Which programmes each student saved |
| `partnership_inquiries` | Everything submitted through the Engage page |

Programme and tutor content is **not** in the database — it lives in editable JSON
files (see below), so the research team can update content without touching SQL.

### Three ways to read it

**1. The admin page** — open http://127.0.0.1:5001/admin and enter your admin token
(`MERIDIAN_ADMIN_TOKEN`, default `meridian-admin`). You get counts and tables for
accounts, lesson requests and partnership enquiries.

**2. The command line**

```bash
python3 tools/admin.py stats        # summary counts
python3 tools/admin.py users        # every account
python3 tools/admin.py bookings     # lesson requests with the student's email
python3 tools/admin.py inquiries    # partnership enquiries
python3 tools/admin.py saved        # saved programmes per student
python3 tools/admin.py export students.csv --table users
python3 tools/admin.py sql "SELECT email, plan FROM users WHERE verified = 1"
python3 tools/admin.py reset --yes   # wipe all visitor records, keep the content
```

> The database currently contains two test accounts created while building the
> site (`demo@meridian.ge` and `ana.test@meridian.ge`) so the admin page has
> something to show. Run `python3 tools/admin.py reset --yes` to clear them.

**3. Any SQLite browser** — open `backend/meridian.db` in
[DB Browser for SQLite](https://sqlitebrowser.org), TablePlus, or the `sqlite3` CLI.

### About passwords

Passwords are **never stored as text**. Each one is hashed with PBKDF2-HMAC-SHA256,
240,000 iterations, with a unique random salt per user. Nobody can read them back —
not an attacker with the file, and not you. If a student forgets their password the
only option is to reset it, which is correct.

Verification codes are hashed the same way, expire after 15 minutes, allow five
attempts and are limited to five per email per hour.

---

## Email — making codes arrive in real inboxes

Until a mailbox is connected, Meridian cannot reach anyone's inbox: messages are
saved to `backend/outbox/` and the code is shown on screen. That is why
verification emails were not arriving.

**Connect Gmail in one step** — double-click **`Set Up Email.command`** in the
Meridian folder (or run `python3 tools/setup_email.py`). It asks for:

1. the address Meridian sends from (e.g. `hello@meridian.ge` on Google Workspace, or any Gmail),
2. a Gmail **App Password** — not your normal password:
   - turn on 2-Step Verification at <https://myaccount.google.com/security>
   - create an App Password at <https://myaccount.google.com/apppasswords> and copy the 16 characters.

It tests the login, saves everything to `.env` (readable only by you, never
committed), and sends you a test email. Restart Meridian and from then on every
verification code, password reset, receipt and booking notice goes to real inboxes.
The `/admin` page shows whether email is live or failing.

---

## Payments, the 10% fee and payouts

- Tutors set their own price. **Meridian adds 10% on top automatically**: a tutor
  who charges 20 ₾ is shown to students at 22 ₾.
- When a student pays 22 ₾, the ledger records **20 ₾ to the tutor** (their full
  price) and **2 ₾ to Meridian**. Every movement is a row in the `ledger` table; the
  admin page totals revenue and what is owed to tutors.
- A tutor cancelling refunds the student in full and reverses both ledger rows.
- Change the rate with `MERIDIAN_PLATFORM_FEE` in `.env`.

**Checkout** takes **Visa and Mastercard only**. It runs in **test mode** until you
connect a provider, so nothing is charged. Test cards: `4242 4242 4242 4242` (Visa)
or `5555 5555 5555 4444` (Mastercard) succeed, and `4000 0000 0000 0002` is
declined. The full card number never leaves the browser: only the brand and the
last four digits are sent. Any other brand or method is refused by the server.

**Going live with real money**: Stripe does not accept companies registered in
Georgia or Qatar (checked on stripe.com/global), and Paddle and Lemon Squeezy
forbid tutoring and counselling. The plan, from the research in
`backend/data/research/investment.json`:

1. **Georgia first.** Register a Georgian LLC and use **TBC Checkout** or **BOG
   Payments** in lari (about 2.5%, recurring billing included). Pay tutors by local
   bank transfer. The LLC also makes GITA grants possible.
2. **Qatar.** Once there is a Qatari entity (QFC, Media City Qatar or QSTP), use
   **Tap Payments**. It is licensed by the Qatar Central Bank and supports
   subscriptions and split payouts.
3. **Global / US investors.** Form a Delaware company through Stripe Atlas
   ($500 + $100/yr). Pay tutors in countries Stripe cannot reach through Wise
   Business.

All three are hosted checkouts: the card is typed on the provider's page, which
keeps Meridian outside PCI-DSS scope. `charge()` in `backend/payments.py` is the
single function to fill in.

**Memberships** (`/pricing`): Explorer (free), Compass (29 ₾/month) and Navigator
(79 ₾/month); yearly billing gives two months free.

---

## Tutors

- **Become a tutor** (`/tutors/apply`): photo, headline, short intro, full bio,
  subjects, admissions systems, languages, education, and price, with a live
  "students will see" preview. Photos are cropped to a 640px square, and location
  and device metadata are stripped.
- **Where an application goes:**
  1. The form posts to `POST /api/tutor/apply`, which saves a row in the `tutors`
     table of `backend/meridian.db` with status **pending**. The profile is not
     visible to students.
  2. The photo is cropped in the browser (drag, zoom and rotate, like LinkedIn),
     normalised by the server to a 640px square JPEG with location and device data
     removed, and saved in `backend/uploads/tutors/`.
  3. An email ("[Tutor application] Name") goes to the team inbox
     (`MERIDIAN_TEAM_INBOX`), linking to `/admin`.
  4. On `/admin`, the **Application** button shows everything the tutor submitted.
     **Approve** makes the profile live and emails the tutor; **Reject** keeps it
     hidden.
- Starter profiles from `teachers.json` that have no real account behind them
  are labelled **Sample profile** and show no ratings or student counts. Only
  approved, real accounts get the "verified" mark.
- **Tutor dashboard** (`/tutor`): a weekly calendar. Click or drag across times to
  open them for booking, and "Repeat this week ×4" copies a week forward. Booked
  lessons show the student's name, stage, note and contact details, and what the
  tutor receives. No Google Calendar needed.
- Students only ever see times the tutor opened. Picking one holds it for 15
  minutes during checkout, and overlapping 60-minute lessons cannot be double-booked.

---

## Checking that everything works

```bash
python3 tools/smoke_test.py
```

This runs 31 end-to-end checks against the running site: sign-up, verification,
password reset, the 10% fee, slot holds, a declined card, payment, the ledger, a
tutor application with photo, approval, the tutor's calendar, a refund,
memberships, and that only Visa and Mastercard are accepted. It deletes its test accounts afterwards.

---

## Adding content

No code changes needed — these are plain JSON files.

### A new programme — `backend/data/programs.json`

```json
{
  "id": "unique-slug",
  "family": "uwc",
  "type": "school",
  "org": "Name of the organisation",
  "name":    { "en": "English title",   "ka": "ქართული სათაური" },
  "country": { "en": "United Kingdom",  "ka": "გაერთიანებული სამეფო" },
  "city": "City, region",
  "iso": "GB", "flag": "🇬🇧", "region": "europe",
  "lat": 51.4, "lon": -3.54,
  "cost": "scholarship",
  "duration": { "en": "2 years", "ka": "2 წელი" },
  "grades": "10-11",
  "opens": "2026-09-08", "deadline": "2026-11-16",
  "summary":     { "en": "…", "ka": "…" },
  "highlights":  { "en": ["…"], "ka": ["…"] },
  "eligibility": { "en": "…", "ka": "…" },
  "url": "https://official-site.org",
  "premium": false
}
```

- `lat` / `lon` place the pin on the globe. Look them up on any map.
- `family` — one of `uwc`, `erasmus`, `flex`, `summer`, `university`, `youth`, `startup`, `competition`.
- `region` — `europe`, `americas`, `asia`, `oceania`, `africa`, `middle-east`, `global`.
- `cost` — `fully-funded`, `scholarship`, `tuition-free`, `funded`, `paid`.
- `premium: true` hides the detail from signed-out visitors.
- Optional: `deadline_note` (shown under the eligibility), `sources` (official pages
  the record was checked against, shown as links), `verified_at`, and from the
  agents `score` (1–10, drives the Highlights row) and `score_reason`.

---

## Research agents — finding programmes every day

`tools/agents/discover.py` runs **nine agents** on Claude Opus 5.5 with web search
and web fetch. Eight each cover one kind of opportunity: schools/UWC, exchanges,
Erasmus+, summer, undergraduate, postgraduate, startups and competitions. The
ninth re-checks published records, because a stale deadline does more harm than a
missing programme. More agents mostly re-find the same programmes.

```bash
pip install -r tools/agents/requirements.txt
export ANTHROPIC_API_KEY=...
python3 tools/agents/discover.py --minutes 10      # quick run
python3 tools/agents/discover.py                   # all nine, 60-minute budget
```

- A full run costs roughly **$6–10**. To run it daily, schedule the command with
  cron or launchd on any machine with an API key.
- Nothing is published automatically. Each run writes
  `backend/data/discoveries/<timestamp>.json`, and the records appear on `/admin`
  under **Discoveries** to approve or reject. Approved records are appended to
  `programs.json`.
- **First run (23 Oct 2026):** 57 programmes added (universities and
  scholarships, summer schools, competitions, startup programmes). The checker
  corrected 19 of the original 22 records and removed 6 that Georgians cannot
  apply to or that could not be confirmed. Those 6 are kept, with the reason, in
  `backend/data/research/retired-programs.json`.

## Research — `/about/research`

`backend/data/research.json` drives the Research page, the facts on the home page
and the live counts on `/about`. It holds cited facts, a solution-fit table, a
competitor table, the business model, the funding calendar, payments and the open
questions. The raw agent reports, with every source, are in
`backend/data/research/`. `GET /api/research` serves it, together with live counts
of programmes, countries and checked records.

### A new tutor

Tutors now join through **`/tutors/apply`** and are approved on **`/admin`**; they
manage their own profile, photo, price and calendar from **`/tutor`**.
`backend/data/teachers.json` is only the starting set: it is copied into the
database the first time the site runs.

New subject names go in `frontend/js/taxonomy.js`. Add the slug with its English
and Georgian labels and it appears in every filter and form automatically.

---

## Translations

All interface text lives in `frontend/js/i18n.js` as two dictionaries, `en` and `ka`.

```js
'nav.programs': 'Programs',      // en
'nav.programs': 'პროგრამები',    // ka
```

Use a key in markup with `data-i18n="nav.programs"`, or in JavaScript with
`M.t('nav.programs')`. Content coming from JSON uses `{ "en": …, "ka": … }` objects
and is picked up automatically by `M.pick()`.

---

## How it is put together

```
Meridian/
├── run.py                     start here
├── requirements.txt           one dependency: Flask
├── .env.example               copy to .env
│
├── backend/
│   ├── app.py                 routes and the JSON API
│   ├── db.py                  SQLite schema, password hashing, sessions
│   ├── mailer.py              SMTP, with a file-based fallback
│   ├── config.py              settings, read from the environment
│   ├── meridian.db            ← created on first run
│   ├── outbox/                ← emails land here when SMTP is off
│   └── data/
│       ├── programs.json      the programme database
│       └── teachers.json      the tutor directory
│
├── frontend/
│   ├── *.html                 one file per page
│   ├── css/
│   │   ├── tokens.css         colour, type, spacing, motion — the whole system
│   │   ├── base.css           reset, typography, layout primitives
│   │   ├── components.css     buttons, cards, nav, footer, forms, calendar
│   │   └── pages.css          page-level composition
│   ├── js/
│   │   ├── app.js             theme, language, nav, footer, reveal, toasts, API
│   │   ├── i18n.js            English + Georgian dictionaries
│   │   ├── taxonomy.js        subjects, regions, languages
│   │   ├── globe.js           the globe engine
│   │   ├── home.js  programs.js  teachers.js  teacher.js
│   │   ├── about.js  engage.js  auth.js  account.js  admin.js
│   └── assets/
│       ├── globe-dots.json    land data for the globe
│       └── favicon.svg
│
└── tools/
    ├── admin.py               read the database from the terminal
    ├── build_globe.py         regenerate the globe land data
    └── countries-110m.json    source map data (Natural Earth, public domain)
```

### The Earth

The globe uses real NASA satellite imagery on WebGL ([globe.gl](https://globe.gl),
stored locally in `frontend/vendor/`, so it works offline). The textures are in
`frontend/assets/earth/`.

- **Home**: a slowly turning horizon. It shows the night side with city lights in
  dark mode and the day side in light mode, with arcs drawn from Tbilisi to every
  destination in the database. It stops rendering when scrolled out of view.
- **Programs**: an explorer. Country borders rise and light up smoothly on hover,
  countries with programmes are faintly tinted, clicking a country filters the
  list, and pins fly the globe to the programme.

Country outlines with English and Georgian names are generated by
`python3 tools/build_countries.py`. Borders follow **United Nations practice**:
Crimea is drawn as part of Ukraine, Northern Cyprus as part of Cyprus, Somaliland
as part of Somalia, Kosovo is shown within Serbia, Taiwan as a province of China,
and Western Sahara as a non-self-governing territory. Clicking a country shows its
official UN name (UNTERM).

### Motion

The intro (logo assembles, curtain lifts, headline types in) plays once per
visit, can be skipped with a click or any key, and is skipped entirely for people
whose system asks for reduced motion. It follows the animate skill's rules:
transform, opacity and clip-path only, strong ease-out curves, CSS keyframes so
it stays smooth while the page loads, and a CSS-only fallback that never traps
the page.

### The logo

Your logo is split into exact layers in `frontend/assets/brand/`: the star facets,
book pages and wordmark as masks. It recolours for dark and light mode, and the
star turns on its own (a compass quarter-turn on hover). `meridian-logo.png` is
the full-colour version, used in emails.

### Design system

| | Dark | Light |
|---|---|---|
| Background | deep navy | dodger blue |
| Search bar | navy blue | royal blue |
| Accents | cobalt blue | royal blue |
| Surfaces | translucent navy glass | white paper |

Both themes are defined entirely as CSS custom properties in `tokens.css`. Nothing
else in the codebase hardcodes a colour, so changing the palette is a one-file job.
Body text always sits on a surface with at least 4.5:1 contrast — which is why light
mode puts content on white cards over the blue field rather than directly on it.

Typography is **Sora** for headings, **Inter** for body, **Newsreader** italic for
editorial accents, and **Noto Sans Georgian** whenever the language is set to
ქართული.

---

## Free vs paid

| | Signed out | Explorer (free) | Compass 29 ₾/mo | Navigator 79 ₾/mo |
|---|---|---|---|---|
| Programme list, countries, deadlines | ✅ | ✅ | ✅ | ✅ |
| Full programme briefs and official links | partial | ✅ | ✅ | ✅ |
| Tutor profiles and booking | first 4 | ✅ | ✅ | ✅ |
| Monthly shortlist by email, deadline alerts, tracker | — | — | ✅ | ✅ |
| Priority booking with counsellors | — | — | ✅ | ✅ |
| Monthly counsellor check-in + one essay review | — | — | — | ✅ |
| Meridian AI | — | — | — | coming soon |

Lessons are paid per lesson at the tutor's price plus 10%.

---

## Before going live

- [ ] Set a real `MERIDIAN_SECRET_KEY` and `MERIDIAN_ADMIN_TOKEN`
- [ ] Configure SMTP and set `MERIDIAN_DEV_CODES=false`
- [ ] Set `MERIDIAN_DEBUG=false` and `MERIDIAN_COOKIE_SECURE=true`
- [ ] Serve over HTTPS behind a real WSGI server (`gunicorn run:application`)
- [ ] Back up `backend/meridian.db` on a schedule
- [ ] Write the privacy policy and terms that `/about/faq` links to
- [ ] Connect real email: double-click `Set Up Email.command`
- [ ] Register the company and open a merchant account (TBC Checkout or BOG Payments in Georgia, Tap Payments in Qatar), then set `MERIDIAN_PAYMENT_PROVIDER`
- [ ] Schedule `tools/agents/discover.py` daily and review **Discoveries** on `/admin`
- [ ] Have a native speaker review the Georgian text the agents wrote
- [ ] Decide when tutor payouts are sent (the `ledger` table already tracks what each tutor is owed)

## Round 5 (30 Oct 2026) — what was added

| Area | Where | Notes |
|---|---|---|
| Meridian AI | `backend/assistant.py`, `frontend/js/ai.js` | Chat button on every page. Claude answers through tools that search *our* catalogue (programmes, scholarships, universities, prep), links to Meridian pages, never invents deadlines. Off until `ANTHROPIC_API_KEY` is set (and `anthropic` installed — Python 3.10+). Daily limits: guest 6, Explorer 25, Compass 120, Navigator 300 (`MERIDIAN_AI_*_LIMIT`). Only counts are stored (`ai_usage`). |
| Universities | `/universities`, `tools/merge_universities.py` | Its own section. QS-ranked list (~1,500) + full profiles with SAT/ACT ranges, IELTS/TOEFL/Duolingo minimums, tuition, aid, scholarships. Sidebar filters with "your scores" → reach / match / likely. Rank shows only on the university's own page. |
| Excel | `GET /api/saved/universities.xlsx`, `backend/xlsx.py` | One formatted sheet of the student's saved universities (no extra packages). Button in the account page. |
| College counselling | `/counselling`, `backend/counselling.py` | AI studio, two self-tests (country fit, RIASEC career), mini-courses (CV, Europass, letters, interviews, email, etiquette, personal statement), counsellor sign-up → admin review, partner schools with email lists, a private school board. |
| Prep materials | `/prep`, `backend/data/prep.json` | Official info and resources for SAT, ACT, IELTS, TOEFL, Duolingo, PTE, Cambridge, AP, IB, GRE, GMAT, Georgian national exams, QU placement. |
| Programmes | `tools/merge_round5.py` | ~500 live records from the round-5 agents, fact-checked (closed ones archived — e.g. John Locke). Filters: MUN, Erasmus+, Exchange, FLEX, UWC, summer, competitions, startups, youth, volunteering, STEM, trainings. "Near you" highlights from the student's country of residence. |
| Arabic | `frontend/js/i18n.js` (`ar` block), `tools/i18n/add_keys.py` | Whole interface in EN / KA / AR, right-to-left layout. Programme texts are translated by `tools/apply_translations.py` from `research/round5/translate/out-*.json`. |

Re-run the data steps any time:

```bash
python3 -X utf8 tools/merge_round5.py        # programmes + universities + prep/courses/quizzes
python3 -X utf8 tools/apply_translations.py  # Georgian + Arabic texts
```

## Hosting — meridiangoal.com on Render

`render.yaml` describes the live site: one Python web service on the Starter
plan (about $7/month) with a 1 GB persistent disk mounted at `/var/data`.
`MERIDIAN_STORAGE=/var/data` puts the database, uploads, outbox and reports on
that disk, so they survive deploys. Render generates the secret key and admin
token — read the admin token in Render → meridian → Environment.

1. Render → **New → Blueprint** → pick this repo → **Apply**.
2. Cloudflare → meridiangoal.com → **DNS**: delete the GitHub Pages records and
   add the two records Render shows under **Settings → Custom Domains**
   (DNS only, grey cloud).
3. Every `git push` to `main` redeploys.

Until SMTP is configured, sign-up codes are still shown on screen, but
password-reset codes never are outside debug mode.

---

## Coming soon

**Meridian AI** — built into the globe. Describe your grades, budget and ambition,
and it proposes the programmes worth your time and the order to apply in.

---

<div align="center">
Based in Doha, Qatar. © 2026 Meridian.
</div>
