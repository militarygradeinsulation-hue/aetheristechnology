// Book Writer — turns Response Library entries + topics into book outline/chapters.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";
import { INFLUENCE_BLUEPRINT_PROMPT } from "../_shared/influenceBlueprint.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
};

const SIGNATURE =
  "\n\nJoseph ~AI Architect MS, BA, IBM AI Certified\nAetheris.Technology";

type Entry = { title?: string; body?: string; topic?: string; mode?: string };

function formatEntries(entries: Entry[], max = 40): string {
  return entries
    .slice(0, max)
    .map((e, i) => {
      const t = (e.topic || e.title || "Untitled").slice(0, 140);
      const b = (e.body || "").slice(0, 800);
      return `— [#${i + 1}] Topic: ${t}\n${b}`;
    })
    .join("\n\n");
}

async function callLLM(system: string, user: string, opts: { json?: boolean } = {}): Promise<string> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const body: Record<string, unknown> = {
    model: "google/gemini-3-flash-preview",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  };
  if (opts.json) body.response_format = { type: "json_object" };
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI ${res.status}: ${t.slice(0, 400)}`);
  }
  const data = await res.json();
  return String(data?.choices?.[0]?.message?.content || "").trim();
}


serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const ok = await verifyAdminToken(
      getAdminTokenFromRequest(req),
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
    );
    if (!ok) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const action = String(body.action || "outline");
    const bookTitle = String(body.bookTitle || "Untitled Book");
    const audience = String(body.audience || "founders, operators, revenue leaders");
    const styleNotes = String(body.styleNotes || "");
    const entries: Entry[] = Array.isArray(body.entries) ? body.entries : [];

    const voiceLock = `
You are ghost-writing Joseph Toney's book — the Aetheris Chaos Theory Forensics operator.
Voice: blunt, forensic, operator. No corporate hedging. No influencer fluff.
Use "because"-clause reasoning. Use power lexicon (leaking, autopsy, evidence, exposure, receipts).
Every claim ends in a receipt or a next action.

${INFLUENCE_BLUEPRINT_PROMPT}

BOOK: "${bookTitle}"
AUDIENCE: ${audience}
${styleNotes ? `AUTHOR NOTES: ${styleNotes}` : ""}

You have ${entries.length} prior published posts/replies from the author as source voice + material. Mine them for themes, phrasing, anecdotes, and doctrines. Do NOT quote them verbatim; distill them into book prose.
`.trim();

    const source = `AUTHOR'S PRIOR WORK (Response Library sample):\n\n${formatEntries(entries)}`;

    if (action === "outline") {
      const user = `${source}

TASK: Produce a book outline.
Return strict JSON only, no prose, no fences:
{
  "title": "${bookTitle}",
  "subtitle": "one-line hook",
  "premise": "2-3 sentence positioning",
  "chapters": [
    { "number": 1, "title": "...", "hook": "one-sentence forensic hook", "beats": ["beat 1","beat 2","beat 3","beat 4"] }
  ]
}
Produce 10-14 chapters. Order them as a narrative arc: diagnosis → mechanism → autopsy → fix → doctrine.`;
      const raw = await callLLM(voiceLock, user, { json: true });
      const json = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
      let parsed: unknown = null;
      try { parsed = JSON.parse(json); }
      catch {
        const m = json.match(/\{[\s\S]*\}/);
        if (m) { try { parsed = JSON.parse(m[0]); } catch { /* noop */ } }
      }
      if (!parsed) throw new Error("Model returned non-JSON outline");
      return new Response(JSON.stringify({ outline: parsed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "chapter") {
      const chapterTitle = String(body.chapterTitle || "Chapter");
      const chapterNumber = Number(body.chapterNumber || 1);
      const beats: string[] = Array.isArray(body.beats) ? body.beats : [];
      const brief = String(body.brief || "");
      const wordTarget = Math.max(800, Math.min(4000, Number(body.wordTarget) || 1800));

      const user = `${source}

TASK: Draft Chapter ${chapterNumber} — "${chapterTitle}".
${beats.length ? `Cover these beats:\n${beats.map((b, i) => `${i + 1}. ${b}`).join("\n")}` : ""}
${brief ? `Extra direction: ${brief}` : ""}

Rules:
- ~${wordTarget} words.
- Open with a forensic hook (one crisp line, not a summary).
- Use short paragraphs, subheads (## Subhead), and at least one "case-file" style block.
- Weave in evidence, "because" reasoning, and at least one anecdote or scenario distilled from the source library.
- End with a "Doctrine" callout (3-5 bullets the reader can act on tomorrow).
- Output clean Markdown starting with "# Chapter ${chapterNumber}. ${chapterTitle}". No preamble, no author bio.`;
      const md = await callLLM(voiceLock, user);
      const finalMd = md.trim() + SIGNATURE;
      return new Response(JSON.stringify({ chapter: finalMd }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
