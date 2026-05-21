## Goal

Turn `/` into a clean, focused landing page. Keep the top (Hero + "This is for you"), drop the noise, and put a big **"Pick your problem"** picker front-and-center — modeled on the small tool cards in `/leak-audit`, but blown up to bold problem buttons that reveal matching solutions. Anchor the bottom with the upcoming events calendar.

## New Home page structure (top → bottom)

1. **Hero** (unchanged)
2. **This Is For You** (unchanged — the signals tile)
3. **Audio briefing tile** — "Who we are. What we do for you. In our own words." (moved up to sit directly under the Aetheris video/audio explainer position)
4. **NEW — "Pick your problem" picker** (front and center, see below)
5. **Book a meeting** (HubSpot embed — kept, it's the conversion anchor)
6. **What You Really Get** (kept)
7. **Resume Forensics teaser** (kept — it's a single live tool spotlight, not noise)
8. **Upcoming Events / Calendar** (moved to the bottom)
9. Footer

## "Pick your problem" picker (the new centerpiece)

Big, bold, scannable. Headline: **"Pick your problem."** Subhead: "Tell us what's broken. We'll show you what plugs it."

Layout: a vertical stack of 5 large problem buttons (the same 5 problem groups already defined in `CapabilitiesPage.tsx`). Each button is a full-width forensic tile with:
- Case-file micro-label ("Problem 01")
- Big serif problem statement (e.g. *"I don't know where the business is actually leaking money."*)
- One-line symptom underneath

Click behavior: button expands inline (accordion) to reveal the matching solution tools as compact cards — title, "What it cures" line, and a "Run it free →" link. Only one open at a time. Single-page interaction, no navigation away.

Source the 5 problem groups + their tools from the existing `problemGroups` array in `src/pages/CapabilitiesPage.tsx` (extract it into `src/lib/problemGroups.ts` so both pages share it).

A small "See all tools →" link at the bottom of the picker points to `/capabilities` for users who want the full grid view.

## Relocations

| Section | From | To |
|---|---|---|
| "There's a ton of AI gurus out there..." trust tile | Home | **`/why-us`** (prepend to `WhyUs.tsx`) |
| "Map. Quantify. Roadmap." 3-step diagnostic | Home | **REMOVE entirely** (per request) |
| "Everyone else is selling you advice. We're an AI-native operator." | Home | **`/why-us`** (append after the gurus tile) |
| "What we've found inside exhausted owner-led businesses" case files | Home | **`/leak-audit`** (append a new section after the intake CTA cards) |
| "New Tech Launch Showcase" heading | Home | **`/catalog`** (the premium tech page — prepend as the page intro) |
| Upcoming Events | Home (mid) | Home (**bottom**, just above footer) |

Audio briefing tile stays on home but moves up directly under the Hero/explainer area so it reads as "Who we are / what we do / in our own words" right under the explainer.

## Files

**Create**
- `src/lib/problemGroups.ts` — export the `problemGroups` array + `Tool` / `ProblemGroup` types, plus the thumbnail imports.
- `src/components/ProblemPicker.tsx` — the new accordion-style picker component for Home (and reusable).

**Edit**
- `src/pages/Home.tsx` — delete relocated sections, reorder, mount `<ProblemPicker />` after the audio briefing, move `<UpcomingEvents />` to the end.
- `src/pages/CapabilitiesPage.tsx` — import `problemGroups` from the new shared lib instead of defining inline.
- `src/components/WhyUs.tsx` — prepend the "AI gurus" trust tile + "AI-native operator" section (copy markup from Home verbatim, keep `INFOGRAPHICS` imports).
- `src/pages/LeakAuditPage.tsx` — append the "What we've found inside exhausted owner-led businesses" case-files section at the bottom of the result/intake flow (visible on all steps, after the main content).
- `src/pages/CatalogPage.tsx` — prepend the "New Tech Launch Showcase" intro heading block above the existing catalog content.

## Out of scope

- No business-logic, backend, or routing changes.
- No design-token changes — reuse existing `forensic-tile`, `font-forensic`, `font-case`, `amber`/`crimson` classes.
- Copy is preserved verbatim wherever sections move; only placement and the new picker UI are new.
