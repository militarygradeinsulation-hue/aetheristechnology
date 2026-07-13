// Recommends the top 3 Aetheris tools for a given URL, with reasons.
// Public: no auth. Uses Lovable AI Gateway.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Kept in sync with src/lib/tool-shop-catalog.ts
const TOOLS = [
  { id: "website-scanner", name: "Website Leak Scanner", tagline: "Live scan for revenue leaks on any URL." },
  { id: "brand-contradictions", name: "Brand Contradictions", tagline: "Where the brand says one thing and does another." },
  { id: "friction-audit", name: "Friction Audit", tagline: "Every buyer step that quietly costs them deals." },
  { id: "strategic-questions", name: "Strategic Questions", tagline: "Boardroom questions leadership is avoiding." },
  { id: "detective-mode", name: "Detective Mode", tagline: "Deep forensic sweep on a single business surface." },
  { id: "forensic-scan-all", name: "Forensic Scan (All)", tagline: "Runs every diagnostic in one shot." },
  { id: "all-in-one", name: "All-In-One Content", tagline: "Blog + social + email from one prompt." },
  { id: "content-calendar", name: "Content Calendar Builder", tagline: "30 days of aligned content on autopilot." },
  { id: "playbook-generator", name: "Playbook Generator", tagline: "Custom operating playbooks for any function." },
  { id: "social-content", name: "Social Content Studio", tagline: "Voice-locked social posts, endless supply." },
  { id: "content-engine", name: "Content Engine", tagline: "Long-form + short-form pipeline in one place." },
  { id: "image-studio", name: "Image Studio", tagline: "On-brand imagery + watermarks in seconds." },
  { id: "creation-studio", name: "Creation Studio", tagline: "Mixed-media asset generator with memory." },
  { id: "easy-mode", name: "Easy Mode", tagline: "Rewrites any output in plain-English, paste-ready copy." },
  { id: "tool-generator", name: "Tool Generator", tagline: "Build a mini-tool from a plain-English brief." },
  { id: "golden-report", name: "Golden Report", tagline: "Flagship forensic report that closes retainers." },
  { id: "head-to-head", name: "Head-to-Head Report", tagline: "Side-by-side competitor comparison." },
  { id: "resume-forensics", name: "Resume Forensics", tagline: "Rewrites resumes to beat ATS filters." },
  { id: "reciprocation", name: "Reciprocation Gift", tagline: "Free custom door-opener report." },
  { id: "ai-checklist", name: "AI Readiness Checklist", tagline: "Score a business on AI-readiness." },
  { id: "nexus-iq", name: "Prospect Intel · Nexus IQ", tagline: "Full pre-meeting dossier on any target." },
  { id: "sales-scripts", name: "Sales Scripts", tagline: "Cold, warm, and follow-up scripts." },
  { id: "follow-up-plan", name: "Follow-Up Sequences", tagline: "Post-meeting email plays that keep deals alive." },
  { id: "linkedin-playbook", name: "LinkedIn Playbook", tagline: "Profile-to-lead-machine system." },
];

async function fetchSiteSnippet(url: string): Promise<string> {
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(url, { signal: ctrl.signal, headers: { "user-agent": "Mozilla/5.0 AetherisBot" } });
    clearTimeout(to);
    const html = await r.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return text.slice(0, 6000);
  } catch (e) {
    return "";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") return json({ error: "url required" }, 400);
    let normalized = url.trim();
    if (!/^https?:\/\//i.test(normalized)) normalized = "https://" + normalized;

    const snippet = await fetchSiteSnippet(normalized);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI not configured" }, 500);

    const catalog = TOOLS.map(t => `- ${t.id} :: ${t.name} — ${t.tagline}`).join("\n");
    const system = `You are the Aetheris Business Forensics Operator. Given a business URL and a snippet of its site content, pick the TOP 3 tools from the catalog that would remove the most workload / plug the biggest leaks for that specific business. Blunt, forensic tone. No fluff.

Return STRICT JSON:
{"summary":"1-2 sentence read of what this business is and its biggest leak","picks":[{"id":"tool-id","reason":"1-2 sentence why THIS business needs this tool. Reference something specific from their site."}]}

Only use ids from the catalog. Exactly 3 picks.`;

    const user = `URL: ${normalized}\n\nSITE SNIPPET:\n${snippet || "(could not fetch — infer from URL/domain)"}\n\nCATALOG:\n${catalog}`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        response_format: { type: "json_object" },
      }),
    });
    if (resp.status === 429) return json({ error: "Rate limit — try again in a moment." }, 429);
    if (resp.status === 402) return json({ error: "AI credits exhausted." }, 402);
    if (!resp.ok) return json({ error: `AI gateway ${resp.status}: ${await resp.text()}` }, 500);
    const data = await resp.json();
    const raw = data?.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch { parsed = { summary: "", picks: [] }; }
    const validIds = new Set(TOOLS.map(t => t.id));
    const picks = Array.isArray(parsed.picks)
      ? parsed.picks.filter((p: any) => p && validIds.has(p.id)).slice(0, 3)
      : [];
    return json({ url: normalized, summary: parsed.summary || "", picks });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
