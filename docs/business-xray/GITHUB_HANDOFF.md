# Aetheris Business X-Ray: GitHub-first release handoff

## Repositories and current status

- **Lovable project:** https://lovable.dev/projects/b83147a2-23c8-4c17-b5ef-ff3b802fefa5
- **GitHub source mirror:** `apps/business-xray/` in `militarygradeinsulation-hue/aetheristechnology`.
- **Free static MVP:** `public/business-xray/index.html`. When this Aetheris website build is actually deployed, its public file path should be `/business-xray/index.html`. Confirm the live origin/URL in a browser before sharing.
- **GitHub tests:** `.github/workflows/business-xray.yml` runs the standalone app's tests and build.
- The X-Ray has no live Mindprint, Golden Report, Command, database or Stripe connection yet. Paid service enquiries are manually fulfilled.

## How to enable Lovable/GitHub sync without another AI build prompt

1. Open the **new** Lovable project above.
2. Open its settings and use the **Git / GitHub** integration to connect your GitHub account and create the repository Lovable requests. This is an account authorization/UI step, not an AI generation prompt.
3. After GitHub shows the new repository, move the standalone source from `apps/business-xray/` into the **root of the new synced repository** through GitHub commits. Do not overwrite the Aetheris website or the Mindprint/Command repositories.
4. Use GitHub feature branches and pull requests for future edits. Confirm that commits from the synced default branch appear in the Lovable preview and publish only after test/build checks pass.
5. The Lovable initial build used some AI credits before the GitHub-only instruction. Reading source and making all subsequent changes in GitHub does not require additional Lovable AI prompts.

## Safe release checklist

- GitHub `Business X-Ray quality checks` passes (unit/integration + build).
- Website `Site quality` build passes.
- Open the static MVP at `/business-xray/index.html`; try a blank assessment and demo on desktop/mobile.
- Confirm the existing `notify-contact-submission` backend accepts form submissions, returns `{ success: true }` after delivery, and notifies the fixed Aetheris inbox. Use a consented end-to-end test; do not mistake a button click for a delivered email.
- Distinguish **estimated opportunity** from **verified financial losses** everywhere.
- Do not collect uploaded company/personnel data on an unprotected public endpoint.
- Use consent, authentication, company isolation, access policies, and source attribution before future imports.
- Do not add AI or Stripe credentials in browser code or commit `.env` secrets to GitHub.
- Link the live full app from the public site only after the synced repo is connected and deployed.

## Product boundaries

The free assessment is a directional, in-browser analysis of self-reported business inputs. The $199 and $599 tiers are proposed manually delivered services, not an automated checkout. Free estimates are not a financial audit or validated psychological assessment.

The current GitHub implementation is the basis for all further code work, not an instruction to run another Lovable AI generation.
