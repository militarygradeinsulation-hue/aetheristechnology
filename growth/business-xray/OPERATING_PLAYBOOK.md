# Aetheris Business X-Ray | $0 ad-spend acquisition system

**Owner:** Aetheris Technology
**Production website:** `https://aetheris.technology/business-xray/index.html`
**Code:** `scripts/business_xray_growth/run.py`
**Review outputs:** GitHub Actions artifact + one GitHub Issue for each ISO week
**Budget policy:** No paid ads, API calls to paid LLMs, purchased leads, private-profile scraping, bulk messaging, or background Golden Reports.

## What is genuinely free

Google Search, Bing organic discoverability, useful industry guides, founder/company LinkedIn organic posts, relevant social community contributions, guest education with publisher permission, a properly eligible Google Business Profile, partner referrals, and publicly available company expansion announcements can reach owners without media spend. These activities are **not paid Google or Meta ads**; a true paid impression/click ordinarily requires a budget. Free reach and conversion are not guaranteed. GitHub Actions use the owner's account entitlements and execution limits, so monitor usage rather than assuming unlimited zero cost.

## Most likely ICP to validate

1. Owner/operator and operations lead at a 5–150 person commercial HVAC, roofing, restoration, or specialty manufacturing business with meaningful quote volume and multiple handoffs.
2. Public signals: expansion, acquisitions, new facility, second shift, new service line, or rapid hiring. These are relevance signals, **not proof of dysfunction**.
3. Business-qualified pain must be confirmed through an actual conversation. Ask about unowned estimates, RFQ turnaround, approval backlog, duplicate entry, customer callbacks, and stage handoffs.
4. Buyer likely to agree to a low-friction self-assessment is not automatically a buyer of the $199 review; measure conversions rather than treating a public score as probability.
5. Exclude companies obviously outside budget/authority and highly regulated records unless you have appropriate authorization. Do not infer sensitive personal traits or financial distress.

### Public signal lead research rules

- `growth/business-xray/prospect-seeds.json` contains attributed **company-level** news candidates only, with a precise publication date and source URL.
- The scheduled process reads public Google News RSS summaries for three sectors, not arbitrary private profiles and not login-protected websites.
- RSS candidates carry `company_name: null` until manually verified. News relevancy alone cannot establish who the real buyer is.
- Scores (0–100) rank **news-signal fit**, not sales conversion propensity. Never assert a prospect is losing money, needs AI, or has a known leak.
- Research and prioritize manually before contacting any company. Use ordinary business channels, consent rules and opt-outs. Keep no scraped private emails.

## 4-week free distribution sequence

### Week 1: Technical SEO and a credible destination
- Keep the landing page's title, visible answer-first sections, unique canonical, OG/Twitter previews, and SoftwareApplication/Organization JSON-LD consistent with what the product really does.
- Ensure the sitemap includes all five Business X-Ray pages with correct last modification dates and the robots file permits search.
- Verify the `aetheris.technology` domain property in Google Search Console and Bing Webmaster Tools using authorized website-owner access.
- IndexNow notifications run **only when** the key is live and five actual pages have canonical source, and only notify supported engines. It is not a Google Search indexing API. Indexing is never guaranteed.
- `llms.txt` is an optional reference for agents: Google says it is not a ranking factor or AI-special requirement.

### Week 2: Earned founder distribution
- Post two useful story-first LinkedIn pieces and one 30–60 second educational video made with existing equipment.
- Each piece should use the same sequence: real operations question, one document to inspect, what that would verify, then one optional link to the free self-assessment.
- Publish a company LinkedIn post answering one owner question. Reuse the source content; avoid boilerplate repeated under numerous accounts.
- Comment constructively on relevant professional posts without dropping links unless requested.

### Week 3: Local and industry visibility
- If the company meets eligibility requirements, share one practical update on its Google Business Profile. Do not create additional fake location listings.
- Offer a genuinely helpful diagnostic worksheet to commercial trade associations, chambers and business development organizations that accept relevant member content. Ask for permission, do not blast directories.
- Seek voluntary reciprocal educational content with ERP implementers, bookkeeping firms, commercial trade suppliers or industry communities.

### Week 4: Conversion proof and measurement
- Reconcile any UTM-tagged traffic with a legitimate analytics source (a link parameter alone is **not** analytics).
- Track actual self-assessment completions only when a privacy-conscious measurement integration and consent model are implemented.
- For manually received enquiries, record lead source, sector, qualification, verified paid reviews sold and actual revenue. No manufactured results.
- Ask consenting customers for factual case study permission and measured before/after evidence.
- Update the content and process from actual objections and records, not keyword-stuffed AI pages.

## Zero-budget copy angles the automated drafts rotate

- HVAC: "A missed call is not proof of a lost sale." Explain call logs vs. booked work and clear follow-up ownership.
- Roofing: "Your quote pipeline may be a handoff problem." Discuss signed scope to production ownership and insurer supplement documentation.
- Manufacturing: "Duplicate entry is a capacity question." Discuss the actual RFQ to engineering to production trail.
- Every post avoids guaranteed ROI claims, fictional percentages and unverified accusations.
- The draft queue targets three owned channels: founder LinkedIn, company LinkedIn, eligible Google Business Profile.
- Community forum posts, including Reddit, must obey each forum's promotion rules and should provide substantial help without using a link as the primary purpose.

## Useful URLs

- Main: https://aetheris.technology/business-xray/index.html
- Methodology: https://aetheris.technology/business-xray/guide/index.html
- HVAC: https://aetheris.technology/business-xray/industries/hvac/index.html
- Roofing: https://aetheris.technology/business-xray/industries/roofing/index.html
- Manufacturing: https://aetheris.technology/business-xray/industries/manufacturing/index.html

Organic posts use `utm_source`, `utm_medium`, `utm_campaign=business_xray`, and distinct `utm_content`, generated by `run.py`.

## What runs automatically

- GitHub scheduled and on-demand execution twice weekly.
- Deterministic offline QA of page SEO, scoring and drafts.
- Optional bounded public RSS research with dates, original source links and conservative ranking.
- Live HTTP checks of the public sitemap, robots and product/industry pages, with clear not-verified warnings.
- Nine editable organic promotion drafts and company-specific, cited **unsent** enquiry drafts.
- A review issue updated rather than creating duplicate issues in the same week.
- Report JSON/Markdown in run artifacts (public repo = publicly discoverable; never add customer information).
- IndexNow verification and content-change caching before notification.

## What is deliberately not automated

- Contact collection, private social scraping, mass email, spam comments, buying ads or posting into third-party accounts without valid permission/connection.
- Claiming Search Console data, social clicks, booked meetings, sales, or SEO ranking without a connected data source.
- "Running a Golden Report" on people or companies discovered by RSS; the existing Aetheris code expressly prevents automated cost-heavy forensic scans without owner authorization.
- Payment collection, legal review of customer materials and the human-evidence verification service.
- Changes to live website content beyond reviewed GitHub merges and publishing.

## Conversion KPI definitions

| Metric | Measurement | Guardrail |
|---|---|---|
| Qualified prospect candidates | Number of cited, manual-verified company records | Not a buyer or conversion prediction |
| Impressions / clicks | Google Search Console and owned-channel insights after connecting | No figures invented |
| Free scan starts | Real privacy-reviewed event only if tracking is enabled | Avoid tracking individual answers |
| Completed scans | Valid completed assessments | Current browser-only tool does not automatically collect |
| Review enquiries | Consent-based on-site email submission with provider-confirmed success | A link click or failed delivery is not proof an email was sent |
| Paid clients | Verified payment/order record | Do not infer from clicking a button |
| Confirmed recovered margin | Audited before-and-after financial evidence | Not equivalent to estimated opportunity |

## Setup action to unlock additional channels

An account owner can connect/verify Google Search Console, Bing Webmaster Tools, a legitimate LinkedIn page and eligible Google Business Profile. Those OAuth/verification steps may require the user and are never implied complete. Their absence does not prevent the scheduled free GitHub research and draft workflow.

## References for site owners

- Google AI features: https://developers.google.com/search/docs/appearance/ai-features
- Google generative AI search guide: https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- Google sitemaps: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- IndexNow setup: https://www.bing.com/indexnow/getstarted
