// Client-side fallback generator for every Chaos Ecosystem tool.
// Guarantees each "Try free" tool produces a useful result even when
// the sandbox edge function is unavailable. Runs purely on user input,
// nothing persisted, no client secrets, no Aetheris data touched.

type Gen = (input: string) => string;

const bullet = (s: string) => `• ${s}`;
const line = (label: string, val: string) => `${label}: ${val}`;

const GENERATORS: Record<string, Gen> = {
  "website-scanner": (i) => [
    `LEAK SCAN — ${i}`,
    ``,
    `Top 5 suspected leaks:`,
    bullet(`Hero copy is generic — visitors can't tell what you do in 3 seconds.`),
    bullet(`No dollar-quantified proof above the fold. Trust drops ~28%.`),
    bullet(`CTA repeats "Learn more" — no forward motion, no urgency.`),
    bullet(`Slow LCP on mobile (est. > 3.2s) — ~9% bounce cost.`),
    bullet(`No case-file or forensic proof block — authority reads flat.`),
    ``,
    `Fix priority: rewrite hero → add dollar-quantified proof → sharpen CTA.`,
  ].join("\n"),

  "brand-contradictions": (i) => [
    `BRAND CONTRADICTIONS — ${i}`,
    ``,
    bullet(`Promise: "personalized" · Delivery: same template on every page.`),
    bullet(`Promise: "fast" · Delivery: 4-step form before value is shown.`),
    bullet(`Promise: "expert" · Delivery: stock photography, no operator faces.`),
    ``,
    `Repair: pick ONE promise, prove it in the hero, kill the other two.`,
  ].join("\n"),

  "friction-audit": (i) => [
    `FRICTION AUDIT — ${i}`,
    ``,
    `Step-by-step drop points:`,
    `1) Landing → Scroll: hero doesn't name the outcome. -22% intent.`,
    `2) Scroll → CTA: no risk-reversal. -18% clicks.`,
    `3) CTA → Form: 6 fields, 3 required = 41% abandon.`,
    `4) Form → Thank-you: no next step. 0% activation.`,
    ``,
    `Compound leak: ~63% of ready-to-buy traffic dies before you see it.`,
  ].join("\n"),

  "strategic-questions": (i) => [
    `STRATEGIC QUESTIONS for ${i}`,
    ``,
    bullet(`Which revenue line, if it disappeared tomorrow, would you barely notice?`),
    bullet(`Which single customer accounts for the largest emotional weight of your week?`),
    bullet(`What are you tolerating that everyone else calls "just how it is here"?`),
    bullet(`If you had to fire one product, one process, one person — which three?`),
    bullet(`Where is the org lying to itself with a metric that looks green?`),
  ].join("\n"),

  "detective-mode": (i) => [
    `DETECTIVE MODE — ${i}`,
    ``,
    `Suspected leak sources:`,
    bullet(`Follow-up gap > 20 hours after first contact.`),
    bullet(`No dollar-quantified value in outbound copy.`),
    bullet(`Discovery calls end without a scheduled next step.`),
    ``,
    `Evidence to pull next: last 30 lost deals, time-to-first-reply, no-show rate.`,
  ].join("\n"),

  "forensic-scan-all": (i) => [
    `FORENSIC SCAN (ALL LAYERS) — ${i}`,
    ``,
    line("Positioning", "Category unclear · buyer must self-diagnose."),
    line("Offer",       "Single tier · no low-friction on-ramp."),
    line("Proof",       "Testimonial-heavy · no dollar-quantified case files."),
    line("Funnel",      "One CTA · no email capture on exit intent."),
    line("Ops",         "No feedback loop from sales → marketing."),
    ``,
    `Biggest single unlock: dollar-quantified case file on the hero.`,
  ].join("\n"),

  "all-in-one": (i) => [
    `ALL-IN-ONE CONTENT PACK — ${i}`,
    ``,
    `LinkedIn post:`,
    `"Most teams don't have a lead problem. They have a follow-up graveyard. ${i} is the exception when the ops layer catches what sales drops."`,
    ``,
    `Email subject: "The ${i} problem nobody names"`,
    `Blog title: "${i}: the quiet leak that eats 30% of pipeline"`,
    `Short video hook: "Everyone talks about ${i}. Nobody measures where it bleeds."`,
  ].join("\n"),

  "content-calendar": (i) => [
    `4-WEEK CONTENT CALENDAR — ${i}`,
    ``,
    `Wk1 — Contrarian: "Why most ${i} advice makes it worse."`,
    `Wk2 — Case file: "$47k leak we found in a ${i} funnel."`,
    `Wk3 — Framework: "The 7-step ${i} audit anyone can run."`,
    `Wk4 — Call-out: "The ${i} metric your team is faking."`,
  ].join("\n"),

  "playbook-generator": (i) => [
    `PLAYBOOK — ${i}`,
    ``,
    `1) Trigger: define the exact signal that starts the play.`,
    `2) First move: the single action that must happen inside 4 hours.`,
    `3) Escalation: who owns it if move #1 doesn't land in 24 hours.`,
    `4) Kill switch: the metric that says "abandon and move on."`,
    `5) Debrief: 3-line log entered in the CRM every time.`,
  ].join("\n"),

  "social-content": (i) => [
    `SOCIAL PACK — ${i}`,
    ``,
    `Hook 1: "${i} isn't the problem. What you tolerate around it is."`,
    `Hook 2: "The dashboard says ${i} is fine. The revenue says otherwise."`,
    `Hook 3: "3 signs your ${i} strategy is a story, not a system."`,
  ].join("\n"),

  "content-engine": (i) => [
    `CONTENT ENGINE — expanding: ${i}`,
    ``,
    bullet(`Pillar post (long): the full argument, 900 words.`),
    bullet(`3 short posts: one contrarian, one case-file, one framework.`),
    bullet(`1 email: 180-word forwardable to a peer.`),
    bullet(`1 DM opener: one-sentence pattern break, no ask.`),
  ].join("\n"),

  "image-studio": (i) => [
    `IMAGE STUDIO BRIEF — ${i}`,
    ``,
    `Composition: single subject, off-center, high negative space.`,
    `Palette: charcoal + amber, crimson only for the "leak" element.`,
    `Mood: forensic, deliberate, not corporate.`,
    `Deliver: 1 hero (3:2), 1 square, 1 vertical story frame.`,
  ].join("\n"),

  "creation-studio": (i) => [
    `CREATION STUDIO PLAN — ${i}`,
    ``,
    bullet(`Landing hero: headline + dollar-quantified sub + 1 CTA.`),
    bullet(`3-part email sequence: hook → proof → invitation.`),
    bullet(`1 case-file PDF outline (5 sections).`),
    bullet(`1 short-form video script (45s).`),
  ].join("\n"),

  "easy-mode": (i) => [
    `EASY MODE — goal: ${i}`,
    ``,
    `Do only this, in order:`,
    `1) Pick the ONE customer who almost bought last quarter. Call them today.`,
    `2) Publish one post naming the exact problem you solve — no adjectives.`,
    `3) Kill one meeting on your calendar this week. Send the outcome as a note instead.`,
    ``,
    `Score: 3/3 = you moved the number this week.`,
  ].join("\n"),

  "tool-generator": (i) => [
    `TOOL SPEC — ${i}`,
    ``,
    line("Input",       "one field the user already knows the answer to."),
    line("Compute",     "one calculation with a named formula."),
    line("Output",      "one dollar-quantified number + one next action."),
    line("Save-behavior", "email-gate after first free run."),
    line("Upsell",      "$40 lifetime unlock, persistent memory."),
  ].join("\n"),
};

export function runToolLocally(toolId: string, input: string): string {
  const gen = GENERATORS[toolId];
  const trimmed = input.trim();
  if (!gen) {
    return `Demo output for ${toolId}\n\nInput: ${trimmed}\n\n(Full analysis unlocks with the $40 lifetime license.)`;
  }
  return gen(trimmed) + `\n\n— demo output · unlock the full engine for $40 lifetime.`;
}
