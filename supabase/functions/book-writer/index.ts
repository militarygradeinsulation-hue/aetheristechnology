// Book Writer — turns Response Library entries + topics into book outline/chapters.
//
// Supports three actions:
//   • outline   — one-shot outline generation (legacy)
//   • chapter   — one-shot chapter draft (legacy)
//   • auto_write — server-side background job that writes the FULL book,
//                  persisting outline + each chapter into admin_library so the
//                  work survives page reloads, tab closes, and shows up in
//                  every admin portal identically (same library row).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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
type Chapter = {
  number: number;
  title: string;
  hook?: string;
  beats?: string[];
  body?: string;
};
type Outline = {
  title: string;
  subtitle?: string;
  premise?: string;
  chapters: Chapter[];
};

const HEARTBEAT_STALE_MS = 5 * 60 * 1000; // 5 minutes — restart if worker died

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

function buildVoiceLock(bookTitle: string, audience: string, styleNotes: string, entryCount: number) {
  return `
You are ghost-writing Joseph Toney's book — the Aetheris Chaos Theory Forensics operator.
Voice: blunt, forensic, operator. No corporate hedging. No influencer fluff.
Use "because"-clause reasoning. Use power lexicon (leaking, autopsy, evidence, exposure, receipts).
Every claim ends in a receipt or a next action.

${INFLUENCE_BLUEPRINT_PROMPT}

BOOK: "${bookTitle}"
AUDIENCE: ${audience}
${styleNotes ? `AUTHOR NOTES: ${styleNotes}` : ""}

You have ${entryCount} prior published posts/replies from the author as source voice + material. Mine them for themes, phrasing, anecdotes, and doctrines. Do NOT quote them verbatim; distill them into book prose.
`.trim();
}

function parseOutline(raw: string): Outline {
  const json = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  let parsed: unknown = null;
  try { parsed = JSON.parse(json); }
  catch {
    const m = json.match(/\{[\s\S]*\}/);
    if (m) { try { parsed = JSON.parse(m[0]); } catch { /* noop */ } }
  }
  if (!parsed || typeof parsed !== "object") throw new Error("Model returned non-JSON outline");
  const o = parsed as Outline;
  if (!Array.isArray(o.chapters)) throw new Error("Outline missing chapters");
  o.chapters = o.chapters.map((c, i) => ({
    number: Number(c.number) || i + 1,
    title: String(c.title || `Chapter ${i + 1}`),
    hook: c.hook ? String(c.hook) : "",
    beats: Array.isArray(c.beats) ? c.beats.map(String) : [],
    body: typeof c.body === "string" ? c.body : "",
  }));
  return o;
}

function buildManuscript(o: Outline): string {
  const lines: string[] = [];
  lines.push(`# ${o.title}`);
  if (o.subtitle) lines.push(`\n_${o.subtitle}_`);
  if (o.premise) lines.push(`\n${o.premise}`);
  lines.push("\n---\n\n## Table of Contents\n");
  o.chapters.forEach((c) => lines.push(`- Chapter ${c.number}. ${c.title}`));
  lines.push("\n---\n");
  o.chapters.forEach((c) => {
    lines.push("\n");
    lines.push(c.body ? c.body : `# Chapter ${c.number}. ${c.title}\n\n_[not yet drafted]_`);
    lines.push("\n");
  });
  return lines.join("\n");
}

function makeSb() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

async function loadRow(sb: ReturnType<typeof makeSb>, id: string) {
  const { data, error } = await sb.from("admin_library").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

async function writeOutput(
  sb: ReturnType<typeof makeSb>,
  id: string,
  outline: Outline,
  extras: Record<string, unknown>,
) {
  const output_data = {
    outline,
    manuscript: buildManuscript(outline),
    draftedChapters: outline.chapters.filter((c) => c.body).length,
    totalChapters: outline.chapters.length,
    updatedAt: new Date().toISOString(),
    ...extras,
  };
  const { error } = await sb.from("admin_library")
    .update({ output_data, title: outline.title || "Book Manuscript" })
    .eq("id", id);
  if (error) throw error;
}

async function heartbeat(sb: ReturnType<typeof makeSb>, id: string, outline: Outline, extras: Record<string, unknown>) {
  await writeOutput(sb, id, outline, {
    jobStatus: "running",
    jobHeartbeat: new Date().toISOString(),
    ...extras,
  });
}

async function runBookJob(params: {
  libraryId: string;
  bookTitle: string;
  audience: string;
  styleNotes: string;
  entries: Entry[];
  outline: Outline;
}) {
  const sb = makeSb();
  const { libraryId, bookTitle, audience, styleNotes, entries } = params;
  let outline = params.outline;
  const voiceLock = buildVoiceLock(bookTitle, audience, styleNotes, entries.length);
  const source = `AUTHOR'S PRIOR WORK (Response Library sample):\n\n${formatEntries(entries)}`;

  try {
    for (let i = 0; i < outline.chapters.length; i++) {
      const c = outline.chapters[i];
      if (c.body && c.body.trim().length > 200) continue;

      await heartbeat(sb, outline, ...([libraryId] as never)).catch(() => {});
      // ^ noop guard; call real one below
      await heartbeat(sb, libraryId, outline, { jobStage: `chapter-${c.number}-drafting` });

      const user = `${source}

TASK: Draft Chapter ${c.number} — "${c.title}".
${(c.beats || []).length ? `Cover these beats:\n${(c.beats || []).map((b, j) => `${j + 1}. ${b}`).join("\n")}` : ""}
${c.hook ? `Extra direction: ${c.hook}` : ""}

Rules:
- ~1800 words.
- Open with a forensic hook (one crisp line, not a summary).
- Use short paragraphs, subheads (## Subhead), and at least one "case-file" style block.
- Weave in evidence, "because" reasoning, and at least one anecdote or scenario distilled from the source library.
- End with a "Doctrine" callout (3-5 bullets the reader can act on tomorrow).
- Output clean Markdown starting with "# Chapter ${c.number}. ${c.title}". No preamble, no author bio.`;

      let md = "";
      let lastErr: unknown = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          md = await callLLM(voiceLock, user);
          break;
        } catch (e) {
          lastErr = e;
          await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        }
      }
      if (!md) throw lastErr instanceof Error ? lastErr : new Error("chapter draft failed");

      outline.chapters[i] = { ...c, body: md.trim() + SIGNATURE };
      await writeOutput(sb, libraryId, outline, {
        jobStatus: "running",
        jobHeartbeat: new Date().toISOString(),
        jobStage: `chapter-${c.number}-saved`,
      });
    }

    await writeOutput(sb, libraryId, outline, {
      jobStatus: "complete",
      jobHeartbeat: new Date().toISOString(),
      jobStage: "complete",
      completedAt: new Date().toISOString(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("book job failed:", msg);
    try {
      await writeOutput(sb, libraryId, outline, {
        jobStatus: "error",
        jobError: msg,
        jobHeartbeat: new Date().toISOString(),
      });
    } catch (_) { /* noop */ }
  }
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

    const voiceLock = buildVoiceLock(bookTitle, audience, styleNotes, entries.length);
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
      const outline = parseOutline(raw);
      return new Response(JSON.stringify({ outline }), {
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

    if (action === "auto_write") {
      const sb = makeSb();
      let libraryId: string | null = body.libraryId ? String(body.libraryId) : null;
      let outline: Outline | null = null;

      // Load existing manuscript row if given
      if (libraryId) {
        const row = await loadRow(sb, libraryId);
        if (row?.output_data?.outline) {
          outline = row.output_data.outline as Outline;
          // If already running and heartbeat is fresh, don't stack a second worker
          const hb = row.output_data.jobHeartbeat ? Date.parse(String(row.output_data.jobHeartbeat)) : 0;
          const stale = !hb || Date.now() - hb > HEARTBEAT_STALE_MS;
          if (row.output_data.jobStatus === "running" && !stale) {
            return new Response(JSON.stringify({
              libraryId, status: "already_running",
              outline, totalChapters: outline.chapters.length,
              draftedChapters: outline.chapters.filter((c) => c.body).length,
            }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
        }
      }

      // Need an outline
      if (!outline) {
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
        outline = parseOutline(raw);
      }

      // Ensure library row exists
      if (!libraryId) {
        const { data, error } = await sb.from("admin_library").insert({
          tool_type: "book_manuscript",
          title: outline.title || bookTitle || "Book Manuscript",
          input_data: {
            audience, styleNotes,
            entryCount: entries.length,
            entries: entries.slice(0, 60),
            autosaved: true,
          },
          output_data: {
            outline,
            manuscript: buildManuscript(outline),
            audience, styleNotes,
            jobStatus: "running",
            jobHeartbeat: new Date().toISOString(),
            jobStage: "queued",
            draftedChapters: 0,
            totalChapters: outline.chapters.length,
            updatedAt: new Date().toISOString(),
          },
        }).select("id").single();
        if (error) throw error;
        libraryId = data.id as string;
      } else {
        await heartbeat(sb, libraryId, outline, { jobStage: "resumed" });
      }

      // Fire-and-forget background worker.
      const workerParams = {
        libraryId: libraryId!,
        bookTitle, audience, styleNotes,
        entries, outline,
      };
      // Deno Deploy / Supabase Edge: EdgeRuntime.waitUntil keeps the isolate
      // alive after the response is sent so the loop can complete.
      const ER = (globalThis as unknown as { EdgeRuntime?: { waitUntil: (p: Promise<unknown>) => void } }).EdgeRuntime;
      const job = runBookJob(workerParams).catch((e) => console.error("book job crash:", e));
      if (ER?.waitUntil) ER.waitUntil(job);

      return new Response(JSON.stringify({
        libraryId,
        status: "started",
        totalChapters: outline.chapters.length,
        draftedChapters: outline.chapters.filter((c) => c.body).length,
        outline,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
