// One-click AI agents: Detective, Marketer, Consultant, Programmer.
// Plan → Confirm → Execute. Execute auto-saves to admin_library.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const COMMON_VOICE = `
VOICE RULES (non-negotiable):
- Forensic operator tone. Blunt, present tense, no hedging.
- USD only ("$"). No emojis, hashtags, em-dashes, hype words ("unlock", "leverage", "synergy", "delve", "game-changer").
- Never sell. Never pitch Aetheris, Leak Audit, or any service.
- Trigger-word ban: "exclusive offer", "limited time", "guaranteed", "best in class",
  "revolutionary", "world-class", "innovative solution", "circle back", "touch base", "quick chat", "synergy".
- Guard-low style: write like you're sharing observations between colleagues, not pitching.
`;

const AGENTS: Record<string, { label: string; toolType: string; system: () => string }> = {
  detective: {
    label: "Detective",
    toolType: "agent_detective",
    system: () => `You are the DETECTIVE agent. Forensic analyst.
Return STRICT JSON only:
{
  "summary": "one sentence",
  "verdict": { "grade": "A"|"B"|"C"|"D"|"F", "score": 0-100, "annualLeakUSD": "$X,XXX" },
  "evidence": ["...up to 4"],
  "fixes": [{ "title": "...", "why": "...", "action": "..." }]
}
${COMMON_VOICE}`,
  },
  marketer: {
    label: "Marketer",
    toolType: "agent_marketer",
    system: () => `You are the MARKETER agent. STRICT JSON only:
{
  "summary": "...",
  "linkedinPosts": [{ "hook": "...", "body": "120-180 words" }],
  "coldEmails": [{ "subject": "...", "body": "70-110 words" }],
  "replies": ["..."]
}
${COMMON_VOICE}`,
  },
  consultant: {
    label: "Consultant",
    toolType: "agent_consultant",
    system: () => `You are the CONSULTANT agent. STRICT JSON only:
{
  "summary": "...",
  "diagnosis": ["..."],
  "ninetyDayPlan": [
    { "phase": "Days 1-30", "focus": "...", "moves": ["..."] },
    { "phase": "Days 31-60", "focus": "...", "moves": ["..."] },
    { "phase": "Days 61-90", "focus": "...", "moves": ["..."] }
  ],
  "kpis": ["..."],
  "risks": ["..."]
}
${COMMON_VOICE}`,
  },
  programmer: {
    label: "Programmer",
    toolType: "agent_programmer",
    system: () => `You are the PROGRAMMER agent. STRICT JSON only:
{
  "summary": "...",
  "fixes": [
    { "selector": "...", "field": "...", "before": "...", "after": "...", "why": "..." }
  ],
  "safety": "..."
}
${COMMON_VOICE}`,
  },
};

async function fetchPage(url: string): Promise<{ host: string; text: string }> {
  try {
    const u = new URL(url);
    const r = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 AetherisAgentsBot/1.0" },
      signal: AbortSignal.timeout(15000),
    });
    const html = await r.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 8000);
    return { host: u.host, text };
  } catch {
    return { host: "", text: "" };
  }
}

async function callAI(system: string, user: string) {
  const KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!KEY) throw new Error("LOVABLE_API_KEY missing");
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    }),
  });
  if (r.status === 429) throw new Error("Rate limit. Try again in a minute.");
  if (r.status === 402) throw new Error("AI credits exhausted.");
  if (!r.ok) throw new Error(`AI ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  const raw = j?.choices?.[0]?.message?.content || "{}";
  try { return JSON.parse(raw); } catch { return { summary: raw }; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();
    const agent = String(body.agent || "").toLowerCase();
    const def = AGENTS[agent];
    if (!def) return json({ error: "Unknown agent" }, 400);

    const mode = body.mode === "execute" ? "execute" : "plan";
    const url = (body.url || "").toString().trim();
    const brief = (body.brief || "").toString().trim().slice(0, 1200);

    if (mode === "plan") {
      const page = url ? await fetchPage(url) : { host: "", text: "" };
      const userMsg = [
        url ? `URL: ${url}` : "URL: (none)",
        page.host ? `HOST: ${page.host}` : "",
        brief ? `OPERATOR BRIEF: ${brief}` : "",
        body.includeHubspot ? "CONTEXT: HubSpot connected — reference CRM hygiene if relevant." : "",
        page.text ? `PAGE TEXT (truncated):\n${page.text}` : "",
      ].filter(Boolean).join("\n\n");

      const result = await callAI(def.system(), userMsg || "No page provided. Use the brief only.");
      return json({
        agent, label: def.label, mode: "plan", url, host: page.host,
        plan: result, requiresConfirm: true,
      });
    }

    const plan = body.plan;
    if (!plan) return json({ error: "Missing plan to execute" }, 400);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(SUPABASE_URL, SR);

    const title = `${def.label} · ${url ? new URL(url).host : (brief.slice(0, 40) || "no target")}`;
    const { data, error } = await sb
      .from("admin_library")
      .insert({
        tool_type: def.toolType,
        title: title.slice(0, 200),
        input_data: { url, brief, includeHubspot: !!body.includeHubspot, agent },
        output_data: plan,
      })
      .select()
      .single();
    if (error) throw error;

    const extras: any = {};
    if (agent === "programmer" && Array.isArray(plan?.fixes)) {
      extras.cmsFixes = plan.fixes.map((f: any) => ({
        selector: f.selector, field: f.field, before: f.before, after: f.after,
      }));
    }
    return json({ saved: true, item: data, ...extras });
  } catch (e: any) {
    return json({ error: e?.message || String(e) }, 500);
  }
});
