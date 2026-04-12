

# Pivot Blog Engine to Playground & Recreation Industry

## Overview
Rewrite the `generate-blog` edge function's topic pools, hashtag pools, frameworks, strategic data, and system prompt to produce raw, blunt, industry-specific content about the commercial playground and recreation equipment industry — covering market insights, growth patterns, emerging markets, common failures, and digital positioning gaps.

## What Changes

### 1. Replace Hashtag Pools
Swap the 3 generic consulting pools for recreation-industry-specific ones:
- **Industry & Market**: `PlaygroundIndustry`, `RecreationBusiness`, `CommercialPlayground`, `OutdoorRecreation`, `PlayEquipment`, `RecreationDesign`, `InclusivePlay`, `PlaygroundSafety`, `ParkDesign`, `CommunityRecreation`
- **Sales & Digital**: `B2BMarketing`, `HighTicketSales`, `LuxuryBranding`, `WebDesignFail`, `CRMAutomation`, `DigitalBrandMakeover`, `SalesAutomation`, `LeadConversion`, `RecreationMarketing`
- **Growth & Trends**: `EmergingMarkets`, `PlaygroundTrends`, `InclusiveDesign`, `NaturePlay`, `FitnessPlayground`, `ADACompliance`, `SmartPlayground`, `SeniorFitness`, `WaterPlay`, `IndoorPlayground`

### 2. Replace Topics with Recreation Industry Angles
New topic categories with raw, blunt angles:

**Category: Playground Industry Market Intelligence**
- "The commercial playground market hit $14B globally and most manufacturers still sell like it's 2005 — static catalogs, dead websites, zero follow-up"
- "Indoor playground franchises are exploding at 12% CAGR while traditional manufacturers fight over the same municipal RFPs"
- "Nature play and adventure playgrounds are the fastest-growing segment and 90% of companies can't even explain what they sell"
- "The inclusive play equipment mandate is a $2B opportunity most companies are treating as a compliance checkbox"
- "Senior fitness parks are a $500M emerging market and nobody in the playground industry is talking about it"
- "Water play installations generate 3x the revenue per project of traditional playgrounds — yet most companies don't even list them"

**Category: Digital Failures in Recreation**
- "Your playground company website looks like it was built in 2012 because it was — and your premium products suffer for it"
- "You sell $200K custom playground systems but your social media looks like a daycare newsletter"
- "Your competitors are winning $500K municipal contracts because their website has 3D renderings and yours has blurry JPEGs from 2018"
- "Recreation companies spending $8K/month on trade shows while their Google listing has 2 reviews and wrong hours"
- "You have a $50K product line and zero email sequences — every lead that doesn't buy in 48 hours is gone forever"

**Category: Growth & Emerging Markets**
- "Smart playgrounds with IoT sensors and usage analytics are coming — and they'll make traditional equipment look like typewriters"
- "The Middle East and Southeast Asia are building $100M recreation mega-projects and US manufacturers are asleep"
- "Inclusive play isn't charity — ADA-compliant playground projects average 40% higher budgets than standard installations"
- "Adult fitness playgrounds are the fastest path to recurring municipal revenue and nobody's pitching them"

### 3. Replace Branded Frameworks
New Aetheris frameworks tailored to recreation:
- "The Playground Brand Overhaul™ — A complete digital repositioning: website rebuild, product photography, 3D rendering integration, and social media strategy that makes $200K systems look like $200K systems."
- "The Recreation Revenue Engine™ — CRM automation, lead scoring, and follow-up sequences designed for long-cycle B2B playground sales where one lost deal costs $50K-$500K."
- "The Specification Domination Strategy™ — Getting your products spec'd into architectural plans and municipal RFPs before the bid even opens."
- "The High-Ticket Visual Authority System™ — Why your competitors close bigger deals: their digital presence matches their product quality. Yours doesn't."

### 4. Replace Strategic Intelligence Data
New data block with playground/recreation industry stats: global market size, growth rates, segment breakdowns, digital adoption gaps, municipal procurement trends, inclusive play mandates, and emerging market data.

### 5. Update System Prompt Tone
- Keep the 8-section blog structure
- Change persona from "Co-CEO business consulting" to recreation industry digital strategy authority
- Add explicit tone instructions: "Write like you're telling a playground CEO the uncomfortable truth over whiskey. Raw. Blunt. No corporate speak. Short sentences that hit hard. Use profanity-adjacent language — 'garbage websites', 'throwing money into a bonfire', 'your brochure belongs in a time capsule.' Make every paragraph memorable."
- Update the CTA to reference digital brand makeover and CRM automation for recreation companies
- Update contact block to reflect playground industry positioning

### 6. Update Author Line
Change `author` from `"Aetheris AI Team"` to `"Aetheris AI"` (or keep as-is per preference).

## Technical Detail
**Modified file:** `supabase/functions/generate-blog/index.ts` — full rewrite of `HASHTAG_POOLS`, `TOPICS`, `AETHERIS_FRAMEWORKS`, `STRATEGIC_INTELLIGENCE`, system prompt tone directives, and CTA/contact block. The function structure, AI gateway call, JSON parsing, and database insertion logic remain unchanged.

No database changes needed — the `blog_posts` table schema supports all fields.

