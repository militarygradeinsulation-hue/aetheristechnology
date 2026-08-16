Golden Report Landers — Add trust line above the free scan CTA

What
- In `src/pages/LeakLanderPage.tsx`, add a line above the "Start free scan" button in the AnomalousMatterHero.
- Exact copy: "Experts in making companies visible AND making brand AI be as human as you are."
- Keep the wordmark title, the two CTAs, and the "Indianapolis · Operating nationwide" micro-line.

Where it fits
- The `AnomalousMatterHero` accepts a `description` prop that currently receives an empty string.
- Populating `description` with the requested line will render it between the wordmark title and the CTA buttons, i.e., directly above "Start free scan".

Checks
- No changes to business logic, auth, data, or financial calculations.
- Verify the hero still renders the wordmark, buttons, and micro-line unchanged.
- Run a typecheck/build to confirm no syntax errors.
