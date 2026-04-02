

# Upgrade Blog Engine to LinkedIn 360 Brew Algorithm Framework

## Overview
Rewrite the blog generation prompt and structure to align with the LinkedIn 360 Brew semantic algorithm framework from both uploaded documents. The core shift: from engagement-hacking to **semantic relevance, dwell time optimization, branded frameworks, and educational authority** within your three core pillars (Marketing, Consulting, Technology).

## What Changes

### 1. Update Edge Function System Prompt (`supabase/functions/generate-blog/index.ts`)

**Replace the current writing instructions** with 360 Brew-aligned directives:

- **The 80% Rule**: Enforce that all content falls strictly within 3 core pillars: **Marketing Technology Strategy**, **Business Consulting & Operational Systems**, **AI & Digital Transformation**. Remove off-topic categories or relabel them under these pillars.

- **Hook as AI Signal (not just human hook)**: Rewrite hook rules — the first 1-2 sentences must contain niche-specific keywords that tell the 360 Brew AI exactly what the content is about. Hooks must be "directional to expertise," topic-specific, and clear over clever. The AI allocates 3-5x processing to these lines.

- **Dwell Time Optimization**: Instruct the AI to write for **maximum time-on-content** — longer-form educational frameworks, step-by-step guides, data tables, and branded methodologies. Prioritize "Save"-worthy content over "Like"-worthy content.

- **Branded Frameworks (IP Creation)**: Every blog must introduce or reference a named Aetheris framework (e.g., "The Diagnostic Protocol," "The Revenue Architecture Model," "The 14-Day Co-CEO Method"). This creates ownable IP the algorithm associates with your profile.

- **Educational > Personality**: Remove any "personal brand" or vulnerability-driven prompts. Replace with instructions to package knowledge into actionable, branded educational guides.

- **Natural Semantic Keywords**: Add instruction to naturally weave high-density semantic keywords throughout — not keyword-stuffed, but woven into the educational narrative. Include terms like: operational efficiency, revenue operations, marketing automation, CRM infrastructure, digital transformation, AI systems architecture, business process automation, lead generation systems, attribution modeling, executive analytics.

- **Content Funnel Alignment**: Tag each blog with its funnel stage (Awareness / Consideration / Conversion) so the content mix follows the 360 Brew funnel architecture.

### 2. Restructure Content Format for Dwell Time

Update the required blog structure in the prompt:

```text
1. SEMANTIC HOOK (1-2 lines with niche keywords — signals the AI)
2. THE PROBLEM (educational breakdown with data tables)
3. BRANDED FRAMEWORK (named methodology with step-by-step)
4. DEEP-DIVE ANALYSIS (500+ words of high-depth educational content)
5. IMPLEMENTATION ROADMAP (actionable steps readers will SAVE)
6. THE AETHERIS APPROACH (14-Day Diagnostic as the conversion layer)
7. ENGAGEMENT DRIVER (specific question that generates depth comments, not "Great post!")
8. Contact block
```

### 3. Update Title Generation Rules

- Titles must contain at least one core pillar keyword
- Under 60 chars, but must be specific and educational (not clickbait)
- Format: "[Specific Problem]: [Framework/Solution]" pattern
- Examples: "Your CRM Has 50K Contacts and Zero Intelligence", "The Revenue Architecture Model: Why Your Pipeline Lies"

### 4. Add 360 Brew Algorithm Knowledge to System Prompt

Inject a condensed version of the 360 Brew framework as context:
- Semantic matching explanation (AI reads content and matches to ICP profiles)
- Save > Like > Comment priority hierarchy
- 80% topic consistency rule
- Dwell time as the confirmation metric
- Content decay (refresh every 60 days)
- The Outlier Method for pre-validated topics

### 5. Update Hashtag Strategy

- Reduce from broad trending hashtags to **niche-specific, high-relevance** tags
- Add new pools: `consulting`, `operations`, `revops`
- Tags should match the 3 core pillars to reinforce semantic consistency
- Keep exactly 5 hashtags but prioritize depth over breadth

### 6. Increase Word Count Target

- Change from 2,500-3,000 words to **3,000-3,500 words** to maximize dwell time
- The 360 Brew algorithm rewards longer educational content that users spend time consuming

## Technical Details
- **File modified**: `supabase/functions/generate-blog/index.ts` — system prompt rewrite, topic restructuring, hashtag pools update, content format update
- **Deployment**: Edge function redeployed after changes
- No database changes needed

