// Random Post Generator — server side validation and prompt construction.
// Mirrors src/lib/randomPost.ts. Keep the two in sync.

import {
  AETHERIS_VINTAGE_DETECTIVE,
  VINTAGE_DETECTIVE_COPY_DIRECTION,
} from "./visual-style-presets.ts";

export const PRESET_WORDS: Record<string, number> = {
  micro: 40, short: 100, social: 200, expanded: 400, article: 750, substack: 1200, deep: 2000, custom: 0,
};
export const PLATFORM_IDS = ["general", "linkedin", "facebook", "instagram", "x", "blog", "substack"];
export const MODE_IDS = ["brand", "industry", "story", "educational", "contrarian", "custom"];
export const CUSTOM_MIN_WORDS = 40;
export const CUSTOM_MAX_WORDS = 3000;
export const LENGTH_TOLERANCE = 0.10;

export function countWords(text: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function toleranceBand(target: number) {
  return { min: Math.floor(target * (1 - LENGTH_TOLERANCE)), max: Math.ceil(target * (1 + LENGTH_TOLERANCE)) };
}

export interface ValidatedRandomPost {
  platform: string;
  mode: string;
  preset: string;
  targetWords: number;
  topic: string;
  tone: string;
  angle: string;
  seed: string;
  avoid: string[];
  /** Optional approved message pack brief (Zero Burden and future packs). */
  brief: string;
  /** Selected visual style preset id. Only recognised ids steer the copy. */
  stylePreset: string;
}

export function validateRandomPost(body: Record<string, unknown>): ValidatedRandomPost {
  const platform = String(body.platform ?? "");
  const mode = String(body.mode ?? "");
  const preset = String(body.preset ?? "");
  if (!PLATFORM_IDS.includes(platform)) throw new Error("Invalid platform");
  if (!MODE_IDS.includes(mode)) throw new Error("Invalid topic mode");
  if (!(preset in PRESET_WORDS)) throw new Error("Invalid length preset");

  let targetWords = PRESET_WORDS[preset];
  if (preset === "custom") {
    const n = Math.round(Number(body.customWords));
    if (!Number.isFinite(n) || n < CUSTOM_MIN_WORDS || n > CUSTOM_MAX_WORDS) {
      throw new Error(`Custom length must be between ${CUSTOM_MIN_WORDS} and ${CUSTOM_MAX_WORDS} words`);
    }
    targetWords = n;
  }

  const topic = String(body.topic ?? "").trim().slice(0, 400);
  if (mode === "custom" && !topic) throw new Error("A custom topic requires topic text");

  return {
    platform, mode, preset, targetWords, topic,
    tone: String(body.tone ?? "").trim().slice(0, 60),
    angle: String(body.angle ?? "").trim().slice(0, 300),
    seed: String(body.seed ?? "").trim().slice(0, 64),
    avoid: Array.isArray(body.avoid) ? body.avoid.slice(0, 6).map((a) => String(a).slice(0, 600)) : [],
    brief: String(body.brief ?? "").trim().slice(0, 6000),
    stylePreset: String(body.style_preset ?? "").trim().slice(0, 64),
  };
}

const PLATFORM_GUIDE: Record<string, string> = {
  general: "Platform neutral prose. No platform specific furniture.",
  linkedin: "LinkedIn feed post. Short paragraphs, one idea per line block, no more than 3 hashtags at the end.",
  facebook: "Facebook post. Conversational, plain language, easy to skim.",
  instagram: "Instagram caption. Strong first line, short blocks, up to 5 hashtags at the end.",
  x: "X or Threads post. Compressed, high signal sentences. If the target length exceeds one post, write it as a numbered thread.",
  blog: "Blog article. Title, intro, clear body sections with subheads, closing takeaway.",
  substack: "Substack essay. Title, an opening scene or claim, developed argument across several paragraphs, a closing line the reader remembers.",
};

const MODE_GUIDE: Record<string, string> = {
  brand: "Pick one topic that comes straight out of this business, its offer, and the buyer it serves.",
  industry: "Pick one insight about the wider industry. Name a pattern and quantify it.",
  story: "Tell one first person story or state one opinion and defend it with specifics.",
  educational: "Teach one mechanism end to end so the reader could run it tomorrow.",
  contrarian: "Take one widely repeated belief in this market, show why it fails, and give the better play.",
  custom: "Write on the supplied topic. Do not drift off it.",
};

export function randomPostSystemPrompt(ctx: {
  businessDescription: string; niche: string; targetBuyer: string; voiceReference: string; ctaLink: string;
  hasBrandVoice: boolean;
}) {
  return `You are writing an original post for this business.

BUSINESS: ${ctx.businessDescription}
NICHE: ${ctx.niche}
BUYER: ${ctx.targetBuyer}
LINK: ${ctx.ctaLink}

${ctx.hasBrandVoice
  ? `BRAND VOICE REFERENCE (match cadence, vocabulary and rhythm exactly):\n${ctx.voiceReference}`
  : `No stored brand voice. Write in a clear, direct, credible operator voice.`}

HARD RULES:
- Every generation must be genuinely new. Never reuse a hook, structure, or closing line from a previous post.
- Concrete over generic. Real specifics, plain nouns, no filler openings such as "In today's fast paced world" or "We looked at how".
- No invented client names or fake statistics presented as verified fact. Illustrative numbers must read as illustrative.
- Write the full requested length. Never truncate. Never pad with repeated sentences to reach a count.`;
}

export function randomPostUserPrompt(v: ValidatedRandomPost, wantsTitle: boolean) {
  const band = toleranceBand(v.targetWords);
  return `${MODE_GUIDE[v.mode]}
${v.topic ? `TOPIC: ${v.topic}` : ""}
CONTENT ANGLE FOR THIS RUN (use it, do not name it): ${v.angle || "your choice, pick an unexpected one"}
RANDOM SEED (forces a different treatment each run): ${v.seed}
${v.tone ? `TONE: ${v.tone}` : ""}

PLATFORM: ${PLATFORM_GUIDE[v.platform]}

LENGTH TARGET: ${v.targetWords} words. Acceptable range is ${band.min} to ${band.max} words. Count as you write.
${wantsTitle
  ? "Return a title and a body organised into paragraphs, with subheads where the length warrants them."
  : "Return an empty title and a body with no subheads."}

${v.stylePreset === AETHERIS_VINTAGE_DETECTIVE ? `${VINTAGE_DETECTIVE_COPY_DIRECTION}\n` : ""}
${v.brief ? `APPROVED MESSAGE PACK. Every claim below is pre approved. Use this wording and meaning. Do not invent stronger claims, do not strip the qualification, and do not turn scoped claims into absolutes:\n${v.brief}\n` : ""}
${v.avoid.length ? `DO NOT REPEAT these recent generations in idea, hook, or structure:\n${v.avoid.map((a, i) => `${i + 1}. ${a.slice(0, 300)}`).join("\n")}` : ""}`;
}

export const RANDOM_POST_TOOL = {
  type: "function",
  function: {
    name: "write_random_post",
    description: "Write one original post at the requested length.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Title for long form, empty string for short form." },
        body: { type: "string", description: "The full post body at the requested word count." },
        topic: { type: "string", description: "One line description of the topic chosen." },
      },
      required: ["title", "body", "topic"],
      additionalProperties: false,
    },
  },
};

export function lengthFixPrompt(current: number, target: number, tooShort: boolean) {
  const band = toleranceBand(target);
  return tooShort
    ? `The draft is ${current} words. The target is ${target} words (${band.min} to ${band.max}). Expand it with new substance: more specifics, a further example, a deeper explanation of the mechanism, a counterpoint. Do not repeat sentences already present and do not pad. Return the complete rewritten post.`
    : `The draft is ${current} words. The target is ${target} words (${band.min} to ${band.max}). Tighten it by cutting redundancy while keeping every distinct idea. Do not truncate mid thought. Return the complete rewritten post.`;
}
