// Server side persistence for Aetheris Nexus chat threads.
// Threads used to live only in the browser (localStorage), so a browser reset
// wiped a rep's entire history. This function mirrors them to the database.
//
// Auth: rep/partner portal token (x-portal-token) or admin token (x-admin-token).
// Guests without either stay on local only storage.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { verifyPortalToken, getPortalTokenFromRequest } from "../_shared/portal-token.ts";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-portal-token, x-admin-token",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const MAX_MESSAGES = 400;
const MAX_THREADS_PER_IMPORT = 200;

type Identity = { code: string; role: string };

async function identify(req: Request, secret: string): Promise<Identity | null> {
  const portal = await verifyPortalToken(getPortalTokenFromRequest(req), secret);
  if (portal) return { code: portal.code.trim().toUpperCase(), role: portal.role };
  const isAdmin = await verifyAdminToken(getAdminTokenFromRequest(req), secret);
  if (isAdmin) return { code: "ADMIN", role: "admin" };
  return null;
}

function sanitizeThread(raw: any) {
  const key = String(raw?.id ?? "").trim();
  if (!key) return null;
  const messages = Array.isArray(raw?.messages) ? raw.messages.slice(-MAX_MESSAGES) : [];
  const title = String(raw?.title ?? "New conversation").slice(0, 200);
  const clientUpdated = Number(raw?.updatedAt);
  return {
    thread_key: key,
    title,
    messages,
    message_count: messages.length,
    client_updated_at: new Date(
      Number.isFinite(clientUpdated) && clientUpdated > 0 ? clientUpdated : Date.now(),
    ).toISOString(),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceKey);

    const who = await identify(req, serviceKey);
    if (!who) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "list");

    // ---------------- list ----------------
    if (action === "list") {
      const { data, error } = await supabase
        .from("nexus_threads")
        .select("thread_key, title, messages, client_updated_at")
        .eq("owner_code", who.code)
        .is("deleted_at", null)
        .order("client_updated_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return json({
        threads: (data ?? []).map((r: any) => ({
          id: r.thread_key,
          title: r.title,
          messages: Array.isArray(r.messages) ? r.messages : [],
          updatedAt: new Date(r.client_updated_at).getTime(),
        })),
      });
    }

    // ---------------- upsert one thread ----------------
    if (action === "save") {
      const t = sanitizeThread(body?.thread);
      if (!t) return json({ error: "thread.id required" }, 400);
      const { error } = await supabase.from("nexus_threads").upsert(
        { ...t, owner_code: who.code, owner_role: who.role, deleted_at: null },
        { onConflict: "owner_code,thread_key" },
      );
      if (error) throw error;
      return json({ success: true });
    }

    // ---------------- bulk import (one time local migration) ----------------
    if (action === "import") {
      const list = Array.isArray(body?.threads) ? body.threads.slice(0, MAX_THREADS_PER_IMPORT) : [];
      const rows = list
        .map(sanitizeThread)
        .filter((t: any) => t && t.messages.length > 0)
        .map((t: any) => ({ ...t, owner_code: who.code, owner_role: who.role, deleted_at: null }));
      if (rows.length === 0) return json({ success: true, imported: 0 });
      const { error } = await supabase
        .from("nexus_threads")
        .upsert(rows, { onConflict: "owner_code,thread_key", ignoreDuplicates: false });
      if (error) throw error;
      return json({ success: true, imported: rows.length });
    }

    // ---------------- soft delete ----------------
    if (action === "delete") {
      const key = String(body?.threadId ?? "").trim();
      if (!key) return json({ error: "threadId required" }, 400);
      const { error } = await supabase
        .from("nexus_threads")
        .update({ deleted_at: new Date().toISOString() })
        .eq("owner_code", who.code)
        .eq("thread_key", key);
      if (error) throw error;
      return json({ success: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("[nexus-threads]", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
