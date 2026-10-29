#!/usr/bin/env python3
"""Meridian research agents — find new programmes and re-check existing ones.

    pip install -r tools/agents/requirements.txt
    export ANTHROPIC_API_KEY=...            # or `ant auth login`
    python3 tools/agents/discover.py                # all 9 agents, 60-minute budget
    python3 tools/agents/discover.py --minutes 10   # a quick run
    python3 tools/agents/discover.py --only startups,summer

Why nine agents
---------------
The database spans eight kinds of opportunity, and each needs different sources
and different judgement (a scholarship's deadline lives on a ministry page, a
hackathon's on an event site). One agent per kind keeps every agent's context
focused and lets them run in parallel; a ninth agent re-checks what is already
published, because a stale deadline does more harm than a missing programme.
More agents than this mostly re-find the same programmes.

What happens to the results
---------------------------
Nothing is published automatically. Every run writes
backend/data/discoveries/<timestamp>.json; new records appear on /admin under
"Discoveries", where a person approves or rejects each one. Approved records are
appended to backend/data/programs.json. The agents' `score` drives the
"Highlights — top 10" row on /programs.

Cost (Claude Opus 5.5 at $4 / $20 per million tokens, web search $10 per 1,000
searches): roughly $0.60–1.20 per agent per run, so about $6–10 for a full run.
"""
import argparse
import concurrent.futures as cf
import datetime as dt
import json
import os
import re
import sys
import time

import anthropic

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROGRAMS = os.path.join(ROOT, "backend", "data", "programs.json")
OUT_DIR = os.path.join(ROOT, "backend", "data", "discoveries")

MODEL = "claude-opus-5-5"
FAMILIES = ["uwc", "erasmus", "flex", "summer", "university", "youth", "startup", "competition"]

AGENTS = {
    "schools": ("uwc", "UWC colleges and other fully or partly funded international upper-secondary "
                "programmes (IB, A-level) that admit students from Georgia or Qatar."),
    "exchanges": ("flex", "Government-funded high-school exchanges and youth leadership programmes "
                  "(e.g. U.S. Department of State, AFS, Rotary) open to Georgian or Qatari students."),
    "erasmus": ("erasmus", "Erasmus+, European Solidarity Corps and other EU-funded mobility, youth "
                "exchange and joint-degree opportunities open to participants from Georgia."),
    "summer": ("summer", "Pre-college summer schools, research programmes and university summer "
               "sessions for students aged 15–19, especially ones with financial aid."),
    "undergrad": ("university", "Bachelor's admission routes and scholarships with generous aid for "
                  "international students, including Education City in Doha and tuition-free systems."),
    "postgrad": ("university", "Master's and PhD scholarships (government, university and foundation) "
                 "that Georgian or Qatari citizens can apply for."),
    "startups": ("startup", "Startup funding, accelerators, incubators, fellowships and investor "
                 "networks for student and young founders — global, Qatar and Georgia."),
    "competitions": ("competition", "Pitch competitions, hackathons, startup marathons, olympiads "
                     "and essay or research competitions that strengthen applications."),
}

TEXT = {"type": "object", "additionalProperties": False, "required": ["en", "ka"],
        "properties": {"en": {"type": "string"}, "ka": {"type": "string"}}}

SUBMIT_TOOL = {
    "name": "submit_programmes",
    "description": "Submit the verified programme records you found. Call this exactly once, at the end.",
    "strict": True,
    "input_schema": {
        "type": "object",
        "additionalProperties": False,
        "required": ["records"],
        "properties": {
            "records": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["id", "family", "type", "org", "name", "country", "city", "iso", "flag",
                                 "region", "lat", "lon", "cost", "duration", "grades", "opens", "deadline",
                                 "deadline_note", "summary", "highlights", "eligibility", "url", "sources",
                                 "score", "score_reason"],
                    "properties": {
                        "id": {"type": "string"},
                        "family": {"type": "string", "enum": FAMILIES},
                        "type": {"type": "string"},
                        "org": {"type": "string"},
                        "name": TEXT,
                        "country": TEXT,
                        "city": {"type": "string"},
                        "iso": {"type": "string"},
                        "flag": {"type": "string"},
                        "region": {"type": "string", "enum": ["europe", "americas", "asia", "oceania",
                                                              "africa", "middle-east", "global"]},
                        "lat": {"type": "number"},
                        "lon": {"type": "number"},
                        "cost": {"type": "string", "enum": ["fully-funded", "scholarship", "tuition-free",
                                                            "funded", "paid", "free"]},
                        "duration": TEXT,
                        "grades": {"type": "string"},
                        "opens": {"type": ["string", "null"]},
                        "deadline": {"type": ["string", "null"]},
                        "deadline_note": {"type": "string"},
                        "summary": TEXT,
                        "highlights": {
                            "type": "object", "additionalProperties": False, "required": ["en", "ka"],
                            "properties": {"en": {"type": "array", "items": {"type": "string"}},
                                           "ka": {"type": "array", "items": {"type": "string"}}},
                        },
                        "eligibility": TEXT,
                        "url": {"type": "string"},
                        "sources": {"type": "array", "items": {"type": "string"}},
                        "score": {"type": "integer"},
                        "score_reason": {"type": "string"},
                    },
                },
            }
        },
    },
}

SYSTEM = """You are a research agent for Meridian, an opportunities platform for high-school and
university students in Georgia (the country) and Qatar. You find REAL programmes and verify them on
official websites using web search and web fetch.

Rules
- Only programmes you verified on the organiser's official site. Never invent a programme, a deadline
  or an amount. If the next (2026-27 or currently open) deadline is not published, set deadline to null
  and put last cycle's date, if known, in deadline_note.
- Dates as YYYY-MM-DD. Coordinates are the host city's. iso is the 2-letter host country code
  ('EU' for multi-country EU programmes, 'WW' for global/online). flag is the emoji flag.
- State eligibility for Georgian and Qatari citizens explicitly.
- Every record needs English and natural Georgian (ka) text: name, country, duration, summary
  (2-3 factual sentences), 3 highlights, eligibility.
- score 1-10 = value to a Georgian or Qatari student: funding, prestige, accessibility, deadline soon.
- Skip anything already in Meridian's database (the user message lists it).
- When you are done, call submit_programmes once with all records. Quality over quantity."""

VERIFY_SYSTEM = """You verify Meridian's published programme records against official websites using web
search and web fetch. For each record you can check in the time available, confirm or correct the
official URL, the next deadline (YYYY-MM-DD or null), the opening date, and whether the programme still
exists and accepts Georgian applicants. Never guess. Reply with ONLY a JSON array:
[{"id": "...", "status": "verified|corrected|discontinued|unverifiable", "url": "...", "deadline": "... or null",
  "opens": "... or null", "deadline_note": "...", "corrections": ["..."], "sources": ["..."]}]"""


def client():
    return anthropic.Anthropic(max_retries=4)


def call(cl, system, messages, tools, max_tokens=32000):
    """One Messages API call with server-side refusal fallbacks enabled."""
    return cl.beta.messages.create(
        model=MODEL,
        max_tokens=max_tokens,
        system=system,
        messages=messages,
        tools=tools,
        thinking={"type": "adaptive"},
        betas=["server-side-fallback-2026-07-01"],
        # passed through extra_body so the script also runs on SDK versions that
        # predate these typed parameters (this machine's Python 3.9 needs anthropic 0.x)
        extra_body={"fallbacks": "default", "output_config": {"effort": "medium"}},
    )


def web_tools(searches, fetches):
    return [
        {"type": "web_search_20260209", "name": "web_search", "max_uses": searches},
        {"type": "web_fetch_20260209", "name": "web_fetch", "max_uses": fetches},
    ]


def usage_of(response, totals):
    u = response.usage
    totals["input"] += getattr(u, "input_tokens", 0) or 0
    totals["output"] += getattr(u, "output_tokens", 0) or 0
    stu = getattr(u, "server_tool_use", None)
    if stu is not None:
        totals["searches"] += getattr(stu, "web_search_requests", 0) or 0


def run_discovery(name, family, brief, existing, deadline_at, searches):
    cl = client()
    totals = {"input": 0, "output": 0, "searches": 0}
    tools = web_tools(searches, searches) + [SUBMIT_TOOL]
    prompt = ("Find 6-12 new programmes in this area: %s\nUse family \"%s\".\nToday is %s.\n\n"
              "Already in the database (skip these):\n%s"
              % (brief, family, dt.date.today().isoformat(), existing))
    messages = [{"role": "user", "content": prompt}]
    for _ in range(24):
        if time.time() > deadline_at:
            messages.append({"role": "user", "content": "Time is up — call submit_programmes now with what you have verified."})
        response = call(cl, SYSTEM, messages, tools)
        usage_of(response, totals)
        if response.stop_reason == "refusal":
            return {"agent": name, "records": [], "usage": totals, "error": "refusal"}
        messages.append({"role": "assistant", "content": response.content})
        if response.stop_reason == "pause_turn":
            continue
        submitted = [b for b in response.content if b.type == "tool_use" and b.name == "submit_programmes"]
        if submitted:
            records = submitted[0].input.get("records", [])
            return {"agent": name, "records": records, "usage": totals}
        if response.stop_reason == "end_turn":
            messages.append({"role": "user", "content": "Please call submit_programmes with your verified records."})
    return {"agent": name, "records": [], "usage": totals, "error": "no submission"}


def run_verifier(programs, deadline_at, searches):
    cl = client()
    totals = {"input": 0, "output": 0, "searches": 0}
    slim = [{k: p.get(k) for k in ("id", "org", "url", "deadline", "opens")} | {"name": p["name"]["en"]}
            for p in programs]
    messages = [{"role": "user", "content": "Today is %s. Records:\n%s" % (
        dt.date.today().isoformat(), json.dumps(slim, ensure_ascii=False))}]
    for _ in range(16):
        response = call(cl, VERIFY_SYSTEM, messages, web_tools(searches, searches))
        usage_of(response, totals)
        if response.stop_reason == "pause_turn" and time.time() < deadline_at:
            messages.append({"role": "assistant", "content": response.content})
            continue
        text = "".join(b.text for b in response.content if b.type == "text")
        match = re.search(r"\[.*\]", text, re.S)
        try:
            return {"agent": "verifier", "checks": json.loads(match.group(0)) if match else [], "usage": totals}
        except ValueError:
            return {"agent": "verifier", "checks": [], "usage": totals, "error": "unparseable"}
    return {"agent": "verifier", "checks": [], "usage": totals, "error": "ran out of turns"}


def valid(record, known_ids):
    try:
        assert record["family"] in FAMILIES
        assert re.match(r"^https?://", record["url"])
        assert -90 <= float(record["lat"]) <= 90 and -180 <= float(record["lon"]) <= 180
        for key in ("deadline", "opens"):
            if record.get(key):
                dt.date.fromisoformat(record[key])
        assert record["id"] not in known_ids
        return True
    except (AssertionError, KeyError, ValueError, TypeError):
        return False


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--minutes", type=float, default=60, help="time budget for the whole run")
    parser.add_argument("--only", default="", help="comma-separated agent names: " + ",".join(AGENTS) + ",verifier")
    parser.add_argument("--searches", type=int, default=20, help="web searches allowed per agent")
    args = parser.parse_args()

    with open(PROGRAMS, encoding="utf-8") as fh:
        programs = json.load(fh)
    known_ids = {p["id"] for p in programs}
    existing = "\n".join("- %s (%s)" % (p["name"]["en"], p["org"]) for p in programs)

    wanted = [a.strip() for a in args.only.split(",") if a.strip()] or list(AGENTS) + ["verifier"]
    deadline_at = time.time() + args.minutes * 60
    print("Meridian agents: %s — budget %.0f min" % (", ".join(wanted), args.minutes))

    results = []
    with cf.ThreadPoolExecutor(max_workers=len(wanted)) as pool:
        futures = {}
        for name in wanted:
            if name == "verifier":
                futures[pool.submit(run_verifier, programs, deadline_at, args.searches)] = name
            elif name in AGENTS:
                family, brief = AGENTS[name]
                futures[pool.submit(run_discovery, name, family, brief, existing, deadline_at, args.searches)] = name
        for future in cf.as_completed(futures):
            name = futures[future]
            try:
                result = future.result()
            except anthropic.APIError as error:
                result = {"agent": name, "records": [], "error": "%s: %s" % (type(error).__name__, error)}
            results.append(result)
            print("  %-13s %s" % (name, result.get("error") or "%d records" % len(result.get("records") or result.get("checks") or [])))

    records, seen = [], set(known_ids)
    for result in results:
        for record in result.get("records", []):
            if valid(record, seen):
                record["premium"] = False
                record["found_by"] = result["agent"]
                record["found_at"] = dt.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
                records.append(record)
                seen.add(record["id"])

    totals = {"input": 0, "output": 0, "searches": 0}
    for result in results:
        for key in totals:
            totals[key] += result.get("usage", {}).get(key, 0)
    cost = totals["input"] / 1e6 * 4 + totals["output"] / 1e6 * 20 + totals["searches"] / 1000 * 10

    os.makedirs(OUT_DIR, exist_ok=True)
    stamp = dt.datetime.utcnow().strftime("%Y%m%d-%H%M%S")
    path = os.path.join(OUT_DIR, "%s.json" % stamp)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump({"run": stamp, "model": MODEL, "records": records,
                   "checks": next((r.get("checks", []) for r in results if r["agent"] == "verifier"), []),
                   "usage": totals, "estimated_cost_usd": round(cost, 2)}, fh, ensure_ascii=False, indent=1)
    print("\n%d new records, %d searches, ~$%.2f — saved %s" % (len(records), totals["searches"], cost, path))
    print("Review them on /admin -> Discoveries.")


if __name__ == "__main__":
    sys.exit(main())
