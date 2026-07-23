// Shared AI router: tries Abacus RouteLLM first (cheaper), falls back to
// Lovable AI Gateway on any failure. Drop-in replacement for direct
// `fetch("https://ai.gateway.lovable.dev/v1/chat/completions", ...)` calls.
//
// Tier -> model mapping (per Joseph, per plan):
//   "bulk"  -> claude-haiku-4-5-20251001   (Lovable fallback: google/gemini-2.5-flash)
//   "heavy" -> grok-4.3                    (Lovable fallback: openai/gpt-5.5 / gemini-2.5-pro)
//
// Env vars:
//   ABACUS_ROUTELLM_API_KEY  (required for savings; missing key -> straight to Lovable)
//   LOVABLE_API_KEY          (existing fallback)
//   AI_ROUTER_DISABLE=1      (kill-switch: force Lovable only)

export type AiTier = "bulk" | "heavy";

type ChatMessage = { role: string; content: any; tool_calls?: any; tool_call_id?: string; name?: string };

export interface RoutedChatOptions {
  tier?: AiTier;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: unknown;
  tools?: unknown;
  tool_choice?: unknown;
  timeoutMs?: number;
  // Override the Lovable fallback model (e.g. "google/gemini-2.5-pro" for
  // assistant-chat which was previously on Pro).
  lovableModelOverride?: string;
}

const ABACUS_URL = "https://routellm.abacus.ai/v1/chat/completions";
const LOVABLE_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const MODEL_MAP: Record<AiTier, { abacus: string; lovable: string }> = {
  bulk:  { abacus: "claude-haiku-4-5-20251001", lovable: "google/gemini-2.5-flash" },
  heavy: { abacus: "grok-4.3",                  lovable: "openai/gpt-5.5" },
};

export interface RoutedChatResult {
  content: string;
  message: any;                       // full assistant message (includes tool_calls if any)
  provider: "abacus" | "lovable";
  model: string;
  raw: any;
}

function buildBody(model: string, opts: RoutedChatOptions) {
  return {
    model,
    messages: opts.messages,
    ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
    ...(opts.max_tokens !== undefined ? { max_tokens: opts.max_tokens } : {}),
    ...(opts.response_format ? { response_format: opts.response_format } : {}),
    ...(opts.tools ? { tools: opts.tools } : {}),
    ...(opts.tool_choice ? { tool_choice: opts.tool_choice } : {}),
  };
}

async function callProvider(
  url: string,
  key: string,
  model: string,
  opts: RoutedChatOptions,
): Promise<Response> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), opts.timeoutMs ?? 60_000);
  try {
    return await fetch(url, {
      method: "POST",
      signal: ctl.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildBody(model, opts)),
    });
  } finally {
    clearTimeout(t);
  }
}

function extractMessage(j: any) {
  const message = j?.choices?.[0]?.message;
  const content = typeof message?.content === "string" ? message.content : "";
  const hasToolCalls = Array.isArray(message?.tool_calls) && message.tool_calls.length > 0;
  return { message, content, ok: !!message && (content.length > 0 || hasToolCalls) };
}

export async function routedChatCompletion(
  opts: RoutedChatOptions,
): Promise<RoutedChatResult> {
  const tier: AiTier = opts.tier ?? "bulk";
  const mapping = MODEL_MAP[tier];
  const lovableModel = opts.lovableModelOverride || mapping.lovable;
  const abacusKey = Deno.env.get("ABACUS_ROUTELLM_API_KEY");
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const disabled = Deno.env.get("AI_ROUTER_DISABLE") === "1";

  if (!disabled && abacusKey) {
    try {
      const r = await callProvider(ABACUS_URL, abacusKey, mapping.abacus, opts);
      if (r.ok) {
        const j = await r.json();
        const { message, content, ok } = extractMessage(j);
        if (ok) {
          return { content, message, provider: "abacus", model: mapping.abacus, raw: j };
        }
        console.warn("[ai-router] Abacus returned unusable response, falling back to Lovable");
      } else {
        console.warn(`[ai-router] Abacus ${r.status}, falling back to Lovable`);
      }
    } catch (e) {
      console.warn(`[ai-router] Abacus error, falling back to Lovable:`, (e as Error).message);
    }
  }

  if (!lovableKey) throw new Error("Neither ABACUS_ROUTELLM_API_KEY nor LOVABLE_API_KEY configured");
  const r = await callProvider(LOVABLE_URL, lovableKey, lovableModel, opts);
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    const err = new Error(`Lovable AI ${r.status}: ${t.slice(0, 200)}`);
    (err as any).status = r.status;
    throw err;
  }
  const j = await r.json();
  const { message, content } = extractMessage(j);
  return { content, message, provider: "lovable", model: lovableModel, raw: j };
}
