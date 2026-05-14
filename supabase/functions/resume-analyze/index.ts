// Admin-only resume analyzer: accepts a resume file, extracts text, runs AI analysis.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Buffer } from "node:buffer";
import pdfParse from "npm:pdf-parse@1.1.1/lib/pdf-parse.js";
import JSZip from "npm:jszip@3.10.1";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";
import { verifyPortalToken, getPortalTokenFromRequest } from "../_shared/portal-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token, x-portal-token",
};

const ALLOWED_PORTAL_CODES = new Set(["963169"]); // Bradon

async function authorize(req: Request, secret: string): Promise<boolean> {
  if (await verifyAdminToken(getAdminTokenFromRequest(req), secret)) return true;
  const claims = await verifyPortalToken(getPortalTokenFromRequest(req), secret);
  return !!(claims && ALLOWED_PORTAL_CODES.has(claims.code));
}

function normalize(t: string) {
  return t.replace(/\u0000/g, " ").replace(/\r/g, "\n").replace(/[\t ]{3,}/g, "  ").replace(/\n[\t ]+/g, "\n").replace(/\n{4,}/g, "\n\n\n").trim();
}
function isUsable(t: string) {
  const c = normalize(t);
  return c.length >= 160 && (c.match(/[A-Za-z]{2,}/g) || []).length >= 25;
}
async function extractPdf(buf: Uint8Array) {
  try { const d = await pdfParse(Buffer.from(buf)); return normalize(d?.text || ""); } catch (e) { console.error("pdf", e); return ""; }
}
function decodeXml(xml: string) {
  return xml.replace(/<w:tab\/>/g, "\t").replace(/<w:br\/>/g, "\n").replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
async function extractDocx(buf: Uint8Array) {
  try {
    const zip = await JSZip.loadAsync(buf);
    const names = Object.keys(zip.files).filter((n) => /^word\/(document|header\d+|footer\d+)\.xml$/.test(n));
    const parts = await Promise.all(names.map(async (n) => decodeXml(await zip.files[n].async("text"))));
    return parts.filter(Boolean).join("\n\n").trim();
  } catch (e) { console.error("docx", e); return ""; }
}
function extractPlain(buf: Uint8Array) {
  return new TextDecoder("utf-8", { fatal: false }).decode(buf).replace(/[^\x09\x0A\x0D\x20-\x7E]+/g, " ").trim();
}
function toBase64(bytes: Uint8Array) {
  let s = ""; const cs = 0x8000;
  for (let i = 0; i < bytes.length; i += cs) s += String.fromCharCode(...bytes.subarray(i, i + cs));
  return btoa(s);
}

async function aiExtract(apiKey: string, bytes: Uint8Array, filename: string, mime: string) {
  if (!(mime === "application/pdf" || mime.startsWith("image/"))) return "";
  const b64 = toBase64(bytes);
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Lovable-API-Key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{
        role: "user",
        content: [
          { type: "file", file: { filename, file_data: `data:${mime};base64,${b64}` } },
          { type: "text", text: "Extract all readable text from this resume. Return plain text only." },
        ],
      }],
    }),
  });
  if (!res.ok) return "";
  const j = await res.json();
  return normalize(j?.choices?.[0]?.message?.content || "");
}

async function analyze(apiKey: string, resumeText: string, role: string, filename: string) {
  const prompt = `You are a senior recruiter and forensic operator at Aetheris Technology evaluating a candidate's resume.

Target role context: ${role || "Sales / Operator role at Aetheris (cold outbound, consultative selling, business diagnostics)"}.
Resume filename: ${filename}

Resume text:
"""
${resumeText.slice(0, 24000)}
"""

Return a JSON object with these exact keys:
{
  "candidate_name": string,
  "headline": string,                       // 1-line snapshot
  "years_experience": number,               // best estimate
  "summary": string,                        // 3-5 sentence executive summary
  "key_skills": string[],                   // 5-12 skills
  "strengths": string[],                    // 4-7 bullets
  "weaknesses": string[],                   // 3-6 bullets, blunt
  "red_flags": string[],                    // gaps, job hopping, vague claims, etc.
  "fit_score": number,                      // 0-100 fit for the target role
  "fit_rationale": string,                  // 2-3 sentences justifying score
  "recommended_questions": string[],        // 5-8 sharp interview questions
  "recommendation": "Strong Yes" | "Yes" | "Maybe" | "No" | "Strong No"
}

Return ONLY raw JSON. No markdown, no code fences.`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Lovable-API-Key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI analyze failed ${res.status}: ${t.slice(0, 300)}`);
  }
  const j = await res.json();
  const raw = j?.choices?.[0]?.message?.content || "{}";
  try { return JSON.parse(raw); } catch { return { raw }; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const secret = Deno.env.get("ADMIN_PIN") || "";
    const apiKey = Deno.env.get("LOVABLE_API_KEY") || "";
    if (!secret || !apiKey) {
      return new Response(JSON.stringify({ error: "Server not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!(await authorize(req, secret))) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const form = await req.formData();
    const file = form.get("file");
    const role = String(form.get("role") || "");
    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: "Missing file" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (file.size > 20 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "File too large (max 20MB)" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const name = file.name || "resume";
    const ext = (name.split(".").pop() || "").toLowerCase();
    const mime = file.type || (ext === "pdf" ? "application/pdf" : ext === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/octet-stream");

    let text = "";
    let method = "none";
    if (mime === "application/pdf" || ext === "pdf") { text = await extractPdf(bytes); method = "pdf-parse"; }
    else if (ext === "docx" || mime.includes("word")) { text = await extractDocx(bytes); method = "docx"; }
    else { text = extractPlain(bytes); method = "plain"; }

    if (!isUsable(text)) {
      const aiText = await aiExtract(apiKey, bytes, name, mime);
      if (aiText) { text = aiText; method = "ai-vision"; }
    }

    if (!text.trim()) {
      return new Response(JSON.stringify({ error: "Could not extract text from this file" }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const analysis = await analyze(apiKey, text, role, name);

    return new Response(JSON.stringify({
      filename: name,
      extract_method: method,
      resume_text: text.slice(0, 30000),
      analysis,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("resume-analyze error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
