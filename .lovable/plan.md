

## The real bug

All 9 tools are succeeding — the database confirms it. What "didn't work" is the **library viewer renders wrong/empty content** for 3 tools and dumps **raw JSON** for 2 others, because field names in the renderer don't match what the edge functions actually return.

## Fixes — all in `src/components/LibraryItemRenderer.tsx`

### 1. `FollowUpPlanView` — currently empty
Real shape: `{ overview, days[{day, channel, action, template, subject, timing, goal, tips}], objectionResponses[{trigger, response}] }`
- Render the `overview` paragraph at top
- Map over `days` (not `steps`), use `day.action`, `day.template`, `day.subject`, `day.timing`, `day.goal`, `day.tips`
- Add `objectionResponses` section

### 2. `FrictionAuditView` — currently empty
Real shape: `{ frictionScore, overallAssessment, flaggedPhrases[{originalPhrase, category, issue, severity, suggestedReplacement, context}], toneAlignment{currentTone, desiredTone, gap, recommendations}, strongerCTAs[{current, replacement, whyBetter}], topPriorityFixes[], copyStrengths[] }`
- Score gauge + overall assessment header (mirror BrandContradictions style)
- Map `flaggedPhrases` with severity badge, category chip, issue, replacement, context
- Tone alignment card
- Stronger CTAs grid
- Priority fixes + copy strengths lists

### 3. `StrategicQuestionsView` — currently empty
Real shape: `{ companySnapshot, top10CriticalQuestions[{question, category, urgency, whyItMatters}], categories{leadership, sales, marketing, operations, hiringAndPeople, pricingAndOffer, customerJourney, growthAndExpansion}, questionsYouProbablyArentAsking[], leadershipTeamDiscussion[], workshopPrompts[] }`
- Company snapshot intro
- Top 10 critical questions with urgency badges
- Tabbed/sectioned categories (8 buckets)
- "Questions you probably aren't asking" highlight section
- Leadership team discussion + workshop prompts

### 4. NEW `WebsiteScanView` — currently raw JSON dump
Real shape: `{ score, grade, companyName, executiveSummary, gaps[{category, severity, title, description, annualCost, recommendedFix, projectedROI}], roadmap[{month, action, estimatedCost, projectedRecovery}], roiTable[], nextSteps[], competitiveBrief }`
- Reuse the **same visual style as the public `WebsiteScanner.tsx`**: ScoreGauge ring (0–100 + grade), revenue-leak banner, GapCard list (severity icons, annualCost, ROI), roadmap timeline, ROI table, next steps, competitive brief
- Lift simplified versions of `ScoreGauge` and `GapCard` into the renderer file (no Stripe/lock UI — pure read view)

### 5. NEW `WhatsWrongView` — currently raw JSON dump
Real shape: `{ diagnosis, urgentFix, recommendedPackage{name, price, description, whyThisFits}, additionalServices[{name, price, reason}], estimatedRevenueLeak, nextStep }`
- Match the original `WhatsWrongDiagnostic.tsx` results layout: Diagnosis card → "Fix This First" destructive card → revenue leak banner → "Recommended For You" amber card → "Also Consider" list → next-step footer

### 6. Wire both new views into the switch
```ts
case 'website_scan':  return <WebsiteScanView {...props} />;
case 'whats_wrong':   return <WhatsWrongView {...props} />;
```

## Files touched
- `src/components/LibraryItemRenderer.tsx` (only file)

## Out of scope (no edge function or All-In-One changes needed)
- Edge functions are returning correct data
- All-In-One generator is saving everything correctly
- No DB / migration changes

<lov-actions>
<lov-suggestion message="Approved — implement the renderer fixes, then I'll open My Library and click each of the 5 items to verify they all render with proper styled views (no raw JSON, no empty lists).">Approve & implement</lov-suggestion>
<lov-suggestion message="Also update src/lib/generateLibraryPdf.ts so the PDF exports for follow-up plan, friction audit, strategic questions, website scan, and what's wrong include the same full sections as the new library views.">Also fix PDF exports</lov-suggestion>
<lov-suggestion message="Add a 'Re-run this tool' button on each library item detail page that re-invokes the edge function with the original input_data and replaces the saved output.">Add per-item re-run button</lov-suggestion>
</lov-actions>
