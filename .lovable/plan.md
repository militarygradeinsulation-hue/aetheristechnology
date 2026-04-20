

## Rebrand Social Content Generator to LinkedIn Growth Framework

### What this does

Rewrites the `generate-social-content` edge function prompt and the `SocialContentGenerator` component so the admin content pack follows the four-pillar LinkedIn growth framework: Brandjacking, Newsjacking, Namejacking, and Hot Takes, plus Authority posts — instead of generic "LinkedIn posts / Facebook posts / ad hooks."

### Technical details

**1. Rewrite edge function prompt: `supabase/functions/generate-social-content/index.ts`**

Replace the generic social media prompt (lines 70-89) with the LinkedIn Growth Framework prompt that instructs the AI to generate:

```text
{
  "businessName": "...",
  "brandjackPosts": [3 posts] — analyze a well-known brand decision through the business's lens
  "newsjackPosts": [3 posts] — contextualize a trending industry event within 24-48hrs
  "namejackPosts": [2 posts] — reference a leader the ICP follows, add unique perspective
  "hotTakes": [2 posts] — contrarian positions that force agreement/disagreement
  "authorityPosts": [3 posts] — niche deep-dives, case studies, expertise Q&A
  "weeklySchedule": [5 entries] — Mon-Fri mapped to the strategic weekly mix
}
```

Each post object keeps `hook`, `body`, `cta` but adds:
- `format`: brandjack | newsjack | namejack | hottake | authority
- `targetEntity`: the brand/person/event being referenced
- `soWhatSentence`: the one-sentence "so what?" pass
- `strategicGoal`: reach | trust | proof | visibility | retention

The system prompt enforces the three pre-publishing stress tests:
- "So What?" sentence test
- Anxiety test for hot takes
- Insight rule (entity is evidence, not the subject)

**2. Update component: `src/components/SocialContentGenerator.tsx`**

- Replace the three sections (LinkedIn / Facebook / Ad Hooks) with five sections matching the framework pillars: Brandjacking, Newsjacking, Namejacking, Hot Takes, Authority
- Each card shows the `format` badge, `targetEntity`, the hook/body/cta, and the `soWhatSentence`
- Add a "Weekly Schedule" section at the bottom showing the Mon-Fri content calendar with strategic goals
- Update the summary text from "25 pieces" to "13 strategic posts + weekly schedule"
- Admin mode: all posts visible, no paywall
- Public mode: show 1 per category free, paywall the rest (keeps existing paywall/checkout logic)
- Update phase labels to match new flow: "Scraping website...", "Analyzing brand position...", "Generating Brandjack posts...", "Crafting Hot Takes...", "Building weekly schedule..."

**3. Update page title: `src/pages/ContentGeneratorPage.tsx`**

- Change heading from generic "Social Content Generator" to "LinkedIn Growth Content Pack"
- Update subtitle to reference the four growth formats

### Files touched

| File | Action |
|------|--------|
| `supabase/functions/generate-social-content/index.ts` | Rewrite AI prompt to four-pillar framework |
| `src/components/SocialContentGenerator.tsx` | Restructure results into 5 format sections + schedule |
| `src/pages/ContentGeneratorPage.tsx` | Update page heading/subtitle |

### What does NOT change

- Website scraping logic (Firecrawl) — identical
- Paywall / Stripe checkout flow — same mechanism, same price
- Admin library save — same structure
- The separate `content_posting_schedule` table and Outlook sync — unrelated system

