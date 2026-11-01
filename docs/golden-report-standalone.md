# Golden Report — standalone website/embedded package

This build **reuses the existing canonical Golden Report UI and algorithms** from the Aetheris source repository, but loads only the Golden Report module. It is intentionally a separate website entrypoint: no global Aetheris navigation, directory, contact pages, site-wide floating tools, cross-promotions, retargeting pixels, or links to the original website.

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

## Embed

After uploading the distribution to a separate HTTPS site, you can embed it from any other website:

```html
<iframe
  src="https://YOUR-GOLDEN-REPORT-HOST.example/?embed=1"
  title="Golden Report forensic scanner"
  loading="lazy"
  style="width:100%;min-height:960px;border:0;border-radius:12px"
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

## PDF branding and navigation

With `standalone` enabled, the scan panel requests **white-label** PDFs: cover/footer text is neutral, file names are neutral, and the PDF's outbound "Ask this report" link is not emitted. Internal clickable PDF index links remain. The scanned website address appears as non-clickable text on the report screen. Report content and evidence still legitimately refer to the company being scanned.

## Limitations

The standalone report retains the **existing** report model, evidence gates, 14-chapter output, financial ledger, generated growth assets, PDF profiles, and advisor endpoint. Exact result contents depend on whether backend scans succeed and what company-specific evidence can be found. The standalone web app intentionally has **no** unrelated site pages or connections to external Aetheris pages.

After building, validate a live authorized run, report progress, evidence-backed leakage totals, full chapter coverage, advisor chat, all three PDF profiles, and a finished report link on the destination host. Do not claim deployment/production readiness before these checks pass.
