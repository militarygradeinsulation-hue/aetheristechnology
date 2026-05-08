// Admin Documents — list/create/update/delete legal docs + AI generation in Aetheris voice.
// Auth: HMAC admin token.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are the Aetheris AI / CTOguy.ai legal documents drafter.

Brand & voice:
- Company: Aetheris AI (operating brand of CTOguy.ai LLC), a Business Forensics Operator.
- Owner-operator: Joseph Toney, Indianapolis IN, serves nationwide.
- IP exclusively owned by CTOguy.ai LLC.
- Tone: Direct. Operator. Forensic, not corporate. Plain English. No fluff. No emojis.
- Audience: independent commission-only sales reps and partners working under our system.

Document rules:
- Output a single, complete, signature-ready document in clean Markdown.
- Use ALL CAPS section headers (## NON-DISCLOSURE, etc.).
- Always include: Effective Date placeholder ([DATE]), Company name (Aetheris AI / CTOguy.ai LLC), Indiana governing law, severability, entire-agreement clause, and a signature block with [REP NAME], [REP CODE], [DATE], [SIGNATURE].
- Bind reps to confidentiality of: lead lists, pricing structure, commission split (70/15/15), AI prompts, internal tools, prospect data, and anything seen inside /admin or /portal.
- No attorney-client guarantees. End with: "*Reviewed by counsel before deployment.*"
- Default to US/Indiana law unless told otherwise.

Never:
- Promise specific dollar earnings.
- Misrepresent the rep as a W-2 employee — they are 1099 independent contractors.
- Quote pricing outside the locked ladder if asked to mention pricing.`;

interface DocRow {
  id: string;
  title: string;
  doc_type: string;
  prompt: string | null;
  content: string;
  status: string;
  require_signature: boolean;
  visible_to: string;
  created_at: string;
  updated_at: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const token = getAdminTokenFromRequest(req);
    if (!token || !(await verifyAdminToken(token, SERVICE_KEY))) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "list");

    if (action === "list") {
      const { data, error } = await sb
        .from("admin_documents")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;

      // Hydrate with signature counts
      const docIds = (data || []).map((d: DocRow) => d.id);
      let sigsByDoc: Record<string, any[]> = {};
      if (docIds.length) {
        const { data: sigs } = await sb
          .from("admin_document_signatures")
          .select("document_id, rep_code, rep_name, signed_at")
          .in("document_id", docIds);
        for (const s of sigs || []) {
          (sigsByDoc[s.document_id] ||= []).push(s);
        }
      }
      const docs = (data || []).map((d: DocRow) => ({
        ...d,
        signatures: sigsByDoc[d.id] || [],
        signature_count: (sigsByDoc[d.id] || []).length,
      }));
      return json({ ok: true, documents: docs });
    }

    if (action === "create") {
      const title = String(body.title || "Untitled Document").slice(0, 200);
      const doc_type = String(body.doc_type || "general").slice(0, 50);
      const prompt = body.prompt ? String(body.prompt).slice(0, 8000) : null;
      const content = String(body.content || "");
      const require_signature = body.require_signature !== false;
      const visible_to = String(body.visible_to || "all").slice(0, 50);

      const { data, error } = await sb
        .from("admin_documents")
        .insert({ title, doc_type, prompt, content, require_signature, visible_to, status: "draft" })
        .select()
        .single();
      if (error) throw error;
      return json({ ok: true, document: data });
    }

    if (action === "update") {
      const id = String(body.id || "");
      if (!id) return json({ error: "Missing id" }, 400);
      const patch: Record<string, unknown> = {};
      for (const k of ["title", "doc_type", "prompt", "content", "status", "require_signature", "visible_to"]) {
        if (k in body) patch[k] = body[k];
      }
      const { data, error } = await sb
        .from("admin_documents")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return json({ ok: true, document: data });
    }

    if (action === "delete") {
      const id = String(body.id || "");
      if (!id) return json({ error: "Missing id" }, 400);
      const { error } = await sb.from("admin_documents").delete().eq("id", id);
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "generate") {
      const prompt = String(body.prompt || "").trim();
      const doc_type = String(body.doc_type || "general");
      if (!prompt) return json({ error: "Prompt is required" }, 400);

      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) return json({ error: "AI gateway not configured" }, 500);

      const userMsg = `Draft a [${doc_type}] document for Aetheris AI based on this request:\n\n"""${prompt}"""\n\nReturn the full document as Markdown only — no preamble, no explanation, no fences.`;

      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userMsg },
          ],
        }),
      });

      if (!aiRes.ok) {
        if (aiRes.status === 429) return json({ error: "Rate limit hit. Try again in a moment." }, 429);
        if (aiRes.status === 402) return json({ error: "Lovable AI credits exhausted. Add credits in Settings → Workspace → Usage." }, 402);
        const t = await aiRes.text();
        console.error("AI gateway error", aiRes.status, t);
        return json({ error: "AI generation failed" }, 500);
      }
      const ai = await aiRes.json();
      const content = ai?.choices?.[0]?.message?.content || "";

      // Auto-derive a title if missing
      const titleGuess = (() => {
        const m = content.match(/^#\s+(.+)$/m);
        if (m) return m[1].slice(0, 200);
        return prompt.slice(0, 80) + (prompt.length > 80 ? "…" : "");
      })();

      return json({ ok: true, content, suggested_title: titleGuess });
    }

    if (action === "list_signatures") {
      const document_id = String(body.document_id || "");
      if (!document_id) return json({ error: "Missing document_id" }, 400);
      const { data, error } = await sb
        .from("admin_document_signatures")
        .select("*")
        .eq("document_id", document_id)
        .order("signed_at", { ascending: false });
      if (error) throw error;
      return json({ ok: true, signatures: data || [] });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("admin-documents error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
