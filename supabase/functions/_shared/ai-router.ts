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
  // Heavy used to fall back to gemini-2.5-pro. Pro is a reasoning model: it
  // burns thinking tokens against max_tokens and routinely takes 20s+, which
  // blanked out whole Golden Reports. Flash returns real content in time.
  heavy: { abacus: "grok-4.3",                  lovable: "google/gemini-2.5-flash" },
};

// Circuit breaker: once Abacus answers with a billing/auth failure, stop
// hammering it for the rest of this isolate. A single Golden Report fires 15
// calls; without this every one of them wastes a round trip.
let abacusDisabledUntil = 0;
const ABACUS_COOLDOWN_MS = 10 * 60_000;

function tripAbacus(reason: string) {
  abacusDisabledUntil = Date.now() + ABACUS_COOLDOWN_MS;
  console.warn(`[ai-router] Abacus disabled for 10m: ${reason}`);
}


export interface RoutedChatResult {
  content: string;
  message: any;                       // full assistant message (includes tool_calls if any)
  provider: "abacus" | "lovable";
  model: string;
  raw: any;
}

// Newer OpenAI models reject `max_tokens` (must use `max_completion_tokens`)
// and reject non-default `temperature`. Detect them and adapt the body.
function isOpenAiNewGen(model: string) {
  return /^openai\//i.test(model) || /^(gpt-5|o[134])/i.test(model);
}

function buildBody(model: string, opts: RoutedChatOptions) {
  const newGen = isOpenAiNewGen(model);
  return {
    model,
    messages: opts.messages,
    ...(opts.temperature !== undefined && !newGen ? { temperature: opts.temperature } : {}),
    ...(opts.max_tokens !== undefined
      ? (newGen ? { max_completion_tokens: opts.max_tokens } : { max_tokens: opts.max_tokens })
      : {}),
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
  bodyOverride?: Record<string, unknown>,
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
      body: JSON.stringify(bodyOverride ?? buildBody(model, opts)),
    });
  } finally {
    clearTimeout(t);
  }
}

// Rewrites a body after a 400 that names an unsupported parameter, so a single
// picky model can never blank out an entire report.
function adaptBodyForError(body: Record<string, any>, errText: string): Record<string, any> | null {
  const next = { ...body };
  let changed = false;
  if (/max_tokens.*not supported|use ['"]?max_completion_tokens/i.test(errText) && "max_tokens" in next) {
    next.max_completion_tokens = next.max_tokens;
    delete next.max_tokens;
    changed = true;
  }
  if (/max_completion_tokens.*not supported|unsupported parameter: ['"]?max_completion_tokens/i.test(errText) && "max_completion_tokens" in next) {
    next.max_tokens = next.max_completion_tokens;
    delete next.max_completion_tokens;
    changed = true;
  }
  if (/temperature/i.test(errText) && "temperature" in next) {
    delete next.temperature;
    changed = true;
  }
  if (/response_format/i.test(errText) && "response_format" in next) {
    delete next.response_format;
    changed = true;
  }
  return changed ? next : null;
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
  let body = buildBody(lovableModel, opts);
  let r = await callProvider(LOVABLE_URL, lovableKey, lovableModel, opts, body);
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    // One adaptive retry for picky-parameter 400s (max_tokens / temperature / response_format).
    const retryBody = r.status === 400 ? adaptBodyForError(body, t) : null;
    if (retryBody) {
      console.warn(`[ai-router] Lovable 400 on parameters, retrying with adapted body`);
      body = retryBody as any;
      r = await callProvider(LOVABLE_URL, lovableKey, lovableModel, opts, body);
    }
    if (!r.ok) {
      const t2 = retryBody ? await r.text().catch(() => "") : t;
      const err = new Error(`Lovable AI ${r.status}: ${t2.slice(0, 200)}`);
      (err as any).status = r.status;
      throw err;
    }
  }
  const j = await r.json();
  const { message, content } = extractMessage(j);
  return { content, message, provider: "lovable", model: lovableModel, raw: j };
}

