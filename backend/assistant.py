"""Meridian AI — the guide that answers through Meridian's own catalogue.

    GET  /api/ai/status     is it switched on, and how many messages are left today
    POST /api/ai/chat       {"messages": [{"role": "user"|"assistant", "content": "..."}], "page": "/universities/mit"}

Claude (Anthropic) answers with tools that search our programmes, scholarships,
universities and prep material, so every opportunity it names is one we have
checked and links to its page on Meridian. It never invents deadlines.

Switched on by setting ANTHROPIC_API_KEY (and installing `anthropic` from
requirements.txt). Without a key the chat button still shows and says "soon".
Only message counts are stored (ai_usage); the conversation itself lives in the
student's browser.
"""
import datetime
import json
import os
import re

from flask import Blueprint, jsonify, request

import catalog
import db
from config import Config, DATA_DIR

bp = Blueprint("assistant", __name__)

MODEL = os.environ.get("MERIDIAN_AI_MODEL", "claude-opus-5-5")
LIMIT_USER = int(os.environ.get("MERIDIAN_AI_DAILY_LIMIT", "25"))
LIMIT_GUEST = int(os.environ.get("MERIDIAN_AI_GUEST_LIMIT", "6"))
LIMIT_COMPASS = int(os.environ.get("MERIDIAN_AI_COMPASS_LIMIT", "120"))
LIMIT_NAVIGATOR = int(os.environ.get("MERIDIAN_AI_NAVIGATOR_LIMIT", "300"))
MAX_TURNS = 24            # conversation turns we accept from the browser
MAX_CHARS = 6000          # per message — enough for an essay draft
MAX_TOOL_ROUNDS = 6

try:                       # optional until the key is configured
    import anthropic
except ImportError:        # pragma: no cover - depends on the host
    anthropic = None

_client = None


def enabled():
    return bool(anthropic and os.environ.get("ANTHROPIC_API_KEY"))


def client():
    global _client
    if _client is None:
        _client = anthropic.Anthropic(max_retries=2, timeout=90.0)
    return _client


# ---------------------------------------------------------------- the brief
SYSTEM = """You are Meridian AI, the guide inside Meridian (meridiangoal.com), an education platform for \
high-school and university students worldwide, based in Doha. Meridian lists projects (Model UN, Erasmus+, \
exchanges, FLEX, UWC, summer schools, competitions, startup and youth programmes, volunteering, STEM, trainings), \
scholarships, QS-ranked universities with admission data, test-prep materials, tutors and college counsellors.

What you do
- Help each student find opportunities that fit them, plan applications, and prepare: choosing universities \
(reach / match / likely), scholarships, essays and personal statements, CVs and Europass, cover and motivation \
letters, interview practice, professional emails, test-prep plans (SAT, IELTS, TOEFL, Duolingo...), study and \
career paths.
- Act like an experienced, warm college counsellor: ask one or two short questions when key facts are missing \
(grade, country, budget, scores, interests, goals), then give concrete, practical steps.

Ground rules
- Opportunities, deadlines, scores, fees and scholarships must come from Meridian's tools. Search before you \
recommend. If the tools find nothing, say so plainly and suggest how the student could search more broadly; \
never invent a programme, a deadline, a coverage percentage or an admission number.
- When you mention an item from the tools, link it with its Meridian page as a markdown link, e.g. \
[Gates Cambridge](/programs/gates-cambridge) or [MIT](/universities/mit). Never link to aggregator sites.
- Admission chances are estimates, never promises. Compare the student's scores with the middle-50% ranges: \
above the range = likely, inside = match, below = reach. Mention test-optional policies and English minimums.
- Writing help: coach, don't ghost-write. Give structure, feedback, examples of strong sentences and rewrites \
of the student's own lines, but keep it their voice and their story. Be honest about weak spots.
- Answer in the student's language (English, Georgian or Arabic), matching how they write.
- Be concise: short paragraphs and bullet points, no filler. Use markdown headings only for long answers.
- Today's date is in the context below; deadlines before it are closed.
- You are not a lawyer, doctor or financial adviser; for visas or money decisions point to official sources.
- Stay on education, careers and Meridian. Politely decline anything unrelated or unsafe."""


def _profile_text(user, page):
    lines = ["Today: %s" % datetime.date.today().isoformat()]
    if user:
        p = {k: user[k] for k in user.keys()}
        interests = p.get("interests") or ""
        lines += [
            "The student is logged in.",
            "Name: %s" % (p.get("first_name") or ""),
            "Grade/stage: %s" % (p.get("grade") or "unknown"),
            "Country of residence: %s" % (p.get("country") or "unknown"),
            "City: %s · School: %s" % (p.get("city") or "-", p.get("school") or "-"),
            "Birth year: %s" % (p.get("birth_year") or "unknown"),
            "Interests: %s" % (interests or "-"),
            "Target regions: %s" % (p.get("target_regions") or "-"),
            "Plan: %s" % (p.get("plan") or "free"),
        ]
        saved = db.list_saved(p["id"])
        if saved:
            lines.append("Saved on Meridian: %s" % ", ".join(saved[:30]))
    else:
        lines.append("The student is not logged in (suggest creating a free account to save items and track applications).")
    if page:
        lines.append("They opened the chat on this page: %s" % page)
    return "\n".join(l for l in lines if l)


# ---------------------------------------------------------------- tools
def _t(value):
    if isinstance(value, dict):
        return value.get("en") or next(iter(value.values()), "")
    return value or ""


def _words(text):
    return [w for w in re.split(r"\W+", (text or "").lower()) if len(w) > 1]


def _program_card(p):
    return {
        "id": p["id"], "page": "/programs/%s" % p["id"], "name": _t(p.get("name")), "org": p.get("org"),
        "section": p.get("section"), "family": p.get("family"), "type": p.get("type"),
        "country": _t(p.get("country")), "city": p.get("city"), "cost": p.get("cost"),
        "level": p.get("level"), "coverage": p.get("coverage"), "coverage_pct": p.get("coverage_pct"),
        "grades": p.get("grades"), "deadline": p.get("deadline"), "event_dates": p.get("event_dates"),
        "summary": _t(p.get("summary")),
    }


def search_programs(query="", section=None, family=None, country=None, level=None, funding=None, limit=8):
    words = _words(query)
    out = []
    for p in catalog.programs():
        if section and p.get("section", "project") != section:
            continue
        if family and p.get("family") != family:
            continue
        if country:
            c = country.lower()
            if c not in (p.get("iso") or "").lower() and c not in json.dumps(p.get("country"), ensure_ascii=False).lower():
                continue
        if level and level not in (p.get("level") or []) and level not in " ".join(p.get("keywords") or []):
            continue
        if funding == "full" and not (p.get("cost") == "fully-funded" or p.get("coverage") == "full"):
            continue
        if catalog.is_expired(p):
            continue
        hay = " ".join([_t(p.get("name")), p.get("org") or "", _t(p.get("summary")), _t(p.get("country")),
                        p.get("city") or "", p.get("family") or "", p.get("type") or "",
                        " ".join(p.get("keywords") or [])]).lower()
        hits = sum(1 for w in words if w in hay)
        if words and not hits:
            continue
        out.append((hits, p.get("score") or 0, p))
    out.sort(key=lambda r: (-r[0], -r[1]))
    return {"count": len(out), "results": [_program_card(p) for _h, _s, p in out[:max(1, min(int(limit or 8), 15))]]}


def get_program(id):
    p = catalog.find_program(id)
    if not p:
        return {"error": "not found"}
    keep = ("about", "highlights", "eligibility", "how_to_apply", "costs", "duration", "deadline_note", "url", "apply_url")
    card = _program_card(p)
    card.update({k: _t(p.get(k)) if isinstance(p.get(k), dict) else p.get(k) for k in keep})
    return card


def _uni_card(u, sat=None, ielts=None):
    card = {
        "id": u["id"], "page": "/universities/%s" % u["id"], "name": _t(u.get("name")),
        "country": _t(u.get("country")), "city": u.get("city"), "qs_rank": u.get("rank_qs"),
        "profile": u.get("profile", "full"), "type": u.get("type"),
    }
    if u.get("profile", "full") == "full":
        card.update({
            "sat_mid50": u.get("sat"), "act_mid50": u.get("act"), "ielts_min": u.get("ielts_min"),
            "toefl_min": u.get("toefl_min"), "duolingo_min": u.get("duolingo_min"),
            "acceptance_rate": u.get("acceptance_rate"), "tuition_intl": u.get("tuition_intl"),
            "aid_intl": _t(u.get("aid_intl")), "deadline": u.get("deadline"), "platform": u.get("platform"),
            "scholarships": [s.get("name") for s in (u.get("scholarships") or [])][:5],
        })
        fit = []
        s = u.get("sat") or {}
        if sat and s.get("low") and s.get("high"):
            fit.append("likely" if sat >= s["high"] else "match" if sat >= s["low"] else "reach")
        if ielts and u.get("ielts_min"):
            fit.append("english ok" if ielts >= u["ielts_min"] else "IELTS below minimum %s" % u["ielts_min"])
        if fit:
            card["fit"] = ", ".join(fit)
    return card


def search_universities(query="", country=None, region=None, max_rank=None, max_tuition_usd=None,
                        sat=None, ielts=None, aid_only=False, limit=10):
    words = _words(query)
    full, rest = catalog.directory()
    out = []
    for u in list(full) + list(rest):
        if not isinstance(u.get("name"), dict):
            continue
        if country:
            c = country.lower()
            if c != (u.get("iso") or "").lower() and c not in json.dumps(u.get("country"), ensure_ascii=False).lower():
                continue
        if region and u.get("region") != region:
            continue
        if max_rank and (not u.get("rank_qs") or u["rank_qs"] > max_rank):
            continue
        if aid_only and not _t(u.get("aid_intl")):
            continue
        if max_tuition_usd:
            t = u.get("tuition_intl") or {}
            rate = USD_RATES.get((t.get("currency") or "USD").upper())
            if t.get("amount") is None or rate is None:
                continue
            if t["amount"] * rate * (2 if t.get("per") == "semester" else 1) > max_tuition_usd:
                continue
        hay = " ".join([_t(u.get("name")), _t(u.get("country")), u.get("city") or "",
                        " ".join(u.get("keywords") or []), " ".join(_t(u.get("strengths")) or [])
                        if isinstance(_t(u.get("strengths")), list) else ""]).lower()
        hits = sum(1 for w in words if w in hay)
        if words and not hits:
            continue
        out.append((-(hits), u.get("profile", "full") != "full", u.get("rank_qs") or 99999, u))
    out.sort(key=lambda r: r[:3])
    return {"count": len(out), "results": [_uni_card(u, sat, ielts) for *_k, u in out[:max(1, min(int(limit or 10), 15))]]}


USD_RATES = {"USD": 1, "EUR": 1.08, "GBP": 1.27, "CHF": 1.12, "CAD": 0.73, "AUD": 0.66, "QAR": 0.27, "AED": 0.27,
             "SAR": 0.27, "JPY": 0.0067, "KRW": 0.00073, "CNY": 0.14, "HKD": 0.13, "SGD": 0.74, "TRY": 0.03,
             "SEK": 0.095, "NOK": 0.093, "DKK": 0.145, "PLN": 0.25, "CZK": 0.043, "HUF": 0.0027, "GEL": 0.37}


def get_university(id):
    u = catalog.find_university(id)
    if not u:
        return {"error": "not found"}
    card = _uni_card(u)
    for k in ("about", "tests", "gpa_note", "strengths", "top_programs", "requirements", "deadline_note",
              "intakes", "students", "intl_pct", "website", "application_url"):
        v = u.get(k)
        if k == "requirements" and v:
            v = [_t(r.get("label")) for r in v]
        card[k] = _t(v) if isinstance(v, dict) else v
    card["scholarships"] = u.get("scholarships")
    return card


def get_prep(exam=""):
    try:
        data = json.load(open(os.path.join(DATA_DIR, "prep.json"), encoding="utf-8"))
    except (OSError, ValueError):
        return {"error": "prep materials are not loaded yet"}
    exams = data.get("exams", [])
    if exam:
        exams = [e for e in exams if exam.lower() in (e.get("id", "") + " " + e.get("name", "")).lower()]
    return {"page": "/prep", "exams": [{
        "id": e.get("id"), "name": e.get("name"), "by": e.get("by"), "what": _t(e.get("what")),
        "format": _t(e.get("format")), "dates": _t(e.get("dates")), "cost": e.get("cost"),
        "register_url": e.get("register_url"),
        "resources": [{"title": _t(r.get("title")), "kind": r.get("kind"), "provider": r.get("provider"),
                       "url": r.get("url"), "free": r.get("free")} for r in (e.get("resources") or [])][:12],
    } for e in exams[:4]]}


TOOLS = [
    {"name": "search_programs",
     "description": "Search Meridian's live catalogue of projects (MUN, Erasmus+, exchanges, FLEX, UWC, summer "
                    "schools, competitions, startup, youth, volunteering, STEM, trainings) and scholarships. Use it "
                    "before recommending any opportunity. Returns ids, Meridian page links, deadlines and costs.",
     "input_schema": {"type": "object", "properties": {
         "query": {"type": "string", "description": "Keywords, e.g. 'startup accelerator', 'debate', 'bachelor full scholarship spain'"},
         "section": {"type": "string", "enum": ["project", "scholarship"]},
         "family": {"type": "string", "enum": ["mun", "erasmus", "exchange", "flex", "uwc", "summer", "competition",
                                               "startup", "youth", "volunteering", "stem", "training", "scholarship"]},
         "country": {"type": "string", "description": "Host country name or ISO code"},
         "level": {"type": "string", "enum": ["bachelor", "masters", "phd"]},
         "funding": {"type": "string", "enum": ["full", "any"]},
         "limit": {"type": "integer", "minimum": 1, "maximum": 15}}}},
    {"name": "get_program",
     "description": "Full details of one programme or scholarship by id: about, eligibility, how to apply, costs, official links.",
     "input_schema": {"type": "object", "properties": {"id": {"type": "string"}}, "required": ["id"]}},
    {"name": "search_universities",
     "description": "Search Meridian's QS-ranked universities. Pass the student's SAT and IELTS to get a reach/match/"
                    "likely estimate per university. Full profiles have test ranges, English minimums, tuition, aid and deadlines.",
     "input_schema": {"type": "object", "properties": {
         "query": {"type": "string", "description": "Name or field keywords, e.g. 'computer science', 'medicine'"},
         "country": {"type": "string"}, "region": {"type": "string", "enum": ["europe", "americas", "asia", "middle-east", "africa", "oceania"]},
         "max_rank": {"type": "integer", "description": "Only QS rank at or better than this"},
         "max_tuition_usd": {"type": "integer"}, "sat": {"type": "integer"}, "ielts": {"type": "number"},
         "aid_only": {"type": "boolean", "description": "Only universities that publish aid for internationals"},
         "limit": {"type": "integer", "minimum": 1, "maximum": 15}}}},
    {"name": "get_university",
     "description": "Full profile of one university by id: tests, requirements, deadlines, tuition, aid, scholarships, programmes.",
     "input_schema": {"type": "object", "properties": {"id": {"type": "string"}}, "required": ["id"]}},
    {"name": "get_prep_materials",
     "description": "Official test information and the best prep resources on Meridian for an exam (SAT, ACT, IELTS, TOEFL, Duolingo, PTE, AP, IB, GRE, GMAT, Georgian national exams).",
     "input_schema": {"type": "object", "properties": {"exam": {"type": "string"}}}},
]

HANDLERS = {
    "search_programs": search_programs,
    "get_program": get_program,
    "search_universities": search_universities,
    "get_university": get_university,
    "get_prep_materials": lambda exam="": get_prep(exam),
}


def run_tool(name, args):
    handler = HANDLERS.get(name)
    if not handler:
        return {"error": "unknown tool"}, True
    try:
        return handler(**(args or {})), False
    except TypeError as exc:
        return {"error": "bad arguments: %s" % exc}, True


# ---------------------------------------------------------------- limits
def _who(user):
    if user:
        return "u%s" % user["id"]
    forwarded = request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
    return "ip:%s" % (forwarded or request.remote_addr or "?")


def _limit(user):
    if not user:
        return LIMIT_GUEST
    plan = user["plan"] or "free"
    return LIMIT_NAVIGATOR if plan == "navigator" else LIMIT_COMPASS if plan == "compass" else LIMIT_USER


def _user():
    return db.session_user(request.cookies.get(Config.COOKIE_NAME))


# ---------------------------------------------------------------- routes
@bp.get("/api/ai/status")
def status():
    user = _user()
    used = db.ai_used_today(_who(user))
    return jsonify({"ok": True, "enabled": enabled(), "left": max(0, _limit(user) - used), "limit": _limit(user)})


@bp.post("/api/ai/chat")
def chat():
    if not enabled():
        return jsonify({"ok": False, "error": "ai_off"}), 503
    user = _user()
    who = _who(user)
    if db.ai_used_today(who) >= _limit(user):
        return jsonify({"ok": False, "error": "ai_limit", "authed": bool(user)}), 429

    data = request.get_json(silent=True) or {}
    history = []
    for m in (data.get("messages") or [])[-MAX_TURNS:]:
        role = m.get("role")
        text = str(m.get("content") or "").strip()[:MAX_CHARS]
        if role in ("user", "assistant") and text:
            history.append({"role": role, "content": text})
    while history and history[0]["role"] != "user":
        history.pop(0)
    if not history or history[-1]["role"] != "user":
        return jsonify({"ok": False, "error": "empty"}), 400

    page = str(data.get("page") or "")[:200]
    system = [
        {"type": "text", "text": SYSTEM, "cache_control": {"type": "ephemeral"}},
        {"type": "text", "text": _profile_text(user, page)},
    ]
    messages = list(history)
    used_items = []
    db.ai_count(who)
    try:
        for _round in range(MAX_TOOL_ROUNDS):
            response = client().beta.messages.create(
                model=MODEL,
                max_tokens=16000,
                system=system,
                tools=TOOLS,
                messages=messages,
                output_config={"effort": "medium"},
                betas=["server-side-fallback-2026-07-01"],
                fallbacks="default",
            )
            if response.stop_reason == "refusal":
                return jsonify({"ok": True, "reply": "", "refused": True})
            if response.stop_reason != "tool_use":
                break
            messages.append({"role": "assistant", "content": response.content})
            results = []
            for block in response.content:
                if block.type != "tool_use":
                    continue
                output, failed = run_tool(block.name, block.input)
                if isinstance(output, dict):
                    for item in output.get("results", []) or [output]:
                        if isinstance(item, dict) and item.get("page"):
                            used_items.append({"page": item["page"], "name": item.get("name")})
                results.append({"type": "tool_result", "tool_use_id": block.id,
                                "content": json.dumps(output, ensure_ascii=False)[:20000], "is_error": failed})
            messages.append({"role": "user", "content": results})
    except anthropic.RateLimitError:
        return jsonify({"ok": False, "error": "ai_busy"}), 503
    except anthropic.APIStatusError as exc:
        return jsonify({"ok": False, "error": "ai_error", "status": exc.status_code}), 502
    except anthropic.APIConnectionError:
        return jsonify({"ok": False, "error": "ai_error"}), 502

    reply = "\n\n".join(b.text for b in response.content if b.type == "text").strip()
    if not reply:
        reply = "I looked through a lot of Meridian's catalogue for that. Could you narrow it down a little (country, level or budget)?"
    seen, links = set(), []
    for item in used_items:
        if item["page"] in reply and item["page"] not in seen:
            seen.add(item["page"])
            links.append(item)
    return jsonify({"ok": True, "reply": reply, "links": links[:8],
                    "left": max(0, _limit(user) - db.ai_used_today(who))})
