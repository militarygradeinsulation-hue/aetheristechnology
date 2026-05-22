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

VOICE: blunt, forensic, operator. We are not consultants. We are not influencers. We do not flatter. We name the leak.

HARD RULES (non-negotiable):
1. NEVER use dashes of any kind. No em dash. No en dash. No hyphen used as a pause. Use a period or a comma instead. The only place a hyphen is allowed is inside a proper compound word like "follow-up" or a URL.
2. No corporate filler. No "I hope this finds you well." No "just checking in." No "circling back."
3. No emoji. No exclamation points.
4. Short sentences. One idea per line. Body should read like the operator is standing across the desk.
5. Subject line is under 7 words. It implies a leak, a number, or a specific observation. Never generic.
6. Open with a specific observation about the prospect (from their site, post, or image). Never start with "Hi {Name}, I came across..."
7. Close with a low-friction ask. A 12 minute call. A reply with one number. Not "let me know if interested."
8. Max 140 words in the body.

If an image is provided, treat it as the prospect's website, ad, social post, or storefront. Pull the most damning specific detail and lead with it.

Return the email as a JSON tool call with subject + body. Do not include any greeting like "Hi {Name}" unless the user gave you a name. Do not sign off with a name; the rep will add their signature.`;

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
    const mode: "create" | "rewrite" = body.mode === "rewrite" ? "rewrite" : "create";
    const prompt: string = (body.prompt || "").toString().slice(0, 4000);
    const pastedText: string = (body.pastedText || "").toString().slice(0, 8000);
    const recipientName: string = (body.recipientName || "").toString().slice(0, 80);
    const senderName: string = (body.senderName || "").toString().slice(0, 80);
    const imageBase64: string | null = body.imageBase64 ? String(body.imageBase64).slice(0, 5_500_000) : null;
    const imageMime: string = (body.imageMime || "image/png").toString();

    if (!prompt && !pastedText && !imageBase64) {
      return json({ error: "Provide a prompt, pasted email, or an image." }, 400);
    }

    let userInstruction = "";
    if (mode === "rewrite") {
      userInstruction = `Rewrite the following email in the Aetheris operator voice. Keep the intent. Remove ALL dashes. Cut filler. Make it specific.\n\nORIGINAL:\n${pastedText}\n\nADDITIONAL CONTEXT:\n${prompt || "(none)"}`;
    } else {
      userInstruction = `Write a cold outreach email.\nRECIPIENT NAME: ${recipientName || "(unknown)"}\nSENDER NAME: ${senderName || "(unknown)"}\nCONTEXT / ANGLE: ${prompt || "(none)"}${pastedText ? `\n\nREFERENCE MATERIAL:\n${pastedText}` : ""}`;
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

    const res = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        tools: [EMAIL_TOOL],
        tool_choice: { type: "function", function: { name: "write_outreach_email" } },
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
    if (!call?.function?.arguments) throw new Error("No email returned");
    const parsed = JSON.parse(call.function.arguments);

    return json({
      subject: stripDashes(parsed.subject || ""),
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
