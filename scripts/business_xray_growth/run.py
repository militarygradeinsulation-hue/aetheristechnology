#!/usr/bin/env python3
"""No-credit Aetheris X-Ray discovery, ICP intelligence and organic campaign drafts.

Safe-by-default: public company-level RSS only, no contact harvesting, no DMs,
no automatic social posting, no model calls, no Golden Report scans, no API keys.
"""
from __future__ import annotations

import argparse
import html
import json
import re
from datetime import date, datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.parse import quote, urlencode, urlparse
from urllib.request import Request, urlopen
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
BASE = "https://aetheris.technology"
SEEDS = ROOT / "growth/business-xray/prospect-seeds.json"
SCAN = BASE + "/business-xray/index.html"
PUBLIC_PAGES = [
    "/business-xray/index.html",
    "/business-xray/guide/index.html",
    "/business-xray/industries/hvac/index.html",
    "/business-xray/industries/roofing/index.html",
    "/business-xray/industries/manufacturing/index.html",
]
FEEDS = {
    "hvac": '"commercial HVAC" (acquisition OR expansion OR new location) (Indiana OR Illinois OR Midwest)',
    "roofing": '"roofing contractor" (acquisition OR expansion OR new office) (Indiana OR Ohio OR Michigan)',
    "manufacturing": '(Indiana manufacturer OR machine shop OR manufacturing) (expansion OR hiring OR new facility)',
}
CHANNELS = {
    "linkedin-founder": ("linkedin", "organic_social"),
    "linkedin-company": ("linkedin", "organic_social"),
    "google-business-profile": ("google_business_profile", "organic_post"),
}
TOPICS = {
    "hvac": [
        ("A missed call is not proof of a lost sale.", "Compare call logs with booked work. Which qualified inquiries lacked a clear owner or next action?"),
        ("Dispatch problems do not always start in dispatch.", "Look at the information handed from sales to scheduling and from scheduling to technicians. Track a real job before buying a tool."),
        ("An estimate without a next action is not a process.", "Count open HVAC estimates missing an owner or follow-up date. Work from real records before assigning a dollar amount."),
    ],
    "roofing": [
        ("Your quote pipeline may be a handoff problem.", "Look at proposals that lack a next step and separate no-response from a customer who genuinely declined."),
        ("An insurance supplement needs a visible owner.", "Follow a supplement from discovery and documentation to approval and billing. Do not count it as profit until the records support it."),
        ("Rework has a reason, not a personality.", "Track scope revisions, crew handoffs and callbacks. Start with the most repeatable source of waste."),
    ],
    "manufacturing": [
        ("The RFQ does not become revenue until the handoffs work.", "Trace a quote through engineering, purchasing and production release. Where is the owner or revision unclear?"),
        ("Duplicate entry is a capacity question.", "Count actual hours spent moving the same job details across systems. Recovered capacity is not automatically payroll savings."),
        ("Your new facility will inherit your old handoffs.", "Expansion makes process ownership more important. Measure revision and release delays before introducing new software."),
    ],
}
CHECKS = {
    "hvac": "What happens to an estimate when nobody owns the next follow-up?",
    "roofing": "Who owns the transition from signed scope to scheduled production?",
    "manufacturing": "How does a released RFQ or engineering revision reach the next production owner?",
}
SOURCE_NOTE = "Public growth news is a qualification signal, not evidence that the company has a leak, budget, or interest."
UA = "AetherisBusinessXRayPublicResearch/1.0 (+https://aetheris.technology/)"


def safe_url(value: str) -> bool:
    parsed = urlparse(value)
    return parsed.scheme == "https" and bool(parsed.netloc) and not parsed.username


def utm_url(channel: str, sector: str, topic: int) -> str:
    src, medium = CHANNELS[channel]
    query = urlencode({
        "utm_source": src,
        "utm_medium": medium,
        "utm_campaign": "business_xray",
        "utm_content": sector + "_angle_" + str(topic + 1),
    })
    return SCAN + "?" + query


def score_seed(item: dict, today: date) -> dict:
    event = item.get("event_type", "")
    industry = item.get("industry", "")
    score = 35 if industry in TOPICS else 10
    score += {"acquisition": 30, "expansion": 27, "launch": 24}.get(event, 0)
    days = (today - date.fromisoformat(item["reported_date"])).days
    score += 18 if 0 <= days <= 30 else 12 if days <= 90 else 3 if days <= 180 else 0
    location = item.get("location", "").lower()
    score += 10 if "indiana" in location else 6 if any(x in location for x in ("illinois", "michigan", "ohio")) else 0
    score = min(100, score)
    return dict(item, score=score, tier="A" if score >= 80 else "B" if score >= 65 else "C",
                score_meaning="Public growth-signal relevance, not conversion probability or measured inefficiency",
                qualification_status="UNVERIFIED")


def read_seeds(today: date) -> list[dict]:
    data = json.loads(SEEDS.read_text(encoding="utf-8"))
    if not data.get("no_personal_contacts") or not data.get("requires_manual_verification"):
        raise ValueError("Prospect seed research must not contain a harvested personal-contact list")
    seen = set()
    rows = []
    for item in data["companies"]:
        if not item.get("company") or not safe_url(item.get("source_url", "")):
            raise ValueError("Every named company requires a supported public citation")
        key = item["company"].casefold().strip()
        if key in seen:
            continue
        seen.add(key)
        rows.append(score_seed(item, today))
    return sorted(rows, key=lambda x: (-x["score"], x["company"]))


def static_seo_audit() -> list[dict]:
    sitemap = (ROOT / "public/sitemap.xml").read_text(encoding="utf-8")
    ET.fromstring(sitemap)
    records = []
    titles = []
    for path in PUBLIC_PAGES:
        f = ROOT / "public" / path.lstrip("/")
        checks = {}
        try:
            markup = f.read_text(encoding="utf-8")
            title_match = re.search(r"<title>(.*?)</title>", markup, re.I | re.S)
            title = html.unescape(title_match.group(1)).strip() if title_match else ""
            titles.append(title)
            checks["title"] = bool(title) and 15 <= len(title) <= 130
            checks["description"] = bool(re.search(r'<meta\s+name="description"\s+content="[^"]{40,}"', markup, re.I))
            checks["canonical"] = ('rel="canonical" href="' + BASE + path + '"') in markup
            checks["h1"] = bool(re.search(r"<h1[\s>]", markup, re.I))
            checks["sitemap"] = ("<loc>" + BASE + path + "</loc>") in sitemap
            blocks = re.findall(r'<script\s+type="application/ld\+json">(.*?)</script>', markup, re.S | re.I)
            valid = False
            for block in blocks:
                try:
                    valid = valid or isinstance(json.loads(block), dict)
                except json.JSONDecodeError:
                    pass
            checks["structured_data_parses"] = valid
            checks["has_answer_text"] = ("What is a" in markup or "What causes" in markup
                                          or "How do" in markup or "How can" in markup)
        except (FileNotFoundError, UnicodeError):
            checks["file_present"] = False
            title = ""
        records.append({"url": BASE + path, "path": path, "title": title, "checks": checks,
                        "pass": bool(checks) and all(checks.values())})
    if len(titles) != len(set(titles)):
        raise AssertionError("Duplicate page titles among Business X-Ray pages")
    return records


def fetch_bytes(url: str, timeout: int = 10) -> bytes:
    if not safe_url(url):
        raise ValueError("Only HTTPS URLs are accepted")
    request = Request(url, headers={"User-Agent": UA, "Accept": "application/rss+xml,text/html,application/xml,*/*"})
    with urlopen(request, timeout=timeout) as response:
        return response.read(450_000)


def live_site_audit() -> list[dict]:
    result = []
    for url in [BASE + "/robots.txt", BASE + "/sitemap.xml"] + [BASE + p for p in PUBLIC_PAGES]:
        try:
            content = fetch_bytes(url, timeout=7).decode("utf-8", errors="replace")
            ok = bool(content.strip()) and (
                "<html" in content.lower() if "/business-xray/" in url
                else "User-agent" in content if url.endswith("robots.txt")
                else "<urlset" in content
            )
            result.append({"url": url, "reachable": ok, "notes": "Accessible" if ok else "Unexpected document"})
        except Exception as ex:  # Network failures must not pretend deployment success.
            result.append({"url": url, "reachable": False, "notes": type(ex).__name__ + ": " + str(ex)[:130]})
    return result


def parse_rss(data: bytes, sector: str, today: date, limit: int = 15) -> list[dict]:
    root = ET.fromstring(data)
    result = []
    for elem in root.findall("./channel/item")[:45]:
        title = html.unescape((elem.findtext("title") or "").strip())
        link = (elem.findtext("link") or "").strip()
        date_text = elem.findtext("pubDate") or ""
        if not title or not safe_url(link):
            continue
        try:
            published = parsedate_to_datetime(date_text).date()
        except (ValueError, TypeError, IndexError):
            continue
        age = (today - published).days
        if not 0 <= age <= 45:
            continue
        lower = title.lower()
        trigger = next((w for w in ["acquir", "expand", "expansion", "new facility",
                                    "new plant", "hiring", "opens", "launch", "merger",
                                    "production", "investment"] if w in lower), None)
        if not trigger:
            continue
        score = min(99, 35 + (26 if trigger in ("acquir", "expand", "expansion") else 19)
                    + (16 if age <= 14 else 10) + (12 if "indiana" in lower else 0))
        source = elem.find("source")
        result.append({
            "industry": sector, "headline": title[:190], "reported_date": published.isoformat(),
            "source_url": link, "publisher": (source.text or "") if source is not None else "",
            "score": score, "tier": "A" if score >= 80 else "B",
            "company_name": None, "qualification_status": "RESEARCH_REQUIRED",
            "note": "Article headline only. Identify the actual company, verify the source and reject irrelevant articles before outreach.",
        })
    seen = set()
    distinct = []
    for x in sorted(result, key=lambda r: (-r["score"], r["reported_date"], r["headline"])):
        key = re.sub(r"\W+", "", x["headline"].lower())
        if key in seen:
            continue
        seen.add(key)
        distinct.append(x)
    return distinct[:limit]


def get_news_signals(today: date) -> tuple[list[dict], list[str]]:
    results, warnings = [], []
    for sector, query in FEEDS.items():
        url = "https://news.google.com/rss/search?" + urlencode({
            "q": query + " when:45d", "hl": "en-US", "gl": "US", "ceid": "US:en"})
        try:
            news = parse_rss(fetch_bytes(url, timeout=12), sector, today)
            if not news:
                warnings.append(sector + ": feed returned no qualifying recent items")
            results.extend(news)
        except Exception as ex:
            warnings.append(sector + ": feed unavailable (" + type(ex).__name__ + "), no fallback data invented")
    return sorted(results, key=lambda r: (-r["score"], r["reported_date"]))[:30], warnings


def organic_post(sector: str, topic_index: int, channel: str) -> dict:
    hook, example = TOPICS[sector][topic_index]
    url = utm_url(channel, sector, topic_index)
    if channel == "google-business-profile":
        body = (hook + "\n\n" + example + "\n\nWe built a free Business X-Ray to help owners "
                "identify what to measure first. Estimates are not verified losses. "
                "Use the diagnostic if your business fits: " + url)
    elif channel == "linkedin-founder":
        body = (hook + "\n\n" + example + "\n\nI would rather confirm one handoff with real records "
                "than sell a business another platform it may not need.\n\n"
                "The free Aetheris Business X-Ray makes the assumptions visible: " + url)
    else:
        body = (hook + "\n\n" + example + "\n\nPeople. Processes. Systems. "
                "Our free Business X-Ray identifies areas worth investigating. "
                "The report is self-reported and the figures are unverified: " + url)
    return {"industry": sector, "channel": channel, "topic_index": topic_index + 1,
            "content": body, "url": url, "review_status": "DRAFT_ONLY"}


def create_campaigns(today: date) -> list[dict]:
    week = today.isocalendar().week
    channels = list(CHANNELS)
    return [
        organic_post(sector, (week + index) % len(TOPICS[sector]), channels[index])
        for sector in TOPICS for index in range(3)
    ]


def prospect_draft(company: dict) -> str:
    industry = company.get("industry", "")
    question = company.get("fit_question") or CHECKS.get(industry, "Which operational handoff needs a clearer owner?")
    name = company["company"]
    return (
        "Subject: A quick operations question for " + name + "\n\n"
        "Hello,\n\n"
        "I saw the public update about " + name + ": " + company["reported_fact"] + "\n"
        "Source: " + company["source_url"] + "\n\n"
        "As companies grow or combine operations, I'm interested in how leaders keep handoffs "
        "between people, processes and systems clear. " + question + "\n\n"
        "I put together a free, private Business X-Ray that helps owners identify what to measure first. "
        "It does not claim to know your operations or access your systems.\n"
        + SCAN + "?utm_source=direct_outreach&utm_medium=manual_email&utm_campaign=business_xray\n\n"
        "Would that be useful for the person responsible for operations?\n\n"
        "Aetheris Technology\n\n"
        "[REVIEW BEFORE SENDING. Identify a legitimate contact channel and respect opt-outs. No message was sent.]\n"
    )


def markdown_report(day: date, seed_rows: list[dict], fresh: list[dict],
                    static: list[dict], live: list[dict], campaigns: list[dict],
                    warnings: list[str]) -> str:
    week = day.isocalendar()
    lines = [
        "# Business X-Ray organic growth review: " + f"{week.year}-W{week.week:02d}",
        "",
        "**Status:** Review queue. This system has not sent emails, purchased ads, published posts or run paid scans.",
        "**Scoring:** Public expansion or acquisition relevance, NOT a predicted close rate or proven company pain.",
        "",
        "## SEO/AEO static checks",
    ]
    for x in static:
        missing = [k for k, v in x["checks"].items() if not v]
        lines.append("- " + ("PASS" if x["pass"] else "NEEDS REVIEW") + " " + x["url"] +
                     ("" if not missing else " | " + ", ".join(missing)))
    lines.extend(["", "## Live page discovery checks"])
    if live:
        for x in live:
            lines.append("- " + ("OK" if x["reachable"] else "NOT VERIFIED") +
                         " " + x["url"] + " | " + x["notes"])
    else:
        lines.append("- Offline run: network not requested, publishing or indexing cannot be verified.")
    lines.extend(["", "## Publicly sourced company candidates (verify before any contact)", "", SOURCE_NOTE, ""])
    for x in seed_rows:
        lines.extend([
            "### " + x["company"] + " | " + x["tier"] + " | signal score " + str(x["score"]),
            "- Industry/location: " + x["industry"] + " / " + x["location"],
            "- Public report: " + x["reported_fact"] + " (" + x["reported_date"] + ")",
            "- Citation: " + x["source_url"],
            "- Qualification question: " + x["fit_question"],
            "- Unknowns: " + x["uncertainty"],
            "",
        ])
    lines.extend(["## Fresh public news signals (not identified or qualified buyers)", ""])
    if fresh:
        for x in fresh[:18]:
            lines.append("- [" + x["industry"] + "] (" + x["reported_date"] + ") " +
                         x["headline"] + " | " + x["source_url"] +
                         " | score " + str(x["score"]))
    else:
        lines.append("No fresh RSS items were available or this was an offline run.")
    lines.extend(["", "## This week's organic promotional draft queue",
                  "All copy is review-only. Platform login, posting, moderation, customer replies and claims review are still needed.", ""])
    for i, p in enumerate(campaigns, 1):
        lines.extend(["### Draft " + str(i) + " | " + p["industry"] + " | " + p["channel"],
                      p["content"], ""])
    lines.extend(["## Example individual outreach drafts", "",
                  "Do not mass-send. Research the company and an appropriate business contact first. "
                  "A signal is not evidence of a defect.", ""])
    for x in seed_rows[:3]:
        lines.extend(["### " + x["company"], prospect_draft(x), ""])
    lines.extend(["## Data or access needed before claiming conversion results",
                  "- Google Search Console or Bing Webmaster verified domain property for impressions and indexing.",
                  "- Site analytics or privacy-respecting, consent-aware traffic measurement for UTM conversion.",
                  "- Authorized LinkedIn and Google Business Profile publishing accounts for actual posts.",
                  "- Explicit CRM consent for storing company/individual contact data.",
                  "- Stripe or other payment processing only if online paid fulfillment is later requested.",
                  "",
                  "## Warnings"])
    lines.extend(["- " + w for w in warnings] or ["- None recorded."])
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--offline", action="store_true", help="No network; use to validate the pipeline in CI")
    parser.add_argument("--out", default="growth-out", help="Directory for GitHub Actions artifacts")
    parser.add_argument("--today", default=None, help="YYYY-MM-DD, used for deterministic tests")
    args = parser.parse_args()
    today = date.fromisoformat(args.today) if args.today else datetime.now(timezone.utc).date()
    output = ROOT / args.out
    output.mkdir(parents=True, exist_ok=True)

    static = static_seo_audit()
    if not all(x["pass"] for x in static):
        raise SystemExit("Static SEO audit failed: repair local metadata, canonicals or sitemap")
    seeds = read_seeds(today)
    signals, errors = ([], []) if args.offline else get_news_signals(today)
    live = [] if args.offline else live_site_audit()
    campaigns = create_campaigns(today)
    week = today.isocalendar()
    summary = {
        "generated_date": today.isoformat(),
        "review_week": f"{week.year}-W{week.week:02d}",
        "mode": "OFFLINE" if args.offline else "LIVE_PUBLIC_RESEARCH",
        "static_seo_pass": all(x["pass"] for x in static),
        "live_pages_verified": sum(x["reachable"] for x in live),
        "live_pages_attempted": len(live),
        "curated_company_candidates": len(seeds),
        "unverified_recent_news_signals": len(signals),
        "organic_drafts_created": len(campaigns),
        "auto_posts_sent": 0,
        "auto_emails_sent": 0,
        "outstanding_account_connections": ["Google Search Console", "Bing Webmaster",
                                             "Organic social accounts", "Conversion analytics"],
        "warnings": errors,
    }
    (output / "summary.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    (output / "candidates.json").write_text(json.dumps({
        "status": "RESEARCH_ONLY", "curated": seeds, "news_signals": signals,
    }, indent=2) + "\n", encoding="utf-8")
    (output / "promotional-drafts.json").write_text(json.dumps(campaigns, indent=2) + "\n", encoding="utf-8")
    (output / "seo-audit.json").write_text(json.dumps({
        "static": static, "live": live, "warnings": errors,
    }, indent=2) + "\n", encoding="utf-8")
    (output / "review.md").write_text(markdown_report(
        today, seeds, signals, static, live, campaigns, errors), encoding="utf-8")
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
