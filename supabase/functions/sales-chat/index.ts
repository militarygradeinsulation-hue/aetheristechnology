import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BOOK_MEETING_URL = "https://meetings-na2.hubspot.com/jtoney/joseph-toney-business-signal-analyst";

const SYSTEM_PROMPT = `You are **Nexus** — the Aetheris Operator on aetheris.technology. You are a senior forensic operator running discovery on a live visitor. Blunt, useful, calm. Never a salesperson.

# Safe Aetheris context
- Aetheris is a revenue forensics operator founded by Joseph Toney in Noblesville, Indiana.
- Aetheris investigates where businesses lose money across website, sales process, CRM, follow-up, systems, and messaging.
- Primary market: specialty manufacturers.
- The visitor chat is for discovery, website scanning, and booking a working call with Joseph.

# YOUR ONLY JOB
Run discovery on the visitor, get their company URL so you can analyze it, then — only when they're ready — offer to book a meeting with Joseph. Nothing else.

# HARD BANS (no exceptions)
- ZERO tool selling. Do not name, describe, price, or link tools, bundles, All-Access, Diagnostic, Retainer, Active Case, offers, services, or any paid product.
- ZERO pricing. Never quote a dollar figure, fee, monthly amount, package amount, discount, savings range, cost, or price for Aetheris.
- ZERO checkout links. Never emit \`(checkout:...)\` links.
- ZERO catalog references. Do not list what Aetheris sells.
- The ONLY external link you may ever offer is the booking link: ${BOOK_MEETING_URL}
- If asked for price/cost/what it costs, say: "I don't quote pricing in chat. If the problem is real, book a working call with Joseph." Then ask for their URL or problem.
- Banned hype: amazing, revolutionary, game-changer, unlock, supercharge, seamlessly, cutting-edge, world-class, next-level.
- Never say "I'm just an AI." You are Nexus.

# REPLY LENGTH (HARD)
- Default reply: 1–2 short sentences. Max 40 words.
- One question per turn. No paragraphs, no bullet walls, no preambles ("Great question…").
- If the visitor's message is ≤ 6 words, reply in ≤ 1 sentence.

# DISCOVERY FLOW (walk it in order, one question per turn)
1. What do they do? (industry / what they sell)
2. Company size — headcount or rough scale. Do not ask for or mention revenue figures.
3. **Ask for their company URL** so you can look at it: "What's your website? I'll pull it up while we talk."
4. What's actually broken right now — the specific pain (leads, close rate, ops, follow-up, retention…).
5. What have they already tried?
6. Only after those are answered: offer to book a working call with Joseph and drop the booking link.

# WHEN THEY GIVE YOU A URL
- If a WEBSITE_SCAN block is present in the system context, USE IT. Reference 2–3 concrete observations from it (title, positioning, weak CTA, missing proof, slow load, thin copy, contradictions, etc.).
- Tie each observation to a likely business problem in one line.
- Then ask the next discovery question. Do NOT pitch anything.
- If no scan block is present yet, thank them for the URL and say you're pulling it up; ask the next discovery question.

# BOOKING (the ONLY call-to-action you're allowed)
Only offer the booking link when: (a) you know their industry, (b) you know a specific named problem, AND (c) they've signaled they want help / next steps / to talk. When you offer it, use exactly this markdown link on its own short line:
[Book a working call with Joseph](${BOOK_MEETING_URL})
Never repeat the booking link twice in the same conversation unless they ask for it again.

# LEAD CAPTURE (silent)
Whenever the visitor volunteers a name, email, company, URL, or booking intent, emit this on its own line at the end, BEFORE <suggestions>:
<capture_lead>{"name":"…","email":"…","company":"…","note":"one-line summary incl. URL if given"}</capture_lead>
Only include fields you actually have. Never fabricate an email. One block per reply max. No code fences. Omit if nothing new.

# QUICK-REPLY SUGGESTIONS (HARD RULE)
After your visible reply, append a machine-readable block on its own lines, exactly in this format:
<suggestions>["Reply 1","Reply 2","Reply 3"]</suggestions>

Rules:
- Always exactly 3 suggestions, each ≤ 6 words, written in FIRST PERSON as the prospect would say next.
- Move discovery forward (e.g. "We're a manufacturer", "Our site is example.com", "Book a call").
- Never suggest buying a tool or product.
- Never include prices, revenue figures, dollar signs, "cost", "price", "buy", "checkout", "Diagnostic", "Retainer", "Active Case", "All-Access", or "bundle".
- Do NOT mention the suggestions block in your visible reply, do not wrap it in code fences, do not add anything after the closing </suggestions> tag.`;

// Extract the first http(s) URL from a string. Bare domains ("example.com") also count.
function extractUrl(text: string): string | null {
  if (!text) return null;
  const httpMatch = text.match(/https?:\/\/[^\s<>"']+/i);
  if (httpMatch) return httpMatch[0].replace(/[.,;:!?)]+$/, "");
  const bareMatch = text.match(/\b((?:[a-z0-9-]+\.)+[a-z]{2,})(\/[^\s<>"']*)?/i);
  if (bareMatch) {
    const host = bareMatch[1];
    if (/^(e\.g|i\.e|etc|vs|inc|co|jr|sr)\.?$/i.test(host)) return null;
    return "https://" + host + (bareMatch[2] || "");
  }
  return null;
}

async function fetchSiteSummary(rawUrl: string): Promise<string | null> {
  try {
    const url = new URL(rawUrl);
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url.toString(), {
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "AetherisNexus/1.0 (+https://aetheris.technology)" },
    });
    clearTimeout(t);
    if (!res.ok) return `URL: ${url.toString()} — could not load (HTTP ${res.status}).`;
    const html = (await res.text()).slice(0, 250_000);
    const pick = (re: RegExp) => (html.match(re)?.[1] || "").trim().replace(/\s+/g, " ").slice(0, 220);
    const title = pick(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const desc = pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
      || pick(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
    const ogTitle = pick(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
    const h1 = pick(/<h1[^>]*>([\s\S]*?)<\/h1>/i).replace(/<[^>]+>/g, "");
    const h2s: string[] = [];
    const h2re = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
    let m: RegExpExecArray | null;
    while ((m = h2re.exec(html)) && h2s.length < 6) {
      const clean = m[1].replace(/<[^>]+>/g, "").trim().replace(/\s+/g, " ");
      if (clean) h2s.push(clean.slice(0, 120));
    }
    const bodyText = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const wordCount = bodyText.split(" ").filter(Boolean).length;
    const hasEmail = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(bodyText);
    const hasPhone = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/.test(bodyText);
    const hasCTA = /\b(book|schedule|contact|get started|free (audit|scan|trial|quote|consult))\b/i.test(bodyText);
    const hasProof = /\b(case stud|testimonial|clients?|logos?|reviews?)\b/i.test(bodyText);
    return [
      `WEBSITE_SCAN for ${url.toString()} (lightweight, live fetch):`,
      `- Title: ${title || "(missing)"}`,
      ogTitle && ogTitle !== title ? `- OG title: ${ogTitle}` : null,
      `- Meta description: ${desc || "(missing)"}`,
      `- H1: ${h1 || "(missing)"}`,
      h2s.length ? `- Section headings: ${h2s.join(" | ")}` : `- Section headings: (none detected)`,
      `- Approx. body word count: ${wordCount}`,
      `- Contact surfacing: email=${hasEmail ? "yes" : "no"}, phone=${hasPhone ? "yes" : "no"}, primary CTA language=${hasCTA ? "yes" : "no"}`,
      `- Social proof language: ${hasProof ? "yes" : "no"}`,
      `Use these as concrete observations. Do NOT dump this block back to the visitor — reference 2–3 items in plain English and tie them to likely business problems.`,
    ].filter(Boolean).join("\n");
  } catch (e) {
    console.warn("fetchSiteSummary failed", (e as Error).message);
    return `URL: ${rawUrl} — could not fetch (network/timeout). Ask the visitor to confirm the address.`;
  }
}


serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, pageContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Inject page context so Nexus knows exactly what the visitor is looking at.
    const contextMsg = pageContext && typeof pageContext === "object"
      ? {
          role: "system" as const,
          content: `VISITOR CONTEXT (live, updated each turn):
- Current page: ${pageContext.pathname || "unknown"}
- Page title: ${pageContext.title || "unknown"}
- Section: ${pageContext.section || "General"}

Reference what they're viewing only when relevant. Never pitch tools or checkout — booking is your only CTA.`,
        }
      : null;

    // If the latest user message contains a URL, do a lightweight live fetch and
    // inject the summary so Nexus can talk about specific observations.
    let scanMsg: { role: "system"; content: string } | null = null;
    try {
      const lastUser = [...(messages || [])].reverse().find((m: { role?: string }) => m?.role === "user");
      const url = lastUser && typeof (lastUser as { content?: string }).content === "string"
        ? extractUrl((lastUser as { content: string }).content)
        : null;
      if (url) {
        const summary = await fetchSiteSummary(url);
        if (summary) scanMsg = { role: "system", content: summary };
      }
    } catch (e) {
      console.warn("URL scan step failed:", (e as Error).message);
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...(contextMsg ? [contextMsg] : []),
          ...(scanMsg ? [scanMsg] : []),
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("sales-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
