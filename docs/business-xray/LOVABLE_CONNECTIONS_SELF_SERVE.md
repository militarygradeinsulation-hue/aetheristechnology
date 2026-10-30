# Aetheris Business X-Ray: Connections, acquisition, payment, delivery (2026-10-30)

**Implementation philosophy:** GitHub source updates first. Do not send Lovable AI generation prompts or spend Lovable build credits. Do not add new SaaS subscriptions merely to duplicate an existing integration.

## Verified in Lovable workspace

Workspace `WElvxikaQtY7u9TjDi0k`; website project `1b783889-c460-4e52-a4bd-950110dc395b`; standalone Business X-Ray project `b83147a2-23c8-4c17-b5ef-ff3b802fefa5`.

- Main site Supabase database enabled; includes private sales, order deliveries, scan activity, CRM contacts, assessment leads and Golden Report history tables. Key tables have RLS enabled.
- Standalone X-Ray has a database enabled but zero public tables. It is not the payment/data owner.
- Lovable workspace connector catalog makes Stripe, Supabase, Google Search Console, Bing Webmaster, Google Analytics, PostHog, HubSpot, Microsoft Outlook, Resend, LinkedIn, Google Business Profile, n8n and others **available**. Availability is not evidence that an account has been authorized or that API reads/writes are working.
- Two connected custom MCP adapters were visible: Aetheris website and Obsidian Coder. They are not a license to expose private database content to the public.
- The existing Aetheris backend has fixed-recipient direct contact email, Stripe checkout, verified payment webhooks and a purchase-deliverables pipeline. This project does NOT require a second merchant account.
- 2026-10-15 to 2026-10-30 Lovable analytics: main site 725 visitors/1049 pageviews; standalone X-Ray 3 visitors/3 pageviews. Analytics alone is not a conversion count. Site scan-product conversion attribution needs authenticated purchase and consent-aware analytics.

## Connection priority

| Connection | Purpose | State | Next action |
|---|---|---|---|
| Lovable Stripe (existing) | One-time paid checkout | Source code and existing sales; X-Ray-specific backend deployment still unverified | Verify $59/`scan_full_report_once` active product in the same live Stripe merchant, webhook events and payments |
| Website Supabase project `ihdjpxhcaiaixmqxyqoe` | Scan requests, paid orders, report storage, access control | Database accessible from website project, but GitHub Actions deployment token previously missing | Restore authorized Edge deployment, run Deno type checks, upload changed Edge functions to this exact project |
| Existing Lovable email sender | Paid report-ready notification | Existing sender in backend; new template added to source | Deploy worker + template registry, verify delivery to a consented address |
| Google Search Console | Organic query impressions, indexing and pages | Catalog enabled, no confirmed account authorization | Use `https://lovable.dev/dashboard?connectors`, select Google Search Console and authorize a verified domain |
| Bing Webmaster Tools | Organic discoverability, crawler diagnostics and IndexNow | Catalog enabled, no confirmed account authorization | Authorize Bing website property, check sitemap and IndexNow outcomes |
| Google Analytics or PostHog | Visit → X-Ray completion → checkout → paid → fulfilled | Neither confirmed connected in Lovable | Pick ONE privacy-conscious tool, implement consent and no raw financial/employee answers in events |
| HubSpot | Lead response, pipeline stage and legitimate follow-up | Catalog available, source has HubSpot integration code | Connect ONLY if useful; dedupe by consented verified email and avoid automatic spam |
| LinkedIn / Google Business Profile | Organic distribution | Catalog available, publishing not authorized through this code | Human-approved posts only. Avoid auto-posting into third-party accounts before permission |
| n8n / additional marketing stack | Advanced orchestration | Catalog available, not actually required | Defer. GitHub Actions already produces twice-weekly SEO/ICP review |

Connectors dashboard: `https://lovable.dev/dashboard?connectors`.

## Current customer journey and release gates

### 1. Discover
Search-indexable Business X-Ray pages, a new answer-first automated-website-report explainer, internal links, desktop/mobile CTA, updated XML sitemap, and optional llms.txt reference. The correct product is the free browser-only diagnostic, NOT a financial audit.

### 2. Scan (free)
Self-reported People/Process/Systems scores and separate estimated opportunity scenarios computed locally. Customer prints/exports an immediate free report. No silent upload of raw estimates.

### 3. Choose
- **$59 Automated Website Report**: Public website URL required, automated digital generation after payment. Only about that website. This is the appropriate pure self-serve SKU.
- **$199 Verified Business X-Ray Review**: Human review. Do not claim instant or automated financial verification.
- **$599 Correction Roadmap**: Human-reviewed process plan. Do not call it an automatically completed audit.

The paid website report uses the preexisting Stripe lookup key `scan_full_report_once`, not a newly invented product. An additional confirmation of the exact live product price is required.

### 4. Pay
Payment must use the server-side Stripe Checkout Session price, exact currency/amount and fixed quantity. The new checkout code rejects missing or non-public website URLs; the client cannot choose the return URL for this SKU. Purchase must remain **disabled** until the correct backend versions are deployed and a sandbox checkout has passed. The gate is `VITE_XRAY_WEBSITE_REPORT_CHECKOUT_ENABLED=true`, which must not be enabled preemptively. Human offers retain their separate `VITE_XRAY_CHECKOUT_ENABLED` gate.

### 5. Deliver
Signed Stripe webhook events `checkout.session.completed` and `checkout.session.async_payment_succeeded` are gated on `payment_status=paid`; unpaid or failed payments do not create paid deliverables. The internal worker requires a service role bearer, atomically claims a pending order, and never falls back to scanning `example.com`. On successful generation, the result is stored, return page shows download and a transactional email sends the report link to the paying customer. Report email is best effort and cannot erase a successfully created report.

**Not yet verified in production.** No public claim that a customer was successfully charged, that an automated scan completed, or that email arrived is supported without a signed end-to-end test.

## Deploy and go-live acceptance test (required)

1. Confirm the correct project ID `ihdjpxhcaiaixmqxyqoe`; do not accidentally deploy to similarly named `xcjvcmdehyybyhkwnnhs`.
2. In a Stripe sandbox, create or verify the $59 one-time USD price with lookup key `scan_full_report_once` and active product. Verify the account, environment and webhook subscription, including async payment succeeded.
3. Using authorized GitHub Actions or Lovable backend deployment controls, deploy `create-checkout`, `payments-webhook`, `generate-purchase-delivery`, and the new shared email template/registry. Keep keys inside the platform secrets vault.
4. Start from the free static X-Ray, use a public owned website URL, view the results, select $59 and complete a **sandbox** checkout. Assert request URL is the intended public domain, quantity 1, price 5900 cents USD, and no raw X-Ray numeric answers in the session.
5. Assert webhook signature authenticates. Test paid, unpaid checkout-completed, delayed success, delayed failure and duplicate events; check no double work or duplicate charges. Use `purchase_deliverables` and `processed_webhook_events` under authorized read access. Do not send repeated charge attempts to production.
6. Verify the customer return page transitions pending → ready, report belongs to the input domain and the email link arrives in a consented inbox; test failure and missing-website variants.
7. Once the sandbox test passes, repeat one deliberately authorized, small live transaction with the owner's permission, settle refunds if necessary, confirm proper receipt/tax settings. **Only then** set `VITE_XRAY_WEBSITE_REPORT_CHECKOUT_ENABLED=true` in the Lovable website environment and deploy from GitHub's latest commit.
8. Confirm mobile and desktop functionality, Search Console indexing, merchant email delivery and real conversion events.

## SEO / AEO boundaries

- Helpful distinct content, clear first-paragraph answers, canonical URLs and XML sitemap integration can support indexing. AI-answer visibility is **not guaranteed**.
- No fictional case studies, statistics, review stars or prices in schema for disabled products.
- Public pages explain how financial scenarios are calculated and why a public website report cannot prove internal company financial leaks.
- `llms.txt` is an optional agent reference; Google Search does not give it special ranking advantage.
- IndexNow only notifies participating engines after URL deployment; it is not a Google Search indexing API.
- Use actual GSC and analytics measurements to prioritize future pages; do not extrapolate visitor counts into conversion rates.

## Safety

Visitor website URL can be entered by untrusted users; normalizer rejects local domains, ports, credentials and numeric IPs, but **DNS rebinding / redirect target validation must also be enforced at the actual fetching layer** before making it a general-purpose public crawler. Rate-limit scans by paid transaction, and monitor server costs. Do not use owner credentials on behalf of prospects. Keep customer reports and financial details private, and give customers access only to their own paid output.
