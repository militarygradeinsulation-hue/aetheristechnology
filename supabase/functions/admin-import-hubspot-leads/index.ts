import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

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
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(`${Deno.env.get("ADMIN_PIN") ?? "9822"}.${exp}`));
  const expected = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
  if (expected.length !== sig.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) mismatch |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return mismatch === 0;
}

const INDY_CITIES = new Set([
  "indianapolis","carmel","fishers","noblesville","westfield","zionsville","greenwood",
  "avon","plainfield","brownsburg","franklin","mooresville","lawrence","beech grove",
  "speedway","mccordsville","whitestown","bargersville","greenfield","danville","martinsville",
]);

function isIndyish(city: string | null, state: string | null): boolean {
  if (state && state.toLowerCase().trim() === "in") return true;
  if (state && state.toLowerCase().trim() === "indiana") return true;
  if (city && INDY_CITIES.has(city.toLowerCase().trim())) return true;
  return false;
}

function scoreLead(props: any, hasEmail: boolean, hasPhone: boolean, indy: boolean, recentActivity: boolean): number {
  let s = 30;
  if (indy) s += 30;
  if (hasEmail) s += 10;
  if (hasPhone) s += 10;
  if (props?.company) s += 10;
  if (props?.industry) s += 5;
  if (recentActivity) s += 5;
  return Math.min(100, s);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminToken = req.headers.get("x-admin-token");
    if (!await verifyAdminToken(adminToken, serviceKey)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
    const body = await req.json().catch(() => ({}));
    const batchSize = Math.min(Math.max(Number(body.batchSize) || 1000, 100), 2000);
    const maxBatches = Math.min(Math.max(Number(body.maxBatches) || 5, 1), 20);

    // Load drip settings
    const { data: settings } = await supabase.from("lead_drip_settings").select("*").maybeSingle();
    const requireEmail = settings?.require_email ?? true;
    const indianapolisOnly = settings?.indianapolis_only ?? true;
    const excluded: string[] = settings?.excluded_lifecycle_stages ?? ["customer", "opportunity"];

    let totalScanned = 0;
    let totalInserted = 0;
    let totalSkipped = 0;
    let cursor: string | null = body.cursor || null;

    for (let batch = 0; batch < maxBatches; batch++) {
      let query = supabase
        .from("mirror_contacts")
        .select("hubspot_id,email,first_name,last_name,lifecycle_stage,lead_status,last_activity_date,properties,created_date")
        .order("hubspot_id", { ascending: true })
        .limit(batchSize);

      if (cursor) query = query.gt("hubspot_id", cursor);
      if (requireEmail) query = query.not("email", "is", null);

      const { data: contacts, error } = await query;
      if (error) throw error;
      if (!contacts || contacts.length === 0) break;

      totalScanned += contacts.length;
      cursor = contacts[contacts.length - 1].hubspot_id;

      // Filter eligible
      const rows: any[] = [];
      for (const c of contacts) {
        if (excluded.includes(c.lifecycle_stage || "")) { totalSkipped++; continue; }
        const props = (c.properties as any) || {};
        const city = props.city || null;
        const state = props.state || null;
        const indy = isIndyish(city, state);
        if (indianapolisOnly && !indy) { totalSkipped++; continue; }

        const fullName = [c.first_name, c.last_name].filter(Boolean).join(" ").trim();
        const company = props.company || props.organization || null;
        if (!company && !c.email) { totalSkipped++; continue; }

        const recent = c.last_activity_date && (Date.now() - new Date(c.last_activity_date).getTime()) < 30 * 86400000;
        // Skip if very recent activity (HubSpot owner is actively working it)
        if (recent && c.lifecycle_stage && ["salesqualifiedlead","opportunity"].includes(c.lifecycle_stage)) {
          totalSkipped++; continue;
        }

        rows.push({
          external_id: `hubspot:${c.hubspot_id}`,
          business_name: company ? String(company).slice(0, 200) : null,
          contact_name: fullName ? fullName.slice(0, 200) : null,
          email: c.email ? String(c.email).toLowerCase().slice(0, 200) : null,
          phone: props.phone ? String(props.phone).slice(0, 50) : null,
          website: props.website ? String(props.website).slice(0, 500) : null,
          industry: props.industry ? String(props.industry).slice(0, 100) : null,
          location: [city, state].filter(Boolean).join(", ").slice(0, 200) || null,
          source: "hubspot_import",
          lifecycle_stage: c.lifecycle_stage || null,
          lead_status: c.lead_status || null,
          score: scoreLead(props, !!c.email, !!props.phone, indy, !!recent),
          why_fit: indy
            ? `Indianapolis-area ${props.industry || "business"}${company ? ` (${company})` : ""}`
            : `${props.industry || "Business"} prospect from HubSpot`,
          status: "new",
        });
      }

      if (rows.length > 0) {
        // upsert on external_id
        const { data: inserted, error: insErr } = await supabase
          .from("rep_leads")
          .upsert(rows, { onConflict: "external_id", ignoreDuplicates: true })
          .select("id");
        if (insErr) throw insErr;
        totalInserted += inserted?.length || 0;
      }

      if (contacts.length < batchSize) break;
    }

    return new Response(JSON.stringify({
      ok: true,
      scanned: totalScanned,
      inserted: totalInserted,
      skipped: totalSkipped,
      nextCursor: cursor,
      hasMore: totalScanned >= batchSize * maxBatches,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("admin-import-hubspot-leads error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
