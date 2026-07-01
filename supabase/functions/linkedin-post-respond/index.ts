import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { INFLUENCE_BLUEPRINT_COMPACT } from "../_shared/influenceBlueprint.ts";


type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type Mode = "micro" | "brief" | "medium" | "long" | "full";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
};

const MODE_SPECS: Record<Mode, { cap: number; instruction: string }> = {
  micro: { cap: 470, instruction: "Write 35-65 words. One paragraph. Fast, natural, and specific." },
  brief: { cap: 900, instruction: "Write 70-120 words. One paragraph. Make one clear point and stop." },
  medium: { cap: 1450, instruction: "Write 130-190 words. One paragraph. Add nuance without turning it into a speech." },
  long: { cap: 2000, instruction: "Write 200-280 words. One paragraph. Go deeper while staying conversational." },
  full: { cap: 2800, instruction: "Write 180-260 words as an original standalone post inspired by the source. Do not address the author directly." },
};

const SYSTEM = INFLUENCE_BLUEPRINT_COMPACT + "\n\n" + `You are an AI writing a fresh LinkedIn response for Joseph.

This is live AI drafting, not a template engine. There are no premade scripts, no signature opener libraries, no brand lexicon, and no canned fallback responses.

Your job is to read the exact post or thread and write what a sharp human would actually say in that conversation.

Hard rules:
- Respond to the author's specific point. Do not redirect to Joseph, Aetheris, business forensics, audits, diagnostics, leaks, operators, services, offers, or a website.
- Do not mention Aetheris, businessforensics.tech, aetheris.technology, Joseph's company, what Joseph sells, or any CTA link.
- Avoid canned openers and formulas: "What looks like", "The part people miss", "I see this in audits", "In my audits", "Diagnosis", "Most companies", "Strip the surface off", "forensic read".
- Never open with generic crowd framing like "Most people", "Most founders", "Most operators", "Most companies", "People think", or "Everyone thinks". Start from the specific post, thread, object, claim, number, or contradiction in front of you.
- Never close with canned endings like "That is the whole game", "That is the game", "The work is the work", "Most won't. You should", or any obvious mic-drop line you could have written before reading the post.
- No empty compliment openers: "Great post", "Love this", "I agree", "Well said", "Spot on", "100%".
- No emojis, hashtags, em dashes, bullets, markdown, labels, or quote marks.
- Sound conversational, present, and specific. If the source is simple, keep the response simple.
- Return only the final text.`;

const BANNED_OUTPUT_PATTERNS = [
  /aetheris/i,
  /businessforensics\.tech/i,
  /aetheris\.technology/i,
  /business forensics/i,
  /leak audit/i,
  /forensic diagnostic/i,
  /\bforensic read\b/i,
  /\bin my audits\b/i,
  /\bi see this in audits\b/i,
  /\bwhat looks like\b/i,
  /\bthe part people miss\b/i,
  /\bmost companies\b/i,
  /^\s*most\s+(people|founders|operators|businesses|companies|marketers|creators|teams)\b/i,
  /^\s*people\s+(think|see|believe|assume)\b/i,
  /^\s*everyone\s+(thinks|sees|believes|assumes)\b/i,
  /\bstrip the surface off\b/i,
  /\bthat is the whole game\b/i,
  /\bthat'?s the whole game\b/i,
  /\bthat is the game\b/i,
  /\bthe work is the work\b/i,
  /\bmost won'?t\.\s*you should\b/i,
  /^\s*diagnosis\s*:/i,
  /great post/i,
  /love this/i,
  /well said/i,
  /spot on/i,
  /https?:\/\//i,
];

const clean = (value: unknown, max = 5000) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

function modeFrom(value: unknown): Mode {
  return ["micro", "brief", "medium", "long", "full"].includes(String(value))
    ? value as Mode
    : "brief";
}

function capFor(mode: Mode, rawMaxChars: unknown, isReplyToReply: boolean) {
  const override = Number(rawMaxChars);
  if (Number.isFinite(override) && override >= 100 && override <= 2900) return Math.round(override);
  if (isReplyToReply) return 650;
  return MODE_SPECS[mode].cap;
}

function stripBadFormatting(text: string) {
  return text
    .replace(/[—–]/g, ",")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/["“”]/g, "")
    .replace(/\s*\n\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function trimToCap(text: string, cap: number) {
  if (text.length <= cap) return text;
  const slice = text.slice(0, cap);
  const lastStop = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf("! "),
    slice.lastIndexOf("? "),
    slice.lastIndexOf("."),
    slice.lastIndexOf("!"),
    slice.lastIndexOf("?"),
  );
  if (lastStop > 80) return slice.slice(0, lastStop + 1).trim();
  const lastSpace = slice.lastIndexOf(" ");
  return `${(lastSpace > 0 ? slice.slice(0, lastSpace) : slice).trim().replace(/[,;:]+$/, "")}.`;
}

function findViolation(text: string) {
  return BANNED_OUTPUT_PATTERNS.find((pattern) => pattern.test(text))?.toString() || null;
}

function sentenceList(text: string) {
  return text.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter((s) => s.length > 3);
}

function normalizedWords(text: string) {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^a-z0-9\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function firstWords(text: string, n: number) {
  return normalizedWords(sentenceList(text)[0] || text).slice(0, n).join(" ");
}

function lastWords(text: string, n: number) {
  const sentences = sentenceList(text);
  const final = sentences[sentences.length - 1] || text;
  const words = normalizedWords(final);
  return words.slice(Math.max(0, words.length - n)).join(" ");
}

function sharedNgram(a: string, b: string, n = 5) {
  const aw = normalizedWords(a);
  const bw = normalizedWords(b);
  if (aw.length < n || bw.length < n) return "";
  const grams = new Set<string>();
  for (let i = 0; i <= aw.length - n; i++) grams.add(aw.slice(i, i + n).join(" "));
  for (let i = 0; i <= bw.length - n; i++) {
    const gram = bw.slice(i, i + n).join(" ");
    if (grams.has(gram)) return gram;
  }
  return "";
}

function findStyleViolation(text: string, recentDrafts: string[]) {
  const opener = firstWords(text, 4);
  const closer = lastWords(text, 6);
  for (const draft of recentDrafts.slice(0, 18)) {
    if (opener && opener === firstWords(draft, 4)) return `repeated opener starter "${opener}"`;
    if (closer && closer === lastWords(draft, 6)) return `repeated closing words "${closer}"`;
    const overlap = sharedNgram(text, draft, 6);
    if (overlap) return `reused phrase "${overlap}"`;
  }
  return null;
}

async function callAI({
  apiKey,
  system,
  content,
  signal,
}: {
  apiKey: string;
  system: string;
  content: string | ChatContentPart[];
  signal: AbortSignal;
}) {
  const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    signal,
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
        temperature: 1.08,
        top_p: 0.97,
      messages: [
        { role: "system", content: system },
        { role: "user", content },
      ],
    }),
  });

  if (!aiRes.ok) {
    const t = await aiRes.text();
    console.error("AI gateway error:", aiRes.status, t);
    if (aiRes.status === 429) throw new Error("Rate limited. Try again shortly.");
    if (aiRes.status === 402) throw new Error("AI credits exhausted.");
    throw new Error(`AI gateway error: ${aiRes.status}`);
  }

  const data = await aiRes.json();
  return clean(data?.choices?.[0]?.message?.content, 6000);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI not configured");

    const body = await req.json();
    const imageDataUrl = clean(body?.imageDataUrl, 10_000_000);
    const postText = clean(body?.postText);
    const extraContext = clean(body?.extraContext || body?.direction, 4000);
    const mode = modeFrom(body?.mode);
    const isReplyToReply = body?.conversationKind === "reply_to_reply";
    const maxChars = capFor(mode, body?.maxChars, isReplyToReply);

    const myComment = clean(body?.myComment, 4000);
    const theirReply = clean(body?.theirReply, 4000);
    const originalPostText = clean(body?.originalPostText, 4000);
    const myCommentImageDataUrl = clean(body?.myCommentImageDataUrl, 10_000_000);
    const theirReplyImageDataUrl = clean(body?.theirReplyImageDataUrl, 10_000_000);
    const originalPostImageDataUrl = clean(body?.originalPostImageDataUrl, 10_000_000);

    const hasImage = imageDataUrl.startsWith("data:image/");
    const hasMyCommentImg = myCommentImageDataUrl.startsWith("data:image/");
    const hasTheirReplyImg = theirReplyImageDataUrl.startsWith("data:image/");
    const hasOriginalImg = originalPostImageDataUrl.startsWith("data:image/");

    if (isReplyToReply) {
      if ((myComment.length < 10 && !hasMyCommentImg) || (theirReply.length < 5 && !hasTheirReplyImg)) {
        return new Response(JSON.stringify({ error: "myComment and theirReply required (text or screenshot)" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (!hasImage && postText.length < 10) {
      return new Response(JSON.stringify({ error: "imageDataUrl or postText required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recentDrafts = Array.isArray(body?.recentDrafts)
      ? body.recentDrafts
          .filter((s: unknown): s is string => typeof s === "string" && s.trim().length > 20)
          .slice(0, 24)
          .map((s: string) => s.replace(/https?:\/\/\S+/gi, "").trim().slice(0, 1200))
      : [];

    const personaKeysArray = Array.isArray(body?.personaKeys) ? body.personaKeys.filter(Boolean).map(String) : [];
    const personaKeys = personaKeysArray.join(" + ");
    const alexRequested = personaKeysArray.includes("alex-hormozi") || /ALEX HORMOZI|alex-hormozi|Hormozi/i.test(extraContext);
    const personaBlock = alexRequested
      ? `\n\nLIVE STYLE LOCK: Alex Hormozi style transfer only. Never name him or his companies. This is NOT a template and NOT a rotating opener bank. Read the source and react to its exact claim. Use blunt arithmetic, compression, and operator impatience only where the source earns it. HARD OVERRIDE: do not begin with "Most people", "Most founders", "Most operators", "People think", or any generic crowd opener. Do not end with "That is the whole game", "The work is the work", or any repeated mic-drop closer. The first sentence must contain a specific noun, claim, number, acronym, or contradiction from the source. The last sentence must be newly written for this source, not reusable.`
      : body?.personaActive || personaKeys
      ? `\n\nPersonality/style selected: ${personaKeys || "custom"}. Use that only for rhythm and tone, not for canned content. Do not reuse any persona opener or closer from prior drafts.`
      : "";
    const memoryBlock = recentDrafts.length
      ? `\n\nRecent saved drafts to avoid copying. Treat them as forbidden style memory, not examples. You must not reuse their first 4 words, final 6 words, or any 6-word phrase:\n${recentDrafts.map((d, i) => `[${i + 1}] ${d}`).join("\n")}`
      : "";
    const directionBlock = extraContext ? `\n\nUser direction for this exact response:\n${extraContext}` : "";

    const instruction = isReplyToReply
      ? `Write the next reply in a LinkedIn thread.\n\n${originalPostText ? `Original post for context only:\n${originalPostText}\n\n` : ""}Your prior comment:\n${myComment || "See attached screenshot."}\n\nTheir reply, the thing you are answering:\n${theirReply || "See attached screenshot."}\n\nWrite a live human reply to their exact words. Engage the substance immediately. ${MODE_SPECS.micro.instruction} Hard cap: ${maxChars} characters. Return only the reply.`
      : `${hasImage ? "The attached image is a screenshot of someone's LinkedIn post." : `LinkedIn post to respond to:\n${postText}`}\n\n${MODE_SPECS[mode].instruction} Hard cap: ${maxChars} characters. Respond to the specific point in the post. Return only the response.`;

    const content: string | ChatContentPart[] = (() => {
      const prompt = `${instruction}${personaBlock}${memoryBlock}${directionBlock}\n\nBefore final output, reject and rewrite if it sounds like an Aetheris pitch, a canned script, a generic template, or the same opener/closer used in the recent drafts. The opening and ending must be source-specific.`;
      if (isReplyToReply && (hasOriginalImg || hasMyCommentImg || hasTheirReplyImg)) {
        const parts: ChatContentPart[] = [{ type: "text", text: prompt }];
        if (hasOriginalImg) parts.push({ type: "text", text: "Original post screenshot:" }, { type: "image_url", image_url: { url: originalPostImageDataUrl } });
        if (hasMyCommentImg) parts.push({ type: "text", text: "Your prior comment screenshot:" }, { type: "image_url", image_url: { url: myCommentImageDataUrl } });
        if (hasTheirReplyImg) parts.push({ type: "text", text: "Their reply screenshot, answer this:" }, { type: "image_url", image_url: { url: theirReplyImageDataUrl } });
        return parts;
      }
      if (hasImage) return [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: imageDataUrl } }];
      return prompt;
    })();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);
    let post = "";
    try {
      const repairNotes: string[] = [];
      for (let attempt = 0; attempt < 3; attempt++) {
        post = await callAI({
          apiKey: LOVABLE_API_KEY,
          system: repairNotes.length
            ? `${SYSTEM}\n\nREWRITE FROM SCRATCH. Previous attempt failed because: ${repairNotes.join("; ")}. Open with a different source-specific noun/claim/number. End with a different source-specific consequence. Do not preserve sentence order from the failed attempt.`
            : SYSTEM,
          content,
          signal: controller.signal,
        });
        post = trimToCap(stripBadFormatting(post), maxChars);

        const violation = findViolation(post) || findStyleViolation(post, recentDrafts);
        if (!violation) break;
        repairNotes.push(violation);
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return new Response(JSON.stringify({ error: "AI took too long. Try a smaller image or retry." }), {
          status: 504,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!post) throw new Error("Empty response from AI");
    const finalViolation = findViolation(post) || findStyleViolation(post, recentDrafts);
    if (finalViolation) console.warn("style violation after 3 attempts, returning anyway:", finalViolation);

    // Append Joseph's signature to every post/reply, idempotent.
    const SIGNATURE = "Joseph ~AI Architect MS, BA, IBM AI Certified Aetheris.Technology";
    if (!post.includes("Aetheris.Technology")) {
      post = post.trimEnd() + "\n\n" + SIGNATURE;
    }

    return new Response(JSON.stringify({ post }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("linkedin-post-respond error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});