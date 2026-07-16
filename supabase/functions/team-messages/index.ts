// Team message board: post / edit / delete / pin / upload.
// Auth: admin token OR portal (rep/partner) token. Only admin can edit/delete/pin others.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { decodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";
import { verifyPortalToken, getPortalTokenFromRequest } from "../_shared/portal-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token, x-portal-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Identify caller
    const adminTok = getAdminTokenFromRequest(req);
    const isAdmin = await verifyAdminToken(adminTok, SVC);
    const portalTok = getPortalTokenFromRequest(req);
    const portal = isAdmin ? null : await verifyPortalToken(portalTok, SVC);

    if (!isAdmin && !portal) return json(401, { error: "Unauthorized" });

    const supabase = createClient(SUPABASE_URL, SVC);
    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === "list") {
      const limit = Math.min(Number(body.limit) || 200, 500);
      const { data, error } = await supabase
        .from("team_messages")
        .select("*")
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return json(200, { messages: data || [] });
    }

    if (action === "unread") {
      const viewerCode = isAdmin ? "ADMIN" : portal!.code;
      const since = String(body.since || new Date(0).toISOString());
      const { data, error } = await supabase
        .from("team_messages")
        .select("id, created_at, author_code, author_name, body")
        .gt("created_at", since)
        .neq("author_code", viewerCode)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return json(200, { messages: data || [] });
    }

    if (action === "post") {
      const text = String(body.body || "").trim();
      const attachments = Array.isArray(body.attachments) ? body.attachments.slice(0, 10) : [];
      const parent_id = body.parent_id || null;
      if (!text && attachments.length === 0) return json(400, { error: "Empty message" });
      if (text.length > 5000) return json(400, { error: "Too long" });

      let author_code: string;
      let author_name: string;
      let author_role: "admin" | "rep" | "partner";

      if (isAdmin) {
        author_code = "ADMIN";
        author_name = String(body.author_name || "Admin").slice(0, 80);
        author_role = "admin";
      } else {
        author_code = portal!.code;
        author_role = portal!.role;
        const { data: rep } = await supabase
          .from("rep_codes")
          .select("rep_name")
          .eq("code", portal!.code)
          .maybeSingle();
        author_name = rep?.rep_name || portal!.code;
      }

      const { data, error } = await supabase
        .from("team_messages")
        .insert({ author_code, author_name, author_role, body: text, attachments, parent_id })
        .select()
        .single();
      if (error) throw error;
      return json(200, { message: data });
    }

    if (action === "edit") {
      if (!isAdmin) return json(403, { error: "Admin only" });
      const id = body.id;
      const text = String(body.body || "").trim();
      if (!id || !text) return json(400, { error: "id and body required" });
      const { error } = await supabase
        .from("team_messages")
        .update({ body: text, edited_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      return json(200, { success: true });
    }

    if (action === "delete") {
      if (!isAdmin) return json(403, { error: "Admin only" });
      const id = body.id;
      if (!id) return json(400, { error: "id required" });
      const { error } = await supabase.from("team_messages").delete().eq("id", id);
      if (error) throw error;
      return json(200, { success: true });
    }

    if (action === "pin") {
      if (!isAdmin) return json(403, { error: "Admin only" });
      const { id, pinned } = body;
      if (!id) return json(400, { error: "id required" });
      const { error } = await supabase
        .from("team_messages")
        .update({ pinned: !!pinned })
        .eq("id", id);
      if (error) throw error;
      return json(200, { success: true });
    }

    if (action === "upload") {
      // body: { filename, content_base64, content_type }
      const filename = String(body.filename || "file").replace(/[^\w.\-]/g, "_").slice(0, 120);
      const contentType = String(body.content_type || "application/octet-stream");
      const b64 = String(body.content_base64 || "");
      if (!b64) return json(400, { error: "content_base64 required" });
      // 10MB cap (base64 inflates ~33%, so ~14MB string)
      if (b64.length > 14_000_000) return json(400, { error: "File too large (max 10MB)" });

      // Strip any data-url prefix the client may have included.
      const cleaned = b64.includes(",") ? b64.split(",", 2)[1] : b64;
      let bytes: Uint8Array;
      try {
        bytes = decodeBase64(cleaned);
      } catch {
        return json(400, { error: "Invalid base64 payload" });
      }
      const path = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${filename}`;
      const { error: upErr } = await supabase.storage
        .from("team-uploads")
        .upload(path, bytes, { contentType, upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("team-uploads").getPublicUrl(path);
      return json(200, {
        attachment: {
          name: filename,
          url: pub.publicUrl,
          path,
          content_type: contentType,
          size: bytes.byteLength,
        },
      });
    }

    return json(400, { error: "Unknown action" });
  } catch (e) {
    console.error("team-messages error:", e);
    return json(500, { error: e instanceof Error ? e.message : "Unknown error" });
  }
});
