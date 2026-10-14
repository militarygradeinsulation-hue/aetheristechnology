// Static public-funnel regression checks. No API keys, services, or AI scans.
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const read = (path) => readFileSync(path, "utf8");
const homepage = read("src/pages/LeakLanderPage.tsx");
const nav = read("src/components/lander/LanderNavbar.tsx");
const app = read("src/App.tsx");
const selfScan = read("src/pages/LeakAuditPage.tsx");
const golden = read("src/pages/GoldenReportPage.tsx");
const goldenPreview = read("src/pages/GoldenLanderPage.tsx");
const seo = read("src/components/SEOHead.tsx");
const html = read("index.html");
const sitemap = read("public/sitemap.xml");
const robots = read("public/robots.txt");
const local = read("src/pages/IndianapolisLeadPage.tsx");

const selfScanPath = "/leak-audit/self-scan";
assert.match(app, /<Route path="\/leak-audit\/self-scan" element={<LeakAuditPage \/>} \/>/);
assert.match(homepage, /to="\/leak-audit\/self-scan"/);
assert.match(homepage, /href: "\/leak-audit\/self-scan"/);
assert.match(nav, /to="\/leak-audit\/self-scan"/);
assert.doesNotMatch(nav, /Start Free Scan|to="\/golden-report" className=\{cn\(pillBase/);
assert.match(selfScan, /path="\/leak-audit\/self-scan"/);
assert.match(selfScan, /leadSaved = true/);
assert.match(selfScan, /generateLeakAuditPdf/);
assert.match(golden, /Operator-led · 14-ch case file/);
assert.doesNotMatch(golden, /Free · 14-ch case file|description="Free tool/);
assert.doesNotMatch(goldenPreview, /Check Your Company Free|Free · 14-Chapter Case File|<span className="text-amber">FREE<\/span>/);
assert.doesNotMatch(homepage, /<strong className="font-bold text-foreground"> Guaranteed.<\/strong>/);
assert.match(seo, /const SITE_NAME = 'Aetheris Technology'/);
assert.match(seo, /const SUFFIX = ' \| Aetheris Technology'/);
assert.doesNotMatch(html, /Helping Smbs find where/);
assert.match(html, /<title>Revenue Leak &amp; Operations Consulting \| Aetheris Technology<\/title>/);
assert.match(robots, /Sitemap: https:\/\/aetheris\.technology\/sitemap\.xml/);
assert.doesNotMatch(sitemap, /businessforensics\.tech/);

const urls = [...sitemap.matchAll(/<loc>(https:\/\/aetheris\.technology[^<]+)<\/loc>/g)].map((m) => m[1]);
for (const path of ["/", selfScanPath, "/golden-report", "/indianapolis/contractor-follow-up", "/indianapolis/service-business-lead-tracking"]) {
  assert.ok(urls.includes("https://aetheris.technology" + path), "Missing public sitemap route: " + path);
}
assert.match(app, /path="\/indianapolis\/contractor-follow-up"/);
assert.match(app, /path="\/indianapolis\/service-business-lead-tracking"/);
assert.match(local, /title=\{topic\.title\}/);
assert.match(local, /description=\{topic\.description\}/);

console.log("Public funnel and SEO regression checks passed.");
