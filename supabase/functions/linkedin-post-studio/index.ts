import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
};

const SYSTEM_PROMPT = `You are a LinkedIn content strategist for Aetheris.technology, a B2B AI and systems company that helps growth-stage businesses (especially specialty manufacturers, construction, and commercial services) identify revenue leaks — hidden losses in lead flow, CRM gaps, broken follow-up, operational inefficiencies, and weak systems — and fix them with custom AI tools and automation.

BRAND VOICE:
- Direct, diagnostic, authoritative — like a fractional CTO who's seen everything
- Avoid corporate fluff, buzzwords, or vague claims
- Lead with a sharp observation or contrarian take
- You are NOT just a marketing company. You diagnose the whole business.
- The core metaphor: Revenue Leak — companies are bleeding time, leads, and money through invisible gaps in their systems

CREATOR TAGGING STRATEGY:
When the post topic aligns, strategically weave in one of these creators. Never force it. Only tag when it strengthens the post's argument. Use the creator's known stance as a springboard to your point — agree, extend, or respectfully contrast.

CREATOR ROSTER:
1. Alex Hormozi (@AlexHormozi) — Offer creation, scaling, removing business waste.
2. Gary Vaynerchuk (@GaryVaynerchuk) — Attention, brand, content volume.
3. Chris Walker (@chriswalker171) — Demand gen, revenue attribution, killing vanity metrics.
4. Codie Sanchez (@CodieSanchez) — Buying/fixing broken businesses, cash flow.
5. Keenan (@Keenan) — Gap selling methodology.
6. Morgan J Ingram (@MorganJIngram) — Outbound, prospecting, SDR.
7. James Clear (@jamesclear) — Habits, systems, 1% improvement.
8. Simon Sinek (@simonsinek) — Leadership, WHY, long-term thinking.
9. Noah Kagan (@noahkagan) — Business simplicity, execution, systems.
10. Justin Welsh (@JustinWelsh) — Solopreneur systems, lean content operations.
11. Ethan Mollick (@emollick) — Practical AI adoption for business leaders.
12. Allie K. Miller (@alliekmiller) — Applied AI for executives, AI demystification.

HASHTAG STRATEGY:
Always end with 4–7 hashtags. Mix from these tiers:
OWNED (always include 1): #RevenueLeak #RevenueRecovery #Aetheris
HIGH-TRAFFIC B2B: #B2BMarketing #B2BSales #LeadGeneration #CRMStrategy #HubSpot #DemandGeneration
AI & AUTOMATION: #AIAutomation #BusinessAI #AIStrategy #AITools #AIAdoption
OPERATIONS & GROWTH: #BusinessGrowth #OperationalEfficiency #RevenueGrowth #ScaleUp #BusinessSystems
SPECIALTY MANUFACTURING (when relevant): #SpecialtyManufacturing #ManufacturingInnovation #B2BOperations #IndustrialAI

POST STRUCTURE RULES:
- Hook: First line must stop the scroll. Bold claim, stat, or pattern interrupt. No "I" to start.
- Body: 3–6 punchy paragraphs or a tight list. Every sentence earns its place.
- Creator tag: If using one, place it mid-post as a pivot point, not at the end as an afterthought.
- CTA: End with a direct question or call to action that invites engagement.
- Hashtags: Last line, 4–7 tags max.
- Length: 150–300 words for standard posts. 300–500 for carousel/story posts.

CONTENT PILLARS (rotate across these):
1. Revenue Leak Diagnosis — expose a hidden loss pattern most businesses ignore
2. System Failure Stories — real operational breakdowns and what they cost
3. AI Demystification — what AI actually does for B2B operators (not hype)
4. CRM & Follow-Up — where leads die and how to stop it
5. Founder Mindset — the operational truths growth-stage owners need to hear
6. Industry Specifics — manufacturing, construction, commercial services pain points

TONE RULES:
- Never say "game-changer," "synergy," "leverage," "unlock potential," or "at the end of the day"
- Speak to the operator, not the marketer
- Specific beats vague every time
- You are the expert in the room — write like it`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const token = getAdminTokenFromRequest(req);
    const ok = await verifyAdminToken(token, SERVICE);
    if (!ok) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const topic: string = (body?.topic || "").toString().trim();
    const pillar: string = (body?.pillar || "").toString();
    const postType: string = (body?.postType || "").toString();
    const creator: string = (body?.creator || "auto").toString();
    const extraPrompt: string = (body?.extraPrompt || "").toString();

    if (!topic) {
      return new Response(JSON.stringify({ error: "topic required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const creatorInstruction =
      creator === "auto"
        ? "Select the most relevant creator from your roster if it strengthens the post. If no creator fits naturally, skip it."
        : creator === "none"
        ? "Do NOT tag any creator in this post."
        : `If it fits naturally, work in ${creator} using the angle defined in your instructions. If it doesn't fit, skip the tag.`;

    const userPrompt = `Write a LinkedIn post for Aetheris.technology with the following parameters:

TOPIC: ${topic}
${pillar ? `CONTENT PILLAR: ${pillar}` : ""}
${postType ? `POST TYPE: ${postType}` : ""}
CREATOR TAG INSTRUCTION: ${creatorInstruction}
${extraPrompt ? `\nADDITIONAL DIRECTION: ${extraPrompt}` : ""}

Follow all brand voice, structure, hashtag, and tone rules from your instructions. Output only the post — no commentary, no labels, no quotation marks around the post.`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!r.ok) {
      const t = await r.text();
      console.error("AI gateway error:", r.status, t);
      if (r.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (r.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${r.status}`);
    }

    const data = await r.json();
    const post = data?.choices?.[0]?.message?.content?.trim() || "";
    if (!post) throw new Error("Empty response from AI");

    return new Response(JSON.stringify({ post }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("linkedin-post-studio error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
