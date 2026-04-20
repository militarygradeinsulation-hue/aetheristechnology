

## Rebrand Blog + Playbook Generators to Business Forensics Operator + LinkedIn Growth Framework

### Problem

Three generation systems are still hardcoded to the **old** playground/recreation industry positioning. They need to be completely rewritten to match the current **Business Forensics Operator** identity and incorporate the LinkedIn growth content framework (Brandjacking, Newsjacking, Namejacking, Hot Takes).

### What changes

**1. `supabase/functions/generate-blog/index.ts` — Full rewrite of prompts and topics**

Replace the playground-industry TOPICS array, HASHTAG_POOLS, AETHERIS_FRAMEWORKS, and STRATEGIC_INTELLIGENCE with:

- **New topic categories** mapped to the 4 growth formats:
  - **Brandjacking** — Analyze decisions by known brands (Salesforce, HubSpot, McKinsey, Stripe, etc.) through the lens of revenue leaks and operational forensics
  - **Newsjacking** — AI industry shifts, SaaS pricing changes, economic data reframed through the Leak Audit lens
  - **Namejacking** — Reference figures the ICP follows (Hormozi, Satya Nadella, Dharmesh Shah, etc.) to trigger pattern interrupts
  - **Hot Takes** — Contrarian positions ("Your CRM is a liability, not an asset", "Most consultants sell comfort, not change")
  - **Authority/Deep-Dive** — Standard forensic methodology posts (existing niche content)

- **New system prompt** aligned to Business Forensics Operator voice:
  - Forensic, blunt, aggressive tone (unchanged intent, new framing)
  - The Leak Audit (7 steps), Forensic Diagnostic ($2,500), operator positioning
  - 8-section structure stays but section 3 references Leak Audit / Forensic Diagnostic instead of playground frameworks
  - Contact block updated: `joseph@aetheris.technology`, `(317) 376-2110`, `aetheris.technology`

- **New STRATEGIC_INTELLIGENCE** block with B2B operational data (CRM failure rates, marketing spend waste, AI adoption stats, consulting industry benchmarks)

- **Each blog post tagged with its growth format** (`brandjack`, `newsjack`, `namejack`, `hottake`, `authority`) so the admin can see the mix

- **New field in AI output**: `growth_format` — stored alongside the post for analytics

**2. `supabase/functions/generate-playbook/index.ts` — Rewrite topic pool and system prompt**

Replace the current TOPIC_POOL (which mixes old playground topics with generic consulting topics) with forensic-aligned playbook topics across three pillars:

- **Revenue Forensics** — Leak Audit methodology, pipeline diagnostics, CRM autopsy, pricing architecture
- **Operational Intelligence** — Process mapping, automation ROI, vendor stack audits, team efficiency
- **AI Transformation** — AI adoption roadmap, GEO/AEO strategy, autonomous workforce integration

Update system prompt from generic "senior strategy consultant" to Business Forensics Operator voice. Reference The Leak Audit, the Forensic Diagnostic, and the case-file aesthetic.

**3. `supabase/functions/generate-custom-playbook/index.ts` — Update system prompt**

Same voice/positioning update. Keep the existing flow (takes a `playbookId`, generates content, renders PDF) but swap the system prompt to forensic positioning.

**4. `supabase/functions/generate-aeo-blog-batch/index.ts` — Update system prompt voice**

The AEO batch generator already has decent topic structure but uses generic "AI consulting" framing. Update the system prompt to use Business Forensics Operator voice and reference The Leak Audit methodology.

**5. `mem://business/brand-strategy` — Update memory**

Replace the outdated "playground & recreation" brand strategy with the current Business Forensics Operator positioning so future generations stay aligned.

### Content framework integration

Every blog post prompt will include a `contentFormat` field drawn from the weekly schedule:

| Day | Format | Goal |
|-----|--------|------|
| Mon | Growth (Brandjack or Newsjack) | New audience acquisition |
| Tue | Authority / Deep-Dive | Trust with existing followers |
| Wed | Case Study / Forensic Report | Social proof |
| Thu | Growth (Namejack or Hot Take) | Scale visibility |
| Fri | Niche Expertise / Q&A | Engagement and retention |

The system prompt will include the "So What?" test, the Anxiety test (for hot takes), and the contextualization-over-summarization rule as mandatory pre-publishing filters baked into the AI instructions.

### Files touched

| File | Action |
|------|--------|
| `supabase/functions/generate-blog/index.ts` | Rewrite TOPICS, HASHTAG_POOLS, FRAMEWORKS, STRATEGIC_INTELLIGENCE, system prompt |
| `supabase/functions/generate-playbook/index.ts` | Rewrite TOPIC_POOL (lines 10-63), system prompt (lines 287-310) |
| `supabase/functions/generate-custom-playbook/index.ts` | Update system prompt (lines 49-73) |
| `supabase/functions/generate-aeo-blog-batch/index.ts` | Update system prompt voice |
| `mem://business/brand-strategy` | Replace with current forensic positioning |

### What does NOT change

- PDF rendering logic (cover pages, styling, jsPDF code) — stays identical
- Database schema — no new tables or columns
- Blog post structure (title, slug, excerpt, content, tags, meta_description) — same fields
- Playbook upload/storage flow — unchanged
- React components — zero touch

