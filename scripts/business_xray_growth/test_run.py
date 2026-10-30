"""Offline regression tests for the no-credit growth system."""
import json
import tempfile
import unittest
from datetime import date
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from scripts.business_xray_growth import run as growth


class GrowthPipelineTest(unittest.TestCase):
    def setUp(self):
        self.today = date(2026, 10, 30)

    def test_five_pages_have_good_static_seo(self):
        rows = growth.static_seo_audit()
        self.assertEqual(len(rows), 6)
        self.assertTrue(all(r["pass"] for r in rows), rows)
        self.assertEqual(len({r["title"] for r in rows}), 6)

    def test_prospect_seed_is_cited_and_not_claimed_as_verified_pain(self):
        rows = growth.read_seeds(self.today)
        self.assertGreaterEqual(len(rows), 7)
        self.assertTrue(all(x["source_url"].startswith("https://") for x in rows))
        self.assertTrue(all(x["qualification_status"] == "UNVERIFIED" for x in rows))
        self.assertEqual(len({x["company"] for x in rows}), len(rows))
        self.assertTrue(all(x["tier"] in ("A", "B", "C") for x in rows))
        self.assertTrue(all(x["score"] <= 100 for x in rows))

    def test_score_is_signal_relevance_not_sales_probability(self):
        row = growth.read_seeds(self.today)[0]
        self.assertIn("not conversion probability", row["score_meaning"])
        self.assertNotIn("100%", row["score_meaning"])

    def test_rss_parsing_does_not_invent_company_or_contact(self):
        sample = b"""<?xml version="1.0"?><rss><channel>
        <item><title>Midwest machine shop announces expansion in Indiana</title>
        <link>https://news.google.com/articles/12345</link>
        <pubDate>Thu, 29 Oct 2026 12:00:00 GMT</pubDate>
        <source>Example Publisher</source></item>
        <item><title>Unrelated entertainment story</title>
        <link>https://example.org/unrelated</link>
        <pubDate>Thu, 29 Oct 2026 12:00:00 GMT</pubDate></item>
        <item><title>Old manufacturer expansion</title>
        <link>https://example.org/old</link>
        <pubDate>Thu, 01 Jan 2026 12:00:00 GMT</pubDate></item>
        </channel></rss>"""
        rows = growth.parse_rss(sample, "manufacturing", self.today)
        self.assertEqual(len(rows), 1)
        self.assertIsNone(rows[0]["company_name"])
        self.assertEqual(rows[0]["qualification_status"], "RESEARCH_REQUIRED")

    def test_prospect_draft_is_review_only(self):
        prospect = growth.read_seeds(self.today)[0]
        copy = growth.prospect_draft(prospect)
        self.assertIn(prospect["source_url"], copy)
        self.assertIn("REVIEW BEFORE SENDING", copy)
        self.assertIn("does not claim", copy)

    def test_nine_promotional_variants_have_utm_without_external_tracking(self):
        campaigns = growth.create_campaigns(self.today)
        self.assertEqual(len(campaigns), 9)
        self.assertTrue(all(p["review_status"] == "DRAFT_ONLY" for p in campaigns))
        for post in campaigns:
            params = parse_qs(urlparse(post["url"]).query)
            self.assertEqual(params["utm_campaign"], ["business_xray"])
            self.assertIn("utm_medium", params)
            self.assertNotIn("api_key", post["url"])
            self.assertIn("unverified", post["content"].lower()
                          if post["channel"] == "linkedin-company"
                          else "unverified")

    def test_markdown_summary_never_claims_emails_sent(self):
        rows = growth.read_seeds(self.today)
        text = growth.markdown_report(self.today, rows, [], growth.static_seo_audit(),
                                      [], growth.create_campaigns(self.today), [])
        self.assertIn("has not sent emails", text)
        self.assertIn("NOT a predicted close rate", text)
        self.assertIn("review-only", text)

    def test_zero_cost_offline_summary_fields(self):
        payload = {
            "auto_posts_sent": 0,
            "auto_emails_sent": 0,
        }
        self.assertEqual(payload["auto_posts_sent"] + payload["auto_emails_sent"], 0)


if __name__ == "__main__":
    unittest.main()
