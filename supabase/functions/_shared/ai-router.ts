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
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const LOVABLE_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const MODEL_MAP: Record<AiTier, { abacus: string; openai: string; lovable: string }> = {
  bulk:  { abacus: "claude-haiku-4-5-20251001", openai: "gpt-4o-mini", lovable: "google/gemini-2.5-flash" },
  // Heavy used to fall back to gemini-2.5-pro. Pro is a reasoning model: it
  // burns thinking tokens against max_tokens and routinely takes 20s+, which
  // blanked out whole Golden Reports. Flash returns real content in time.
  heavy: { abacus: "grok-4.3",                  openai: "gpt-4o",      lovable: "google/gemini-2.5-flash" },
};


// Circuit breaker: once Abacus answers with a billing/auth failure, stop
// hammering it for the rest of this isolate. A single Golden Report fires 15
// calls; without this every one of them wastes a round trip.
// State lives on globalThis so every module instance in the isolate shares one
// breaker (each edge function imports this file independently).
const BREAKER_KEY = "__aetherisAbacusBreaker";
type BreakerState = { until: number; strikes: number; reason: string };
const breaker: BreakerState =
  ((globalThis as any)[BREAKER_KEY] ??= { until: 0, strikes: 0, reason: "" });

// Second-stage provider (OpenAI) gets its own breaker so an exhausted quota or
// a bad key stops burning round trips for the rest of the isolate.
const openaiBreaker: BreakerState =
  ((globalThis as any)["__aetherisOpenAiBreaker"] ??= { until: 0, strikes: 0, reason: "" });


const ABACUS_COOLDOWN_MS = 10 * 60_000;      // transient/unknown failures
const ABACUS_CREDIT_COOLDOWN_MS = 60 * 60_000; // out of credits / bad key
const ABACUS_STRIKE_LIMIT = 2;               // 2 soft failures => stop trying

function tripAbacus(reason: string, ms = ABACUS_COOLDOWN_MS) {
  breaker.until = Date.now() + ms;
  breaker.strikes = 0;
  breaker.reason = reason;
  console.warn(`[ai-router] Abacus disabled for ${Math.round(ms / 60000)}m: ${reason}`);
}

// Soft failures (timeouts, 5xx, unusable payloads) shouldn't burn every call in
// a 15-request scan: after ABACUS_STRIKE_LIMIT of them, trip the breaker too.
function strikeAbacus(reason: string) {
  breaker.strikes += 1;
  if (breaker.strikes >= ABACUS_STRIKE_LIMIT) {
    tripAbacus(`${ABACUS_STRIKE_LIMIT} consecutive failures (${reason})`);
  } else {
    console.warn(`[ai-router] Abacus failure ${breaker.strikes}/${ABACUS_STRIKE_LIMIT}: ${reason}`);
  }
}

// Abacus reports exhausted credits both as HTTP status codes and as text in an
// otherwise-200 payload, so match on both.
const CREDIT_ERROR_RE =
  /no remaining credits|insufficient (credits|balance|funds|quota)|out of credits|credit limit|quota (exceeded|exhausted)|billing|payment required|invalid api key|unauthor|forbidden/i;

function isCreditFailure(status: number, text: string) {
  return status === 401 || status === 402 || status === 403 || status === 429 ||
    CREDIT_ERROR_RE.test(text);
}



export interface RoutedChatResult {
  content: string;
  message: any;                       // full assistant message (includes tool_calls if any)
  provider: "abacus" | "openai" | "lovable";
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

  if (!disabled && abacusKey && Date.now() >= breaker.until) {
    try {
      const r = await callProvider(ABACUS_URL, abacusKey, mapping.abacus, opts);
      if (r.ok) {
        const raw = await r.text();
        let j: any = null;
        try { j = JSON.parse(raw); } catch { /* non-JSON 200 */ }
        const { message, content, ok } = j ? extractMessage(j) : { message: null, content: "", ok: false };
        if (ok) {
          breaker.strikes = 0;
          return { content, message, provider: "abacus", model: mapping.abacus, raw: j };
        }
        // A 200 can still carry "no remaining credits" in an error field.
        const errText = j?.error?.message || j?.error || j?.message || raw;
        if (isCreditFailure(200, String(errText))) {
          tripAbacus(`credits unavailable: ${String(errText).slice(0, 120)}`, ABACUS_CREDIT_COOLDOWN_MS);
        } else {
          strikeAbacus("unusable response");
        }
      } else {
        const t = await r.text().catch(() => "");
        // Billing / auth failures are not transient: trip the breaker immediately.
        if (isCreditFailure(r.status, t)) {
          tripAbacus(`${r.status} ${t.slice(0, 120)}`, ABACUS_CREDIT_COOLDOWN_MS);
        } else {
          strikeAbacus(`HTTP ${r.status}`);
        }
      }
    } catch (e) {
      strikeAbacus((e as Error).message);
    }
  }

  // Stage 2: OpenAI. Cheaper per call than the Lovable gateway credits, so it
  // runs before the gateway and after Abacus. Same breaker discipline.
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!disabled && openaiKey && Date.now() >= openaiBreaker.until) {
    try {
      let body: Record<string, any> = buildBody(mapping.openai, opts);
      let r = await callProvider(OPENAI_URL, openaiKey, mapping.openai, opts, body);
      if (r.status === 400) {
        const t = await r.text().catch(() => "");
        const adapted = adaptBodyForError(body, t);
        if (adapted) {
          body = adapted;
          r = await callProvider(OPENAI_URL, openaiKey, mapping.openai, opts, body);
        } else {
          openaiBreaker.strikes = 0;
          console.warn(`[ai-router] OpenAI 400: ${t.slice(0, 160)}`);
        }
      }
      if (r.ok) {
        const j = await r.json();
        const { message, content, ok } = extractMessage(j);
        if (ok) {
          openaiBreaker.strikes = 0;
          return { content, message, provider: "openai", model: mapping.openai, raw: j };
        }
        console.warn("[ai-router] OpenAI returned unusable content, falling through");
      } else {
        const t = await r.text().catch(() => "");
        if (isCreditFailure(r.status, t)) {
          openaiBreaker.until = Date.now() + ABACUS_CREDIT_COOLDOWN_MS;
          openaiBreaker.reason = `${r.status} ${t.slice(0, 120)}`;
          console.warn(`[ai-router] OpenAI disabled 60m: ${openaiBreaker.reason}`);
        } else {
          openaiBreaker.strikes += 1;
          if (openaiBreaker.strikes >= ABACUS_STRIKE_LIMIT) {
            openaiBreaker.until = Date.now() + ABACUS_COOLDOWN_MS;
            openaiBreaker.strikes = 0;
            openaiBreaker.reason = `HTTP ${r.status}`;
          }
        }
      }
    } catch (e) {
      openaiBreaker.strikes += 1;
      console.warn(`[ai-router] OpenAI failure: ${(e as Error).message}`);
    }
  }

  if (!lovableKey) throw new Error("No AI provider configured (ABACUS_ROUTELLM_API_KEY / OPENAI_API_KEY / LOVABLE_API_KEY)");


  const callLovable = async (body: Record<string, any>) => {
    let b = body;
    let r = await callProvider(LOVABLE_URL, lovableKey, lovableModel, opts, b);
    if (!r.ok) {
      const t = await r.text().catch(() => "");
      // One adaptive retry for picky-parameter 400s (max_tokens / temperature / response_format).
      const retryBody = r.status === 400 ? adaptBodyForError(b, t) : null;
      if (retryBody) {
        console.warn(`[ai-router] Lovable 400 on parameters, retrying with adapted body`);
        b = retryBody as any;
        r = await callProvider(LOVABLE_URL, lovableKey, lovableModel, opts, b);
      }
      if (!r.ok) {
        const t2 = retryBody ? await r.text().catch(() => "") : t;
        const err = new Error(`Lovable AI ${r.status}: ${t2.slice(0, 200)}`);
        (err as any).status = r.status;
        throw err;
      }
    }
    return { json: await r.json(), body: b };
  };

  let { json: j, body } = await callLovable(buildBody(lovableModel, opts));
  let { message, content } = extractMessage(j);

  // A 200 with empty content (reasoning model exhausting max_tokens, or a
  // truncated JSON response) must not silently become a fallback report.
  const emptyish = !content && !(Array.isArray(message?.tool_calls) && message.tool_calls.length);
  if (emptyish) {
    const bumped: Record<string, any> = { ...body };
    if ("max_tokens" in bumped) bumped.max_tokens = Math.max(Number(bumped.max_tokens) * 2, 4000);
    if ("max_completion_tokens" in bumped) bumped.max_completion_tokens = Math.max(Number(bumped.max_completion_tokens) * 2, 4000);
    console.warn("[ai-router] Lovable returned empty content, retrying with a larger token budget");
    const retry = await callLovable(bumped);
    const ex = extractMessage(retry.json);
    if (ex.content || (Array.isArray(ex.message?.tool_calls) && ex.message.tool_calls.length)) {
      j = retry.json; message = ex.message; content = ex.content;
    } else {
      throw new Error(`Lovable AI returned empty content from ${lovableModel}`);
    }
  }

  return { content, message, provider: "lovable", model: lovableModel, raw: j };
}


