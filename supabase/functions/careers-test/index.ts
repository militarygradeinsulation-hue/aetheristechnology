// Careers test: start attempt, submit answers, upload resume, admin lookup by code.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Buffer } from "node:buffer";
import pdfParse from "npm:pdf-parse@1.1.1/lib/pdf-parse.js";
import JSZip from "npm:jszip@3.10.1";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";
import { verifyPortalToken, getPortalTokenFromRequest, type PortalClaims } from "../_shared/portal-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token, x-portal-token",
};

// Reps/partners with elevated access to careers admin data.
const CAREERS_ALLOWED_PORTAL_CODES = new Set(["963169"]); // Bradon Roberts

async function authorize(req: Request, secret: string): Promise<{ ok: boolean; isAdmin: boolean; claims: PortalClaims | null }> {
  if (await verifyAdminToken(getAdminTokenFromRequest(req), secret)) return { ok: true, isAdmin: true, claims: null };
  const claims = await verifyPortalToken(getPortalTokenFromRequest(req), secret);
  if (claims && CAREERS_ALLOWED_PORTAL_CODES.has(claims.code)) return { ok: true, isAdmin: false, claims };
  return { ok: false, isAdmin: false, claims: null };
}
async function isAuthorizedAdminOrAllowedPortal(req: Request, secret: string): Promise<boolean> {
  return (await authorize(req, secret)).ok;
}

const TEST_MINUTES = 50;
const QUESTION_COUNT = 25;
const PASS_PCT = 80;
const MAX_ATTEMPTS_PER_DAY = 5;

function extFromName(name: string | null | undefined) {
  return (name || "").split(".").pop()?.toLowerCase() || "";
}

function mimeFromExt(ext: string) {
  if (ext === "pdf") return "application/pdf";
  if (ext === "doc") return "application/msword";
  if (ext === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (ext === "txt") return "text/plain";
  if (ext === "rtf") return "application/rtf";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  return "application/octet-stream";
}

function detectResumeType(bytes: Uint8Array, filename: string) {
  const ext = extFromName(filename);
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return { ext: "pdf", mime: "application/pdf" };
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) return { ext: ext === "docx" ? "docx" : ext, mime: mimeFromExt(ext) };
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return { ext: "png", mime: "image/png" };
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return { ext: "jpg", mime: "image/jpeg" };
  return { ext, mime: mimeFromExt(ext) };
}

function extractPlainText(buf: Uint8Array) {
  const raw = new TextDecoder("utf-8", { fatal: false }).decode(buf);
  return raw.replace(/[^\x09\x0A\x0D\x20-\x7E]+/g, " ").replace(/\s{3,}/g, "  ").trim();
}

function normalizeResumeText(text: string) {
  return text
    .replace(/\u0000/g, " ")
    .replace(/\r/g, "\n")
    .replace(/[\t ]{3,}/g, "  ")
    .replace(/\n[\t ]+/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function isUsableResumeText(text: string) {
  const clean = normalizeResumeText(text);
  const letters = (clean.match(/[A-Za-z]/g) || []).length;
  const words = (clean.match(/[A-Za-z]{2,}/g) || []).length;
  return clean.length >= 160 && letters >= 80 && words >= 25;
}

async function extractPdfText(buf: Uint8Array) {
  try {
    const data = await pdfParse(Buffer.from(buf));
    return normalizeResumeText(data?.text || "");
  } catch (error) {
    console.error("PDF text extraction failed", error);
    return "";
  }
}

function decodeXmlText(xml: string) {
  return xml
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<w:br\/>/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractDocxText(buf: Uint8Array) {
  const zip = await JSZip.loadAsync(buf);
  const names = Object.keys(zip.files).filter((name) => /^word\/(document|header\d+|footer\d+)\.xml$/.test(name));
  const parts = await Promise.all(names.map(async (name) => decodeXmlText(await zip.files[name].async("text"))));
  return parts.filter(Boolean).join("\n\n").trim();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function rebuiltResumeHtml(app: any, resumeText: string, meta: { method: string; filename: string; error?: string | null }) {
  const lines = normalizeResumeText(resumeText).split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 500);
  const sectionNames = /^(summary|profile|objective|experience|employment|work history|professional experience|sales experience|education|skills|certifications|licenses|awards|references|projects|contact)$/i;
  const body = lines.length ? lines.map((line, idx) => {
    const plain = line.replace(/[:\s]+$/g, "");
    const looksHeading = sectionNames.test(plain) || (plain.length <= 42 && plain === plain.toUpperCase() && /[A-Z]{3,}/.test(plain));
    if (looksHeading && idx > 0) return `<h2>${escapeHtml(plain)}</h2>`;
    if (/^[•\-*]\s+/.test(line)) return `<li>${escapeHtml(line.replace(/^[•\-*]\s+/, ""))}</li>`;
    return `<p>${escapeHtml(line)}</p>`;
  }).join("\n") : `<p>No readable text could be extracted from the uploaded file.</p>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(app.candidate_name || "Candidate")} — Recreated Resume</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: #f3f0ea; color: #171411; }
    main { width: min(860px, calc(100vw - 32px)); margin: 28px auto; background: #fffaf1; border: 1px solid #d8c7a5; box-shadow: 0 20px 60px rgba(33, 24, 8, .18); }
    header { padding: 32px 38px 20px; border-bottom: 2px solid #b5832f; }
    h1 { margin: 0; font-family: Georgia, "Times New Roman", serif; font-size: clamp(30px, 5vw, 48px); line-height: 1; letter-spacing: 0; color: #171411; }
    .contact { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 10px 18px; color: #5c5042; font-size: 14px; }
    .meta { margin-top: 14px; color: #7b3f24; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; font-weight: 700; }
    article { padding: 26px 38px 38px; }
    h2 { margin: 24px 0 8px; padding-top: 10px; border-top: 1px solid #e3d7c1; font-size: 14px; text-transform: uppercase; letter-spacing: .1em; color: #8a5a18; }
    p { margin: 0 0 9px; line-height: 1.48; font-size: 14.5px; white-space: pre-wrap; }
    li { margin: 0 0 6px 20px; line-height: 1.45; font-size: 14.5px; }
    .notice { margin: 0 38px 22px; padding: 10px 12px; background: #fff3d6; border: 1px solid #e6c875; color: #6a4a08; font-size: 12px; }
    @media print { body { background: white; } main { margin: 0; width: 100%; box-shadow: none; border: 0; } }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>${escapeHtml(app.candidate_name || "Candidate")}</h1>
      <div class="contact">
        <span>${escapeHtml(app.candidate_email || "")}</span>
        ${app.candidate_phone ? `<span>${escapeHtml(app.candidate_phone)}</span>` : ""}
        ${app.score_pct != null ? `<span>Test score: ${escapeHtml(String(app.score_pct))}%</span>` : ""}
      </div>
      <div class="meta">Recreated readable resume · ${escapeHtml(meta.filename)} · ${escapeHtml(meta.method)}</div>
    </header>
    ${meta.error ? `<div class="notice">Extraction note: ${escapeHtml(meta.error)}</div>` : ""}
    <article>${body}</article>
  </main>
</body>
</html>`;
}

function toBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function aiExtractResumeText(params: {
  apiKey: string;
  bytes: Uint8Array;
  filename: string;
  mime: string;
}) {
  const gatewaySupportedFile = params.mime === "application/pdf" || params.mime.startsWith("image/");
  if (!gatewaySupportedFile) {
    return "";
  }
  const base64 = toBase64(params.bytes);
  const prompt = [
    "Extract all readable text from this resume.",
    "Preserve section order and line breaks where possible.",
    "Return plain text only. No commentary, no JSON, no markdown."
  ].join(" ");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Lovable-API-Key": params.apiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{
        role: "user",
        content: [
          {
            type: "file",
            file: {
              filename: params.filename,
              file_data: `data:${params.mime};base64,${base64}`,
            },
          },
          {
            type: "text",
            text: prompt,
          },
        ],
      }],
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OCR ${res.status}: ${txt.slice(0, 240)}`);
  }

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content;
  const text = typeof content === "string"
    ? content.trim()
    : Array.isArray(content)
      ? content.map((part: any) => part?.text || "").join("\n").trim()
      : "";

  return text;
}

async function recreateResumeForApplication(admin: any, app: any, apiKey: string) {
  let resumeText = "";
  let method = "metadata-only";
  let extractError: string | null = null;
  const filename = app.resume_filename || app.resume_path?.split("/").pop() || "resume";

  if (app.resume_path) {
    const { data: file, error: dlErr } = await admin.storage.from("careers-resumes").download(app.resume_path);
    if (dlErr) throw new Error(`Resume download failed: ${dlErr.message}`);
    const buf = new Uint8Array(await file.arrayBuffer());
    const { ext, mime } = detectResumeType(buf, filename);
    const plainTextable = new Set(["txt", "md", "csv", "json", "rtf"]);

    if (ext === "pdf") {
      resumeText = await extractPdfText(buf);
      method = "pdf-text";
    } else if (ext === "docx") {
      try {
        resumeText = await extractDocxText(buf);
        method = "docx-xml";
      } catch (docxErr) {
        extractError = docxErr instanceof Error ? docxErr.message : "DOCX extraction failed";
        console.error("DOCX text extraction failed", docxErr);
      }
    } else if (plainTextable.has(ext)) {
      resumeText = extractPlainText(buf);
      method = "plain-text";
    }

    if (!isUsableResumeText(resumeText) && mime !== "application/msword") {
      try {
        const ocrText = await aiExtractResumeText({ apiKey, bytes: buf, filename, mime });
        if (isUsableResumeText(ocrText) || ocrText.trim().length > resumeText.trim().length) {
          resumeText = ocrText;
          method = ext === "pdf" ? "pdf-vision" : "ai-vision";
          extractError = null;
        }
      } catch (ocrErr) {
        extractError = ocrErr instanceof Error ? ocrErr.message : "AI document extraction failed";
        console.error("resume OCR fallback failed", ocrErr);
      }
    }

    resumeText = normalizeResumeText(resumeText).slice(0, 30000);
  }

  if (!resumeText.trim()) {
    resumeText = [
      `Candidate: ${app.candidate_name || "Unknown"}`,
      `Email: ${app.candidate_email || "Unknown"}`,
      app.candidate_phone ? `Phone: ${app.candidate_phone}` : "",
      app.notes ? `Candidate notes: ${app.notes}` : "",
      app.resume_filename ? `Uploaded file: ${app.resume_filename}` : "No resume file was uploaded.",
    ].filter(Boolean).join("\n");
    method = "metadata-only";
  }

  const resumeHtml = rebuiltResumeHtml(app, resumeText, { method, filename, error: extractError });
  await admin.from("careers_applications").update({
    resume_text: resumeText,
    resume_html: resumeHtml,
    resume_extract_method: method,
    resume_extract_error: extractError,
    resume_recreated_at: new Date().toISOString(),
  }).eq("share_code", app.share_code);

  return { resumeText, resumeHtml, method, extractError };
}

async function analyzeApplicationFit(admin: any, app: any, apiKey: string) {
  const recreated = app.resume_text && app.resume_html
    ? { resumeText: app.resume_text, resumeHtml: app.resume_html, method: app.resume_extract_method || "stored", extractError: app.resume_extract_error || null }
    : await recreateResumeForApplication(admin, app, apiKey);

  const sys = `You are the hiring operator for Aetheris Technology, a Business Forensics consulting firm in Indianapolis.
We sell the Forensic Diagnostic ($2,500 flat applied toward engagement). Reps work on a 70/15/15 commission split.
Tone is blunt, operator, non-corporate. We hire CLOSERS — confident communicators with B2B sales instincts, comfort with discovery calls and CFO-level conversations, hustle, ownership, and resilience.
Penalize: pure marketing/agency fluff, no measurable outcomes, no B2B sales experience, job-hopping under 6 months.
Reward: closed-deal numbers, quota attainment, consultative selling, finance/ops/SaaS background, entrepreneurship, prior commission roles.

You MUST rate the candidate 1-10 on each of these six sections (1 = total miss, 5 = average, 10 = exceptional). Be strict — most candidates land 3-6.

SECTIONS:
1. b2b_sales_experience      — Direct B2B sales role time, deal complexity, sales cycle exposure.
2. closing_track_record      — Quota attainment, closed-deal numbers, commission history, win rate.
3. communication_confidence  — Discovery skills, CFO-level conversation comfort, written clarity.
4. hustle_ownership          — Self-direction, entrepreneurial moves, side businesses, outbound grit.
5. domain_fit                — Finance / ops / SaaS / consulting / forensics-adjacent background.
6. resilience_tenure         — Tenure stability (no <6 mo hops), bouncing back from misses, longevity.

The overall fit_score is the SUM of the six section ratings (range 6-60). Do NOT scale to 100. Do not invent the total — sum it.

Output STRICT JSON only — no markdown, no code fences:
{
  "section_scores": {
    "b2b_sales_experience":     { "rating": <1-10>, "reason": "<one sentence>" },
    "closing_track_record":     { "rating": <1-10>, "reason": "<one sentence>" },
    "communication_confidence": { "rating": <1-10>, "reason": "<one sentence>" },
    "hustle_ownership":         { "rating": <1-10>, "reason": "<one sentence>" },
    "domain_fit":               { "rating": <1-10>, "reason": "<one sentence>" },
    "resilience_tenure":        { "rating": <1-10>, "reason": "<one sentence>" }
  },
  "fit_score": <integer 6-60, must equal sum of all six ratings>,
  "summary": "<2-3 sentence verdict on whether to hire as a sales rep>",
  "strengths": ["<bullet>", "<bullet>", "..."],
  "concerns": ["<bullet>", "<bullet>", "..."],
  "recommended_next_step": "<one line: e.g. 'Phone screen this week', 'Pass', 'Final interview'>"
}`;
  const user = `Candidate: ${app.candidate_name} (${app.candidate_email})
Test score: ${app.score_pct ?? "n/a"}%
Resume filename: ${app.resume_filename || "(none)"}
Resume extraction: ${recreated.method}${recreated.extractError ? ` (${recreated.extractError})` : ""}
Notes from candidate: ${app.notes || "(none)"}

--- Recreated resume text ---
${recreated.resumeText.slice(0, 18000)}`;

  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk", "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [{ role: "system", content: sys }, { role: "user", content: user }],
      response_format: { type: "json_object" },
    }),
  });
  if (!r.ok) {
    const txt = await r.text();
    if (r.status === 429) throw new Error("AI rate limited — try again shortly.");
    if (r.status === 402) throw new Error("AI credits exhausted — add credits in Settings.");
    throw new Error(`AI ${r.status}: ${txt.slice(0, 200)}`);
  }
  const j = await r.json();
  let txt = j.choices?.[0]?.message?.content || "{}";
  txt = txt.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  const parsed = JSON.parse(txt);

  // Normalize section scores and recompute fit_score = sum (always trustworthy).
  const SECTION_KEYS = [
    "b2b_sales_experience",
    "closing_track_record",
    "communication_confidence",
    "hustle_ownership",
    "domain_fit",
    "resilience_tenure",
  ];
  const rawSections = (parsed.section_scores && typeof parsed.section_scores === "object") ? parsed.section_scores : {};
  const sectionScores: Record<string, { rating: number; reason: string }> = {};
  let total = 0;
  for (const key of SECTION_KEYS) {
    const entry = rawSections[key] || {};
    const rating = Math.max(1, Math.min(10, Math.round(Number(entry.rating) || 0) || 1));
    const reason = String(entry.reason || "").slice(0, 400);
    sectionScores[key] = { rating, reason };
    total += rating;
  }
  const fitScore = Math.max(6, Math.min(60, total));
  const strengths = Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 8) : [];
  const concerns = Array.isArray(parsed.concerns) ? parsed.concerns.slice(0, 8) : [];
  const summary = String(parsed.summary || "").slice(0, 2000) +
    (parsed.recommended_next_step ? `\n\nNext step: ${parsed.recommended_next_step}` : "");

  await admin.from("careers_applications").update({
    ai_fit_score: fitScore,
    ai_section_scores: sectionScores,
    ai_summary: summary,
    ai_strengths: strengths,
    ai_concerns: concerns,
    ai_analyzed_at: new Date().toISOString(),
  }).eq("share_code", app.share_code);

  return { fit_score: fitScore, section_scores: sectionScores, summary, strengths, concerns, ...recreated };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function code6() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, SERVICE);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");

    // ---------- START ----------
    if (action === "start") {
      const email = String(body.email || "").trim().toLowerCase();
      const name = String(body.name || "").trim();
      const phone = String(body.phone || "").trim() || null;
      if (!email || !name) return json({ error: "Name and email required" }, 400);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Invalid email" }, 400);

      // Only count *submitted* attempts toward the daily limit so abandoned/lost
      // sessions and quick mis-clicks don't lock candidates out.
      const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const { count } = await admin.from("careers_attempts")
        .select("id", { count: "exact", head: true })
        .ilike("candidate_email", email)
        .not("submitted_at", "is", null)
        .gte("started_at", dayAgo);
      if ((count ?? 0) >= MAX_ATTEMPTS_PER_DAY) {
        return json({ error: `You've used your ${MAX_ATTEMPTS_PER_DAY} attempts for today. Try again tomorrow.` }, 429);
      }

      const { data: pool, error: poolErr } = await admin.from("careers_questions")
        .select("id,question,choices,correct_choice_id")
        .eq("is_active", true);
      if (poolErr) throw poolErr;
      if (!pool || pool.length < QUESTION_COUNT) return json({ error: "Question bank not ready yet." }, 500);

      // Pick questions, then shuffle each question's choices and re-key them a/b/c/d
      // so guessing a single letter (the bank was skewed toward 'b') no longer passes.
      const LETTERS = ["a", "b", "c", "d", "e", "f"];
      const picked = shuffle(pool).slice(0, QUESTION_COUNT).map((q: any) => {
        const originalChoices = Array.isArray(q.choices) ? q.choices : [];
        const shuffled = shuffle(originalChoices);
        const remapped = shuffled.map((c: any, i: number) => ({ id: LETTERS[i], text: c.text }));
        const originalCorrect = originalChoices.find((c: any) => c.id === q.correct_choice_id);
        const newCorrectIdx = shuffled.findIndex((c: any) => c.id === q.correct_choice_id);
        return {
          id: q.id,
          question: q.question,
          choices: remapped,
          correct_choice_id: newCorrectIdx >= 0 ? LETTERS[newCorrectIdx] : q.correct_choice_id,
          _orig_correct_text: originalCorrect?.text || null,
        };
      });
      // Strip correct answers before sending to client
      const clientQuestions = picked.map((q: any) => ({
        id: q.id,
        question: q.question,
        choices: q.choices,
      }));
      const expires = new Date(Date.now() + TEST_MINUTES * 60 * 1000).toISOString();

      const { data: attempt, error: insErr } = await admin.from("careers_attempts").insert({
        candidate_email: email, candidate_name: name, candidate_phone: phone,
        questions: picked, // keep correct answers stored on attempt for grading
        expires_at: expires,
        status: "in_progress",
      }).select("id,expires_at").single();
      if (insErr) throw insErr;

      return json({ ok: true, attempt_id: attempt.id, expires_at: attempt.expires_at, questions: clientQuestions, minutes: TEST_MINUTES, total: QUESTION_COUNT, pass_pct: PASS_PCT });
    }

    // ---------- SUBMIT ----------
    if (action === "submit") {
      const attemptId = String(body.attempt_id || "");
      const answers = body.answers && typeof body.answers === "object" ? body.answers as Record<string, string> : {};
      const notes = (body.notes || "").toString().slice(0, 4000);
      if (!attemptId) return json({ error: "Missing attempt_id" }, 400);

      const { data: attempt, error: getErr } = await admin.from("careers_attempts")
        .select("id,questions,expires_at,status,candidate_email,candidate_name,candidate_phone")
        .eq("id", attemptId).maybeSingle();
      if (getErr) throw getErr;
      if (!attempt) return json({ error: "Attempt not found" }, 404);
      if (attempt.status !== "in_progress") return json({ error: "Attempt already submitted" }, 400);

      const expired = new Date(attempt.expires_at).getTime() < Date.now();
      const total = attempt.questions.length;
      let correct = 0;
      for (const q of attempt.questions as any[]) {
        if (answers[q.id] && answers[q.id] === q.correct_choice_id) correct++;
      }
      const pct = Math.round((correct / total) * 1000) / 10; // 1 decimal
      const passed = !expired && pct >= PASS_PCT;
      const shareCode = passed ? code6() : null;

      const { error: upErr } = await admin.from("careers_attempts").update({
        answers,
        submitted_at: new Date().toISOString(),
        score_pct: pct,
        correct_count: correct,
        total_count: total,
        status: expired ? "expired" : (passed ? "passed" : "failed"),
        share_code: shareCode,
        notes_to_admin: notes || null,
      }).eq("id", attemptId);
      if (upErr) throw upErr;

      return json({ ok: true, passed, score_pct: pct, correct, total, expired, share_code: shareCode });
    }

    // ---------- UPLOAD-RESUME (signed URL) ----------
    if (action === "upload_resume_url") {
      const code = String(body.share_code || "").trim().toUpperCase();
      const filename = String(body.filename || "resume").replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 80);
      if (!code) return json({ error: "Missing share_code" }, 400);
      const { data: attempt } = await admin.from("careers_attempts").select("id,share_code,status").eq("share_code", code).maybeSingle();
      if (!attempt || attempt.status !== "passed") return json({ error: "Invalid share code" }, 404);
      const path = `${code}/${Date.now()}_${filename}`;
      const { data: signed, error } = await admin.storage.from("careers-resumes").createSignedUploadUrl(path);
      if (error) throw error;
      return json({ ok: true, path, token: signed.token, signed_url: signed.signedUrl });
    }

    // ---------- FINALIZE APPLICATION (after upload) ----------
    if (action === "finalize_application") {
      const code = String(body.share_code || "").trim().toUpperCase();
      const resumePath = body.resume_path ? String(body.resume_path) : null;
      const resumeFilename = body.resume_filename ? String(body.resume_filename).slice(0, 200) : null;
      const rawNotes = (body.notes || "").toString().slice(0, 4000);
      const notes = rawNotes || null;
      if (!code) return json({ error: "Missing share_code" }, 400);
      if (!resumePath) return json({ error: "Resume is required." }, 400);
      const wordCount = rawNotes.trim().split(/\s+/).filter(Boolean).length;
      if (wordCount < 150) {
        return json({ error: `Your note must be at least 150 words (currently ${wordCount}).` }, 400);
      }

      const { data: attempt } = await admin.from("careers_attempts")
        .select("id,share_code,status,candidate_email,candidate_name,candidate_phone,score_pct")
        .eq("share_code", code).maybeSingle();
      if (!attempt || attempt.status !== "passed") return json({ error: "Invalid share code" }, 404);

      // upsert by share_code
      const { data: savedApp, error } = await admin.from("careers_applications").upsert({
        attempt_id: attempt.id,
        share_code: code,
        candidate_name: attempt.candidate_name || "",
        candidate_email: attempt.candidate_email,
        candidate_phone: attempt.candidate_phone,
        resume_path: resumePath,
        resume_filename: resumeFilename,
        notes,
        score_pct: attempt.score_pct,
      }, { onConflict: "share_code" }).select("*").single();
      if (error) throw error;

      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (LOVABLE_API_KEY && savedApp) {
        const autoAnalyze = analyzeApplicationFit(admin, savedApp, LOVABLE_API_KEY)
          .catch((autoErr) => console.error("Automatic resume analysis failed", autoErr));
        const edgeRuntime = (globalThis as any).EdgeRuntime;
        if (edgeRuntime?.waitUntil) edgeRuntime.waitUntil(autoAnalyze);
        else await autoAnalyze;
      }

      return json({ ok: true, share_code: code });
    }

    // ---------- ADMIN: lookup by code ----------
    if (action === "admin_lookup") {
      const ok = await isAuthorizedAdminOrAllowedPortal(req, SERVICE);
      if (!ok) return json({ error: "Unauthorized" }, 401);
      const code = String(body.share_code || "").trim().toUpperCase();
      if (!code) return json({ error: "Missing share_code" }, 400);

      const { data: app } = await admin.from("careers_applications").select("*").eq("share_code", code).maybeSingle();
      const { data: attempt } = await admin.from("careers_attempts").select("id,candidate_name,candidate_email,candidate_phone,score_pct,correct_count,total_count,status,started_at,submitted_at,notes_to_admin,questions,answers").eq("share_code", code).maybeSingle();
      if (!app && !attempt) return json({ error: "Code not found" }, 404);

      let resumeUrl: string | null = null;
      if (app?.resume_path) {
        const { data: signed } = await admin.storage.from("careers-resumes").createSignedUrl(app.resume_path, 60 * 30);
        resumeUrl = signed?.signedUrl || null;
      }

      // mark reviewed
      if (app) await admin.from("careers_applications").update({ reviewed: true, reviewed_at: new Date().toISOString() }).eq("share_code", code);

      return json({ ok: true, application: app, attempt, resume_url: resumeUrl });
    }

    // ---------- ADMIN: list everyone ----------
    if (action === "admin_list") {
      const ok = await isAuthorizedAdminOrAllowedPortal(req, SERVICE);
      if (!ok) return json({ error: "Unauthorized" }, 401);

      const { data: attempts } = await admin.from("careers_attempts")
        .select("id,candidate_name,candidate_email,candidate_phone,score_pct,correct_count,total_count,status,started_at,submitted_at,share_code,notes_to_admin,admin_notes")
        .order("started_at", { ascending: false }).limit(500);

      const { data: applications } = await admin.from("careers_applications")
        .select("id,share_code,candidate_name,candidate_email,candidate_phone,resume_path,resume_filename,resume_extract_method,resume_extract_error,resume_recreated_at,notes,admin_notes,stage,score_pct,reviewed,reviewed_at,contacted,contacted_at,created_at,ai_fit_score,ai_summary,ai_strengths,ai_concerns,ai_section_scores,ai_analyzed_at")
        .order("created_at", { ascending: false }).limit(500);

      // Page analytics for /careers and /careers/test
      const { data: events } = await admin.from("site_events")
        .select("event_type,event_data,session_id,created_at")
        .in("event_type", ["page_view", "careers_cta_click"])
        .gte("created_at", new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString())
        .order("created_at", { ascending: false }).limit(5000);

      const careersEvents = (events || []).filter((e: any) => {
        const path = (e.event_data?.path || "") as string;
        return path.startsWith("/careers");
      });

      const views = careersEvents.filter((e: any) => e.event_type === "page_view");
      const ctaClicks = careersEvents.filter((e: any) => e.event_type === "careers_cta_click");
      const uniqueVisitors = new Set(views.map((e: any) => e.session_id)).size;

      const byPath: Record<string, number> = {};
      views.forEach((e: any) => { const p = e.event_data?.path || "/careers"; byPath[p] = (byPath[p] || 0) + 1; });
      const byCta: Record<string, number> = {};
      ctaClicks.forEach((e: any) => { const c = e.event_data?.cta || "unknown"; byCta[c] = (byCta[c] || 0) + 1; });

      return json({
        ok: true,
        attempts: attempts || [],
        applications: applications || [],
        analytics: {
          total_views: views.length,
          unique_visitors: uniqueVisitors,
          total_cta_clicks: ctaClicks.length,
          by_path: Object.entries(byPath).map(([path, count]) => ({ path, count })).sort((a, b) => b.count - a.count),
          by_cta: Object.entries(byCta).map(([cta, count]) => ({ cta, count })).sort((a, b) => b.count - a.count),
        },
      });
    }

    // ---------- ADMIN: update application (notes / reviewed flag) ----------
    if (action === "admin_update_application") {
      const ok = await isAuthorizedAdminOrAllowedPortal(req, SERVICE);
      if (!ok) return json({ error: "Unauthorized" }, 401);
      const code = String(body.share_code || "").trim().toUpperCase();
      if (!code) return json({ error: "Missing share_code" }, 400);
      const patch: Record<string, unknown> = {};
      if (typeof body.notes === "string") patch.notes = body.notes.slice(0, 4000) || null;
      if (typeof body.reviewed === "boolean") {
        patch.reviewed = body.reviewed;
        patch.reviewed_at = body.reviewed ? new Date().toISOString() : null;
      }
      if (typeof body.contacted === "boolean") {
        patch.contacted = body.contacted;
        patch.contacted_at = body.contacted ? new Date().toISOString() : null;
      }
      if (typeof body.admin_notes === "string") patch.admin_notes = body.admin_notes.slice(0, 4000) || null;
      if (typeof body.stage === "string") {
        const s = body.stage.trim().toLowerCase();
        if (["new", "interview", "wait", "no"].includes(s)) patch.stage = s;
      }
      if (Object.keys(patch).length === 0) return json({ error: "Nothing to update" }, 400);
      const { error } = await admin.from("careers_applications").update(patch).eq("share_code", code);
      if (error) throw error;
      return json({ ok: true });
    }

    // ---------- ADMIN: delete application (and its attempts) ----------
    if (action === "admin_delete_application") {
      const ok = await isAuthorizedAdminOrAllowedPortal(req, SERVICE);
      if (!ok) return json({ error: "Unauthorized" }, 401);
      const code = String(body.share_code || "").trim().toUpperCase();
      if (!code) return json({ error: "Missing share_code" }, 400);
      // Best-effort: delete attempts tied to this share_code, then the application
      try { await admin.from("careers_attempts").delete().eq("share_code", code); } catch {}
      const { error } = await admin.from("careers_applications").delete().eq("share_code", code);
      if (error) throw error;
      return json({ ok: true });
    }

    // ---------- ADMIN: update attempt (admin notes) ----------
    if (action === "admin_update_attempt") {
      const ok = await isAuthorizedAdminOrAllowedPortal(req, SERVICE);
      if (!ok) return json({ error: "Unauthorized" }, 401);
      const attemptId = String(body.attempt_id || "");
      if (!attemptId) return json({ error: "Missing attempt_id" }, 400);
      const patch: Record<string, unknown> = {};
      if (typeof body.admin_notes === "string") patch.admin_notes = body.admin_notes.slice(0, 4000) || null;
      if (Object.keys(patch).length === 0) return json({ error: "Nothing to update" }, 400);
      const { error } = await admin.from("careers_attempts").update(patch).eq("id", attemptId);
      if (error) throw error;
      return json({ ok: true });
    }

    // ---------- ADMIN: rebuilt readable resume view ----------
    if (action === "admin_resume_url") {
      const ok = await isAuthorizedAdminOrAllowedPortal(req, SERVICE);
      if (!ok) return json({ error: "Unauthorized" }, 401);
      const code = String(body.share_code || "").trim().toUpperCase();
      if (!code) return json({ error: "Missing share_code" }, 400);
      const { data: app } = await admin.from("careers_applications").select("*").eq("share_code", code).maybeSingle();
      if (!app) return json({ error: "Application not found" }, 404);

      let originalUrl: string | null = null;
      if (app.resume_path) {
        const { data: signed } = await admin.storage.from("careers-resumes").createSignedUrl(app.resume_path, 60 * 30);
        originalUrl = signed?.signedUrl || null;
      }

      let resumeHtml = app.resume_html || "";
      if (!resumeHtml) {
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        if (!LOVABLE_API_KEY) return json({ error: "AI not configured" }, 500);
        const recreated = await recreateResumeForApplication(admin, app, LOVABLE_API_KEY);
        resumeHtml = recreated.resumeHtml;
      }

      return json({ ok: true, html: resumeHtml, url: originalUrl, filename: app.resume_filename || `${code}-resume.html`, mime: "text/html" });
    }

    // ---------- ADMIN: AI fit-score analysis ----------
    if (action === "ai_analyze_resume") {
      const ok = await isAuthorizedAdminOrAllowedPortal(req, SERVICE);
      if (!ok) return json({ error: "Unauthorized" }, 401);
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) return json({ error: "AI not configured" }, 500);
      const code = String(body.share_code || "").trim().toUpperCase();
      if (!code) return json({ error: "Missing share_code" }, 400);

      const { data: app } = await admin.from("careers_applications")
        .select("*")
        .eq("share_code", code).maybeSingle();
      if (!app) return json({ error: "Application not found" }, 404);
      try {
        const result = await analyzeApplicationFit(admin, app, LOVABLE_API_KEY);
        return json({ ok: true, fit_score: result.fit_score, section_scores: result.section_scores, summary: result.summary, strengths: result.strengths, concerns: result.concerns });
      } catch (err) {
        const message = err instanceof Error ? err.message : "AI analysis failed";
        if (message.includes("rate limited")) return json({ error: message }, 429);
        if (message.includes("credits exhausted")) return json({ error: message }, 402);
        return json({ error: message }, 500);
      }
    }

    // ---------- ADMIN: list private messages (only the caller's own) ----------
    if (action === "messages_list") {
      const auth = await authorize(req, SERVICE);
      if (!auth.ok) return json({ error: "Unauthorized" }, 401);
      const code = String(body.share_code || "").trim().toUpperCase();
      if (!code) return json({ error: "Missing share_code" }, 400);
      // Admin sees all; portal user only sees their own
      let q = admin.from("careers_messages").select("*").eq("share_code", code).order("created_at", { ascending: true });
      if (!auth.isAdmin && auth.claims) q = q.eq("author_rep_code", auth.claims.code);
      const { data, error } = await q;
      if (error) throw error;
      // Sign attachment URLs for display
      const messages = await Promise.all((data || []).map(async (m: any) => {
        let attachment_url: string | null = null;
        if (m.attachment_path) {
          const { data: signed } = await admin.storage.from("careers-messages").createSignedUrl(m.attachment_path, 60 * 30);
          attachment_url = signed?.signedUrl || null;
        }
        return { ...m, attachment_url };
      }));
      return json({ ok: true, messages });
    }

    // ---------- ADMIN: send a private message (optionally with attachment) ----------
    if (action === "messages_send") {
      const auth = await authorize(req, SERVICE);
      if (!auth.ok) return json({ error: "Unauthorized" }, 401);
      const code = String(body.share_code || "").trim().toUpperCase();
      const text = String(body.body || "").slice(0, 4000);
      const author_rep_code = auth.isAdmin ? "admin" : (auth.claims?.code || "unknown");
      const author_name = String(body.author_name || "").slice(0, 80) || null;
      const attachment_path = body.attachment_path ? String(body.attachment_path).slice(0, 400) : null;
      const attachment_filename = body.attachment_filename ? String(body.attachment_filename).slice(0, 200) : null;
      if (!code) return json({ error: "Missing share_code" }, 400);
      if (!text && !attachment_path) return json({ error: "Empty message" }, 400);

      const { data, error } = await admin.from("careers_messages").insert({
        share_code: code,
        author_rep_code,
        author_name,
        body: text,
        attachment_path,
        attachment_filename,
      }).select().single();
      if (error) throw error;
      return json({ ok: true, message: data });
    }

    // ---------- ADMIN: signed upload URL for a message attachment ----------
    if (action === "messages_upload_url") {
      const auth = await authorize(req, SERVICE);
      if (!auth.ok) return json({ error: "Unauthorized" }, 401);
      const code = String(body.share_code || "").trim().toUpperCase();
      const filename = String(body.filename || "file").replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 80);
      if (!code) return json({ error: "Missing share_code" }, 400);
      const author = auth.isAdmin ? "admin" : (auth.claims?.code || "unknown");
      const path = `${code}/${author}/${Date.now()}_${filename}`;
      const { data: signed, error } = await admin.storage.from("careers-messages").createSignedUploadUrl(path);
      if (error) throw error;
      return json({ ok: true, path, token: signed.token, signed_url: signed.signedUrl });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("careers-test error:", e);
    return json({ error: e instanceof Error ? e.message : "Server error" }, 500);
  }
});
