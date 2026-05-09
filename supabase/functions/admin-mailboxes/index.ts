// Admin/partner CRUD for rep mailboxes (in-portal email addresses).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";
import { verifyPortalToken, getPortalTokenFromRequest } from "../_shared/portal-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token, x-portal-token",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const EMAIL_DOMAIN = "aetheris.technology";

function slugify(name: string): string {
  return (name || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s.-]/g, "")
    .trim()
    .split(/\s+/)[0] || "rep";
}

function isValidEmail(addr: string): boolean {
  return /^[a-z0-9][a-z0-9._-]{0,63}@[a-z0-9.-]+\.[a-z]{2,}$/i.test(addr);
}

async function pickAddress(sb: any, repName: string): Promise<string> {
  const slug = slugify(repName);
  const { data: existing } = await sb
    .from("rep_mailboxes")
    .select("address")
    .ilike("address", `${slug}%@${EMAIL_DOMAIN}`);
  const taken = new Set((existing || []).map((r: any) => String(r.address).toLowerCase()));
  let candidate = `${slug}@${EMAIL_DOMAIN}`;
  let n = 2;
  while (taken.has(candidate.toLowerCase())) {
    candidate = `${slug}${n}@${EMAIL_DOMAIN}`;
    n++;
  }
  return candidate;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminTok = getAdminTokenFromRequest(req);
    const isAdmin = await verifyAdminToken(adminTok, SVC);
    let isPartner = false;
    if (!isAdmin) {
      const portalTok = getPortalTokenFromRequest(req);
      const portal = await verifyPortalToken(portalTok, SVC);
      if (!portal || portal.role !== "partner") {
        return json(401, { error: "Unauthorized" });
      }
      isPartner = true;
    }

    const sb = createClient(SUPABASE_URL, SVC);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");

    if (action === "list") {
      const { data: reps, error: repErr } = await sb
        .from("rep_codes")
        .select("code, rep_name, role, is_active")
        .order("rep_name", { ascending: true });
      if (repErr) throw repErr;
      const { data: mboxes, error: mErr } = await sb
        .from("rep_mailboxes")
        .select("*");
      if (mErr) throw mErr;
      const counts: Record<string, number> = {};
      const { data: msgCounts } = await sb
        .from("rep_email_messages")
        .select("mailbox_address", { count: "exact", head: false })
        .limit(50000);
      (msgCounts || []).forEach((r: any) => {
        const k = String(r.mailbox_address || "").toLowerCase();
        counts[k] = (counts[k] || 0) + 1;
      });
      const byCode = new Map((mboxes || []).map((m: any) => [m.code, m]));
      const rows = (reps || []).map((r: any) => {
        const m = byCode.get(r.code);
        return {
          code: r.code,
          rep_name: r.rep_name,
          role: r.role,
          is_active: r.is_active,
          mailbox: m
            ? {
                ...m,
                message_count: counts[String(m.address).toLowerCase()] || 0,
              }
            : null,
        };
      });
      return json(200, { rows });
    }

    if (action === "create") {
      const code = String(body.code || "").trim();
      if (!code) return json(400, { error: "code required" });
      const { data: rep } = await sb.from("rep_codes").select("rep_name").eq("code", code).maybeSingle();
      if (!rep) return json(404, { error: "Rep not found" });
      let address = String(body.address || "").trim().toLowerCase();
      if (!address) address = await pickAddress(sb, rep.rep_name);
      if (!isValidEmail(address)) return json(400, { error: "Invalid email address" });
      if (!address.endsWith(`@${EMAIL_DOMAIN}`)) {
        return json(400, { error: `Address must end with @${EMAIL_DOMAIN}` });
      }
      const { data, error } = await sb
        .from("rep_mailboxes")
        .insert({ code, address })
        .select()
        .single();
      if (error) return json(400, { error: error.message });
      return json(200, { mailbox: data });
    }

    if (action === "bulk_generate") {
      const { data: reps } = await sb
        .from("rep_codes")
        .select("code, rep_name")
        .eq("is_active", true);
      const { data: existing } = await sb
        .from("rep_mailboxes")
        .select("code");
      const have = new Set((existing || []).map((r: any) => r.code));
      const created: any[] = [];
      const failed: any[] = [];
      for (const r of reps || []) {
        if (have.has(r.code)) continue;
        try {
          const address = await pickAddress(sb, r.rep_name);
          const { data, error } = await sb
            .from("rep_mailboxes")
            .insert({ code: r.code, address })
            .select()
            .single();
          if (error) failed.push({ code: r.code, error: error.message });
          else created.push(data);
        } catch (e: any) {
          failed.push({ code: r.code, error: String(e?.message || e) });
        }
      }
      return json(200, { created, failed });
    }

    if (action === "update") {
      const id = String(body.id || "");
      if (!id) return json(400, { error: "id required" });
      const patch: Record<string, any> = {};
      if (typeof body.signature === "string") patch.signature = body.signature.slice(0, 2000);
      if ("forwarding_to" in body) {
        const f = body.forwarding_to ? String(body.forwarding_to).trim().toLowerCase() : null;
        if (f && !isValidEmail(f)) return json(400, { error: "Invalid forwarding address" });
        patch.forwarding_to = f;
      }
      if (typeof body.auto_reply_enabled === "boolean") patch.auto_reply_enabled = body.auto_reply_enabled;
      if (typeof body.auto_reply_body === "string") patch.auto_reply_body = body.auto_reply_body.slice(0, 2000);
      if (typeof body.is_active === "boolean") patch.is_active = body.is_active;
      if (typeof body.address === "string") {
        const addr = body.address.trim().toLowerCase();
        if (!isValidEmail(addr) || !addr.endsWith(`@${EMAIL_DOMAIN}`)) {
          return json(400, { error: `Address must be valid and end with @${EMAIL_DOMAIN}` });
        }
        patch.address = addr;
      }
      const { data, error } = await sb
        .from("rep_mailboxes")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) return json(400, { error: error.message });
      return json(200, { mailbox: data });
    }

    if (action === "delete") {
      const id = String(body.id || "");
      if (!id) return json(400, { error: "id required" });
      const { error } = await sb.from("rep_mailboxes").delete().eq("id", id);
      if (error) return json(400, { error: error.message });
      return json(200, { ok: true });
    }

    return json(400, { error: "unknown action" });
  } catch (e: any) {
    console.error("admin-mailboxes error:", e);
    return json(500, { error: String(e?.message || e) });
  }
});
