# Complete Portal Golden Report Source Copy

Snapshot source commit: 47905564cb6e374dd367baaf24e6eb4bd1026c94

This folder preserves the Golden Report system currently used inside the Aetheris portal.

## Portal entry points
- Portal tool: `src/pages/PortalPage.tsx`
- Golden Report runner: `src/components/ForensicScanAllPanel.tsx`
- Golden Report Library: `src/components/GoldenReportLibrary.tsx`
- Report Q&A: `src/pages/ForensicReportAskPage.tsx`

## Backend included
- forensic-scan-all
- forensic-report-chat
- golden-report-library
- golden-report-brain
- golden-report-track
- golden-report-recompile
- golden-report-parity
- golden-leakage-backfill
- company-system
- universe-access
- every shared Supabase function dependency
- all Supabase migrations, so the connected schema is preserved

## Report logic included
- 14-chapter report generation
- PDF generation
- evidence/source scoring
- leakage model
- financial ledger
- money taxonomy and sanitizers
- compiler/model/source logic
- report archive and library
- collective report brain
- tracking and parity
- report deliverables
- Company System / CRM connection layer

## External connections found in the live implementation
- Supabase database / Edge Functions
- Firecrawl
- Lovable AI gateway
- optional OpenAI and Abacus RouteLLM through the shared AI router
- Aetheris CRM/company records
- Company System records
- Golden Report archive, findings index, blueprints and collective brain

## Secrets
No secret values are copied. Configure the keys listed in `ENV_KEYS.example` through the deployment secret manager.

## Structure
Everything under `original/` keeps the same source path it has in the live portal repo. This is a source snapshot, not a rewrite.
