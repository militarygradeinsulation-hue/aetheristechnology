// Business Post Analyst — in-portal tool for reps & admins.
// Paste a LinkedIn/social post (text, URL screenshot, or image) and get back
// forensic prospect ammo: what they revealed, the leak, the angle to use,
// and a ready-to-send outreach hook in the Aetheris operator voice.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyAdminToken } from "../_shared/admin-token.ts";
import { verifyPortalToken } from "../_shared/portal-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token, x-portal-token",
};

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SYSTEM_PROMPT = `You are a Chaos Theory Forensics Operator analyzing a social/LinkedIn post for a sales rep at Aetheris.

VOICE: blunt, forensic, operator. We name leaks. We do not flatter. We do not coach like an influencer.

HARD RULES:
1. NEVER use em dashes, en dashes, or hyphens-as-pauses. Use periods or commas. Hyphens only inside compound words.
2. No emoji. No exclamation points. No corporate filler.
3. Short sentences. One idea per line.
4. Every output item must be specific to what the post reveals. No generic advice.
5. The outreach hook must reference an exact detail from the post and end with a low-friction ask (a number, a 12 minute call, a one-line reply).
6. Outreach hook body: under 110 words.

Return the analysis as a JSON tool call.`;

const ANALYZE_TOOL = {
  type: "function",
  function: {
    name: "analyze_business_post",
    description: "Forensic breakdown of a prospect's social/LinkedIn post.",
    parameters: {
      type: "object",
      properties: {
        post_summary: { type: "string", description: "One sentence. What this post is actually saying. No dashes." },
        author_signal: { type: "string", description: "What this reveals about the author/business (role, stage, pain, ego, blind spot)." },
        the_leak: { type: "string", description: "The specific business leak or weakness the post exposes. Be concrete." },
        leverage_points: {
          type: "array",
          minItems: 3,
          maxItems: 6,
          items: { type: "string", description: "Specific detail from the post you can use as ammo." },
        },
        suggested_angle: { type: "string", enum: ["leak-callout", "number-challenge", "contrarian", "specific-observation", "operator-curiosity", "playbook-offer"] },
        outreach_hook: {
          type: "object",
          properties: {
            subject: { type: "string", description: "Under 7 words. Specific. No dashes." },
            opener: { type: "string", description: "One sentence opener referencing an exact detail from the post." },
            body: { type: "string", description: "Under 110 words. Short lines. No dashes. Ends with a low-friction ask." },
          },
          required: ["subject", "opener", "body"],
          additionalProperties: false,
        },
        comment_reply: { type: "string", description: "A 1-2 sentence operator-voice public comment you could leave on the post. No flattery." },
        do_not_say: {
          type: "array",
          minItems: 2,
          maxItems: 5,
          items: { type: "string", description: "Phrases or angles that would tank this lead. Be specific." },
        },
        follow_up_move: { type: "string", description: "The exact next move if they don't respond in 3 days." },
      },
      required: [
        "post_summary",
        "author_signal",
        "the_leak",
        "leverage_points",
        "suggested_angle",
        "outreach_hook",
        "comment_reply",
        "do_not_say",
        "follow_up_move",
      ],
      additionalProperties: false,
    },
  },
};

function stripDashes(s: string): string {
  if (!s) return s;
  let out = s.replace(/\s*[—–]\s*/g, ". ");
  out = out.replace(/\s+-\s+/g, ". ");
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
    if (!authed) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const postText: string = (body.postText || "").toString().slice(0, 8000);
    const authorName: string = (body.authorName || "").toString().slice(0, 120);
    const authorRole: string = (body.authorRole || "").toString().slice(0, 200);
    const sourceUrl: string = (body.sourceUrl || "").toString().slice(0, 500);
    const extraContext: string = (body.extraContext || "").toString().slice(0, 2000);
    const imageBase64: string | null = body.imageBase64 ? String(body.imageBase64).slice(0, 5_500_000) : null;
    const imageMime: string = (body.imageMime || "image/png").toString();

    if (!postText && !imageBase64 && !sourceUrl) {
      return json({ error: "Provide post text, a screenshot, or a source URL." }, 400);
    }

    const userInstruction = `Analyze this prospect's social post.

AUTHOR: ${authorName || "(unknown)"}
ROLE/COMPANY: ${authorRole || "(unknown)"}
SOURCE URL: ${sourceUrl || "(none)"}

POST CONTENT:
${postText || "(see attached image)"}

EXTRA CONTEXT FROM REP: ${extraContext || "(none)"}

Give the rep ammo. Name the leak. Build the hook.`;

    const userContent: any[] = [{ type: "text", text: userInstruction }];
    if (imageBase64) {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:${imageMime};base64,${imageBase64}` },
      });
    }

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) throw new Error("LOVABLE_API_KEY missing");

    const res = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        tools: [ANALYZE_TOOL],
        tool_choice: { type: "function", function: { name: ANALYZE_TOOL.function.name } },
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

    const hook = parsed.outreach_hook || {};
    const analysis = {
      post_summary: stripDashes(parsed.post_summary || ""),
      author_signal: stripDashes(parsed.author_signal || ""),
      the_leak: stripDashes(parsed.the_leak || ""),
      leverage_points: (parsed.leverage_points || []).map((s: string) => stripDashes(s)),
      suggested_angle: parsed.suggested_angle || "specific-observation",
      outreach_hook: {
        subject: stripDashes(hook.subject || ""),
        opener: stripDashes(hook.opener || ""),
        body: stripDashes(hook.body || ""),
      },
      comment_reply: stripDashes(parsed.comment_reply || ""),
      do_not_say: (parsed.do_not_say || []).map((s: string) => stripDashes(s)),
      follow_up_move: stripDashes(parsed.follow_up_move || ""),
    };

    return json({ analysis, by: authed.kind === "rep" ? authed.code : "admin" });
  } catch (e) {
    console.error("business-post-analyst error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(payload: any, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
