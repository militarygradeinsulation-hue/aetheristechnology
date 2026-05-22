// admin-purge-blocked-leads: removes leads matching admin-configured blocked
// keywords (schools, universities, etc.) from rep_leads. Admin-only.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { loadBlockedKeywords, isLeadBlocked } from "../_shared/lead-blocklist.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!await verifyAdminToken(req.headers.get("x-admin-token"), serviceKey)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dryRun === true;

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
    const blocked = await loadBlockedKeywords(supabase);
    if (!blocked.length) {
      return new Response(JSON.stringify({ ok: true, matched: 0, deleted: 0, note: "No blocked keywords configured" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Scan all leads in pages, collect matches.
    const matchIds: string[] = [];
    const samples: any[] = [];
    const pageSize = 1000;
    let from = 0;
    while (true) {
      const { data, error } = await supabase.from("rep_leads")
        .select("id,business_name,industry,website,location,contact_name,email,why_fit,notes")
        .range(from, from + pageSize - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      for (const row of data) {
        if (isLeadBlocked(row as any, blocked)) {
          matchIds.push((row as any).id);
          if (samples.length < 20) samples.push({ id: (row as any).id, business_name: (row as any).business_name });
        }
      }
      if (data.length < pageSize) break;
      from += pageSize;
    }

    let deleted = 0;
    if (!dryRun && matchIds.length > 0) {
      // delete in chunks to avoid URL length limits
      for (let i = 0; i < matchIds.length; i += 200) {
        const chunk = matchIds.slice(i, i + 200);
        const { error, count } = await supabase.from("rep_leads")
          .delete({ count: "exact" }).in("id", chunk);
        if (error) throw error;
        deleted += count ?? chunk.length;
      }
    }

    return new Response(JSON.stringify({ ok: true, matched: matchIds.length, deleted, samples, blocked }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("admin-purge-blocked-leads error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
