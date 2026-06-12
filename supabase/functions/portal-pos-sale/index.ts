// portal-pos-sale — records a manual sale made by a rep or admin through the
// in-portal POS terminal. Tags the sale with the closing rep's code so the
// existing commission system attributes it correctly.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { verifyPortalToken } from "../_shared/portal-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function verifyAdminToken(token: string | null, secret: string): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [expStr, sig] = parts;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const adminPin = Deno.env.get("ADMIN_PIN");
  if (!adminPin) return false;
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(`${adminPin}.${exp}`));
  const expected = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
  if (expected.length !== sig.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) mismatch |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return mismatch === 0;
}

function bad(status: number, error: string) {
  return new Response(JSON.stringify({ error }), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return bad(405, "POST only");

  try {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    // Auth — accept either admin PIN token OR portal session token.
    const adminTok = req.headers.get("x-admin-token");
    const authHdr = req.headers.get("authorization") || "";
    const portalTok = authHdr.startsWith("Bearer ") ? authHdr.slice(7) : null;

    let claimedBy: { kind: "admin" } | { kind: "portal"; code: string; role: string } | null = null;
    if (await verifyAdminToken(adminTok, serviceKey)) {
      claimedBy = { kind: "admin" };
    } else {
      const claims = await verifyPortalToken(portalTok, serviceKey);
      if (claims) claimedBy = { kind: "portal", code: claims.code, role: claims.role };
    }
    if (!claimedBy) return bad(401, "Unauthorized");

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "record");

    const supabase = createClient(supabaseUrl, serviceKey);

    if (action === "list") {
      const limit = Math.min(Math.max(Number(body?.limit) || 50, 1), 200);
      let q = supabase.from("sales")
        .select("id, occurred_at, product_name, product_id, amount_cents, currency, kind, status, rep_code, partner_code, email, environment, metadata")
        .order("occurred_at", { ascending: false })
        .limit(limit);
      // If the caller is a rep (not admin, not partner), restrict to their own.
      if (claimedBy.kind === "portal" && claimedBy.role === "rep") {
        q = q.eq("rep_code", claimedBy.code);
      }
      const { data, error } = await q;
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, sales: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // action = "record" (default)
    const productName = String(body?.product_name || "").trim().slice(0, 200);
    const productId = String(body?.product_id || "").trim().slice(0, 100) || null;
    const amountCents = Math.round(Number(body?.amount_cents) || 0);
    const kind = (body?.kind === "recurring" ? "recurring" : "one_time") as "one_time" | "recurring";
    const customerEmail = String(body?.customer_email || "").trim().toLowerCase().slice(0, 200) || null;
    const customerName = String(body?.customer_name || "").trim().slice(0, 200) || null;
    const customerPhone = String(body?.customer_phone || "").trim().slice(0, 50) || null;
    const repCodeInput = String(body?.rep_code || "").trim().slice(0, 16);
    const partnerCodeInput = String(body?.partner_code || "").trim().slice(0, 16) || null;
    const environment = (body?.environment === "live" ? "live" : "sandbox") as "live" | "sandbox";
    const notes = String(body?.notes || "").trim().slice(0, 2000);
    const status = (body?.status === "pending" ? "pending" : "paid") as "paid" | "pending";

    if (!productName) return bad(400, "product_name required");
    if (!Number.isFinite(amountCents) || amountCents <= 0 || amountCents > 100_000_000) {
      return bad(400, "amount_cents must be a positive integer <= 100,000,000");
    }

    // Resolve rep_code: portal reps default to their own code, partners/admins
    // may sell on behalf of another rep but rep_code must match a real code.
    let repCode = repCodeInput;
    if (claimedBy.kind === "portal" && claimedBy.role === "rep") {
      repCode = claimedBy.code; // force own code for non-partner reps
    }
    if (!repCode) {
      return bad(400, "rep_code required");
    }
    const { data: repRow, error: repErr } = await supabase
      .from("rep_codes")
      .select("code, is_active, role")
      .eq("code", repCode)
      .maybeSingle();
    if (repErr) throw repErr;
    if (!repRow || repRow.is_active === false) return bad(400, "rep_code does not match an active rep");

    // Upsert customer (if email present) and link to the sale.
    let customerId: string | null = null;
    if (customerEmail) {
      const { data: cId } = await supabase.rpc("upsert_customer_with_sale", {
        _email: customerEmail,
        _name: customerName,
        _phone: customerPhone,
        _stripe_customer_id: null,
        _source: "pos",
        _rep_code: repCode,
        _partner_code: partnerCodeInput,
        _amount_cents: amountCents,
      });
      customerId = (cId as unknown as string) || null;
    }

    // Record the sale.
    const { data: saleRow, error: saleErr } = await supabase
      .from("sales")
      .insert({
        customer_id: customerId,
        email: customerEmail,
        amount_cents: amountCents,
        currency: "usd",
        product_id: productId,
        product_name: productName,
        kind,
        rep_code: repCode,
        partner_code: partnerCodeInput,
        status,
        environment,
        metadata: {
          source: "pos_terminal",
          recorded_by: claimedBy.kind,
          recorder_code: claimedBy.kind === "portal" ? claimedBy.code : null,
          recorder_role: claimedBy.kind === "portal" ? claimedBy.role : "admin",
          notes,
          customer_name: customerName,
          customer_phone: customerPhone,
        },
        occurred_at: new Date().toISOString(),
      })
      .select("id, occurred_at, amount_cents, product_name, rep_code, partner_code, status")
      .single();
    if (saleErr) throw saleErr;

    // Increment rep totals (basic — actual commission split handled elsewhere).
    // Conservatively credit the rep with 25% of one-time, 0% of recurring first month.
    if (status === "paid") {
      const commissionCents = Math.round(amountCents * 0.25);
      await supabase.rpc("increment_rep_sales", {
        _code: repCode,
        _sales: amountCents,
        _commission: commissionCents,
      });
    }

    return new Response(JSON.stringify({ ok: true, sale: saleRow }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("portal-pos-sale error:", e);
    return bad(500, e instanceof Error ? e.message : "Server error");
  }
});
