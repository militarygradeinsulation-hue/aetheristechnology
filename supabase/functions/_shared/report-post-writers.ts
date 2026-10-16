// Golden Report social posts are authored FOR the scanned company, never as
// Aetheris commentary about that company. Report findings are private planning
// inputs, not claims to publish in the company's voice.
import { stripDashes } from "./no-dashes.ts";

export type PostRole =
  | "executive_observation" | "buyer_problem" | "myth_correction" | "evidence_insight"
  | "process_explanation" | "practical_checklist" | "objection_response"
  | "operator_perspective" | "before_after" | "proof_credibility"
  | "offer_education" | "direct_next_step";

export const POST_ROLES: PostRole[] = [
  "executive_observation", "buyer_problem", "myth_correction", "evidence_insight",
  "process_explanation", "practical_checklist", "objection_response", "operator_perspective",
  "before_after", "proof_credibility", "offer_education", "direct_next_step",
];

export type PostEvidence = { leak: string; detail: string; action: string };
export type WriterContext = { name: string; site: string; ev: PostEvidence; index: number; positioning?: string };
export type WrittenPost = { role: PostRole; hook: string; body: string; cta: string; visual: string; takeaway: string };
const c = (s: string) => stripDashes(String(s || "").replace(/\s+/g, " ").trim());

// Use only observed public positioning, never the report's criticisms or a
// guessed product, customer result, testimonial, team member, or guarantee.
function brandLine(x: WriterContext): string {
  // A long observed positioning sentence is useful once, but repeating the
  // exact sentence across all twelve posts makes the uniqueness gate reject
  // posts 2 through 12 as copied prose. Anchor identity in the first post only.
  if (x.index !== 0) return "";
  const description = c(x.positioning || "").split(/(?<=[.!?])\s+/)[0].slice(0, 220).trim();
  if (description) return description;
  return x.name && x.name !== "this company" ? `We are ${x.name}.` : "";
}
function invite(x: WriterContext): string {
  return x.site ? `Learn more about us at ${x.site}.` : `Send us a message to start a conversation.`;
}

type Draft = Omit<WrittenPost, "role">;
const WRITERS: Record<PostRole, (x: WriterContext) => Draft> = {
  executive_observation: (x) => ({
    hook: "The first question deserves a clear answer.",
    body: `When you first meet a business, you should not have to guess what it does. ${brandLine(x)} If you are looking for a clearer picture before taking the next step, ask us directly. We would rather explain the work in plain language than leave you to read between the lines.`,
    cta: invite(x), visual: "Clear brand statement using the company's own colors.", takeaway: "Make the first conversation clear.",
  }),
  buyer_problem: (x) => ({
    hook: "You should not have to know all the right words to get started.",
    body: `People come to us with different questions. Some know exactly what they need. Others are still figuring out what to ask. Both are welcome. ${brandLine(x)} Tell us what you are trying to do and what is getting in the way. We can start with the situation in front of you, not a script.`,
    cta: "Tell us what you are looking for.", visual: "An approachable first point of contact.", takeaway: "Start with the customer's question.",
  }),
  myth_correction: (x) => ({
    hook: "A polished answer is not always a useful one.",
    body: `Before deciding who to work with, ask what happens after the first conversation. Ask which parts of the work are clear now and which depend on learning more. We believe you should have enough information to make your own decision. ${brandLine(x)} If our approach might fit, let us talk through the details together.`,
    cta: "Ask us how we approach the work.", visual: "One direct question in the brand typography.", takeaway: "Answer the practical question first.",
  }),
  evidence_insight: (x) => ({
    hook: "Here is a better way to start the conversation.",
    body: `Bring the real situation, not the perfect brief. What matters most to you right now? What have you already tried? What would make the next step worthwhile? Those answers tell us more than a form full of buzzwords. ${brandLine(x)} We will listen first and be direct about what we can actually help with.`,
    cta: "Start with your biggest question.", visual: "A short list of customer questions.", takeaway: "Listen before proposing a solution.",
  }),
  process_explanation: (x) => ({
    hook: "What happens when you reach out?",
    body: `First, tell us what you need. Then we can work through the relevant details and explain what a sensible next step could look like. No one benefits when the important questions are skipped. ${brandLine(x)} You should know what is understood, what still needs an answer, and where to go from there.`,
    cta: "Reach out with your question.", visual: "A simple conversation sequence.", takeaway: "Explain the next step in plain language.",
  }),
  practical_checklist: (x) => ({
    hook: "Three things to ask before you decide.",
    body: `What exactly do I need? What information would help me choose? What does the next step involve? Write those down before any conversation. It keeps the discussion grounded in your priorities. ${brandLine(x)} We are happy to talk through those questions with you, even if you are still exploring your options.`,
    cta: "Bring your questions to us.", visual: "Three-item checklist with brand colors.", takeaway: "Help people decide with clarity.",
  }),
  objection_response: (x) => ({
    hook: "Still deciding? That is a reasonable place to be.",
    body: `You do not have to arrive with every detail settled. Tell us what you know, what you are unsure about, and what a good outcome would mean to you. A useful conversation can begin there. ${brandLine(x)} We can explain our approach without pretending every situation is the same.`,
    cta: "Talk through your options with us.", visual: "Quiet, conversational branded portrait or workspace.", takeaway: "Make room for an honest question.",
  }),
  operator_perspective: (x) => ({
    hook: "The details matter more than the pitch.",
    body: `A conversation gets useful when it moves past general promises. Tell us the constraints, the timing, and the questions nobody has answered yet. We will do our best to keep the discussion specific. ${brandLine(x)} That is a better starting point than guessing what you need from a headline alone.`,
    cta: "Share the details that matter to you.", visual: "Real work and materials, not a stock office scene.", takeaway: "Be specific about the customer's situation.",
  }),
  before_after: (x) => ({
    hook: "Before the next step, get the basics straight.",
    body: `It is easy to rush toward a decision while a simple question is still unanswered. Pause. Name what you need to know. Ask how the work would fit your situation. ${brandLine(x)} We would rather have that conversation up front than leave you filling in the blanks afterward.`,
    cta: "Ask us the question you have been holding back.", visual: "A single clear question on an uncluttered field.", takeaway: "Clear up uncertainty before moving ahead.",
  }),
  proof_credibility: (x) => ({
    hook: "You can ask for a clearer explanation.",
    body: `If something we say sounds broad, ask us to be specific. You deserve to understand what we mean and whether it applies to your situation. ${brandLine(x)} We would rather explain the work honestly than ask you to rely on a polished line of copy. A good decision starts with real answers.`,
    cta: "Ask us to explain our approach.", visual: "Brand-led type and a simple real-world detail.", takeaway: "Make claims understandable and checkable.",
  }),
  offer_education: (x) => ({
    hook: "There is no one-size-fits-all first question.",
    body: `Some people want to understand the process. Some want to know if we are a fit. Some are weighing several possible directions. All of those are good reasons to reach out. ${brandLine(x)} Tell us which part matters most to you and we can begin there.`,
    cta: "Choose the question you want to ask us first.", visual: "A clear branded invitation to get in touch.", takeaway: "Let the customer set the first question.",
  }),
  direct_next_step: (x) => ({
    hook: "Start with one honest question.",
    body: `What would you need to know to move forward with confidence? Send us that question. It does not need to be dressed up or turned into a formal brief. ${brandLine(x)} We can talk about your situation, explain what we know, and identify what still needs to be worked out.`,
    cta: "Send us your question.", visual: "One question set in the company's brand typography.", takeaway: "Invite a direct, useful conversation.",
  }),
};

export function writePost(role: PostRole, ctx: WriterContext): WrittenPost {
  const draft = WRITERS[role](ctx);
  return { role, hook: c(draft.hook), body: c(draft.body), cta: c(draft.cta), visual: c(draft.visual), takeaway: c(draft.takeaway) };
}

export function writeAllPosts(name: string, site: string, evidence: PostEvidence[], positioning = ""): WrittenPost[] {
  return POST_ROLES.map((role, i) => writePost(role, { name, site, positioning, index: i, ev: evidence[i % Math.max(1, evidence.length)] }));
}

// Distinct reserve posts when an AI candidate fails uniqueness or voice checks.
export function writeReservePosts(name: string, site: string, evidence: PostEvidence[], positioning = ""): WrittenPost[] {
  const themes: Array<{ hook: string; body: string; cta: string; visual: string; takeaway: string }> = [
    {
      hook: "Define the finish line before the work begins.",
      body: "A useful first step is to write down what a successful outcome would look like in plain terms. Not a slogan. Not a list of features. Name the change you expect to see and the evidence that would make you believe it happened. We use that definition to keep the work focused.",
      cta: "Ask us how we would define success.",
      visual: "A simple outcome statement beside a measurable checkpoint.",
      takeaway: "Agree on the outcome before discussing tactics.",
    },
    {
      hook: "Compare decisions, not presentations.",
      body: "If you are weighing several options, build a short comparison around the things that affect the decision: scope, responsibility, timing, evidence, and what happens when something changes. A polished presentation can hide weak ownership. A clear comparison makes tradeoffs visible before they become expensive.",
      cta: "Bring us the options you are comparing.",
      visual: "A clean comparison grid with five decision criteria.",
      takeaway: "Make tradeoffs visible before choosing.",
    },
    {
      hook: "Timing changes the right answer.",
      body: "A project that must move this month is a different problem from one that can be tested over a quarter. Tell us what deadline is real, what can move, and what cannot. That changes sequencing, staffing, and how much certainty is required before the first action.",
      cta: "Tell us the deadline that actually matters.",
      visual: "A restrained timeline showing fixed and flexible milestones.",
      takeaway: "Design the approach around the real clock.",
    },
    {
      hook: "Constraints belong on the table early.",
      body: "Budget, access, staffing, compliance, legacy systems, and internal politics all shape what is practical. Hiding those constraints does not make them disappear. We would rather know them at the beginning so the recommendation fits the business that exists instead of an imaginary version of it.",
      cta: "Start with the constraint everyone already knows about.",
      visual: "A field-note style list of real operating constraints.",
      takeaway: "Build around reality instead of ideal conditions.",
    },
    {
      hook: "Scope is a decision tool.",
      body: "Good work starts with boundaries. Ask what is included, what is not, who owns each decision, and what would trigger a change in scope. Those answers are not administrative details. They are what keep a useful project from turning into a moving target with no accountable finish.",
      cta: "Ask us to define the boundary first.",
      visual: "A scope card divided into included, excluded, and owner.",
      takeaway: "Use boundaries to protect the result.",
    },
    {
      hook: "Access determines how certain an answer can be.",
      body: "Some questions can be answered from the outside. Others require records, systems, customer history, or the people doing the work every day. We will tell you which is which. The level of access should match the level of certainty you expect from the answer.",
      cta: "Ask what evidence would be required.",
      visual: "Layered evidence sources from public to internal.",
      takeaway: "Match certainty to the evidence available.",
    },
    {
      hook: "Look at what happens after approval.",
      body: "Two proposals can sound similar until the work starts. Compare who owns implementation, how decisions are documented, what your team must provide, and how progress is checked. The operating model after the yes often matters more than the language used to win the yes.",
      cta: "Ask us what happens after you approve the work.",
      visual: "A handoff map from approval through implementation.",
      takeaway: "Judge the operating model, not only the proposal.",
    },
    {
      hook: "Name the uncertainty instead of hiding it.",
      body: "Every meaningful business decision contains something that is not known yet. Separate facts from assumptions and assumptions from guesses. Once the uncertainty is visible, you can decide whether to test it, accept it, or gather more evidence before committing resources.",
      cta: "Bring us the part you are least certain about.",
      visual: "Three labeled columns for fact, assumption, and unknown.",
      takeaway: "Turn uncertainty into an explicit decision.",
    },
    {
      hook: "Proof should answer a specific question.",
      body: "A logo wall is not proof of the thing you are trying to decide. A useful example shows the starting condition, what changed, and what was measured afterward. When you review evidence, ask exactly which claim it supports and which claims still depend on judgment.",
      cta: "Ask us which evidence supports which claim.",
      visual: "A case note connecting claim, evidence, and measured change.",
      takeaway: "Tie every proof point to a claim.",
    },
    {
      hook: "Ownership is part of the solution.",
      body: "A recommendation without an owner is only an idea. Before implementation begins, decide who can approve changes, who performs the work, who supplies information, and who checks the result. Clear ownership prevents good decisions from disappearing between departments.",
      cta: "Ask us to map ownership before implementation.",
      visual: "A four-role ownership map with one accountable decision maker.",
      takeaway: "Give every correction an accountable owner.",
    },
    {
      hook: "A handoff should leave nothing to interpret.",
      body: "When work moves from one person or system to another, the next owner should know what happened, what is expected, and when action is due. If any of those are missing, the handoff depends on memory. We prefer explicit transitions that can be checked.",
      cta: "Show us the handoff that causes the most friction.",
      visual: "A before-and-after handoff diagram with clear ownership.",
      takeaway: "Make transitions explicit and checkable.",
    },
    {
      hook: "The next step does not need to be the biggest step.",
      body: "Sometimes the right move is a narrow investigation, one correction, or a short working session before anything larger is considered. A smaller scope is useful when it answers the decision in front of you. We would rather solve the right-sized problem than manufacture a larger one.",
      cta: "Ask us for the narrowest useful next step.",
      visual: "A progression from one question to one verified action.",
      takeaway: "Match the scope to the decision.",
    },
  ];

  return POST_ROLES.map((role, i) => {
    const theme = themes[i];
    const identity = i === 0 ? brandLine({ name, site, positioning, index: 0, ev: evidence[0] }) : "";
    return {
      role,
      hook: c(theme.hook),
      body: c(identity ? `${identity} ${theme.body}` : theme.body),
      cta: c(theme.cta),
      visual: c(theme.visual),
      takeaway: c(theme.takeaway),
    };
  });
}
