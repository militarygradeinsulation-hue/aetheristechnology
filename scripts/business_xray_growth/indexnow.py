#!/usr/bin/env python3
"""Notify IndexNow only after verifying site ownership and published page content.

IndexNow submission means URL notification, NOT confirmed crawling/ranking/indexing.
No paid API. The key is public in /public/<key>.txt by IndexNow design.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from scripts.business_xray_growth.run import BASE, PUBLIC_PAGES, ROOT, safe_url

KEY = "f2ae351ef1aac49ba48ce811dfe25983"
KEY_PATH = ROOT / "public" / (KEY + ".txt")
KEY_URL = BASE + "/" + KEY + ".txt"
API_URL = "https://api.indexnow.org/IndexNow"
USER_AGENT = "AetherisBusinessXRayIndexNow/1.0"


def report(status: str, reason: str, count: int = 0) -> dict:
    return {
        "status": status, "message": reason, "notification_count": count,
        "indexing_confirmed": False, "indexnow_is_not_google_submission": True,
    }


def verified_live_pages() -> tuple[list[str], str]:
    req = Request(KEY_URL, headers={"User-Agent": USER_AGENT})
    try:
        with urlopen(req, timeout=10) as response:
            remote_key = response.read(300).decode("utf-8", errors="replace").strip()
    except Exception as exc:
        return [], "Public IndexNow key is not reachable yet (" + type(exc).__name__ + ")"
    if remote_key != KEY:
        return [], "Domain ownership key content differs; refused to send notifications"
    verified = []
    for path in PUBLIC_PAGES:
        url = BASE + path
        if not safe_url(url):
            return [], "Invalid or non-HTTPS URL was blocked"
        try:
            with urlopen(Request(url, headers={"User-Agent": USER_AGENT}), timeout=9) as response:
                data = response.read(220_000).decode("utf-8", errors="replace")
            expected_canonical = 'rel="canonical" href="' + url + '"'
            if "<html" in data.lower() and expected_canonical in data:
                verified.append(url)
        except (HTTPError, URLError, TimeoutError, UnicodeError):
            continue
    return verified, ""


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--offline", action="store_true", help="Validate key file and format without network")
    parser.add_argument("--out", default="growth-out/indexnow.json")
    args = parser.parse_args()
    dest = ROOT / args.out
    dest.parent.mkdir(parents=True, exist_ok=True)
    if not KEY_PATH.is_file() or KEY_PATH.read_text(encoding="utf-8").strip() != KEY:
        result = report("config_error", "Missing or invalid hosted verification key")
        code = 1
    elif args.offline:
        result = report("offline_ready", "Public verification key format is valid. No external request made.")
        code = 0
    else:
        urls, error = verified_live_pages()
        if error or len(urls) != len(PUBLIC_PAGES):
            result = report("not_submitted", error or (
                "Some public pages are not live with matching canonical URLs (" +
                str(len(urls)) + "/" + str(len(PUBLIC_PAGES)) + ")."
            ))
            code = 0
        else:
            body = {
                "host": "aetheris.technology",
                "key": KEY,
                "keyLocation": KEY_URL,
                "urlList": urls,
            }
            req = Request(API_URL, data=json.dumps(body).encode("utf-8"), method="POST",
                          headers={"Content-Type": "application/json; charset=utf-8",
                                   "User-Agent": USER_AGENT})
            try:
                with urlopen(req, timeout=15) as response:
                    result = report("notified", "IndexNow endpoint accepted the URL notification. "
                                    "Search indexing and ranking are not guaranteed.", len(urls))
                    result["response_code"] = response.status
                    code = 0
            except Exception as exc:
                result = report("not_submitted", "IndexNow notification unavailable: " +
                                type(exc).__name__ + " " + str(exc)[:140])
                code = 0
    dest.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    output_file = os.environ.get("GITHUB_OUTPUT")
    if output_file:
        with open(output_file, "a", encoding="utf-8") as fh:
            fh.write("submitted=" + ("true" if result["status"] == "notified" else "false") + "\n")
    print(json.dumps(result, indent=2))
    return code


if __name__ == "__main__":
    sys.exit(main())
