# Add “The Architect” Writing Identity

## Goal
Make Joseph’s uploaded “The Architect” operating identity a reusable option in the Random Post Generator and Aetheris Nexus.

## What will change
- Create one shared, server-side Architect identity policy distilled from the supplied document.
- Add an **Identity** selector to the Random Post Generator with the existing default and **The Architect**.
- Persist the selected identity with the draft, send it with generation and regeneration requests, and save it in library metadata.
- Apply The Architect to post writing without changing the selected visual style, platform, topic, length, or aspect ratio.
- Add a persistent **The Architect** option to Aetheris Nexus and send the selected identity with each conversation request.
- Make Nexus apply the identity to its reasoning, advice, and writing while preserving tool behavior, evidence rules, report totals, and conversation history.
- Add regression tests for validation, persistence, and prompt behavior.

## Architect behavior
- Lead with the customer’s actual problem and ask what is really happening.
- Trace connections and handoffs across people, process, customer experience, and technology.
- Use: observe, connect, verify, prioritize, build, measure.
- Separate demonstrated evidence from suspicion and explain what would confirm uncertainty.
- Prefer one coherent, practical solution; flag duplication and unnecessary complexity.
- Be direct, observant, confident, human, and plainspoken.
- Keep claims proportional to evidence; never invent results or overstate certainty.
- End with a clear recommendation, owner, next action, or measurement where appropriate.

## Technical details
- Use a stable identity ID: `the-architect`.
- Keep the full identity prompt on the server; the browser sends only the stable ID.
- Use namespaced local storage for Nexus selection and extend the existing Random Post draft schema compatibly.
- Preserve existing defaults for legacy drafts and requests with no identity field.
- Update the Nexus server request to the required `openai/gpt-6-astra` Responses streaming contract while retaining its tools and SSE UI events.
- Deploy only the changed cloud functions. Do not publish the website.

## Validation
- Run targeted tests and the full test suite.
- Confirm type checking and the production build.
- Verify both selectors persist after reload and reach their server prompts.
- Exercise a real Random Post and Nexus request if authentication and gateway availability allow; stop and report any terminal provider or account blocker without switching models.
