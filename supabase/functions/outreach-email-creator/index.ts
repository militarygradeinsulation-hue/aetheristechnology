// Outreach Email Creator — shared by admins and reps.
// Accepts admin token OR portal token. Generates bold, direct outreach emails
// in the Aetheris voice. NEVER outputs dashes (em, en, hyphen-as-pause).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyAdminToken } from "../_shared/admin-token.ts";
import { verifyPortalToken } from "../_shared/portal-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token, x-portal-token",
};

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SYSTEM_PROMPT = `You write outreach emails for Aetheris (Business Forensics Operators).

DEFAULT VOICE: blunt, forensic, operator. We are not consultants. We are not influencers. We do not flatter. We name the leak.

HARD RULES (non-negotiable):
1. NEVER use dashes of any kind. No em dash. No en dash. No hyphen used as a pause. Use a period or a comma instead. The only place a hyphen is allowed is inside a proper compound word like "follow-up" or a URL.
2. No corporate filler. No "I hope this finds you well." No "just checking in." No "circling back."
3. No emoji. No exclamation points.
4. Short sentences. One idea per line.
5. Subject line is under 7 words. Specific. Never generic.
6. Open with a specific observation about the prospect. Never start with "Hi {Name}, I came across..."
7. Close with a low-friction ask. A 12 minute call. A reply with one number. Not "let me know if interested."
8. Max 140 words in the body.

TONE/PERSONALITY: If the user specifies a tone and/or personality, ADAPT the voice while keeping the hard rules. Tone shifts cadence and warmth. Personality shifts the operator archetype. The hard rules above are always enforced.

If an image is provided, treat it as the prospect's website, ad, social post, or storefront. Pull the most damning specific detail and lead with it.

Return the email as a JSON tool call with subject + body. Do not include any greeting like "Hi {Name}" unless the user gave you a name. Do not sign off with a name; the rep will add their signature.`;

const CRITIQUE_SYSTEM_PROMPT = `You are a fair, evidence-based email critic for Aetheris reps. You score every email on a measurable 0 to 100 rubric. You are not a vibes critic.

CORE PSYCHOLOGY (the lens behind every score):
A great outreach email keeps the reader's guard LOW. It reads peer-to-peer. It leads with a specific observation about THEM, not us. It earns the right to ask anything by being useful first. It has exactly ONE low-friction ask phrased as a question, not a demand. The moment the reader feels they are being SOLD to, the guard goes up and the email is dead.

GROUND RULES:
1. Only flag REAL problems. Quote the exact offending text from the email verbatim. If you cannot quote it, do not flag it.
2. Do NOT invent problems to fill a quota. A strong email can have ZERO problems. Be honest.
3. Do NOT downgrade an email just because it does not match your personal taste. Judge against: clarity, specificity, opener strength, ask strength, length, tone consistency, and how low it keeps the reader's guard.
4. Dashes (em, en, or hyphen-as-pause) and emoji ARE legitimate problems IF they actually appear in the draft.
5. If the email is already strong, say so. Grade A or B, score 70 or above. Keep "problems" short or empty. Put praise in "what_works".
6. The "rewritten_body" must preserve the writer's intent and any concrete facts. Tighten, do not replace. No dashes. Under 140 words.
7. You are critiquing the DRAFT the rep submitted. Never critique your own rewrite.

SCORING (0 to 100, sum of 6 pillars):
- opener (max 20): Specific observation about THEM in line 1. Generic = 0 to 5. Specific + earned = 16 to 20.
- specificity (max 20): Concrete facts, numbers, named details about the prospect's business. Vague = 0 to 5. Forensic-specific = 16 to 20.
- guard_low (max 20): Reads peer-to-peer, no sales pressure, no jargon. Salesy = 0 to 5. Disarming = 16 to 20.
- clarity (max 15): Short sentences, one idea per line, no filler, under 140 words.
- ask (max 15): Exactly ONE low-friction ask phrased as a question. Multiple CTAs or pushy = 0 to 5.
- tone_fit (max 10): Matches the requested tone/personality and stays consistent.

TRIGGER WORDS (cite them in trigger_words_found whenever they appear). These instantly raise the reader's guard:
- spam_trigger: "just checking in", "circling back", "touching base", "as per my last email", "per our conversation", "did you see my last email", "I hope this finds you well", "I hope you're doing well", "to whom it may concern", "Dear Sir/Madam".
- sales_jargon: "synergy", "leverage" (as verb), "unlock", "revolutionary", "game-changer", "cutting-edge", "world-class", "best-in-class", "ROI", "solution", "solutions", "value-add", "value prop", "our platform", "our software", "our solution", "scalable solution", "at scale", "move the needle", "low-hanging fruit", "boil the ocean", "take this offline", "bandwidth", "align", "alignment", "holistic", "seamless", "robust", "transformative", "paradigm", "disrupting".
- guard_raiser: "hop on a call", "quick call", "quick chat", "15 minutes", "30 minutes", "book a demo", "schedule a demo", "pick your brain", "partnership opportunity", "partner with you" (as ask), "when we work together" (presumptive).
- fake_flattery: generic "loved your post", "huge fan", "impressive work", "passionate", generic "Congratulations on" without a specific reason.
- false_urgency: "exclusive offer", "limited time", "act now", "don't miss out", "special discount".
- corporate_filler: any sentence that could be deleted without losing meaning.

For each trigger you find: quote the exact phrase, classify it, explain why it raises the guard in 1 sentence, and give a concrete swap_with replacement the rep can paste in.

GUARD METER:
- low: Reader will keep reading. No sales pressure detected.
- medium: Reader senses a pitch coming. Mixed signals.
- high: Reader is bracing for a sales pitch. Likely to skim or delete.
- hostile: Reader feels actively sold to. Likely to delete or report as spam.

Return the critique via the analyze_email tool. Pillar scores must sum to total_score. score_bar mapping: 85+ elite, 70 to 84 strong, 55 to 69 decent, 35 to 54 weak, under 35 danger.`;

const LINKEDIN_INTRO_SYSTEM_PROMPT = `You write FIRST-TOUCH LinkedIn DMs for Aetheris reps.

This is an INTRODUCTION. It is not a pitch. It is not a sales message. It is a human reaching out to another human on LinkedIn.

HARD RULES:
1. NEVER pitch. Do not mention Aetheris, "audit", "leak", "diagnostic", services, calls, meetings, or any next step beyond "happy to connect" or a single curious question.
2. NEVER ask for a call, demo, intro, 15 minutes, "quick chat", or any time on the calendar.
3. NEVER use dashes (em, en, hyphen-as-pause). Use periods or commas. Hyphens only inside compound words like "follow-up".
4. No emoji. No exclamation points. No flattery ("love what you're doing", "huge fan", "impressive work"). No "I hope this finds you well."
5. 40 to 90 words. Short sentences. Reads like a real person, not a template.
6. Open with ONE specific, genuine observation about THEM (their post, role, company, industry, something they shipped). Prove you actually looked.
7. Add ONE short personal context line about why you're reaching out (shared interest, a question their work raised, a pattern in their space). NO product mention.
8. Close with EITHER a soft "open to connecting / following your work" OR ONE genuine curious question. Never both. Never a CTA.
9. No subject line. LinkedIn DMs do not have subjects.

TONE: warm, curious, peer-to-peer, low-pressure. Sounds like a competent operator who reached out because they were genuinely interested, not because they want something.

If a tone or personality is specified, adapt the cadence but keep ALL hard rules. The point: zero sales pressure on the first touch.

Return the message via the write_linkedin_intro tool.`;

const EMAIL_TOOL = {
  type: "function",
  function: {
    name: "write_outreach_email",
    description: "Write a bold, direct outreach email in the Aetheris voice.",
    parameters: {
      type: "object",
      properties: {
        subject: { type: "string", description: "Under 7 words. Specific. No dashes." },
        body: { type: "string", description: "Under 140 words. Short lines. No dashes. No emoji." },
        why_it_works: { type: "string", description: "One sentence operator note explaining the leverage." },
      },
      required: ["subject", "body", "why_it_works"],
      additionalProperties: false,
    },
  },
};

const LINKEDIN_INTRO_TOOL = {
  type: "function",
  function: {
    name: "write_linkedin_intro",
    description: "Write a soft, non-salesy first-touch LinkedIn DM. No pitch, no CTA to a call.",
    parameters: {
      type: "object",
      properties: {
        body: { type: "string", description: "40 to 90 words. No subject. No dashes. No pitch. No call ask." },
        why_it_works: { type: "string", description: "One sentence on why this opener is hard to ignore without feeling sold to." },
      },
      required: ["body", "why_it_works"],
      additionalProperties: false,
    },
  },
};

const SUBJECT_TOOL = {
  type: "function",
  function: {
    name: "write_subject_hooks",
    description: "Write 10 bold, direct subject line hooks in the Aetheris operator voice.",
    parameters: {
      type: "object",
      properties: {
        hooks: {
          type: "array",
          minItems: 8,
          maxItems: 12,
          items: {
            type: "object",
            properties: {
              subject: { type: "string", description: "Under 7 words. Specific. No dashes. No emoji." },
              angle: { type: "string", enum: ["leak", "number", "observation", "contrarian", "curiosity", "challenge"] },
              why: { type: "string", description: "One short sentence on why it lands." },
            },
            required: ["subject", "angle", "why"],
            additionalProperties: false,
          },
        },
      },
      required: ["hooks"],
      additionalProperties: false,
    },
  },
};

const ANALYZE_TOOL = {
  type: "function",
  function: {
    name: "analyze_email",
    description: "Forensic critique of an email draft. Brutally honest. No flattery.",
    parameters: {
      type: "object",
      properties: {
        overall_grade: { type: "string", enum: ["A", "B", "C", "D", "F"] },
        verdict: { type: "string", description: "One-sentence operator verdict. Blunt. No dashes." },
        subject_critique: {
          type: "object",
          properties: {
            current: { type: "string", description: "The subject line as written, or '(none detected)'." },
            score: { type: "integer", minimum: 1, maximum: 10 },
            problems: { type: "array", items: { type: "string" } },
            rewrites: { type: "array", minItems: 3, maxItems: 5, items: { type: "string" } },
          },
          required: ["current", "score", "problems", "rewrites"],
          additionalProperties: false,
        },
        problems: {
          type: "array",
          items: {
            type: "object",
            properties: {
              severity: { type: "string", enum: ["critical", "major", "minor"] },
              category: { type: "string", enum: ["voice", "opener", "specificity", "filler", "length", "ask", "formatting", "dashes", "emoji", "subject", "tone", "structure"] },
              quote: { type: "string", description: "Exact offending text from the email." },
              issue: { type: "string", description: "Why it fails." },
              fix: { type: "string", description: "What to do instead. Concrete." },
            },
            required: ["severity", "category", "quote", "issue", "fix"],
            additionalProperties: false,
          },
        },
        what_works: { type: "array", items: { type: "string" } },
        rewritten_body: { type: "string", description: "Full rewritten body in the Aetheris voice. No dashes. Under 140 words." },
        next_moves: { type: "array", minItems: 2, maxItems: 5, items: { type: "string" } },
        total_score: { type: "integer", minimum: 0, maximum: 100, description: "Sum of pillar scores. 0 to 100." },
        score_bar: { type: "string", enum: ["danger", "weak", "decent", "strong", "elite"] },
        pillars: {
          type: "array",
          minItems: 6,
          maxItems: 6,
          description: "Exactly 6 pillars in this order: opener, specificity, guard_low, clarity, ask, tone_fit.",
          items: {
            type: "object",
            properties: {
              key: { type: "string", enum: ["opener", "specificity", "guard_low", "clarity", "ask", "tone_fit"] },
              label: { type: "string" },
              score: { type: "integer", minimum: 0, maximum: 20 },
              max: { type: "integer", enum: [10, 15, 20] },
              note: { type: "string", description: "One blunt sentence on why this score." },
            },
            required: ["key", "label", "score", "max", "note"],
            additionalProperties: false,
          },
        },
        trigger_words_found: {
          type: "array",
          items: {
            type: "object",
            properties: {
              phrase: { type: "string", description: "Exact phrase quoted from the draft." },
              category: { type: "string", enum: ["spam_trigger", "sales_jargon", "guard_raiser", "fake_flattery", "false_urgency", "corporate_filler"] },
              why_bad: { type: "string" },
              swap_with: { type: "string", description: "Concrete replacement the rep can paste in." },
            },
            required: ["phrase", "category", "why_bad", "swap_with"],
            additionalProperties: false,
          },
        },
        guard_meter: {
          type: "object",
          properties: {
            level: { type: "string", enum: ["low", "medium", "high", "hostile"] },
            why: { type: "string" },
            fix: { type: "string" },
          },
          required: ["level", "why", "fix"],
          additionalProperties: false,
        },
      },
      required: ["overall_grade", "verdict", "subject_critique", "problems", "what_works", "rewritten_body", "next_moves", "total_score", "score_bar", "pillars", "trigger_words_found", "guard_meter"],
      additionalProperties: false,
    },
  },
};

function stripDashes(s: string): string {
  if (!s) return s;
  // Replace em / en dashes used as pauses with periods.
  let out = s.replace(/\s*[—–]\s*/g, ". ");
  // Hyphen used as a pause (space hyphen space) -> period.
  out = out.replace(/\s+-\s+/g, ". ");
  // Collapse accidental ". ." sequences and stray double periods.
  out = out.replace(/\.\s*\.+/g, ".").replace(/\s{2,}/g, " ").trim();
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminToken = req.headers.get("x-admin-token");
    const portalToken = req.headers.get("x-portal-token");

    let authed: { kind: "admin" | "rep"; code?: string } | null = null;
    if (adminToken && (await verifyAdminToken(adminToken, SERVICE))) {
      authed = { kind: "admin" };
    } else if (portalToken) {
      const claims = await verifyPortalToken(portalToken, SERVICE);
      if (claims) authed = { kind: "rep", code: claims.code };
    }
    if (!authed) {
      return json({ error: "Unauthorized" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const mode: "create" | "rewrite" | "subjects" | "analyze" | "linkedin_intro" =
      body.mode === "rewrite" ? "rewrite"
        : body.mode === "subjects" ? "subjects"
        : body.mode === "analyze" ? "analyze"
        : body.mode === "linkedin_intro" || body.mode === "linkedin-intro" ? "linkedin_intro"
        : "create";
    const prompt: string = (body.prompt || "").toString().slice(0, 4000);
    const pastedText: string = (body.pastedText || "").toString().slice(0, 8000);
    const recipientName: string = (body.recipientName || "").toString().slice(0, 80);
    const senderName: string = (body.senderName || "").toString().slice(0, 80);
    const imageBase64: string | null = body.imageBase64 ? String(body.imageBase64).slice(0, 5_500_000) : null;
    const imageMime: string = (body.imageMime || "image/png").toString();
    const tone: string = (body.tone || "").toString().slice(0, 60);
    const personality: string = (body.personality || "").toString().slice(0, 60);

    if (!prompt && !pastedText && !imageBase64) {
      return json({ error: "Provide a prompt, pasted email, or an image." }, 400);
    }

    const styleLine = (tone || personality)
      ? `\nTONE: ${tone || "(default operator)"}\nPERSONALITY: ${personality || "(default operator)"}\n`
      : "";

    let userInstruction = "";
    if (mode === "rewrite") {
      userInstruction = `Rewrite the following email. Keep the intent and any concrete facts. Remove ALL dashes. Cut filler. Make it specific.${styleLine}\nORIGINAL:\n${pastedText}\n\nADDITIONAL CONTEXT:\n${prompt || "(none)"}`;
    } else if (mode === "subjects") {
      userInstruction = `Write 10 subject line hooks for a cold outreach email to this prospect. Each must be under 7 words, specific, and pass the "would you open this" test. Vary the angle: some name a leak, some lead with a number, some make a specific observation, some take a contrarian stance, some create curiosity, some issue a challenge. No filler. No emoji. No dashes.${styleLine}\nRECIPIENT: ${recipientName || "(unknown)"}\nCONTEXT / ANGLE: ${prompt || "(none)"}${pastedText ? `\n\nREFERENCE MATERIAL:\n${pastedText}` : ""}`;
    } else if (mode === "analyze") {
      userInstruction = `Critique the outreach email below. Follow the GROUND RULES strictly. Only flag problems you can quote verbatim. Do not invent problems to fill space. If the email is already strong, grade it A or B and leave the problems array short or empty. The rewritten_body should preserve the writer's intent and any concrete facts; tighten, do not replace.\n\n${pastedText ? `EMAIL DRAFT:\n${pastedText}\n\n` : "(no pasted text; read the screenshot)\n\n"}${prompt ? `EXTRA CONTEXT: ${prompt}` : ""}`;
    } else if (mode === "linkedin_intro") {
      userInstruction = `Write a SOFT, NON-SALESY first-touch LinkedIn DM. This is the very first time the rep is reaching out. Do NOT pitch. Do NOT ask for a call or meeting. Open with one specific, genuine observation about the recipient or their company. End with either a soft "open to connecting" line OR ONE genuine curious question. 40 to 90 words. No subject.${styleLine}\nRECIPIENT: ${recipientName || "(unknown)"}\nSENDER NAME: ${senderName || "(unknown)"}\nCONTEXT ABOUT THE RECIPIENT (their work, post, role, company, industry): ${prompt || "(none)"}${pastedText ? `\n\nREFERENCE MATERIAL (their post / profile / site copy):\n${pastedText}` : ""}`;
    } else {
      userInstruction = `Write a cold outreach email.${styleLine}\nRECIPIENT NAME: ${recipientName || "(unknown)"}\nSENDER NAME: ${senderName || "(unknown)"}\nCONTEXT / ANGLE: ${prompt || "(none)"}${pastedText ? `\n\nREFERENCE MATERIAL:\n${pastedText}` : ""}`;
    }

    const userContent: any[] = [{ type: "text", text: userInstruction }];
    if (imageBase64) {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:${imageMime};base64,${imageBase64}` },
      });
    }

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) throw new Error("LOVABLE_API_KEY missing");

    const tool = mode === "subjects" ? SUBJECT_TOOL : mode === "analyze" ? ANALYZE_TOOL : mode === "linkedin_intro" ? LINKEDIN_INTRO_TOOL : EMAIL_TOOL;
    const systemPrompt = mode === "analyze" ? CRITIQUE_SYSTEM_PROMPT : mode === "linkedin_intro" ? LINKEDIN_INTRO_SYSTEM_PROMPT : SYSTEM_PROMPT;
    const res = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: tool.function.name } },
      }),
    });

    if (!res.ok) {
      if (res.status === 429) return json({ error: "Rate limited. Try again in a moment." }, 429);
      if (res.status === 402) return json({ error: "AI credits exhausted." }, 402);
      const t = await res.text();
      return json({ error: `AI gateway ${res.status}: ${t.slice(0, 200)}` }, 500);
    }

    const data = await res.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!call?.function?.arguments) throw new Error("No result returned");
    const parsed = JSON.parse(call.function.arguments);

    if (mode === "subjects") {
      const hooks = (parsed.hooks || []).map((h: any) => ({
        subject: stripDashes(h.subject || ""),
        angle: h.angle || "observation",
        why: stripDashes(h.why || ""),
      }));
      return json({ mode, hooks, by: authed.kind === "rep" ? authed.code : "admin" });
    }

    if (mode === "analyze") {
      const sc = parsed.subject_critique || {};
      const analysis = {
        overall_grade: parsed.overall_grade || "C",
        verdict: stripDashes(parsed.verdict || ""),
        subject_critique: {
          current: stripDashes(sc.current || ""),
          score: typeof sc.score === "number" ? sc.score : 5,
          problems: (sc.problems || []).map((p: string) => stripDashes(p)),
          rewrites: (sc.rewrites || []).map((p: string) => stripDashes(p)),
        },
        problems: (parsed.problems || []).map((p: any) => ({
          severity: p.severity || "minor",
          category: p.category || "tone",
          quote: stripDashes(p.quote || ""),
          issue: stripDashes(p.issue || ""),
          fix: stripDashes(p.fix || ""),
        })),
        what_works: (parsed.what_works || []).map((s: string) => stripDashes(s)),
        rewritten_body: stripDashes(parsed.rewritten_body || ""),
        next_moves: (parsed.next_moves || []).map((s: string) => stripDashes(s)),
      };
      return json({ mode, analysis, by: authed.kind === "rep" ? authed.code : "admin" });
    }

    return json({
      subject: mode === "linkedin_intro" ? "" : stripDashes(parsed.subject || ""),
      body: stripDashes(parsed.body || ""),
      why_it_works: stripDashes(parsed.why_it_works || ""),
      mode,
      by: authed.kind === "rep" ? authed.code : "admin",
    });
  } catch (e) {
    console.error("outreach-email-creator error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(payload: any, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
