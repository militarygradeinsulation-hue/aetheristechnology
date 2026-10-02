// admin-quotes — Quoting POS persistence (drafts + SOWs).
// Auth: existing PIN-based HMAC admin token (x-admin-token). The table has RLS
// enabled with no client policies, so only this function (service role) can
// read or write quotes. No emails, payments or commission rows are created.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";
import { computeQuote, type QuoteLineInput, type QuoteDiscount, type QuoteCadence, CADENCES } from "../_shared/quote-math.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const dateOrNull = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

function newQuoteNumber() {
  const d = new Date();
  const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  const rnd = crypto.getRandomValues(new Uint32Array(1))[0].toString(36).toUpperCase().slice(0, 5).padStart(5, "0");
  return `AET-Q-${ymd}-${rnd}`;
}

function sanitizeDiscount(d: any): QuoteDiscount {
  const type = d?.type === "percent" || d?.type === "amount" ? d.type : "none";
  return { type, value: Number(d?.value) || 0 };
}

function sanitizeLines(raw: unknown): QuoteLineInput[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 200).map((l: any, i: number) => ({
    id: str(l?.id, 64) || `line-${i}`,
    catalogName: typeof l?.catalogName === "string" ? l.catalogName.slice(0, 300) : null,
    name: str(l?.name, 300),
    cadence: (CADENCES as string[]).includes(l?.cadence) ? l.cadence : "one_time",
    quantity: Number(l?.quantity),
    listPriceCents: l?.listPriceCents === null || l?.listPriceCents === undefined ? null : Number(l.listPriceCents),
    unitPriceCents: l?.unitPriceCents === null || l?.unitPriceCents === undefined ? null : Number(l.unitPriceCents),
    discount: sanitizeDiscount(l?.discount),
    scope: str(l?.scope, 8000),
  }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const token = getAdminTokenFromRequest(req);
    if (!token || !(await verifyAdminToken(token, SERVICE_KEY))) return json({ error: "Unauthorized" }, 401);

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "list");

    if (action === "list") {
      const q = str(body?.search, 120).trim().replace(/[%,()]/g, " ");
      let query = sb.from("admin_quotes")
        .select("id, quote_number, status, client_company, client_contact, client_email, quote_date, valid_until, sow_title, totals, created_by, created_at, updated_at")
        .order("updated_at", { ascending: false })
        .limit(200);
      if (q) {
        query = query.or(`quote_number.ilike.%${q}%,client_company.ilike.%${q}%,client_contact.ilike.%${q}%,client_email.ilike.%${q}%,sow_title.ilike.%${q}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return json({ quotes: data || [] });
    }

    if (action === "get") {
      const { data, error } = await sb.from("admin_quotes").select("*").eq("id", str(body?.id, 64)).maybeSingle();
      if (error) throw error;
      if (!data) return json({ error: "Quote not found" }, 404);
      return json({ quote: data });
    }

    if (action === "next_number") return json({ quote_number: newQuoteNumber() });

    if (action === "save" || action === "duplicate") {
      const p = body?.quote ?? {};
      const lines = sanitizeLines(p.lines);
      const quoteDiscount = sanitizeDiscount(p.quoteDiscount);
      const quoteDiscountCadence: QuoteCadence = (CADENCES as string[]).includes(p.quoteDiscountCadence) ? p.quoteDiscountCadence : "one_time";
      const totals = computeQuote(lines, quoteDiscount, quoteDiscountCadence);
      const status = p.status === "issued" ? "issued" : "draft";
      if (status === "issued" && !totals.valid) {
        return json({ error: `Fix before issuing: ${totals.errors.slice(0, 3).join(" ")}` }, 400);
      }
      const client = p.client ?? {};
      const email = str(client.email, 200).trim();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Client email is not valid." }, 400);
      const quoteDate = dateOrNull(p.quoteDate) ?? new Date().toISOString().slice(0, 10);

      const payload = {
        client: {
          company: str(client.company, 200), contact: str(client.contact, 200), email,
          phone: str(client.phone, 60), address: str(client.address, 600),
        },
        quoteDate,
        validUntil: dateOrNull(p.validUntil),
        projectStart: dateOrNull(p.projectStart),
        projectEnd: dateOrNull(p.projectEnd),
        lines,
        quoteDiscount,
        quoteDiscountCadence,
        sow: {
          title: str(p.sow?.title, 300), objectives: str(p.sow?.objectives, 8000),
          exclusions: str(p.sow?.exclusions, 8000), timeline: str(p.sow?.timeline, 8000),
          responsibilities: str(p.sow?.responsibilities, 8000), paymentTerms: str(p.sow?.paymentTerms, 8000),
          assumptions: str(p.sow?.assumptions, 8000), notes: str(p.sow?.notes, 8000),
        },
      };
      const snapshot = Array.isArray(p.catalogSnapshot) ? p.catalogSnapshot.slice(0, 200) : [];
      const isDup = action === "duplicate";
      const id = isDup ? null : (str(p.id, 64) || null);
      let quoteNumber = isDup ? newQuoteNumber() : (str(p.quoteNumber, 60).trim() || newQuoteNumber());

      const row = {
        quote_number: quoteNumber,
        status: isDup ? "draft" : status,
        client_company: payload.client.company || null,
        client_contact: payload.client.contact || null,
        client_email: email || null,
        quote_date: isDup ? new Date().toISOString().slice(0, 10) : quoteDate,
        valid_until: payload.validUntil,
        sow_title: payload.sow.title || null,
        payload: isDup ? { ...payload, quoteDate: new Date().toISOString().slice(0, 10) } : payload,
        totals,
        catalog_snapshot: snapshot,
        updated_by: "admin",
      };

      if (id) {
        const { data, error } = await sb.from("admin_quotes").update(row).eq("id", id).select("*").maybeSingle();
        if (error) {
          if ((error as any).code === "23505") return json({ error: `Quote number ${quoteNumber} is already used.` }, 409);
          throw error;
        }
        if (!data) return json({ error: "Quote not found" }, 404);
        return json({ quote: data });
      }
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data, error } = await sb.from("admin_quotes")
          .insert({ ...row, quote_number: quoteNumber, created_by: "admin", duplicated_from: isDup ? (str(p.id, 64) || null) : null })
          .select("*").single();
        if (!error) return json({ quote: data });
        if ((error as any).code !== "23505") throw error;
        if (!isDup && str(p.quoteNumber, 60).trim()) return json({ error: `Quote number ${quoteNumber} is already used.` }, 409);
        quoteNumber = newQuoteNumber();
      }
      return json({ error: "Could not allocate a unique quote number." }, 500);
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("admin-quotes error", e);
    return json({ error: e instanceof Error ? e.message : "Server error" }, 500);
  }
});
