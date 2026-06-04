import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type Mode = "micro" | "brief" | "medium" | "long" | "full";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
};

const ALLOWED_MODES: Mode[] = ["micro", "brief", "medium", "long", "full"];

const MODE_SPECS: Record<Mode, { label: string; cap: number; instruction: string }> = {
  micro: {
    label: "short LinkedIn comment",
    cap: 470,
    instruction: "Write 35-65 words. One paragraph. Fast, natural, and specific.",
  },
  brief: {
    label: "LinkedIn comment",
    cap: 900,
    instruction: "Write 70-120 words. One paragraph. Make one clear point and stop.",
  },
  medium: {
    label: "deeper LinkedIn comment",
    cap: 1450,
    instruction: "Write 130-190 words. One paragraph. Add nuance without turning it into a speech.",
  },
  long: {
    label: "long LinkedIn comment",
    cap: 2000,
    instruction: "Write 200-280 words. One paragraph. Go deeper while staying conversational.",
  },
  full: {
    label: "standalone LinkedIn post",
    cap: 2800,
    instruction: "Write 180-260 words as an original standalone post inspired by the source. Do not address the author directly.",
  },
};

const SYSTEM = `You are an AI writing a fresh LinkedIn response for Joseph.

This is live AI drafting, not a template engine. There are no premade scripts, no signature opener libraries, no brand lexicon, and no canned fallback responses.

Your job is to read the exact post or thread and write what a sharp human would actually say in that conversation.

Hard rules:
- Respond to the author's specific point. Do not redirect to Joseph, Aetheris, business forensics, audits, diagnostics, leaks, operators, services, offers, or a website.
- Do not mention Aetheris, businessforensics.tech, aetheris.technology, Joseph's company, what Joseph sells, or any CTA link.
- Avoid canned openers and formulas: "What looks like", "The part people miss", "I see this in audits", "In my audits", "Diagnosis", "Most companies", "Strip the surface off", "forensic read".
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
  /\bstrip the surface off\b/i,
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
  return ALLOWED_MODES.includes(value as Mode) ? value as Mode : "brief";
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI not configured");

    const body = await req.json();
    const imageDataUrl: string = body?.imageDataUrl || "";
    const postText: string = (body?.postText || "").toString().trim();
    const extraContext: string = (body?.extraContext || "").toString().trim();
    const personaActive: boolean = !!body?.personaActive || /PERSONA LOCK|PERSONA BLEND LOCK/i.test(extraContext);
    const personaKeys: string[] = Array.isArray(body?.personaKeys) ? body.personaKeys.filter(Boolean) : [];
    const recentDrafts: string[] = Array.isArray(body?.recentDrafts)
      ? body.recentDrafts
          .filter((s: unknown): s is string => typeof s === "string" && s.trim().length > 20)
          .slice(0, 24)
          .map((s: string) => s.replace(/https?:\/\/\S+/gi, "").trim().slice(0, 1800))
      : [];
    const ALLOWED_MODES = ["micro", "brief", "medium", "long", "full"] as const;
    type Mode = typeof ALLOWED_MODES[number];
    const mode: Mode = (ALLOWED_MODES as readonly string[]).includes(body?.mode) ? body.mode as Mode : "brief";
    const isStandalonePost = mode === "full";
    const MODE_SPECS: Record<Mode, { label: string; spec: string }> = {
      micro:  { label: "MICRO COMMENT reply",   spec: "40–70 words, UNDER 450 characters. ONE tight paragraph. Cut all setup. One reframe, one mechanism beat, one verdict." },
      brief:  { label: "COMMENT reply",          spec: "90–140 words, UNDER 900 characters, hard cap 1,150 chars. ONE dense paragraph." },
      medium: { label: "MEDIUM COMMENT reply",   spec: "150–210 words, UNDER 1,500 characters. ONE dense paragraph. Room for a fuller mechanism walk before the verdict." },
      long:   { label: "LONG COMMENT reply",     spec: "220–300 words, UNDER 2,100 characters. ONE dense paragraph. Full 4-part architecture with extended mechanism cascade." },
      full:   { label: "standalone LinkedIn POST", spec: "180–260 words, UNDER 2,800 characters." },
    };
    // Optional user-provided character cap overrides the mode spec.
    const rawMaxChars = Number(body?.maxChars);
    const maxCharsOverride = Number.isFinite(rawMaxChars) && rawMaxChars >= 100 && rawMaxChars <= 2900
      ? Math.round(rawMaxChars) : null;
    const modeSpec = maxCharsOverride
      ? {
          label: MODE_SPECS[mode].label,
          spec: `STRICT LENGTH: UNDER ${maxCharsOverride} characters TOTAL. Target ~${Math.round(maxCharsOverride * 0.85)} characters. ONE dense paragraph, no line breaks. COUNT characters as you write — stop at the verdict before hitting the cap. Approx ${Math.max(20, Math.round(maxCharsOverride / 6.5))} words or fewer.`,
        }
      : MODE_SPECS[mode];
    const conversationKind: string = body?.conversationKind === "reply_to_reply" ? "reply_to_reply" : "comment_on_post";
    const myComment: string = (body?.myComment || "").toString().trim();
    const theirReply: string = (body?.theirReply || "").toString().trim();
    const originalPostText: string = (body?.originalPostText || "").toString().trim();
    const myCommentImageDataUrl: string = (body?.myCommentImageDataUrl || "").toString();
    const theirReplyImageDataUrl: string = (body?.theirReplyImageDataUrl || "").toString();
    const originalPostImageDataUrl: string = (body?.originalPostImageDataUrl || "").toString();
    const hasMyCommentImg = myCommentImageDataUrl.startsWith("data:image/");
    const hasTheirReplyImg = theirReplyImageDataUrl.startsWith("data:image/");
    const hasOriginalImg = originalPostImageDataUrl.startsWith("data:image/");

    const hasImage = imageDataUrl && imageDataUrl.startsWith("data:image/");
    const hasText = postText.length > 10;
    const isReplyToReply = conversationKind === "reply_to_reply";

    if (isReplyToReply) {
      if ((myComment.length < 10 && !hasMyCommentImg) || (theirReply.length < 5 && !hasTheirReplyImg)) {
        return new Response(JSON.stringify({ error: "myComment and theirReply required (text or screenshot)" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (!hasImage && !hasText) {
      return new Response(JSON.stringify({ error: "imageDataUrl or postText required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const liveAntiRepetitionBlock = recentDrafts.length > 0
      ? `\n\n═══════════════════════════════════════════════════════════
LIVE FULL-LIBRARY ANTI-REPETITION AUDIT
═══════════════════════════════════════════════════════════
You have live memory from ${recentDrafts.length} saved drafts/comments across ALL personalities and tools. These are not examples to imitate. They are evidence of what must be avoided.

Before writing, silently audit them for:
1. Repeated opener grammar and first 3-6 word shapes.
2. Repeated sentence-length patterns, including one-long-sentence-plus-short-verdict structures.
3. Repeated reframe templates like "What looks like...", "The part people miss...", "It's not X. It's Y.", "Most companies...", "Architecture Failure", "Operational Waste", and recurring leak-label defaults.
4. Repeated nouns, metaphors, verdict cadence, number shapes, and CTA rhythm.
5. Repeated reply-to-reply moves such as concession-pivot, polite pushback, or recycled forensic labels.

NON-NEGOTIABLE OUTPUT RULES:
- Do NOT reuse any 4+ word phrase from the saved drafts.
- Do NOT use the same opening word, same first-sentence grammar, same paragraph rhythm, or same closer structure as any recent item.
- Do NOT default to "Architecture Failure", "Operational Waste", "Brand Contradiction", or any single leak label unless the specific thread demands it. If a persona is active, diagnose in the persona's own language instead of forcing a label.
- Write the reply as a fresh live answer to the exact LinkedIn thread, not a premade response and not a remix of prior drafts.
- If the first draft in your head sounds like any saved draft below, discard it and choose a different angle, sentence pattern, and vocabulary set.

SAVED DRAFTS/COMMENTS TO AVOID:
${recentDrafts.map((d, i) => `── SAVED ITEM ${i + 1} ──\n${d}`).join("\n\n")}
═══════════════════════════════════════════════════════════`
      : `\n\nLIVE FULL-LIBRARY ANTI-REPETITION AUDIT: No saved drafts were provided in this request. Still avoid generic Aetheris defaults and produce a fresh, thread-specific reply.`;

    const personaRuntimeBlock = personaActive
      ? `\n\n═══════════════════════════════════════════════════════════
LIVE PERSONALITY ENGINE — HIGHEST STYLE AUTHORITY
═══════════════════════════════════════════════════════════
Active personality mode${personaKeys.length ? `: ${personaKeys.join(" + ")}` : ""}.
The personality rules supplied in ADDITIONAL DIRECTION are not canned responses. They are live style-control instructions for this exact reply.

Priority order for this generation:
1. Read the actual post/thread accurately.
2. Apply the selected personality or blended personalities to rhythm, sentence length, vocabulary, entry angle, and closer shape.
3. Use the full-library anti-repetition audit to avoid repeated phrases and repeated sentence structures.
4. Keep Aetheris forensic substance only as background expertise. Do not let the default lexicon flatten the personality.

If Aetheris lexicon rules conflict with the personality rhythm, the personality wins. If the reply sounds like a generic Aetheris template, rewrite it before returning. The reader should feel a live human voice adapting to this thread, not a preset.`
      : "";

    const replyToReplyBlock = `You are continuing a LinkedIn thread. Someone replied to YOUR comment, and you are writing the next reply back to THEM directly.

${originalPostText ? `ORIGINAL POST (context only, do NOT re-litigate it):\n"""\n${originalPostText}\n"""\n` : hasOriginalImg ? `ORIGINAL POST: see the screenshot labeled "ORIGINAL POST SCREENSHOT" below (context only, do NOT re-litigate it).\n` : ""}YOUR PRIOR COMMENT (the one they're responding to — do NOT repeat its diagnosis verbatim):
"""
${myComment || (hasMyCommentImg ? "(see screenshot labeled YOUR PRIOR COMMENT SCREENSHOT)" : "")}
"""

THEIR REPLY TO YOU (this is who you're now answering):
"""
${theirReply || (hasTheirReplyImg ? "(see screenshot labeled THEIR REPLY SCREENSHOT — read the reply text in that image carefully)" : "")}
"""

Write a live human reply to THEIR exact words. Engage the substance in the first clause. Do not diagnose, brand, sell, append a link, or reuse Aetheris language. Keep it 45–90 words, one paragraph, no line breaks. It can end with a clean statement or a real question if that is the most natural way to continue the conversation.`;

    const topLevelTaskBlock = `${hasImage ? "The image attached is a screenshot of someone's LinkedIn post." : `The following is the full text of someone's LinkedIn post:\n\n"""\n${postText}\n"""`}

1. Read the post carefully. Identify the author's actual point.
2. Write a ${modeSpec.label} (${modeSpec.spec}) in Joseph's first-person voice, in ONE natural paragraph.
3. Respond to the specific post, not to a generic business prompt.
4. Do not use a preset opener, Aetheris vocabulary, a diagnostic frame, a sales frame, or a link.
${extraContext ? `\nADDITIONAL DIRECTION FROM OPERATOR: ${extraContext}` : ""}

Return ONLY the response text. One paragraph. No line breaks between sentences. No commentary, no labels, no quotation marks, no markdown.`;

    const userInstruction = `${personaRuntimeBlock}

${liveAntiRepetitionBlock}

═══════════════════════════════════════════════════════════
TASK
═══════════════════════════════════════════════════════════
${isReplyToReply ? replyToReplyBlock + (extraContext ? `\n\nADDITIONAL DIRECTION FROM OPERATOR: ${extraContext}` : "") + `\n\nReturn ONLY the reply text. One paragraph. No line breaks. No commentary, no labels, no quotation marks, no markdown.\n\nLIVE CHECK BEFORE OUTPUT: Did I answer their exact reply like a person, avoid every canned opener, avoid Aetheris language, and avoid a sales/link CTA? If not, rewrite before returning.` : topLevelTaskBlock + `\n\nLIVE CHECK BEFORE OUTPUT: Did I answer the actual post like a person, avoid every canned opener, avoid Aetheris language, and avoid a sales/link CTA? If not, rewrite before returning.`}`;




    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    let aiRes: Response;
    try {
      aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: `${HUMAN_RESPONSE_SYSTEM}${personaActive ? "\n\nPERSONALITY ACTIVE: the personality/blend instructions in the user message control rhythm, sentence length, vocabulary, and angle." : ""}${recentDrafts.length ? `\n\nLIVE MEMORY ACTIVE: ${recentDrafts.length} saved drafts/comments were provided. Avoid their phrases, openers, closers, and sentence structures.` : ""}` },

            (() => {
              if (isReplyToReply && (hasOriginalImg || hasMyCommentImg || hasTheirReplyImg)) {
                const parts: ChatContentPart[] = [{ type: "text", text: userInstruction }];
                if (hasOriginalImg) {
                  parts.push({ type: "text", text: "ORIGINAL POST SCREENSHOT:" });
                  parts.push({ type: "image_url", image_url: { url: originalPostImageDataUrl } });
                }
                if (hasMyCommentImg) {
                  parts.push({ type: "text", text: "YOUR PRIOR COMMENT SCREENSHOT:" });
                  parts.push({ type: "image_url", image_url: { url: myCommentImageDataUrl } });
                }
                if (hasTheirReplyImg) {
                  parts.push({ type: "text", text: "THEIR REPLY SCREENSHOT (this is the one you're answering):" });
                  parts.push({ type: "image_url", image_url: { url: theirReplyImageDataUrl } });
                }
                return { role: "user", content: parts };
              }
              return {
                role: "user",
                content: hasImage
                  ? [
                      { type: "text", text: userInstruction },
                      { type: "image_url", image_url: { url: imageDataUrl } },
                    ]
                  : userInstruction,
              };
            })(),

          ],
        }),
      });
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === "AbortError") {
        return new Response(JSON.stringify({ error: "AI took too long. Try a smaller image or retry." }), {
          status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw err;
    }
    clearTimeout(timeoutId);

    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, t);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${aiRes.status}`);
    }

    const data = await aiRes.json();
    let post = (data?.choices?.[0]?.message?.content || "").trim();
    if (!post) throw new Error("Empty response from AI");
    post = post.replace(/[—–]/g, ".");

    // Strip any model-generated URLs. Comments/replies should be human responses,
    // not traffic redirects or canned sales CTAs.
    post = post.replace(/https?:\/\/\S+/gi, "").replace(/\s{2,}/g, " ").trim();

    // Mode-aware character ceilings. LinkedIn truncates comments past ~1,250
    // chars, so we trim well below that and ALWAYS land on a sentence boundary
    // — never ship a half-thought, never blow past the platform limit.
    const MODE_CAP: Record<Mode, number> = { micro: 470, brief: 1150, medium: 1550, long: 2150, full: 2900 };
    const baseCap = maxCharsOverride ?? (isReplyToReply ? 650 : MODE_CAP[mode]);
    const HARD_CAP = baseCap;
    if (post.length > HARD_CAP) {
      const slice = post.slice(0, HARD_CAP);
      const lastStop = Math.max(
        slice.lastIndexOf(". "),
        slice.lastIndexOf("! "),
        slice.lastIndexOf("? "),
        slice.lastIndexOf("."),
        slice.lastIndexOf("!"),
        slice.lastIndexOf("?"),
      );
      if (lastStop > 120) {
        post = slice.slice(0, lastStop + 1).trim();
      } else {
        const lastSpace = slice.lastIndexOf(" ");
        post = (lastSpace > 0 ? slice.slice(0, lastSpace) : slice).trim().replace(/[,;:]+$/, "") + ".";
      }
    }

    return new Response(JSON.stringify({ post }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("linkedin-post-respond error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
