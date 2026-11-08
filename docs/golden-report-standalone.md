# Research Intelligence — standalone company and person URL scanner

This build presents two working research engines inside one standalone interface: **Company URL** (the canonical 14-chapter Golden Report with evidence, financial ledger, report chat and PDFs) and **Person URL** (the embedded source-backed Mindprint professional LinkedIn scanner, six lenses and expanded report, where evidence is available). It is not a mockup or a new AI approximation. It is intentionally a separate website entrypoint: no global Aetheris navigation, directory, contact pages, site-wide floating tools, cross-promotions, retargeting pixels, or links to the original website.

## Build

```bash
npm ci
npm run build:golden-standalone
```

The distributable is `dist-golden-standalone/`. Upload **its full contents** (not the source repository) to any static host. `index.html` is generated automatically. Asset URLs are relative so the package can be hosted at the root or at a subdirectory.

To view in development: `npm run dev:golden-standalone`, then open `/golden-standalone.html`.

## Backend requirements and honest separation boundary

The exact 14-chapter Golden Report **cannot be generated offline**. The source scanner is a privileged Supabase Edge Function pipeline with a forensic scan database, AI gateway, crawling provider, compiled-financial ledger, and other internal services. Merely copying the frontend does not duplicate that backend. This frontend therefore needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` at **build time** and an authorized `forensic-scan-all`, `admin-pin-login`, and `forensic-report-chat` deployment.

- For a fast separate **frontend** site, point at the existing authorized backend. This still uses backend services from the source project. It must **not** be represented as infrastructure-independent.
- For a fully independent deployment, provision a **separate** Supabase project, migrate the scan schema, the Edge Functions and their transitive `_shared` dependencies, configure the AI/crawling secrets and report-specific permission checks, then point this bundle at the new backend. This has not been provisioned by this build.
- Do not embed a service-role API key, admin session token, personal PIN, or AI provider API key in frontend code or `VITE_*` settings. Browser-side secrets are public.
- The source backend grants scan creation only to authorized runners. This package preserves that rule by requiring the server-issued admin runner code. Do not remove it to allow anonymous traffic without a per-tenant metered backend, rate limits, bot protection, quotas, and abuse controls.
- The current backend includes post-scan archive, CRM attachment, outreach tracking, growth asset generation, and other lifecycle jobs. Those **server-side links are not removed** by this frontend-only packaging. A separate backend deployment is necessary to make the full system genuinely unconnected.

## Immediately available website route

The **same dual-engine research UI** is also registered as `/research-embed` on the Aetheris web application as a top-level route, outside its marketing pages, client AuthProvider, conversion popups and site navigation. After deploying the Aetheris site's latest commit, another site can embed:

```html
<iframe
  src="https://aetheris.technology/research-embed?embed=1"
  title="Company and person research"
  width="100%"
  height="1400"
  style="width:100%;border:0;border-radius:12px"
  loading="lazy"
></iframe>
```

This enables immediate embedding without a second static host, but **the iframe is still served by the Aetheris domain** and both engine backends remain connected. To eliminate that hosting connection, deploy the separate `dist-golden-standalone/` package to your chosen unrelated domain with your own secure backend. Do not represent the hosted route as a fully independent clone.

## Embed

After uploading the distribution to a separate HTTPS site, you can embed it from any other website:

```html
<iframe
  src="https://YOUR-GOLDEN-REPORT-HOST.example/?embed=1"
  title="Company and Person Research Intelligence"
  loading="lazy"
  style="width:100%;min-height:1100px;border:0;border-radius:12px"
  referrerpolicy="strict-origin-when-cross-origin"
></iframe>
```

You may prefill a company without automatically launching a billable scan:

```
?embed=1&url=https%3A%2F%2Fexample.com&company=Example
```

For an already generated report:

```
?embed=1&scan=<authorized-report-uuid>
```

Some hosting platforms or third-party-cookie restrictions limit cross-site login and downloads in iframes. If that happens, install the static bundle directly into the target site, or use its top-level dedicated URL. Prevent untrusted pages from framing your scanner if that matters to your organization by configuring the host's Content-Security-Policy `frame-ancestors`.

## Person URL scanner

The second form accepts a public LinkedIn profile URL. It creates an embedded Mindprint runner in the same user-facing workspace rather than sending the visitor to the Mindprint website. The runner is backed by Mindprint's real `/api/public/mindprint?action=scan` analysis, public-source enrichment, evidence-backed lenses, quotas and saved-report rules. **The visitor must still confirm permission inside Mindprint and click its scan control.** URL prefill is implemented in Mindprint's `/mindprint/run?embed=1&mode=url&url=<encoded>` endpoint. When the public sources provide insufficient evidence, the scanner requests additional authorized professional writing rather than inventing personality claims. This person scanner is currently hosted by a separate existing backend. It is **not** an offline copy of Mindprint.

For deploying Mindprint somewhere other than `mindsteal.lovable.app`, set `VITE_MINDPRINT_RUNNER_URL` to the new absolute HTTPS URL for that identical runner before building. Configure the other service's HTTP iframe headers and content security policy to allow the embedding host. Do not forward private profiles, reports, or API credentials using iframe URL query parameters. URL-only prefill is permitted.

For a new company report, enter one website and choose Scan Company. The workspace launches the existing authorized Golden Report engine after runner authorization, without asking you to re-enter the URL in the underlying report panel. The original scan quality checks and credit safeguards are unchanged.

## PDF branding and navigation

With `standalone` enabled, the scan panel requests **white-label** PDFs: cover/footer text is neutral, file names are neutral, and the PDF's outbound "Ask this report" link is not emitted. Internal clickable PDF index links remain. The scanned website address appears as non-clickable text on the report screen. Report content and evidence still legitimately refer to the company being scanned.

## Limitations

The standalone report retains the **existing** report model, evidence gates, 14-chapter output, financial ledger, generated growth assets, PDF profiles, and advisor endpoint. Exact result contents depend on whether backend scans succeed and what company-specific evidence can be found. The standalone web app intentionally has **no** unrelated site pages or user navigation back to Aetheris. Its existing underlying report services and Mindprint iframe remain external connections until separately migrated. The URL-only Mindprint feature requires the current Mindprint deployment to be updated and published.

After building, validate a live authorized company run, scan progress, evidence-backed leakage totals, full chapter coverage, advisor chat, all three PDF profiles, and a finished report link. Then validate person URL prefill, explicit consent, actual Mindprint analysis, no top-level navigation, restricted-profile fallback and quotas on the destination host. CI alone cannot verify external hosted services. Do not claim deployment/production readiness before these checks pass.

## Download access after creation

A completed Golden Report is persisted in `forensic_scans.report` and indexed in the Golden Report Library. A returning authorized user can download Executive, Complete, or Appendix PDF using that saved payload without another scan, regardless of whether the evidence validator labeled it `compiled` or `needs_review`. Reports requiring review download as unmistakably unverified historical copies; a verified client-facing export is never mislabeled as verified. The source JSON remains available for archival recovery. Missing library index entries can be reconciled without regenerating the saved report.

Verify the **published** site is running the GitHub code before claiming the buttons are fixed in production. GitHub merges alone do not publish a new Lovable release; the frontend, edge functions and library index must all be checked after synchronization. This is a required regression check for future releases.

## Lovable branch synchronization verification

The canonical production website source is `militarygradeinsulation-hue/aetheristechnology` branch `main`. The older `lovable-sync` branch is not a release source. Before publishing, confirm Lovable's editor files contain both `AETHERIS_PROMO_IMAGE` in `src/components/LimitedOfferPopup.tsx` and `reserveSavedPdfTab` in `src/components/GoldenReportLibrary.tsx`. If either marker is missing, the Lovable project has not imported the current `main` tree and must not be published as containing these fixes. GitHub CI passing is not evidence that Lovable has deployed the commit.
