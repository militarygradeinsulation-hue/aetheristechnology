// ============================================================================
// DETERMINISTIC POST WRITERS — 12 distinct editorial archetypes.
// ----------------------------------------------------------------------------
// These are NOT one template with variable substitution. Each writer has its
// own opening move, cadence, length, argument shape and call to action. Every
// writer is handed its own evidence anchor drawn from the report so no two
// posts reuse the same factual bundle.
//
// Roles are editorial only. They are never printed in public copy.
// ============================================================================

import { stripDashes } from "./no-dashes.ts";

export type PostRole =
  | "executive_observation"
  | "buyer_problem"
  | "myth_correction"
  | "evidence_insight"
  | "process_explanation"
  | "practical_checklist"
  | "objection_response"
  | "operator_perspective"
  | "before_after"
  | "proof_credibility"
  | "offer_education"
  | "direct_next_step";

export const POST_ROLES: PostRole[] = [
  "executive_observation",
  "buyer_problem",
  "myth_correction",
  "evidence_insight",
  "process_explanation",
  "practical_checklist",
  "objection_response",
  "operator_perspective",
  "before_after",
  "proof_credibility",
  "offer_education",
  "direct_next_step",
];

/** One post's private evidence anchor. No two posts share the same bundle. */
export type PostEvidence = {
  /** Finding / leak title this post owns. */
  leak: string;
  /** A concrete observation traceable to the report. */
  detail: string;
  /** The action the report already prescribes for this finding. */
  action: string;
};

export type WriterContext = {
  name: string;
  site: string;
  ev: PostEvidence;
  index: number;
};

export type WrittenPost = {
  role: PostRole;
  hook: string;
  body: string;
  cta: string;
  visual: string;
  takeaway: string;
};

const c = (s: string) => stripDashes(String(s || "").replace(/\s+/g, " ").trim());

/** Trim a sentence-ish fragment so it can be embedded mid sentence. */
function frag(s: string, max = 190): string {
  let t = c(s).replace(/^[^A-Za-z0-9$]+/, "");
  if (t.length > max) t = t.slice(0, max).replace(/\s+\S*$/, "");
  return t.replace(/[.\s]+$/, "");
}

function lower(s: string): string {
  const t = c(s);
  return /^[A-Z]{2,}/.test(t) ? t : t.charAt(0).toLowerCase() + t.slice(1);
}

/* ─────────────────────────── the twelve writers ──────────────────────── */

const WRITERS: Record<PostRole, (x: WriterContext) => Omit<WrittenPost, "role">> = {
  executive_observation: ({ name, ev }) => ({
    hook: c(`${ev.leak}: the finding most owners at ${name} would never see from the inside.`),
    body: c(
      `Owners rarely lose revenue in obvious places. It leaves quietly, through the parts of the business nobody re reads.
The forensic review of ${name} recorded this: ${frag(ev.detail)}.
That is not a branding opinion. It is an observation about what a buyer meets before anyone at ${name} gets to speak.
The correction on the record is straightforward: ${lower(frag(ev.action))}.
Fixing it does not need a rebuild. It needs a decision.`,
    ),
    cta: c(`Want the same review run on your business? Ask for the forensic diagnostic.`),
    visual: "Single line of the finding set in large type on a dark field.",
    takeaway: c(`Decide this week who owns ${lower(ev.leak)}.`),
  }),

  buyer_problem: ({ name, ev }) => ({
    hook: c(`Your buyer already made a judgement. You just were not there for it.`),
    body: c(
      `Picture the person deciding whether to contact ${name}. They arrive with a question and a limited amount of patience.
What the review found in their path: ${frag(ev.detail)}.
The buyer does not report that. They leave, and the loss looks like a slow month rather than a fixable defect.
The prescribed repair is ${lower(frag(ev.action))}.
Run that and the same visitor gets to a decision instead of an exit.`,
    ),
    cta: `Walk one buyer path today and write down where you hesitate.`,
    visual: "Simple path graphic showing where the visitor stalls.",
    takeaway: `Fix the first hesitation point before adding traffic.`,
  }),

  myth_correction: ({ name, ev }) => ({
    hook: c(`More traffic will not solve ${lower(ev.leak)}.`),
    body: c(
      `The common instinct is to buy attention. Spend more, post more, chase more. That instinct is expensive when the defect sits after the click.
Evidence from the ${name} review: ${frag(ev.detail)}.
Send ten times the traffic into that and you multiply the leak instead of the revenue.
Order of operations matters. Repair first: ${lower(frag(ev.action))}. Then scale spend into something that holds.`,
    ),
    cta: `Before your next ad budget, audit what happens after the click.`,
    visual: "Two arrows, one funnelling into a sealed pipe, one into a leaking one.",
    takeaway: `Repair conversion before increasing spend.`,
  }),

  evidence_insight: ({ name, ev, site }) => ({
    hook: c(`One line from the ${name} findings file.`),
    body: c(
      `Reviews are only useful when they are specific. Here is a specific one.
Recorded under ${ev.leak}: ${frag(ev.detail)}.
Read that as a buyer, not as an owner. It changes what the sentence means.
The file also carries the remedy: ${lower(frag(ev.action))}.
Evidence, implication, action. That is the whole loop, and most businesses never close it${site ? "" : ""}.`,
    ),
    cta: `Ask for the finding that applies to your own front door.`,
    visual: "Case file card with the finding label and a single evidence line.",
    takeaway: `Attach every observation to one action with a name on it.`,
  }),

  process_explanation: ({ name, ev }) => ({
    hook: `How a finding like this actually gets diagnosed.`,
    body: c(
      `The method is boring on purpose. Crawl the public surface, capture what a buyer meets, compare that against what the business claims it delivers, then price the distance between them.
Applied to ${name}, that method surfaced ${lower(ev.leak)}, with this on the record: ${frag(ev.detail)}.
No guessing, no persona workshop, no opinion round.
Each finding leaves with an owner and a next move. For this one, that move is ${lower(frag(ev.action))}.`,
    ),
    cta: `See the method before you buy anything: read the diagnostic breakdown.`,
    visual: "Four step method strip with the third step highlighted.",
    takeaway: `Diagnosis before prescription, always.`,
  }),

  practical_checklist: ({ name, ev }) => ({
    hook: c(`Four checks that expose ${lower(ev.leak)} in an afternoon.`),
    body: c(
      `One. Open your own site on a phone, cold, with no context, and time how long it takes to learn what you sell.
Two. Ask a person outside the business to name your offer after thirty seconds.
Three. Compare their answer against what ${name} actually wants to sell.
Four. Check the exact issue the review flagged: ${frag(ev.detail)}.
If any check fails, you already know the first job: ${lower(frag(ev.action))}.`,
    ),
    cta: `Run all four checks this week and log what breaks.`,
    visual: "Numbered checklist card, four rows, one ticked.",
    takeaway: `A failed thirty second test is a revenue problem, not a design problem.`,
  }),

  objection_response: ({ name, ev }) => ({
    hook: `"We are busy enough, this can wait."`,
    body: c(
      `Fair objection. Busy quarters hide defects well, and nothing here is on fire.
The trouble is that ${lower(ev.leak)} does not bill you in a lump. It bills you quietly, in the deals that never announce themselves.
The ${name} record shows ${frag(ev.detail)}.
Waiting is a choice to keep paying that invoice.
The cheapest version of this fix is available now: ${lower(frag(ev.action))}. It gets more expensive once demand slows and you need every visitor to convert.`,
    ),
    cta: `If it can wait, put a date on it. Then keep the date.`,
    visual: "Calendar page with one circled date and nothing else.",
    takeaway: `Deferred repairs are still purchases.`,
  }),

  operator_perspective: ({ name, ev }) => ({
    hook: `The part of the business nobody was assigned.`,
    body: c(
      `Most of these findings are not competence failures. They are ownership gaps. A page gets written once, ships, and then belongs to nobody.
That is the shape of what surfaced at ${name} under ${lower(ev.leak)}: ${frag(ev.detail)}.
An operator does not fix that with a campaign. They put one name against it and a date next to the name.
Assignment first, then the work itself: ${lower(frag(ev.action))}.`,
    ),
    cta: `Name the owner of your front door before Friday.`,
    visual: "Org style card with one role highlighted and one blank slot.",
    takeaway: `Unowned surfaces decay by default.`,
  }),

  before_after: ({ name, ev }) => ({
    hook: c(`Before and after, on one finding.`),
    body: c(
      `Before: ${frag(ev.detail)}. A visitor carries their own question out of the building because nothing answered it.
After: ${lower(frag(ev.action))}. The same visitor gets the answer in the place they were already looking.
Nothing about ${name} changed except the order and clarity of what was already true.
That is what most of this work is. Not reinvention. Removing the reasons a buyer stops.`,
    ),
    cta: `Pick one page and write its after state today.`,
    visual: "Split frame, cluttered left, resolved right.",
    takeaway: `Clarity is a rewrite, not a rebrand.`,
  }),

  proof_credibility: ({ name, ev }) => ({
    hook: `Findings beat adjectives.`,
    body: c(
      `Any firm can call itself thorough. Fewer will hand you the file.
The ${name} review lists each finding with what was observed, why it costs, and what to do. This entry sits under ${ev.leak}: ${frag(ev.detail)}.
Every claim carries its source, and anything unverified is marked as unverified rather than dressed up.
That is the standard the work is held to, including the fix on this one: ${lower(frag(ev.action))}.`,
    ),
    cta: `Ask to see a real finding before you hire anyone, including us.`,
    visual: "Report page detail with the evidence label visible.",
    takeaway: `If it has no source, it is not a finding.`,
  }),

  offer_education: ({ name, ev }) => ({
    hook: `What a forensic diagnostic actually hands you.`,
    body: c(
      `Not a slide deck. A findings file with owners, actions and a repair order.
For ${name} that file includes ${lower(ev.leak)}, recorded as ${frag(ev.detail)}, along with the exact next move: ${lower(frag(ev.action))}.
It also carries the growth package, so the same findings turn into imagery direction, publishable posts and a thirty day cadence.
You end with a corrected front door and something to say once it works.`,
    ),
    cta: `Start with the free scan and see your own findings first.`,
    visual: "Deliverable stack shown as three labelled cards.",
    takeaway: `Buy a diagnosis, not a promise.`,
  }),

  direct_next_step: ({ name, ev }) => ({
    hook: `One move. This week.`,
    body: c(
      `Skip the strategy conversation for a moment.
Take the single finding recorded against ${lower(ev.leak)} at ${name}: ${frag(ev.detail)}.
Do this: ${lower(frag(ev.action))}.
Give it an owner, a deadline and a way to tell whether it worked, which usually means counting enquiries the week before and the week after.
If that number moves, you have found where the rest of the work should go.`,
    ),
    cta: `Reply with your site and we will name your first move.`,
    visual: "Bold single instruction on a plain background.",
    takeaway: `Measure the week before and the week after.`,
  }),
};

/** Write one post for a role using its own private evidence anchor. */
export function writePost(role: PostRole, ctx: WriterContext): WrittenPost {
  const w = WRITERS[role](ctx);
  return { role, ...w, hook: c(w.hook), body: c(w.body), cta: c(w.cta) };
}

/** The full deterministic set: 12 archetypes, 12 distinct evidence anchors. */
export function writeAllPosts(name: string, site: string, evidence: PostEvidence[]): WrittenPost[] {
  return POST_ROLES.map((role, i) =>
    writePost(role, { name, site, index: i, ev: evidence[i % Math.max(1, evidence.length)] }),
  );
}

/* ───────────────────── reserve family (second twelve) ────────────────── */
//
// When a report's own evidence forces primary posts to be dropped (raw URLs in
// the source sentence, duplicated findings, thin chapters), the set must still
// ship twelve substantive posts. These twelve writers are a genuinely separate
// editorial family: different openings, different argument shapes, different
// calls to action. They are refill, never padding, and each one still argues
// from its own evidence anchor.

const RESERVE_WRITERS: Array<(x: WriterContext) => Omit<WrittenPost, "role">> = [
  ({ name, ev }) => ({
    hook: c(`A quiet cost hides inside ${lower(ev.leak)} at ${name}.`),
    body: c(
      `Costs that announce themselves get fixed. This one does not announce itself, which is exactly why it survives quarter after quarter.
The record reads: ${frag(ev.detail)}.
Nobody wakes up to an alert about that. It shows up later as a softer month with no obvious explanation.
What closes it: ${lower(frag(ev.action))}.`,
    ),
    cta: `Put a number on your quietest cost this quarter.`,
    visual: "Flat line chart with one small unlabelled dip.",
    takeaway: `Silent costs need a scheduled review, not an alert.`,
  }),
  ({ name, ev }) => ({
    hook: `Ask a stranger, not your team.`,
    body: c(
      `Internal review always flatters the business, because everyone reviewing it already knows the answer.
Hand a stranger the same surface and the picture changes. That is how this surfaced at ${name}: ${frag(ev.detail)}.
Nobody inside had to be wrong for that to be true. They were simply too close to see it.
The correction is small and specific: ${lower(frag(ev.action))}.`,
    ),
    cta: `Get one outsider to review your front door this month.`,
    visual: "Two viewers looking at the same screen from opposite sides.",
    takeaway: `Familiarity is the most expensive bias in the building.`,
  }),
  ({ name, ev }) => ({
    hook: c(`The cheapest week to fix ${lower(ev.leak)} was last year.`),
    body: c(
      `Every month this stays open, the repair gets slightly more expensive, because more of the business gets built on top of it.
At ${name} the finding stands as ${frag(ev.detail)}.
That is not a crisis. It is compound interest, charged in missed enquiries rather than dollars on a statement.
The move on file is ${lower(frag(ev.action))}, and it costs the same today as it will cost after you argue about it.`,
    ),
    cta: `Schedule the repair before you schedule the debate.`,
    visual: "Rising step chart with the first step circled.",
    takeaway: `Delay is the only line item that grows on its own.`,
  }),
  ({ name, ev }) => ({
    hook: `Read your own page out loud.`,
    body: c(
      `Try it once. Read the page a buyer lands on out loud, at normal speed, and stop wherever you have to explain something.
Every stop is a place the buyer had no one to ask. That is the mechanism behind what the review logged at ${name}: ${frag(ev.detail)}.
The page does not have to be clever. It has to answer the question in the order the question arrives.
Start here: ${lower(frag(ev.action))}.`,
    ),
    cta: `Read one page aloud today and mark every stop.`,
    visual: "Page mock with three highlighted pause markers.",
    takeaway: `Wherever you explain, the page failed.`,
  }),
  ({ name, ev }) => ({
    hook: c(`What ${name} says and what a buyer receives are two different things.`),
    body: c(
      `A business describes itself from the inside. A buyer experiences it from the outside, with no context and no patience.
The distance between those two views is where the finding sits: ${frag(ev.detail)}.
Closing that distance is not marketing. It is accuracy.
The step recorded against it: ${lower(frag(ev.action))}.`,
    ),
    cta: `Compare your claim against your buyer's actual first minute.`,
    visual: "Two panels, claim on one side, experience on the other.",
    takeaway: `Measure the gap between claim and experience.`,
  }),
  ({ name, ev }) => ({
    hook: `Small defect, wide blast radius.`,
    body: c(
      `Findings are rarely isolated. One unclear surface bends everything downstream of it, including the leads your team judges as low quality.
The entry from ${name} reads: ${frag(ev.detail)}.
Sales then works harder on enquiries that arrived confused, and the confusion gets blamed on the market.
Repair upstream instead: ${lower(frag(ev.action))}.`,
    ),
    cta: `Trace one bad lead back to the page that produced it.`,
    visual: "Single crack spreading across a pane.",
    takeaway: `Lead quality is usually a page problem.`,
  }),
  ({ name, ev }) => ({
    hook: `Nobody is coming to tell you.`,
    body: c(
      `Buyers do not file complaints about friction. They pick the option that asked less of them and never mention it.
So a finding like the one at ${name} can run for years without a single piece of feedback: ${frag(ev.detail)}.
Absence of complaints is not evidence of health. It is the expected symptom.
The prescribed action: ${lower(frag(ev.action))}.`,
    ),
    cta: `Stop waiting for feedback and go look yourself.`,
    visual: "Empty inbox with one unread item.",
    takeaway: `No complaints is not a signal of health.`,
  }),
  ({ name, ev }) => ({
    hook: `Thirty minutes, one owner, done.`,
    body: c(
      `Some findings need a project. This one needs a calendar slot and a decision.
At ${name}, the item is ${frag(ev.detail)}.
Block half an hour, put a single name on it, and finish it in that window rather than adding it to a roadmap where it will age.
The instruction is already written: ${lower(frag(ev.action))}.`,
    ),
    cta: `Book the half hour now while it is still small.`,
    visual: "Single calendar block with a name on it.",
    takeaway: `Small fixes die on roadmaps.`,
  }),
  ({ name, ev }) => ({
    hook: `Where the review stopped guessing.`,
    body: c(
      `An opinion says a business could communicate better. A finding says what was observed, where, and what it costs to leave alone.
This is the observed version for ${name}: ${frag(ev.detail)}.
No persona exercise produced that. It came from looking at the same surface a buyer sees.
Which is why the next move can be this concrete: ${lower(frag(ev.action))}.`,
    ),
    cta: `Demand observations, not adjectives, from any review you buy.`,
    visual: "Magnifier over a single line of copy.",
    takeaway: `Observation beats opinion every time.`,
  }),
  ({ name, ev }) => ({
    hook: c(`If nothing changes, here is what continues.`),
    body: c(
      `Forecasting is easy when the mechanism is already running.
Leave ${lower(ev.leak)} exactly as it is at ${name} and the same thing keeps happening: ${frag(ev.detail)}.
Same buyers, same hesitation, same unexplained gap between traffic and enquiries.
The alternative is one decision: ${lower(frag(ev.action))}.`,
    ),
    cta: `Choose the version of next quarter you actually want.`,
    visual: "Two forked paths, one unchanged, one corrected.",
    takeaway: `Doing nothing is also a forecast.`,
  }),
  ({ name, ev }) => ({
    hook: `The order of repairs matters more than the list.`,
    body: c(
      `Every business already has a list. Lists do not fix anything, sequence does.
For ${name} this item earns an early slot because of what was recorded: ${frag(ev.detail)}.
Handled first, it makes the later work measurable, since you can finally tell whether a change moved anything.
Its instruction stands as ${lower(frag(ev.action))}.`,
    ),
    cta: `Reorder your fix list by leverage, not by effort.`,
    visual: "Ordered list with the top row highlighted.",
    takeaway: `Sequence beats volume on any fix list.`,
  }),
  ({ name, ev }) => ({
    hook: `Count enquiries before and after. That is the whole test.`,
    body: c(
      `Proof does not require analytics maturity. It requires a count taken twice.
Take the finding at ${name}: ${frag(ev.detail)}.
Record enquiries for the week before the change and the week after, under the same conditions, and let the difference argue for itself.
Make the change first: ${lower(frag(ev.action))}.`,
    ),
    cta: `Start counting this week so the next change can be judged.`,
    visual: "Two tally marks side by side, one larger.",
    takeaway: `Two counts beat one dashboard.`,
  }),
];

/**
 * The reserve twelve. Same evidence discipline, different editorial family.
 * Used only to refill a set that lost primary posts to the quality gate.
 */
export function writeReservePosts(name: string, site: string, evidence: PostEvidence[]): WrittenPost[] {
  return RESERVE_WRITERS.map((w, i) => {
    const ev = evidence[i % Math.max(1, evidence.length)];
    const out = w({ name, site, index: i, ev });
    return {
      role: POST_ROLES[i % POST_ROLES.length],
      ...out,
      hook: c(out.hook),
      body: c(out.body),
      cta: c(out.cta),
    };
  });
}

