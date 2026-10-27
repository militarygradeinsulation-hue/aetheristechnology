# Aetheris Buyer Intent Radar

Owner-only purchasing-intent discovery alongside **Admin → Buyer Intent + ICP**. Existing ICP Connections remains available as the second tab. No Lovable AI-builder prompts are required to publish the frontend.

## What qualifies

The scanner runs bounded, public-web Firecrawl searches for three service lines: marketing (SEO, ads, agencies), consulting (operations, strategic advisory, fractional leadership), and AI (implementation, integration, automation). The Lovable AI Gateway suggests source-linked opportunities, but a deterministic validator only retains requests where:

1. The requesting organization is visibly named in a returned public page.
2. A **verbatim 18–220 character quote**, included in the same returned source, asks for an external vendor, firm, consultant, partner, or proposal.
3. The public source is HTTPS and not a protected social platform.
4. The service matches the operator's enabled service lines; the signal score passes the operator's threshold.
5. If a date is verified, the request is not more than 180 days old. Undated items are marked unverified, **not** fresh.

The interface shows the evidence URL, request excerpt, signal reasons, ranking, publication/observation dates, recommended Aetheris offer, research notes, and a manual pipeline (new → researched/approved → contacted → qualified → won). It never auto-sends email, contacts social profiles, purchases enrichment, or runs forensic/Golden Reports. Scored intent is not a verified budget or an open RFP: check deadlines and procurement rules first.

## Production deployment

The repo already contains \`supabase/functions/_shared/owner-token.ts\` and \`admin_kv\`. There are **no new tables or public RLS grants**. An independent owner token (issued by the existing admin PIN login) is required for dashboard actions, while a separate 24+ character random secret authenticates scheduled calls.

The GitHub workflow \`.github/workflows/deploy-buyer-intent-edge.yml\` deploys **only** \`owner-buyer-intent\` on a merge to main, using \`SUPABASE_ACCESS_TOKEN\` in repository Actions secrets. If the secret is absent, the workflow safely skips; GitHub code merging alone does **not** deploy this function. To enable deployment:

- In **GitHub → Repository → Settings → Secrets and variables → Actions**, configure \`SUPABASE_ACCESS_TOKEN\` with a Supabase personal access token that can deploy to project \`ihdjpxhcaiaixmqxyqoe\`. Do not commit or paste secrets in chat.
- Ensure the deployed function has server secrets \`FIRECRAWL_API_KEY\`, \`LOVABLE_API_KEY\`, \`SUPABASE_URL\`, \`SUPABASE_SERVICE_ROLE_KEY\`, \`ADMIN_PIN\`, and optionally \`BUYER_INTENT_CRON_SECRET\`. The existing ICP engine uses the first two providers; still verify each in the production function environment.
- Re-run **Deploy Buyer Intent Radar edge function** in GitHub Actions, or use Supabase CLI with authorized credentials: \`supabase functions deploy owner-buyer-intent --project-ref ihdjpxhcaiaixmqxyqoe\`.
- The deployment workflow checks that unauthenticated \`get\` calls return HTTP 403. A manual authenticated scan in the owner dashboard is required to confirm real providers and production storage.

### Scheduled daily scans

The separate GitHub workflow \`.github/workflows/buyer-intent-daily.yml\` triggers daily at 13:15 UTC and can also be launched manually. It **only** makes a scheduled request when:

1. \`BUYER_INTENT_CRON_SECRET\` is configured **both** as a GitHub Actions secret and as the identical Supabase Edge Function secret. Use a new random 24+ character value that is unrelated to the owner PIN or service-role key.
2. The owner has switched on **Permit daily scheduled scans** under the radar's **Scan settings** and pressed **Save targeting**.
3. At least 20 hours have elapsed since the previous successful or reserved scheduled scan.

Scheduled invocations never send outreach and never print prospect data in Actions logs. On missing secrets they skip rather than initiating paid work.

### Cost and abuse controls

Each run searches at most six queries and 30 evidence pages, with one bounded AI extraction (up to 24 candidates). Manual runs are limited to three attempts per UTC day and one attempt per 30 minutes; attempts count even when an external provider errors. Daily automated scans run only after opt-in and matching secrets. Already-seen leads are deduplicated by normalized company + service + source URL. Storage is owner-private and capped at 400 opportunities. Repeated manual attempts from multiple devices may race; do not use this as an enterprise-grade billing lock.

To disable **all automated requests**, clear the GitHub cron secret or uncheck the scheduled scan and save. To disable manual discovery, remove a provider credential from the Edge Function secret store; the saved queue remains viewable.

## Acceptance checks

- [ ] Site-quality workflow builds the application and runs \`src/lib/buyerIntentCore.test.ts\`.
- [ ] Supabase function deployment succeeded, including the negative-auth smoke test (403).
- [ ] Owner PIN login reveals **Admin → Buyer Intent + ICP → Buyer Intent Radar**; logged-out and partner PIN sessions cannot access it.
- [ ] Missing \`FIRECRAWL_API_KEY\` or \`LOVABLE_API_KEY\` is reported without making calls.
- [ ] Manually scanning yields source-backed opportunities or an honest zero-result report, and updates persist after refresh.
- [ ] No invented contacts, stale dated requests, public queue exposure, unsolicited outreach, or auto-generated paid reports.
- [ ] Enabling schedule is deliberate; matching secrets exist only server-side and in GitHub Actions.

The scoring model prioritizes **observed requests** over firmographic guesswork, and is a directional triage indicator, not a probability that a contract will close.
