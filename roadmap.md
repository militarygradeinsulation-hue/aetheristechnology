# Roadmap

## Collective Brain production release
- [x] Requested migration, function, Collective Brain UI, and AdminDashboard match GitHub main d7cf1ce2193c4819a63923071819cf726c53cf52 byte-for-byte; no manual Git sync operation performed.
- [ ] Apply supplied migration: blocked by PostgreSQL 42702, column reference "company_id" is ambiguous (SELECT f.*, a.company_id duplicates company_id). Transaction rolled back; aggregate tables remain absent. Source left unchanged as requested.
- [x] Deploy golden-report-brain; unauthenticated request returns 401 Admin session required.
- [x] Fix Collective Brain 401 using the existing shared admin-token verifier and deploy; real PIN login now passes authorization. Four regression tests cover valid, missing, forged, and expired sessions; invalid deployed token still returns 401. Authorized reads now reach the database but return 500 "Brain query failed" because the supplied migration remains blocked above.
- [x] Latest harness build OK at 2026-10-29T16:54:53Z; authenticated Collective Brain screen verified in browser. No feature or database architecture rewrite.
- [x] Harness build OK at 2026-10-29T16:41:05Z; authenticated Admin Collective Brain renders, Vite serves component HTTP 200, no runtime errors; no compile fixes required.

## Missing Leak Audit appendix investigation
- [x] Confirm saved submissions, report readiness, and accepted email events.
- [x] Repair production correction-plan and evidence projection without changing canonical report amounts.
- [x] Verify corrected appendix rules (6 tests), deploy, and complete a real questionnaire: existing Ask Intros report reused and corrected findings email accepted for militarygradeinsulation@gmail.com; inbox receipt remains unverified.
- [ ] Identify Joseph's exact missing test if it differs from the two saved submissions; website/email not supplied.

All landing-page removals complete:
- [x] Remove #recognize section ("What the problem looks like")
- [x] Remove decision headline h2 ("Can we find what is costing...")
- [x] Remove "The first useful output" / #sample-reports section
- [x] Remove ObsidianVibeWaitlist block
- [x] Verified no dangling references; typecheck clean

## Leak Audit → emailed Golden Report appendix
- [x] Confirm plain-language appendix and one report per normalized company URL; retain global spending safeguard.
- [x] Restore assessment saving by applying the missing private intake tables and protected claim function.
- [x] Replace instant modeled-cost results with an honest email-delivery confirmation.
- [x] Generate or reuse the canonical Golden Report under the existing three-attempt daily safety limit.
- [x] Deliver the approved appendix to the original requesting visitor on completion and to later requests for completed reports.
- [x] Verify questionnaire submission, saved TCC report reuse, and email send end-to-end; 13 regression tests pass. Fresh paid generation was not rerun.

Operational limitation: additional visitors requesting a report while its first scan is still running need operator follow-up; no bulk delivery job was added.

## Scrolling system builds
- [x] Extract all 67 build names, URLs, and screenshots from https://josephtoneymsbaibm.com/#builds.
- [x] Add a linked scrolling strip to the home page with Joseph's requested caption.
- [x] Verify sourced links, desktop/mobile rendering, pause, and reduced-motion behavior; hosted assets verified separately from local asset serving.

- [x] Add obsidianvibe.live/library projects to builds strip (no duplicates)
- [x] Builds caption update + 100 Golden Reports scrolling strip under it
