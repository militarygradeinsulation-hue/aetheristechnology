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
assert.match(homepage, /href="#sample-reports"/);
assert.match(homepage, /id="how-we-work"/);
assert.match(homepage, /id="case-studies"/);
assert.match(homepage, /id="prices"/);
assert.match(nav, /to="\/leak-audit\/self-scan"/);
assert.doesNotMatch(nav, /Start Free Scan|to="\/golden-report" className=\{cn\(pillBase/);
assert.match(selfScan, /path="\/leak-audit\/self-scan"/);
assert.match(selfScan, /functions\.invoke\('company-leak-audit'/);
assert.match(selfScan, /<AuditCustomQuote/);
assert.match(selfScan, /personalized\.recommendations/);
assert.doesNotMatch(selfScan, /generateLeakAuditPdf|pricingLadder\(/);
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
assert.ok(homepage.indexOf('The Aetheris Methodology') < homepage.indexOf('<PricingTimeline />'),
  "Pricing must come after the mechanism and proof sections");
assert.ok(homepage.indexOf('id="sample-reports"') < homepage.indexOf('<PricingTimeline />'),
  "Sample Golden Reports must appear before pricing");
assert.ok(homepage.indexOf('id="first-win"') < homepage.indexOf('<PricingTimeline />'),
  "First-win and client-effort framing must appear before pricing");
assert.ok(homepage.indexOf('id="engagement-options"') < homepage.indexOf('<PricingTimeline />'),
  "Simplified buying journey must appear before the detailed pricing timeline");
assert.match(homepage, /First meeting is complimentary|first meeting is complimentary/i);
assert.match(homepage, /$100(?: per hour|/hour)/i);
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

// New company-specific assessment must still serve useful self-reported results
// when a Supabase edge function or database migration has not been deployed.
assert.match(selfScan, /evaluateCompanyAudit\(answers\)/);
assert.match(selfScan, /localOnly: true/);
assert.match(selfScan, /Preview only — not saved to Aetheris/);
assert.match(selfScan, /No private scan was requested from this local preview/);
assert.match(read("src/components/AuditCustomQuote.tsx"), /Or schedule a scope discussion/);

const auditBackend = read("supabase/functions/company-leak-audit/index.ts");
const costCap = read("supabase/migrations/20261014233500_private_golden_daily_cap_hardening.sql");
assert.match(auditBackend, /if \(runtime\?\.waitUntil\) runtime\.waitUntil\(dispatch\)/);
assert.match(auditBackend, /claim_private_company_golden/);
assert.match(costCap, /'dispatching', 'queued', 'reused', 'failed'/);
assert.match(costCap, /pg_advisory_xact_lock/);

// Structured data must not promise fees, results or services at old prices.
const jsonLd = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map(m => JSON.parse(m[1]));
const org = jsonLd.find(s => Array.isArray(s["@type"]) && s["@type"].includes("Organization"));
const faq = jsonLd.find(s => s["@type"] === "FAQPage");
const howTo = jsonLd.find(s => s["@type"] === "HowTo");
assert.equal(org.name, "Aetheris Technology");
assert.equal(org.hasOfferCatalog, undefined);
assert.equal(org.priceRange, undefined);
assert.ok(!/written guarantee|18,500|15,000\/month/i.test(org.description));
assert.equal(howTo.tool[0].url, "https://aetheris.technology/leak-audit/self-scan");
const costs = faq.mainEntity.find(q => q.name === "How much does Aetheris cost?");
assert.match(costs.acceptedAnswer.text, /\$23,500 one-time/);
assert.match(costs.acceptedAnswer.text, /\$20,000\/month/);
assert.doesNotMatch(html, /\$18,500 flat|\$15,000\/month, 3-month minimum/);

console.log("Public funnel and SEO regression checks passed.");
