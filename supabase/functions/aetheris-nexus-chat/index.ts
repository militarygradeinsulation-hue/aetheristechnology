// Aetheris Nexus AI — premium streaming chat with tools
// POST { messages: [{role, content, attachments?}], model?, useSearch? }
// Streams OpenAI-compatible SSE chat completions back to the client.
// Tools: web_search (DuckDuckGo), scan_company (forensic-scan-all), consult_company

import { INFLUENCE_BLUEPRINT_COMPACT, RECIPROCITY_OPENING_RULE } from "../_shared/influenceBlueprint.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
  "Access-Control-Expose-Headers": "x-lovable-aig-run-id",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

import { createClient } from "npm:@supabase/supabase-js@2";

// Aetheris IQ is a public tool — auth is OPTIONAL. If a signed-in user's JWT is
// present we resolve their id (useful for future rate-limit / attribution), but
// anonymous visitors are allowed through as well.
async function optionalAuth(req: Request): Promise<{ userId: string | null }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return { userId: null };
  const token = authHeader.replace("Bearer ", "");
  // Skip the JWT round-trip when the client sent the anon key itself.
  if (token === SUPABASE_ANON_KEY) return { userId: null };
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims?.sub) return { userId: null };
    return { userId: data.claims.sub as string };
  } catch {
    return { userId: null };
  }
}

const SYSTEM_PROMPT = `You are Aetheris Nexus — the premium AI operator built by Aetheris Technology / Chaos Theory Forensics. You are a forensic business operator, not a generic assistant. Tone: direct, sharp, useful. No corporate fluff.

Capabilities you have available as tools:
- web_search: live web search with citations
- scan_company: run a full forensic scan on any company URL (returns leak findings, opportunities, risk scores)
- consult_company: deep operator-level consulting based on scan data or attached documents

Behavior rules:
- When the user names a company or pastes a URL and asks "analyze / scan / look into / audit / consult on" → call scan_company, then synthesize a Leak Audit-style brief (visible leaks, dollar exposure, fix path).
- When the user asks about current events, prices, news, people, or anything that requires fresh info → call web_search and cite sources.
- When the user uploads a document/image, analyze it directly and tie insights back to the business context.
- For image generation requests (e.g. "create / draw / generate an image of ...") respond with: \`[GENERATE_IMAGE: <detailed prompt>]\` on its own line — the UI will render the image.
- Format with markdown. Use headers, lists, and **bold** for clarity. Cite sources as [1], [2] with a Sources section.
- Money is always USD with $ symbol.

You are not ChatGPT. You are Aetheris. Be opinionated.

${INFLUENCE_BLUEPRINT_COMPACT}

${RECIPROCITY_OPENING_RULE}`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the live web. Use for current events, prices, news, people, or any fresh info.",
      parameters: {
        type: "object",
        required: ["query"],
        properties: {
          query: { type: "string", description: "Search query" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "scan_company",
      description: "Run a full forensic scan on a company website. Returns leak findings, opportunities, risk scores, brand analysis. Use when the user asks to analyze, scan, audit, look into, or consult on a company.",
      parameters: {
        type: "object",
        required: ["url"],
        properties: {
          url: { type: "string", description: "Company website URL (e.g. https://example.com)" },
          company: { type: "string", description: "Optional company name" },
        },
      },
    },
  },
];

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// ─── Tool implementations ──────────────────────────────────────────────────
async function webSearch(query: string) {
  try {
    const r = await fetch(`https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: { "User-Agent": "Mozilla/5.0 (Aetheris/1.0)" },
    });
    const html = await r.text();
    const results: Array<{ title: string; url: string; snippet: string }> = [];
    const re = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    let m;
    while ((m = re.exec(html)) && results.length < 8) {
      const cleanUrl = decodeURIComponent(m[1].replace(/^\/\/duckduckgo\.com\/l\/\?uddg=/, "").split("&")[0]);
      const title = m[2].replace(/<[^>]+>/g, "").trim();
      const snippet = m[3].replace(/<[^>]+>/g, "").trim();
      if (title && cleanUrl.startsWith("http")) results.push({ title, url: cleanUrl, snippet });
    }
    return { results };
  } catch (e) {
    return { error: String(e), results: [] };
  }
}

async function scanCompany(url: string, company?: string, adminToken?: string) {
  try {
    // Kick off scan
    const startRes = await fetch(`${SUPABASE_URL}/functions/v1/forensic-scan-all`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(adminToken ? { "x-admin-token": adminToken } : {}),
        Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY") || ""}`,
      },
      body: JSON.stringify({ url, company }),
    });
    const startData = await startRes.json();
    const scanId = startData?.scan_id;
    if (!scanId) return { error: "Failed to start scan", detail: startData };

    // Poll up to ~45s (scans that take longer will resolve async; we return
    // scan_id so the model can tell the user to check back).
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      const pollRes = await fetch(`${SUPABASE_URL}/functions/v1/forensic-scan-all?id=${scanId}`, {
        headers: { Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY") || ""}` },
      });
      const row = await pollRes.json();
      if (row?.status === "completed" && row?.report) {
        return { scan_id: scanId, report: row.report, summary: row.report?.executive_summary || null };
      }
      if (row?.status === "failed") return { error: "Scan failed", scan_id: scanId };
    }
    return { error: "Scan still running", scan_id: scanId, note: "Tell the user the scan is in progress and results will be available shortly at /report/" + scanId };
  } catch (e) {
    return { error: String(e) };
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  await optionalAuth(req); // public tool — auth is optional

  if (!LOVABLE_API_KEY) return json({ error: "Missing LOVABLE_API_KEY" }, 500);

  let body: { messages?: any[]; model?: string; useSearch?: boolean };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const incoming = Array.isArray(body.messages) ? body.messages : [];
  if (incoming.length === 0) return json({ error: "messages required" }, 400);

  const model = body.model || "google/gemini-3-flash-preview";
  const adminToken = req.headers.get("x-admin-token") || undefined;

  // Build message list with system prompt
  const messages: any[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...incoming,
  ];

  // Gate tools by intent. Attaching tools on every call forces the model to
  // spend latency deciding whether to invoke them, and often triggers a
  // multi-second scan/search on plain chat. Only enable when the latest user
  // turn actually signals a scan or a live-web question.
  const lastUser = [...incoming].reverse().find((m) => m?.role === "user");
  const lastText = typeof lastUser?.content === "string"
    ? lastUser.content
    : Array.isArray(lastUser?.content)
      ? lastUser.content.map((p: any) => p?.text || "").join(" ")
      : "";
  const hasUrl = /https?:\/\/\S+|\bwww\.\S+\.\w{2,}/i.test(lastText);
  const scanIntent = /\b(scan|audit|analyze|analyse|look\s+into|consult\s+on|forensic|leak\s+audit)\b/i.test(lastText);
  const searchIntent = body.useSearch === true ||
    /\b(search|google|latest|current|news|today|price of|stock|weather|who is|what is happening)\b/i.test(lastText);
  const enabledTools = [
    ...(scanIntent || hasUrl ? [TOOLS[1]] : []),
    ...(searchIntent ? [TOOLS[0]] : []),
  ];
  const useTools = enabledTools.length > 0;

  // Tool-calling loop (server-side resolution), then final streaming reply.
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

      try {
        // Loop until model returns a non-tool response (max 5 rounds when
        // tools are enabled; a single streaming call otherwise).
        const maxRounds = useTools ? 8 : 1;
        for (let round = 0; round < maxRounds; round++) {
          const isFinalRound = round === maxRounds - 1;
          // On the final round, drop tools so the model MUST produce a text answer
          // instead of another tool call (which would trip "Max tool rounds exceeded").
          const includeTools = useTools && !isFinalRound;
          // Use streaming on every call so the user sees tokens immediately.
          const res = await fetch(AI_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model,
              messages,
              ...(includeTools ? { tools: enabledTools } : {}),
              stream: true,
            }),
          });


          if (!res.ok || !res.body) {
            const txt = await res.text().catch(() => "");
            send({ type: "error", error: `Gateway ${res.status}: ${txt}` });
            controller.close();
            return;
          }

          // Parse SSE deltas, accumulating tool calls and streaming text.
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buf = "";
          let started = false;
          let finalContent = "";
          const toolCallsAcc: any[] = []; // index -> { id, function:{name, arguments} }

          outer: while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const lines = buf.split("\n");
            buf = lines.pop() || "";
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;
              const payload = trimmed.slice(5).trim();
              if (payload === "[DONE]") break outer;
              let evt: any;
              try { evt = JSON.parse(payload); } catch { continue; }
              const delta = evt.choices?.[0]?.delta;
              if (!delta) continue;
              if (typeof delta.content === "string" && delta.content.length > 0) {
                if (!started) { send({ type: "message_start" }); started = true; }
                finalContent += delta.content;
                send({ type: "delta", text: delta.content });
              }
              if (Array.isArray(delta.tool_calls)) {
                for (const tc of delta.tool_calls) {
                  const idx = tc.index ?? 0;
                  if (!toolCallsAcc[idx]) {
                    toolCallsAcc[idx] = { id: tc.id || `call_${idx}`, type: "function", function: { name: "", arguments: "" } };
                  }
                  if (tc.id) toolCallsAcc[idx].id = tc.id;
                  if (tc.function?.name) toolCallsAcc[idx].function.name = tc.function.name;
                  if (tc.function?.arguments) toolCallsAcc[idx].function.arguments += tc.function.arguments;
                }
              }
            }
          }

          // If model produced text and no tool calls → done.
          if (toolCallsAcc.length === 0) {
            if (!started) { send({ type: "message_start" }); send({ type: "delta", text: finalContent }); }
            send({ type: "done" });
            controller.close();
            return;
          }

          if (isFinalRound) {
            send({ type: "error", error: "Max tool rounds exceeded" });
            controller.close();
            return;
          }

          // Append assistant tool-call message and execute tools.
          messages.push({ role: "assistant", content: finalContent || null, tool_calls: toolCallsAcc });

          for (const tc of toolCallsAcc) {
            const name = tc.function?.name;
            let args: any = {};
            try { args = JSON.parse(tc.function?.arguments || "{}"); } catch {}
            send({ type: "tool_start", name, args });

            let result: any;
            if (name === "web_search") {
              result = await webSearch(args.query || "");
            } else if (name === "scan_company") {
              result = await scanCompany(args.url, args.company, adminToken);
            } else {
              result = { error: `Unknown tool ${name}` };
            }

            send({ type: "tool_result", name, result });

            messages.push({
              role: "tool",
              tool_call_id: tc.id,
              content: JSON.stringify(result).slice(0, 50000),
            });
          }
        }


        send({ type: "error", error: "Max tool rounds exceeded" });
        controller.close();
      } catch (e) {
        send({ type: "error", error: String(e) });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
});
