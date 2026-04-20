

## Rebrand Content Generator to Five-Format Forensic Content Architecture

### What this does

Replaces the current four-pillar LinkedIn Growth Framework (Brandjack/Newsjack/Namejack/Hot Take/Authority) with your five-format forensic content architecture: **The Case File**, **Leak of the Week**, **The Dead Simple Diagnostic**, **Operator's Journal**, and **The Contrarian**. Updates the AI prompt, the UI component, the page title, and saves the content architecture as project memory.

### Technical details

**1. Rewrite edge function prompt: `supabase/functions/generate-social-content/index.ts`**

Replace the four-pillar prompt (lines 70-108) with your five-format architecture. New JSON output structure:

```text
{
  "businessName": "...",
  "caseFiles": [2 posts] — forensic case studies with CASE ID, STATUS: ACTIVE, THE FINDING, THE EVIDENCE, THE MATH, THE FIX (teased), and THE LESSON
  "leakOfTheWeek": [1 post] — name one leak pattern, define it, show the signs, teach them to spot it, don't give away the fix
  "deadSimpleDiagnostics": [1 post] — one 60-second self-test, shareable/saveable, with THE TEST, THE THRESHOLD, and WHAT IT MEANS
  "operatorsJournal": [2 posts] — 3-8 lines, no template, no CTA, field notes, personal, unpolished
  "contrarians": [1 post] — one defensible dissent, pattern-recognition not rage-bait, with THE CLAIM, THE EVIDENCE, THE COUNTER, and THE POSITION
  "weeklySchedule": [7 entries mapped to the format rotation]
}
```

Each post object structure changes per format:
- **Case File**: `caseId`, `status` ("ACTIVE"), `finding`, `evidence`, `math`, `fixTease`, `lesson`, `format`: "case_file"
- **Leak of the Week**: `leakName`, `definition`, `signs`, `spotIt`, `format`: "leak_of_week"
- **Dead Simple Diagnostic**: `testName`, `test`, `threshold`, `whatItMeans`, `format`: "diagnostic"
- **Operator's Journal**: `body` (raw text, 3-8 lines), `format`: "operators_journal" -- no hook/cta/soWhat
- **Contrarian**: `claim`, `evidence`, `counter`, `position`, `format`: "contrarian"

All posts still carry `hook` and `body` for rendering consistency (except Operator's Journal which has `body` only).

System prompt enforces the seven rules:
1. Every post finds, names, or fixes a leak -- or it doesn't exist
2. No AI tells ("As an AI-enabled...", "In the age of AI...")
3. Every number is specific or it doesn't exist ("$1.4M/year" not "millions")
4. Every CTA is the same CTA: "Run the 14-Point Leak Audit"
5. Never explain the methodology unprompted -- demonstrate it
6. The One-Sentence Test: could an AI-consultant LinkedIn bot have written this? If yes, rewrite
7. When in doubt -- cut it

**2. Update component: `src/components/SocialContentGenerator.tsx`**

- Replace `FORMAT_META` with five new format entries: `case_file`, `leak_of_week`, `diagnostic`, `operators_journal`, `contrarian`
- Replace `sections` array to map to the new data keys
- Update `renderPost` to handle format-specific rendering:
  - **Case File**: Show `CASE ID` badge, `STATUS: ACTIVE` in crimson, structured sections (Finding, Evidence, Math, Fix tease, Lesson)
  - **Leak of the Week**: Show leak name as header, definition, signs list, "how to spot it"
  - **Dead Simple Diagnostic**: Show test name, the test steps, threshold, interpretation
  - **Operator's Journal**: Minimal card -- just the body text, no badges, no CTA, no structure. Mono font feel
  - **Contrarian**: Show THE CLAIM bold, then evidence/counter/position sections
- Update phase labels: "Running forensic scan...", "Building Case Files...", "Identifying leak patterns...", "Writing field notes...", "Drafting contrarian positions..."
- Update summary text: "7 forensic posts + weekly rotation"
- Weekly schedule grid updated to reflect the new rotation (Case File 2x, Leak 1x, Diagnostic 1x, Journal 1-2x, Contrarian 1x)

**3. Update page: `src/pages/ContentGeneratorPage.tsx`**

- Heading: "Forensic Content Pack"
- Subtitle: "Five formats. Each finds a leak, names a leak, or fixes a leak."

**4. Save content architecture to memory: `mem://marketing/content-architecture`**

Store the full five-format architecture, the seven rules, blog/long-form style guide, and playbook style guide as persistent project memory so all future content generation respects it.

**5. Update blog generation prompt: `supabase/functions/generate-blog/index.ts`**

Add the blog/long-form style rules to the existing blog generation system prompt:
- Lead with forensic frame (first 3 lines match Case File DNA)
- H2s as dossier section markers: "THE INVENTORY", "THE AUTOPSY", "THE MATH", "THE FIX", "THE PATTERN"
- Numbers in digits, currency explicit, time frames specific
- Break every 3-4 sentences
- Every blog ends with single clean CTA: the Leak Audit, no alternatives
- No generic intro paragraphs -- start in the middle

### Files touched

| File | Action |
|------|--------|
| `supabase/functions/generate-social-content/index.ts` | Rewrite prompt to five-format architecture |
| `src/components/SocialContentGenerator.tsx` | New format cards, rendering, sections, phase labels |
| `src/pages/ContentGeneratorPage.tsx` | Update heading/subtitle |
| `supabase/functions/generate-blog/index.ts` | Add forensic blog style rules to prompt |
| `mem://marketing/content-architecture` | New memory file with full architecture |
| `mem://index.md` | Add reference to content architecture memory |

### What does NOT change

- Firecrawl scraping logic -- identical
- Paywall / Stripe checkout -- same mechanism, same price
- Admin library save -- same structure
- LinkedIn posting queue / OAuth -- unrelated
- Outlook sync -- unrelated

