

# Expand Platform to Three Industries: Playground, Interior Design, and Home Building

## Overview

Transform the site from a playground-only focus into a multi-industry AI platform serving three verticals: **Playground Safety**, **Interior Design**, and **Home Building**. The Triple-AI architecture (Safety/Analysis AI, Marketing AI, Creative AI) stays the same but is reframed to serve all three industries.

---

## Branding Update

**Current**: "PlaySafe AI — By Aetheris Technology" (playground only)
**New**: "Aetheris AI — By Aetheris Technology" (multi-industry platform)

**New tagline**: "Triple-AI for the Industries That Build Our World"

The three AI layers now map across industries:
- **Analysis AI** (was Safety AI): Playground hazard detection, interior design space analysis, home building inspection
- **Marketing AI**: Content and lead generation for all three industries
- **Creative AI**: Playground renderings, interior design visualizations, home building concept art

---

## Files to Modify

### 1. `src/components/Navbar.tsx`
- Rename "PlaySafe AI" to "Aetheris AI"
- Update nav items: Replace "Safety Science" with "Industries" dropdown concept
- Keep "AI Platform", "Services", "Blog", "About"

### 2. `src/components/Hero.tsx`
- Update headline from playground-specific to multi-industry
- New headline: "Three AI Engines. Three Industries. Unlimited Potential."
- Update value prop to mention playground, interior design, and home building
- Update stats to be industry-agnostic (e.g., "3 Industries Served", "95%+ Accuracy", "3 AI Layers", "48hr Turnaround")
- Remove ASTM-specific trust indicator, replace with broader one

### 3. `src/components/AILayers.tsx`
- Update the three layer cards:
  - **Analysis AI**: Mention photo analysis for playgrounds (hazard detection), interiors (space planning), and homes (inspection)
  - **Marketing AI**: Content for playground companies, interior designers, home builders
  - **Creative AI**: Playground renderings, room visualizations, home concept art
- Update headline: "The First Triple-AI Platform Built for Design, Safety, and Construction"

### 4. `src/components/ThePitch.tsx`
- Broaden each card's messaging:
  - "It Sees Hidden Details" (playground hazards, design flaws, construction issues)
  - "It Measures What Matters" (safety metrics, space dimensions, build specs)
  - "It Predicts Before Problems" (surface wear, design trends, construction delays)
  - "It Creates What You Need" (renderings for all three industries)
  - "It Remembers Everything" (compliance, project history, client records)
- Update closing CTA to reference all three industries

### 5. `src/components/Services.tsx`
- Restructure services into three industry tabs or sections:
  - **Playground Industry**: AI Photo Safety Scan, Impact Monitoring, Compliance Dashboard
  - **Interior Design Industry**: AI Space Analysis, Style Matching, Client Visualization, Material Recommendations
  - **Home Building Industry**: AI Inspection, Project Timeline Prediction, Quality Assessment, Code Compliance
- Update "Industries We Serve" section to show three primary verticals with sub-segments:
  - Playground: Municipal Parks, Schools, Childcare, HOAs, Churches
  - Interior Design: Residential Designers, Commercial Spaces, Staging Companies, Renovation Firms
  - Home Building: Custom Builders, Developers, Remodelers, Contractors

### 6. `src/components/AutonomousWorkforce.tsx`
- Rename to "The Aetheris AI Platform"
- Update features to span all three industries
- Update "How It Works" to be industry-agnostic: Upload -> Analyze -> Report -> Optimize

### 7. `src/pages/AIPlatformPage.tsx`
- Update hero and sections to reference all three industries
- "AI That Sees" - photo analysis across playground, interior, and home building
- "AI That Creates" - renderings for all three verticals
- "AI That Grows Your Business" - marketing for all three industries
- "AI That Learns" - predictive analytics across verticals
- Update stats and competitive advantage messaging

### 8. `src/components/Footer.tsx`
- Rename "PlaySafe AI" to "Aetheris AI"
- Update description to mention all three industries
- Replace "Standards & Compliance" with "Industries" listing all three
- Keep ASTM under a sub-item for playground

### 9. `src/components/PlaygroundImageGenerator.tsx`
- Rename to more generic or add industry selector (playground rendering, interior design visualization, home concept)
- Update type options to include all three industries

### 10. `supabase/functions/generate-playground-image/index.ts`
- Update prompts to handle interior design and home building image types in addition to playground

### 11. `src/pages/SafetySciencePage.tsx`
- Keep as-is but frame as one of three industry verticals (playground-specific deep dive)

---

## New Content by Industry

### Playground Industry (existing, refined)
- Safety inspections, ASTM/CPSC compliance, hazard detection, surface monitoring

### Interior Design Industry (new)
- AI space analysis from photos (room dimensions, lighting, flow)
- Style matching and mood board generation
- Client visualization renderings
- Material and color palette recommendations
- Marketing content for interior design firms

### Home Building Industry (new)
- AI construction inspection from photos
- Project timeline prediction and delay alerts
- Quality assessment and code compliance checks
- Concept renderings for client presentations
- Marketing content for builders and contractors

---

## Technical Notes

- No new dependencies needed
- No new edge functions needed (existing `generate-playground-image` will be expanded to handle all three industry types)
- No database changes required
- All changes are frontend content/messaging updates plus minor edge function prompt updates
- Approximately 10 files modified, 0 new files created

