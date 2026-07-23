// Shared AI router: tries Abacus RouteLLM first (cheaper), falls back to
// Lovable AI Gateway on any failure. Drop-in replacement for direct
// `fetch("https://ai.gateway.lovable.dev/v1/chat/completions", ...)` calls.
//
// Tier -> model mapping (per Joseph, per plan):
//   "bulk"  -> claude-haiku-4-5-20251001   (Lovable fallback: google/gemini-2.5-flash)
//   "heavy" -> grok-4.3                    (Lovable fallback: openai/gpt-5.5)
//
// Env vars:
//   ABACUS_ROUTELLM_API_KEY  (required for savings; missing key -> straight to Lovable)
//   LOVABLE_API_KEY          (existing fallback)
//   AI_ROUTER_DISABLE=1      (kill-switch: force Lovable only)

export type AiTier = "bulk" | "heavy";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export interface RoutedChatOptions {
  tier?: AiTier;                    // default "bulk"
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: unknown;        // e.g. { type: "json_object" }
  timeoutMs?: number;               // default 60_000
}

const ABACUS_URL = "https://routellm.abacus.ai/v1/chat/completions";
const LOVABLE_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const MODEL_MAP: Record<AiTier, { abacus: string; lovable: string }> = {
  bulk:  { abacus: "claude-haiku-4-5-20251001", lovable: "google/gemini-2.5-flash" },
  heavy: { abacus: "grok-4.3",                  lovable: "openai/gpt-5.5" },
};

export interface RoutedChatResult {
  content: string;
  provider: "abacus" | "lovable";
  model: string;
  raw: any;
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
      body: JSON.stringify({
        model,
        messages: opts.messages,
        ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
        ...(opts.max_tokens !== undefined ? { max_tokens: opts.max_tokens } : {}),
        ...(opts.response_format ? { response_format: opts.response_format } : {}),
      }),
    });
  } finally {
    clearTimeout(t);
  }
}

export async function routedChatCompletion(
  opts: RoutedChatOptions,
): Promise<RoutedChatResult> {
  const tier: AiTier = opts.tier ?? "bulk";
  const mapping = MODEL_MAP[tier];
  const abacusKey = Deno.env.get("ABACUS_ROUTELLM_API_KEY");
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const disabled = Deno.env.get("AI_ROUTER_DISABLE") === "1";

  // Try Abacus first when available
  if (!disabled && abacusKey) {
    try {
      const r = await callProvider(ABACUS_URL, abacusKey, mapping.abacus, opts);
      if (r.ok) {
        const j = await r.json();
        const content = j?.choices?.[0]?.message?.content ?? "";
        if (content) {
          return { content, provider: "abacus", model: mapping.abacus, raw: j };
        }
        console.warn("[ai-router] Abacus returned empty content, falling back to Lovable");
      } else {
        console.warn(`[ai-router] Abacus ${r.status}, falling back to Lovable`);
      }
    } catch (e) {
      console.warn(`[ai-router] Abacus error, falling back to Lovable:`, (e as Error).message);
    }
  }

  // Fallback: Lovable AI Gateway
  if (!lovableKey) throw new Error("Neither ABACUS_ROUTELLM_API_KEY nor LOVABLE_API_KEY configured");
  const r = await callProvider(LOVABLE_URL, lovableKey, mapping.lovable, opts);
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    const err = new Error(`Lovable AI ${r.status}: ${t.slice(0, 200)}`);
    (err as any).status = r.status;
    throw err;
  }
  const j = await r.json();
  const content = j?.choices?.[0]?.message?.content ?? "";
  return { content, provider: "lovable", model: mapping.lovable, raw: j };
}
