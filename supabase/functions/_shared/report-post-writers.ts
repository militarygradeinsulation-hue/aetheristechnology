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
  const description = c(x.positioning || "").split(/(?<=[.!?])\s+/)[0].slice(0, 220).trim();
  return description || `We are ${x.name}.`;
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
  return POST_ROLES.map((role, i) => {
    const x = { name, site, positioning, index: i, ev: evidence[i % Math.max(1, evidence.length)] };
    const b = brandLine(x);
    const themes = [
      ["A question worth asking first.", `Before you choose a direction, tell us what you are hoping to accomplish. ${b} We can start there and talk through what is actually relevant to your situation.`],
      ["Clarity beats a long introduction.", `You should not have to decode a pitch to find out whether there is a fit. ${b} Ask us what matters most to you, and we will keep the answer grounded.`],
      ["The right next step starts with listening.", `Every situation carries its own priorities. Share yours with us before anyone suggests a solution. ${b} A practical conversation begins with those details.`],
      ["There is room for a better question.", `If the usual question does not get at what you need, ask another. ${b} Tell us what you are still trying to understand and we can start with that.`],
      ["You deserve an answer you can use.", `A clear answer should help you decide what to do next, even if that means taking more time. ${b} Bring us the question behind your decision.`],
      ["Consider what matters to you.", `Timing, priorities, and context make a difference. Before moving forward, tell us which of those is driving your decision. ${b} We can talk it through.`],
      ["A conversation can start small.", `You do not need a complete plan to get in touch. One specific concern or question is enough to begin. ${b} Let us know what is on your mind.`],
      ["Make space for the practical details.", `The right questions are often the everyday ones: what happens next, what do you need from me, and what is still unknown? ${b} Ask us directly.`],
      ["Not sure where to begin?", `Start with what has been hardest to clarify so far. ${b} We can work from the actual question rather than a guessed answer.`],
      ["The decision is yours.", `We want you to understand your options before you choose. ${b} Tell us what would help you make an informed decision.`],
      ["Look past the polished promise.", `Ask what a conversation would cover and which details still need to be confirmed. ${b} We welcome that kind of direct question.`],
      ["Talk to us about the real situation.", `A useful discussion does not need buzzwords. ${b} Tell us what is happening and what you need to know next.`],
    ] as const;
    const [hook, body] = themes[i];
    const followups = [
      "If there is a particular detail you would like us to clarify, tell us what it is. A direct question makes the next conversation more useful for both of us.",
      "Tell us what you have already explored and what you still need to understand. We can take the conversation from there without jumping to conclusions.",
      "Share the context behind your question when you reach out. It helps us respond to your actual situation instead of sending a generic answer.",
      "You can tell us which part feels uncertain. We will focus the conversation on that point and explain what we know and what still needs checking.",
      "If you have a particular deadline, let us know at the outset. That context helps keep the discussion focused on what is practical for you.",
      "Tell us which tradeoffs matter most before anyone suggests a direction. A better answer takes your priorities into account.",
      "You can begin with a single concern and add the details as we talk. There is no need to prepare a polished presentation first.",
      "We can discuss what is known and which questions still need answers. That distinction matters when you are deciding what to do next.",
      "Explain where the uncertainty started. We will listen to the specifics before assuming that a familiar solution is the right one.",
      "Let us know what a useful outcome would look like from your perspective. It gives the conversation a real point of reference.",
      "Bring the questions that did not fit into the usual form. They may be the most important part of the decision you are making.",
      "We can start from your circumstances rather than a standard sales script. Tell us which detail you want to unpack first.",
    ];
    const ctas = [
      "Tell us what you hope to accomplish.", "Ask us what a good first step looks like.",
      "Share the details behind your question.", "Send us the part you want explained.",
      "Ask us for a practical answer.", "Tell us what is driving your decision.",
      "Reach out with your starting point.", "Ask us about the next step.",
      "Tell us what has been unclear.", "Share what you need to decide.",
      "Ask us what still needs confirming.", "Start a conversation with us.",
    ];
    return { role, hook: c(hook), body: c(`${body} ${followups[i % followups.length]}`), cta: c(ctas[i]), visual: "Use the scanned company's visual identity.", takeaway: "Invite a useful conversation." };
  });
}
