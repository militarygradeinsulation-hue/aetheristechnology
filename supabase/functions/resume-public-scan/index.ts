// Public: resume vs. company culture-fit scan. Consumes 1 credit per call.
// Accepts multipart/form-data: file (resume), email, company_url, role_title, role_notes, brief (json string).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { Buffer } from "node:buffer";
import pdfParse from "npm:pdf-parse@1.1.1/lib/pdf-parse.js";
import JSZip from "npm:jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const AI_KEY = Deno.env.get("LOVABLE_API_KEY") || "";

function normalize(t: string) {
  return t.replace(/\u0000/g, " ").replace(/\r/g, "\n").replace(/[\t ]{3,}/g, "  ").replace(/\n[\t ]+/g, "\n").replace(/\n{4,}/g, "\n\n\n").trim();
}
function isUsable(t: string) {
  const c = normalize(t);
  return c.length >= 160 && (c.match(/[A-Za-z]{2,}/g) || []).length >= 25;
}
async function extractPdf(buf: Uint8Array) {
  try { const d = await pdfParse(Buffer.from(buf)); return normalize(d?.text || ""); } catch { return ""; }
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
  } catch { return ""; }
}
function extractPlain(buf: Uint8Array) {
  return new TextDecoder("utf-8", { fatal: false }).decode(buf).replace(/[^\x09\x0A\x0D\x20-\x7E]+/g, " ").trim();
}
function toBase64(bytes: Uint8Array) {
  let s = ""; const cs = 0x8000;
  for (let i = 0; i < bytes.length; i += cs) s += String.fromCharCode(...bytes.subarray(i, i + cs));
  return btoa(s);
}
async function aiOcr(bytes: Uint8Array, filename: string, mime: string) {
  if (!(mime === "application/pdf" || mime.startsWith("image/"))) return "";
  const b64 = toBase64(bytes);
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Lovable-API-Key": AI_KEY, "Content-Type": "application/json" },
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
  if (!r.ok) return "";
  const j = await r.json();
  return normalize(j?.choices?.[0]?.message?.content || "");
}

async function fitAnalyze(resumeText: string, brief: any, roleTitle: string, roleNotes: string) {
  const prompt = `You are a forensic operator at Aetheris Technology evaluating a candidate's culture and capability fit for a specific company and role.

Company brief:
"""
${JSON.stringify(brief || {}, null, 2).slice(0, 8000)}
"""

Role title: ${roleTitle || "(not specified)"}
Hiring notes: ${roleNotes || "(none)"}

Resume text:
"""
${resumeText.slice(0, 22000)}
"""

Return ONLY raw JSON with these exact keys:
{
  "candidate_name": string,
  "headline": string,                  // 1-line snapshot
  "years_experience": number,
  "executive_summary": string,         // 3-5 sentences, blunt
  "fit_score": number,                 // 0-100 overall fit
  "fit_band": "Strong Fit" | "Good Fit" | "Borderline" | "Poor Fit",
  "culture_alignment": [{ "point": string, "evidence": string, "rating": "high" | "medium" | "low" }],   // 4-6 items
  "capability_match": [{ "requirement": string, "evidence": string, "rating": "high" | "medium" | "low" }], // 4-6 items
  "strengths": string[],               // 4-6
  "risk_flags": string[],              // 3-6 blunt flags (gaps, hops, vague claims)
  "interview_questions": string[],     // 6-8 sharp, role-specific
  "recommended_next_steps": string,    // 2-3 sentences
  "recommendation": "Strong Yes" | "Yes" | "Maybe" | "No" | "Strong No"
}
No markdown, no code fences.`;

  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Lovable-API-Key": AI_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }),
  });
  if (!r.ok) throw new Error(`AI fit failed ${r.status}: ${(await r.text()).slice(0,300)}`);
  const j = await r.json();
  try { return JSON.parse(j?.choices?.[0]?.message?.content || "{}"); }
  catch { return { raw: j?.choices?.[0]?.message?.content }; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  let consumedEmail: string | null = null;
  try {
    if (!AI_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const form = await req.formData();
    const file = form.get("file");
    const email = String(form.get("email") || "").trim().toLowerCase();
    const companyUrl = String(form.get("company_url") || "").trim();
    const roleTitle = String(form.get("role_title") || "").trim();
    const roleNotes = String(form.get("role_notes") || "").trim();
    let brief: any = {};
    try { brief = JSON.parse(String(form.get("brief") || "{}")); } catch { brief = {}; }

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return new Response(JSON.stringify({ error: "Valid email required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: "Resume file required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (file.size > 10 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "File too large (max 10MB)" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Consume credit (atomic)
    const { data: ok, error: rpcErr } = await supabase.rpc("consume_resume_credit" as any, { _email: email });
    if (rpcErr || !ok) {
      return new Response(JSON.stringify({ error: "No scan credits remaining. Please purchase a pack." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    consumedEmail = email;

    const bytes = new Uint8Array(await file.arrayBuffer());
    const filename = file.name || "resume";
    const ext = (filename.split(".").pop() || "").toLowerCase();
    const mime = file.type ||
      (ext === "pdf" ? "application/pdf" :
       ext === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" :
       "application/octet-stream");

    // Upload to private bucket
    const safeName = filename.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 80);
    const storagePath = `${email}/${Date.now()}-${safeName}`;
    await supabase.storage.from("resume-scans").upload(storagePath, bytes, {
      contentType: mime,
      upsert: false,
    }).catch((e) => console.error("upload resume:", e));

    // Insert scan row (pending)
    const { data: scan } = await supabase.from("resume_scans").insert({
      email,
      company_url: companyUrl || null,
      role_title: roleTitle || null,
      role_notes: roleNotes || null,
      resume_storage_path: storagePath,
      resume_filename: filename,
      status: "pending",
    }).select().single();

    // Extract text
    let text = "";
    if (mime === "application/pdf" || ext === "pdf") text = await extractPdf(bytes);
    else if (ext === "docx" || mime.includes("word")) text = await extractDocx(bytes);
    else text = extractPlain(bytes);
    if (!isUsable(text)) {
      const ai = await aiOcr(bytes, filename, mime);
      if (ai) text = ai;
    }
    if (!text.trim()) {
      // refund credit
      await supabase.rpc("refund_resume_credit" as any, { _email: email });
      if (scan) await supabase.from("resume_scans").update({ status: "failed", error_message: "Could not extract text from resume" }).eq("id", scan.id);
      return new Response(JSON.stringify({ error: "Could not extract text from this resume. Try a different format." }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const analysis = await fitAnalyze(text, brief, roleTitle, roleNotes);
    const fitScore = typeof analysis?.fit_score === "number" ? Math.round(analysis.fit_score) : null;
    const recommendation = analysis?.recommendation ?? null;

    if (scan) {
      await supabase.from("resume_scans").update({
        scan_result: analysis,
        fit_score: fitScore,
        recommendation,
        status: "complete",
      }).eq("id", scan.id);
    }

    // Log to activity_log so admins see it in their feed
    supabase.from("activity_log").insert({
      event_type: "resume_scan.complete",
      entity_type: "resume_scan",
      entity_id: scan?.id ?? null,
      summary: `Resume scan: ${analysis?.candidate_name || "Unknown"} → ${roleTitle || "?"} — Fit ${fitScore ?? "?"}/100`,
      actor: "system",
      metadata: { scan_id: scan?.id, fit_score: fitScore, email, company_url: companyUrl, role_title: roleTitle },
    } as any).then(() => {}, () => {});

    return new Response(JSON.stringify({
      scan_id: scan?.id,
      analysis,
      fit_score: fitScore,
      filename,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("resume-public-scan error:", e);
    if (consumedEmail) {
      await supabase.rpc("refund_resume_credit" as any, { _email: consumedEmail }).catch(() => {});
    }
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
