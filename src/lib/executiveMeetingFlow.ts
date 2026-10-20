export type MeetingStageId = "dean" | "braden" | "joseph";

export type MeetingQuestion = {
  id: string;
  prompt: string;
  why?: string;
};

export type MeetingSection = {
  title: string;
  purpose: string;
  questions: MeetingQuestion[];
};

export type MeetingGate = {
  id: string;
  label: string;
};

export type MeetingStageDefinition = {
  id: MeetingStageId;
  owner: string;
  title: string;
  objective: string;
  prospectShift: string;
  doNotDo: string;
  sections: MeetingSection[];
  gates: MeetingGate[];
  handoffQuestionIds: string[];
};

export const EXECUTIVE_MEETING_FLOW: MeetingStageDefinition[] = [
  {
    id: "dean",
    owner: "Dean",
    title: "Relationship + Situation",
    objective: "Establish executive trust, understand why the conversation is happening, identify the visible business problem, and decide whether the opportunity deserves deeper investigation.",
    prospectShift: "From: “Who are these people?”  →  To: “They understand businesses like mine.”",
    doNotDo: "Do not diagnose the whole company, design the solution, or pull Joseph into a casual discovery call.",
    sections: [
      {
        title: "Open the conversation",
        purpose: "Understand the person, the business, and the trigger before explaining Aetheris.",
        questions: [
          { id: "d1", prompt: "Before I tell you anything about Aetheris, tell me about the business. What are you responsible for right now?" },
          { id: "d2", prompt: "What made this conversation worth taking?" },
          { id: "d3", prompt: "What is going well enough that you would not want someone coming in and disrupting it?" },
          { id: "d4", prompt: "Where does the business feel harder than it should?" },
        ],
      },
      {
        title: "Understand the operating path",
        purpose: "Follow an opportunity through the business without turning the conversation into an audit.",
        questions: [
          { id: "d5", prompt: "How does a new customer typically find you?" },
          { id: "d6", prompt: "Once someone shows interest, what happens next?" },
          { id: "d7", prompt: "How many people touch that customer before money actually changes hands?" },
          { id: "d8", prompt: "Where does responsibility change from one person or department to another?" },
          { id: "d9", prompt: "What systems are involved between the first inquiry and the completed sale?" },
          { id: "d10", prompt: "How confident are you that everyone looking at those systems sees the same version of what is happening?" },
          { id: "d11", prompt: "Where does the process still depend on somebody remembering to do something?" },
        ],
      },
      {
        title: "Surface friction",
        purpose: "Find repeating problems and the places leadership has learned to tolerate.",
        questions: [
          { id: "d12", prompt: "What issue keeps resurfacing even after you have tried to correct it?" },
          { id: "d13", prompt: "Where do you feel like you are paying for something that should be producing more?" },
          { id: "d14", prompt: "What does your team complain about that leadership may have gotten used to?" },
          { id: "d15", prompt: "What takes longer inside the company than you think it should?" },
          { id: "d16", prompt: "If I followed one opportunity from the moment it entered the business until it either became revenue or disappeared, where would you be least confident in what I would find?" },
        ],
      },
      {
        title: "Establish importance + decision structure",
        purpose: "Determine whether the issue matters enough economically and whether the right people can act.",
        questions: [
          { id: "d17", prompt: "What happens if nothing about this changes over the next twelve months?" },
          { id: "d18", prompt: "Is the consequence mostly time, missed revenue, unnecessary cost, customer experience, or some combination?" },
          { id: "d19", prompt: "Do you have any sense of what this problem is already costing? If not, is not knowing that number part of the problem?" },
          { id: "d20", prompt: "Which problem inside the company would you most like to finally have a definitive answer about?" },
          { id: "d21", prompt: "When something crosses departments like this, who normally gets involved in fixing it?" },
          { id: "d22", prompt: "Who ultimately decides whether something gets changed?" },
          { id: "d23", prompt: "If we eventually found something worth correcting, who else would need to understand the evidence?" },
          { id: "d24", prompt: "Would it be useful if we looked at how these pieces may actually be connected?" },
        ],
      },
    ],
    gates: [
      { id: "material_problem", label: "A material business problem is present." },
      { id: "economic_relevance", label: "The problem is economically meaningful enough to investigate." },
      { id: "authority_identified", label: "A decision-maker is involved or can be brought into the process." },
      { id: "wants_deeper", label: "The prospect wants Aetheris to look deeper rather than just continue talking." },
    ],
    handoffQuestionIds: ["d2", "d4", "d12", "d16", "d17", "d20", "d22", "d24"],
  },
  {
    id: "braden",
    owner: "Braden",
    title: "Business Case + Qualification",
    objective: "Test the assumptions from the first meeting, trace the repeating pattern, establish economic relevance, expose objections, and determine whether the opportunity is ready for Joseph.",
    prospectShift: "From: “Something is wrong.”  →  To: “This is real, connected, and worth solving.”",
    doNotDo: "Do not repeat Dean’s discovery call. Do not bring Joseph in until the prospect is decision-capable, except for a clearly documented decision-ready exception.",
    sections: [
      {
        title: "Confirm the problem",
        purpose: "Separate the stated problem from the underlying cause.",
        questions: [
          { id: "b1", prompt: "Of everything you discussed with Dean, what would you say is the actual problem?" },
          { id: "b2", prompt: "What makes you confident that is the cause rather than the symptom?" },
          { id: "b3", prompt: "When did you first notice it?" },
          { id: "b4", prompt: "Was there ever a period when this worked better? What changed?" },
          { id: "b5", prompt: "What have you already tried, and what happened after those attempts?" },
        ],
      },
      {
        title: "Trace the pattern",
        purpose: "Follow the problem upstream and downstream until the structure becomes visible.",
        questions: [
          { id: "b6", prompt: "What happens immediately before this problem appears?" },
          { id: "b7", prompt: "What happens immediately after it?" },
          { id: "b8", prompt: "Which other department gets affected when this goes wrong?" },
          { id: "b9", prompt: "Where does information change hands? Where does ownership change hands?" },
          { id: "b10", prompt: "Where does the system require someone to interpret what the previous person meant?" },
          { id: "b11", prompt: "What happens when the normal person responsible for this is unavailable?" },
          { id: "b12", prompt: "Where are spreadsheets, inboxes, CRM records, texts, or verbal updates doing the same job?" },
          { id: "b13", prompt: "Which number does leadership trust the least?" },
          { id: "b14", prompt: "Where would two people inside the company give me different answers to the same question?" },
        ],
      },
      {
        title: "Establish economic exposure + urgency",
        purpose: "Determine whether the business case is large enough and whether waiting has a consequence.",
        questions: [
          { id: "b15", prompt: "What is the business currently spending around this problem: people, software, agencies, marketing, management time, and rework?" },
          { id: "b16", prompt: "Which of those costs exist specifically because the system is not working correctly?" },
          { id: "b17", prompt: "How much revenue passes through this process in a normal month?" },
          { id: "b18", prompt: "What percentage would need to be recovered or improved for fixing this to become financially obvious?" },
          { id: "b19", prompt: "Why solve this now instead of six months from now?" },
          { id: "b20", prompt: "What happens if the company grows before this is fixed?" },
        ],
      },
      {
        title: "Test implementation + objections",
        purpose: "Know whether the company can act and surface the reason a qualified buyer might still say no.",
        questions: [
          { id: "b21", prompt: "If we proved the cause, how quickly could the company actually make a change?" },
          { id: "b22", prompt: "Who can authorize access, approve process changes, and own implementation internally?" },
          { id: "b23", prompt: "What kinds of changes are politically difficult inside the company?" },
          { id: "b24", prompt: "What would prevent a good recommendation from being acted on?" },
          { id: "b25", prompt: "What would make you decide not to move forward even if we found something meaningful?" },
          { id: "b26", prompt: "What would make leadership skeptical?" },
          { id: "b27", prompt: "What did you dislike about previous consultants, agencies, software companies, or outside partners?" },
          { id: "b28", prompt: "What would you need to see before you would feel comfortable approving an engagement?" },
          { id: "b29", prompt: "If we can show you where the problem originates, support it with evidence, and give you a practical way to correct it, is there anything preventing the company from moving forward?" },
          { id: "b30", prompt: "Who needs to be in the next conversation if we are going to make an actual decision?" },
          { id: "b31", prompt: "Assuming Joseph agrees there is something worth solving, are you comfortable using the next meeting to determine scope and decide whether we work together?" },
        ],
      },
    ],
    gates: [
      { id: "cause_hypothesis", label: "The likely cause is clearer than the original symptom." },
      { id: "economic_exposure", label: "There is enough economic exposure to justify action." },
      { id: "implementation_capacity", label: "The company can authorize access and implement a correction." },
      { id: "objections_visible", label: "Major objections and prior bad experiences have been surfaced." },
      { id: "decision_maker_next", label: "The necessary decision-maker(s) will attend the Joseph meeting." },
      { id: "decision_ready", label: "The prospect agrees the next meeting can produce a commercial decision." },
    ],
    handoffQuestionIds: ["b1", "b2", "b5", "b14", "b17", "b19", "b24", "b25", "b28", "b30", "b31"],
  },
  {
    id: "joseph",
    owner: "Joseph",
    title: "Architecture + Decision",
    objective: "Confirm the diagnosis, expose the architecture of the problem, define the first meaningful win, establish scope and ownership, and reach a commercial decision.",
    prospectShift: "From: “We need to solve this.”  →  To: “Here is exactly how we solve it and who owns what.”",
    doNotDo: "Do not restart discovery. Joseph enters as the architect and closer, not as another introductory salesperson.",
    sections: [
      {
        title: "Confirm the diagnosis",
        purpose: "Begin with a point of view, then invite correction.",
        questions: [
          { id: "j1", prompt: "I have reviewed what you discussed with Dean and Braden. Here is what I think is happening. What did I misunderstand?" },
          { id: "j2", prompt: "If we correct the issue we are looking at, what downstream problem should disappear with it?" },
          { id: "j3", prompt: "What would still remain broken?" },
          { id: "j4", prompt: "Which part of this is structural, and which part is behavioral?" },
        ],
      },
      {
        title: "Expose the architecture",
        purpose: "Identify the systems and compensating behaviors creating the outcome.",
        questions: [
          { id: "j5", prompt: "Where is the company compensating manually for a system that should work without intervention?" },
          { id: "j6", prompt: "What process exists because another process cannot be trusted?" },
          { id: "j7", prompt: "What are you paying people to remember?" },
          { id: "j8", prompt: "What are you paying software to do that people are still doing manually?" },
          { id: "j9", prompt: "Where has complexity been added to compensate for something that was never fixed properly?" },
        ],
      },
      {
        title: "Define the outcome + first win",
        purpose: "Turn the engagement into observable operating change rather than vague ROI language.",
        questions: [
          { id: "j10", prompt: "If we do this correctly, what changes inside the business?" },
          { id: "j11", prompt: "What would you want to be able to see in 30, 60, or 90 days that you cannot see today?" },
          { id: "j12", prompt: "Which metric should prove the correction worked?" },
          { id: "j13", prompt: "Who should notice the change first: leadership, employees, customers, or finance?" },
          { id: "j14", prompt: "Of everything we have discussed, what needs to become true first?" },
          { id: "j15", prompt: "If we establish that first, are you comfortable letting the evidence determine what comes next rather than prescribing the entire solution before we investigate?" },
        ],
      },
      {
        title: "Define scope + make the decision",
        purpose: "Clarify responsibility, boundaries, access, and the commercial next step.",
        questions: [
          { id: "j16", prompt: "Do you want us only to identify the cause, or do you want us responsible for correcting it as well?" },
          { id: "j17", prompt: "Which systems can we access? Which systems can we change?" },
          { id: "j18", prompt: "Which decisions require your approval?" },
          { id: "j19", prompt: "Who should be our internal point person?" },
          { id: "j20", prompt: "What should absolutely remain untouched?" },
          { id: "j21", prompt: "Is there anything happening internally that could materially change the environment while we are working?" },
          { id: "j22", prompt: "Given what we have uncovered, is there any reason we should solve only part of this problem?" },
          { id: "j23", prompt: "Do you agree with the problem we have defined?" },
          { id: "j24", prompt: "Do you agree that leaving it as it is costs more than correcting it?" },
          { id: "j25", prompt: "Do you agree with the way I have proposed we address it?" },
          { id: "j26", prompt: "Then the remaining question is whether you want Aetheris to take responsibility for it. What would prevent us from defining scope, start date, access, and commercial terms now?" },
        ],
      },
    ],
    gates: [
      { id: "problem_agreed", label: "The buyer agrees with the defined problem." },
      { id: "economics_agreed", label: "The buyer agrees the cost of inaction justifies correction." },
      { id: "solution_agreed", label: "The buyer agrees with the proposed approach." },
      { id: "scope_defined", label: "Scope, access, ownership, and first win are defined." },
      { id: "commercial_next_step", label: "A commercial decision or explicit decision condition is recorded." },
    ],
    handoffQuestionIds: ["j1", "j6", "j10", "j11", "j12", "j14", "j16", "j19", "j23", "j24", "j25", "j26"],
  },
];

export const stageById = (id: MeetingStageId) =>
  EXECUTIVE_MEETING_FLOW.find((stage) => stage.id === id) || EXECUTIVE_MEETING_FLOW[0];

export function stageQuestionCount(stage: MeetingStageDefinition): number {
  return stage.sections.reduce((sum, section) => sum + section.questions.length, 0);
}

export function answeredQuestionCount(stage: MeetingStageDefinition, answers: Record<string, string> | undefined): number {
  const map = answers || {};
  return stage.sections.reduce(
    (sum, section) => sum + section.questions.filter((q) => String(map[q.id] || "").trim().length > 0).length,
    0,
  );
}

export function stageGateComplete(stage: MeetingStageDefinition, gates: Record<string, boolean> | undefined): boolean {
  const map = gates || {};
  return stage.gates.every((gate) => map[gate.id] === true);
}

export function buildStageHandoff(
  stage: MeetingStageDefinition,
  company: string,
  contact: string,
  answers: Record<string, string> | undefined,
): string {
  const allQuestions = stage.sections.flatMap((section) => section.questions);
  const byId = new Map(allQuestions.map((q) => [q.id, q.prompt]));
  const lines = stage.handoffQuestionIds
    .map((id) => {
      const answer = String(answers?.[id] || "").trim();
      if (!answer) return null;
      return `• ${byId.get(id) || id}\n  ${answer}`;
    })
    .filter(Boolean);

  return [
    `AETHERIS HANDOFF — ${stage.owner.toUpperCase()} / ${stage.title.toUpperCase()}`,
    company ? `Company: ${company}` : "",
    contact ? `Contact: ${contact}` : "",
    "",
    ...lines,
  ].filter(Boolean).join("\n");
}
