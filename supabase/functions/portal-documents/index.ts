// Portal Documents — reps view active legal documents and submit a typed signature.
// Auth: portal HMAC token (rep or partner).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { verifyPortalToken, getPortalTokenFromRequest } from "../_shared/portal-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-portal-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const token = getPortalTokenFromRequest(req);
    const claims = await verifyPortalToken(token, SERVICE_KEY);
    if (!claims) {
      return json({ error: "Unauthorized" }, 401);
    }

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "list");

    // Resolve rep name from rep_codes for nicer signature records
    let repName: string | null = null;
    {
      const { data: repRow } = await sb
        .from("rep_codes")
        .select("rep_name")
        .eq("code", claims.code)
        .maybeSingle();
      repName = repRow?.rep_name ?? null;
    }

    if (action === "list") {
      const { data: docs, error } = await sb
        .from("admin_documents")
        .select("id, title, doc_type, content, status, require_signature, visible_to, updated_at")
        .eq("status", "active")
        .order("updated_at", { ascending: false });
      if (error) throw error;

      const ids = (docs || []).map((d: any) => d.id);
      const sigMap: Record<string, any> = {};
      if (ids.length) {
        const { data: sigs } = await sb
          .from("admin_document_signatures")
          .select("document_id, signed_at, typed_signature")
          .eq("rep_code", claims.code)
          .in("document_id", ids);
        for (const s of sigs || []) sigMap[s.document_id] = s;
      }

      const filtered = (docs || []).filter((d: any) => {
        if (d.visible_to === "all" || !d.visible_to) return true;
        if (d.visible_to === "rep") return claims.role === "rep";
        if (d.visible_to === "partner") return claims.role === "partner";
        return true;
      });

      const documents = filtered.map((d: any) => ({
        ...d,
        signed: !!sigMap[d.id],
        signed_at: sigMap[d.id]?.signed_at ?? null,
        typed_signature: sigMap[d.id]?.typed_signature ?? null,
      }));

      return json({ ok: true, documents });
    }

    if (action === "sign") {
      const document_id = String(body.document_id || "");
      const typed_signature = String(body.typed_signature || "").trim();
      if (!document_id) return json({ error: "Missing document_id" }, 400);
      if (typed_signature.length < 2 || typed_signature.length > 120) {
        return json({ error: "Typed signature must be 2-120 characters" }, 400);
      }

      // Confirm doc exists and is active + requires signature
      const { data: doc, error: docErr } = await sb
        .from("admin_documents")
        .select("id, status, require_signature")
        .eq("id", document_id)
        .maybeSingle();
      if (docErr) throw docErr;
      if (!doc) return json({ error: "Document not found" }, 404);
      if (doc.status !== "active") return json({ error: "Document is not active" }, 400);
      if (!doc.require_signature) return json({ error: "Document does not require a signature" }, 400);

      const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("cf-connecting-ip") ||
        null;
      const ua = req.headers.get("user-agent") || null;

      const { data: sig, error: sigErr } = await sb
        .from("admin_document_signatures")
        .upsert(
          {
            document_id,
            rep_code: claims.code,
            rep_name: repName,
            typed_signature,
            ip_address: ip,
            user_agent: ua,
            signed_at: new Date().toISOString(),
          },
          { onConflict: "document_id,rep_code" },
        )
        .select()
        .single();
      if (sigErr) throw sigErr;

      return json({ ok: true, signature: sig });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("portal-documents error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
