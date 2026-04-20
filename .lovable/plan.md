

## Add Structural DNA Theft Framework to Content System

### What this does

Adds the "steal structure, not voice" principle and the 13-person influence list as a structural reference layer in the content generation prompt. The AI will model post structures after proven formats from Hormozi, Naval, Jocko, Rory Sutherland, and others — without copying their voice. Also saves the full framework to project memory.

### Technical details

**1. New memory file: `mem://marketing/structural-influences`**

Stores the full framework:
- Core principle: steal structure, not voice
- Who NOT to steal from (AI consulting, playground industry, format-owners)
- Who TO steal from, organized by tier:
  - Tier 1 (direct voice cousins): Hormozi, Rory Sutherland, Naval, Jocko
  - Tier 2 (adjacent-industry operators): Tommy Mello, Sam Parr, Codie Sanchez
  - Tier 3 (structure masters): Justin Welsh, Daniel Priestley, Harry Dry
  - Tier 4 (wildcards): Morgan Housel, Derek Sivers, Jon Matzner
- For each: what to steal and which of the five formats it maps to

**2. Update edge function prompt: `supabase/functions/generate-social-content/index.ts`**

Add a new section before the Seven Rules called "STRUCTURAL DNA — STEAL STRUCTURE, NOT VOICE" that instructs the AI:

- Case Files should use Hormozi's "named framework + reveal-then-math" structure and Harry Dry's 3-beat (situation, decision, result) pacing
- Leak of the Week should use Rory Sutherland's "everybody thinks X but actually Y" reversal hook
- Operator's Journal should use Naval's aphoristic stacking and Morgan Housel's "one thing I've noticed" meditation format
- Contrarian posts should use Codie Sanchez's "here's what nobody tells you" frame
- Hooks should follow Justin Welsh's scroll-stop formulas — flat declarative, specific number, pattern interrupt
- All posts should use Hormozi-style short-paragraph pacing (1-3 lines max)
- Jocko's command-style sentences for Case Files that use ownership framing
- Sam Parr's "I met a guy who..." narrative openers for story-driven Case Files
- Tommy Mello's operational granularity and specific-revenue hooks

Add explicit guardrails:
- Never mimic the voice of anyone in AI consulting
- Never echo playground/parks industry voices
- Steal bones, not skin — the structure is invisible to the reader

**3. Update memory: `mem://marketing/content-architecture`**

Add a "Structural Influences" section referencing the principle and the tier list, with a pointer to the full memory file.

**4. Update memory: `mem://index.md`**

Add reference to the structural influences memory file.

### Files touched

| File | Action |
|------|--------|
| `mem://marketing/structural-influences` | New — full 13-person influence framework with steal-targets per format |
| `mem://marketing/content-architecture` | Add structural influences section |
| `mem://index.md` | Add reference |
| `supabase/functions/generate-social-content/index.ts` | Add structural DNA instructions to prompt (before the Seven Rules) |

### What does NOT change

- The five-format architecture — identical
- UI rendering in SocialContentGenerator — no changes needed
- Blog/playbook generation — untouched
- LinkedIn posting queue — unrelated

