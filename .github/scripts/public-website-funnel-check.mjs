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
assert.doesNotMatch(homepage, /const STEPS|STEPS\.map|id="how-it-works"|Three steps\./);
assert.doesNotMatch(homepage, /const FINDINGS|FINDINGS\.map|id="what-we-find"|The leaks that never show up/);
assert.doesNotMatch(homepage, /\{HERO_SUPPORT\}/);
assert.match(homepage, /href="#how-we-work"/);
assert.match(homepage, /id="how-we-work"/);
assert.match(homepage, /id="case-studies"/);
assert.match(homepage, /id="prices"/);
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


// Pricing timeline regression: the real seven-tier catalog, NOT fake demo prices.
const pricing = read("src/components/PricingTimeline.tsx");
const tiers = read("src/lib/aetherisTiers.ts");
assert.match(homepage, /import \{ PricingTimeline \} from "@\/components\/PricingTimeline"/);
assert.match(homepage, /<PricingTimeline \/>/);
assert.doesNotMatch(homepage, /<PackageTiers \/>/);
assert.ok(homepage.indexOf('<PricingTimeline />') < homepage.indexOf('The Aetheris Methodology'),
  "Pricing must appear near the top of the homepage");
assert.match(pricing, /AETHERIS_TIERS\.map/);
assert.match(pricing, /type="range"/);
assert.match(pricing, /onChange=\{\(e\) => setLevel/);
assert.match(pricing, /aria-pressed=\{index === i\}/);
assert.match(pricing, /selected\.adds\.map/);
assert.match(pricing, /selected\.excludes/);
assert.match(pricing, /selected\.cadence/);
assert.match(pricing, /selected\.qualificationOnly/);
assert.match(nav, /<Link to="\/leak-audit\/self-scan" onClick=\{\(\) => setOpen\(false\)\}/);
const tierList = tiers.split("export const AETHERIS_TIERS: AetherisTier[] = [")[1]?.split("export function tier(")[0];
assert.ok(tierList, "Public pricing tier list was not found");
const expectedAmounts = {
  free: 0,
  intelligence: 250000,
  signal: 750000,
  revenue: 1000000,
  suite: 1500000,
  diagnostic: 2350000,
  active: 2000000,
};
const allTiers = [...tierList.matchAll(/id: "(free|intelligence|signal|revenue|suite|diagnostic|active)",[\s\S]*?amountCents: (\d+)/g)];
assert.equal(allTiers.length, 7, "Timeline must represent all seven priced offers");
for (const match of allTiers) {
  assert.equal(Number(match[2]), expectedAmounts[match[1]], "Pricing changed for " + match[1]);
}
assert.match(tierList, /ctaHref: "\/leak-audit\/self-scan"/);

console.log("Public funnel and SEO regression checks passed.");
