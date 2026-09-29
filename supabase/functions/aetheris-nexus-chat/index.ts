// Aetheris Nexus AI — premium streaming chat with tools
// POST { messages: [{role, content, attachments?}], model?, useSearch? }
// Streams OpenAI-compatible SSE chat completions back to the client.
// Tools: web_search (DuckDuckGo), scan_company (forensic-scan-all), consult_company

import { INFLUENCE_BLUEPRINT_COMPACT, RECIPROCITY_OPENING_RULE } from "../_shared/influenceBlueprint.ts";
import { sanitizedGoldenReport } from "../_shared/golden-money-sanitizer.ts";
import { architectIdentityPrompt } from "../_shared/architect-identity.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
  "Access-Control-Expose-Headers": "x-lovable-aig-run-id",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const AI_URL = "https://ai.gateway.lovable.dev/v1/responses";
const MODEL = "openai/gpt-6-astra";

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
    name: "web_search",
    description: "Search the live web. Use for current events, prices, news, people, or any fresh info.",
    strict: true,
    parameters: {
        type: "object",
        required: ["query"],
        additionalProperties: false,
        properties: {
          query: { type: "string", description: "Search query" },
        },
      },
  },
  {
    type: "function",
    name: "scan_company",
    description: "Run a full forensic scan on a company website. Returns leak findings, opportunities, risk scores, brand analysis. Use when the user asks to analyze, scan, audit, look into, or consult on a company.",
    strict: true,
    parameters: {
        type: "object",
        required: ["url", "company"],
        additionalProperties: false,
        properties: {
          url: { type: "string", description: "Company website URL (e.g. https://example.com)" },
          company: { type: ["string", "null"], description: "Company name when known, otherwise null" },
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
        // Never hand the model a raw stored report: legacy rows carry stale
        // pre-ledger amounts. Only the sanitized canonical model is exposed.
        const safe = sanitizedGoldenReport(row.report as never) as Record<string, unknown> | null;
        return { scan_id: scanId, report: safe, summary: (safe?.executive_summary as string) || null };
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

  // Auth is intentionally optional (verify_jwt = false). We resolve the user id
  // when a JWT is present for attribution, but anonymous visitors and portal
  // reps without a Supabase session must never be blocked.
  await optionalAuth(req).catch(() => ({ userId: null }));

  if (!LOVABLE_API_KEY) return json({ error: "Missing LOVABLE_API_KEY" }, 500);


  let body: { messages?: any[]; useSearch?: boolean; identity?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const incoming = Array.isArray(body.messages) ? body.messages : [];
  if (incoming.length === 0) return json({ error: "messages required" }, 400);

  const adminToken = req.headers.get("x-admin-token") || undefined;

  const identityPrompt = architectIdentityPrompt(body.identity);
  const input: any[] = [
    { role: "system", content: [{ type: "input_text", text: SYSTEM_PROMPT }] },
    ...(identityPrompt ? [{ role: "system", content: [{ type: "input_text", text: identityPrompt }] }] : []),
    {
      role: "system",
      content: [{ type: "input_text", text: "GOLDEN REPORT MONEY LOCK. Any scan report you are shown has already been rendered from the canonical Financial Leak Ledger. You may quote a dollar figure ONLY if it appears verbatim in that sanitized report, and only in the same scope it appears in. You must never add, sum, average, extrapolate, annualize, discount or otherwise derive a new dollar amount, and never invent one. If a number is not in the report, say it is not modeled. USD only." }],
    },
    ...incoming.map((message) => ({
      role: message.role,
      content: typeof message.content === "string"
        ? [{ type: message.role === "assistant" ? "output_text" : "input_text", text: message.content }]
        : (Array.isArray(message.content) ? message.content.map((part: any) => {
            if (part?.type === "text") return { type: "input_text", text: String(part.text || "") };
            if (part?.type === "image_url") return { type: "input_image", image_url: part.image_url?.url };
            return { type: "input_text", text: `[Attached file: ${String(part?.file?.filename || "document")}]` };
          }) : [{ type: "input_text", text: String(message.content || "") }]),
    })),
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
        // No hard cap on tool rounds — Nexus can chain as many tool calls as
        // it needs. We use a large soft ceiling (safety net against infinite
        // loops) and on the last iteration drop tools so the model is forced
        // to produce a final text answer instead of erroring out.
        const maxRounds = useTools ? 40 : 1;
        for (let round = 0; round < maxRounds; round++) {
          const isFinalRound = round === maxRounds - 1;
          const includeTools = useTools && !isFinalRound;
          let res: Response | null = null;
          let lastErr = "";
          let retryDelayMs = 0;
          const attempts = 3;
          for (let attemptIndex = 0; attemptIndex < attempts; attemptIndex++) {
            if (attemptIndex > 0) {
              await new Promise((resolve) => setTimeout(resolve, Math.max(retryDelayMs, 500 * (2 ** (attemptIndex - 1))) + Math.floor(Math.random() * 250)));
            }
            try {
              const attempt = await fetch(AI_URL, {
                method: "POST",
                signal: req.signal,
                headers: {
                  "Lovable-API-Key": LOVABLE_API_KEY,
                  "X-Lovable-AIG-SDK": "fetch",
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  model: MODEL,
                  input,
                  ...(includeTools ? { tools: enabledTools } : {}),
                  stream: true,
                  store: false,
                  reasoning: { effort: "medium", summary: "auto" },
                  include: ["reasoning.encrypted_content"],
                }),
              });
              if (attempt.ok && attempt.body) { res = attempt; break; }
              const rawError = await attempt.text().catch(() => "");
              let safeMessage = rawError.slice(0, 240);
              try { safeMessage = JSON.parse(rawError)?.message || JSON.parse(rawError)?.error?.message || safeMessage; } catch {}
              lastErr = safeMessage || `AI request failed with status ${attempt.status}`;
              const retryable = attempt.status === 429 || attempt.status >= 500;
              const retryAfter = Number(attempt.headers.get("Retry-After"));
              retryDelayMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 0;
              console.warn(`[nexus] ${MODEL} failed with ${attempt.status}`);
              if (!retryable) break;
            } catch (e) {
              if (req.signal.aborted) throw e;
              lastErr = String(e);
              console.warn(`[nexus] ${MODEL} request failed`);
            }
          }

          if (!res || !res.body) {
            if (!useTools || round === 0) {
              // Absolute last resort: never leave the user with a dead chat.
              send({ type: "message_start" });
              send({
                type: "delta",
                text: lastErr || "Nexus could not complete this request.",
              });
              send({ type: "done" });
            } else {
              send({ type: "error", error: lastErr || "Gateway unavailable" });
            }
            controller.close();
            return;
          }


          // Parse Responses SSE, preserving output items for stateless tool continuation.
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buf = "";
          let started = false;
          let finalContent = "";
          const outputItems: any[] = [];
          const toolCallsAcc: any[] = [];

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
              if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
                if (!started) { send({ type: "message_start" }); started = true; }
                finalContent += evt.delta;
                send({ type: "delta", text: evt.delta });
              }
              if (evt.type === "response.output_item.done" && evt.item) outputItems.push(evt.item);
              if (evt.type === "response.completed" && Array.isArray(evt.response?.output) && outputItems.length === 0) {
                outputItems.push(...evt.response.output);
              }
              if (evt.type === "error") {
                throw new Error(evt.error?.message || evt.message || "AI stream failed");
              }
            }
          }
          toolCallsAcc.push(...outputItems.filter((item) => item?.type === "function_call"));

          // If model produced text and no tool calls → done.
          if (toolCallsAcc.length === 0) {
            if (!started) { send({ type: "message_start" }); send({ type: "delta", text: finalContent }); }
            send({ type: "done" });
            controller.close();
            return;
          }

          if (isFinalRound) {
            // Tools were dropped this round; whatever text we got is the final answer.
            if (!started) { send({ type: "message_start" }); send({ type: "delta", text: finalContent }); }
            send({ type: "done" });
            controller.close();
            return;
          }

          // Append assistant tool-call message and execute tools.
          input.push(...outputItems);

          for (const tc of toolCallsAcc) {
            const name = tc.name;
            let args: any = {};
            try { args = JSON.parse(tc.arguments || "{}"); } catch {}
            send({ type: "tool_start", name, args });

            let result: any;
            if (name === "web_search") {
              result = await webSearch(args.query || "");
            } else if (name === "scan_company") {
              result = await scanCompany(args.url, args.company || undefined, adminToken);
            } else {
              result = { error: `Unknown tool ${name}` };
            }

            send({ type: "tool_result", name, result });

            input.push({
              type: "function_call_output",
              call_id: tc.call_id,
              output: JSON.stringify(result).slice(0, 50000),
            });
          }
        }


        send({ type: "done" });
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
