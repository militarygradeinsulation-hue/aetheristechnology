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

class Invalid extends Error {}
const LIMITS = { lines: 200, scope: 8000, text: 8000, title: 300, name: 300, company: 200, contact: 200, email: 200, phone: 60, address: 600, quoteNumber: 60 };

// Strict: rejects over-limit text instead of truncating, so saved content always equals what was shown.
function txt(v: unknown, max: number, label: string): string {
  if (v === undefined || v === null) return "";
  if (typeof v !== "string") throw new Invalid(`${label} must be text.`);
  if (v.length > max) throw new Invalid(`${label} is too long (${v.length}/${max} characters).`);
  return v;
}
function optDate(v: unknown, label: string): string | null {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  throw new Invalid(`${label} is not a valid date.`);
}

function sanitizeDiscount(d: any, label: string): QuoteDiscount {
  if (d === undefined || d === null) return { type: "none", value: 0 };
  const type = d.type;
  if (type === "none") return { type, value: 0 };
  if (type !== "percent" && type !== "amount") throw new Invalid(`${label}: unknown discount type.`);
  const value = typeof d.value === "number" ? d.value : NaN;
  if (!Number.isFinite(value) || value < 0) throw new Invalid(`${label}: discount value is not a valid number.`);
  if (type === "amount" && !Number.isInteger(value)) throw new Invalid(`${label}: discount amount must be whole cents.`);
  if (type === "percent" && value > 100) throw new Invalid(`${label}: percent must be between 0 and 100.`);
  return { type, value };
}

function sanitizeLines(raw: unknown): QuoteLineInput[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) throw new Invalid("Lines must be a list.");
  if (raw.length > LIMITS.lines) throw new Invalid(`A quote can have at most ${LIMITS.lines} lines (got ${raw.length}).`);
  return raw.map((l: any, i: number) => {
    const label = `Line ${i + 1}`;
    const num = (v: unknown) => (v === null || v === undefined ? null : typeof v === "number" ? v : NaN);
    return {
      id: txt(l?.id, 64, `${label} id`) || `line-${i}`,
      catalogName: l?.catalogName == null ? null : txt(l.catalogName, LIMITS.name, `${label} catalog name`),
      name: txt(l?.name, LIMITS.name, `${label} name`),
      cadence: (CADENCES as string[]).includes(l?.cadence) ? l.cadence : (() => { throw new Invalid(`${label}: invalid cadence.`); })(),
      quantity: typeof l?.quantity === "number" ? l.quantity : NaN,
      listPriceCents: num(l?.listPriceCents),
      unitPriceCents: num(l?.unitPriceCents),
      discount: sanitizeDiscount(l?.discount, `${label} discount`),
      scope: txt(l?.scope, LIMITS.scope, `${label} scope`),
    } as QuoteLineInput;
  });
}

function mergeSnapshots(existing: unknown, incoming: unknown): unknown[] {
  const out: any[] = Array.isArray(existing) ? [...existing] : [];
  const have = new Set(out.map((e) => e?.name));
  for (const e of Array.isArray(incoming) ? incoming : []) {
    if (e && typeof e.name === "string" && !have.has(e.name)) { out.push(e); have.add(e.name); }
  }
  return out.slice(0, LIMITS.lines * 2);
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
      let lines: QuoteLineInput[], quoteDiscount: QuoteDiscount, payload: any, email: string, quoteDate: string;
      const status = p.status === "issued" ? "issued" : "draft";
      try {
        lines = sanitizeLines(p.lines);
        quoteDiscount = sanitizeDiscount(p.quoteDiscount, "Quote discount");
        const client = p.client ?? {};
        email = txt(client.email, LIMITS.email, "Client email").trim();
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Invalid("Client email is not valid.");
        quoteDate = optDate(p.quoteDate, "Quote date") ?? new Date().toISOString().slice(0, 10);
        const sow = p.sow ?? {};
        payload = {
          client: {
            company: txt(client.company, LIMITS.company, "Client company"), contact: txt(client.contact, LIMITS.contact, "Client contact"), email,
            phone: txt(client.phone, LIMITS.phone, "Client phone"), address: txt(client.address, LIMITS.address, "Client address"),
          },
          quoteDate,
          validUntil: optDate(p.validUntil, "Valid until"),
          projectStart: optDate(p.projectStart, "Project start"),
          projectEnd: optDate(p.projectEnd, "Project end"),
          lines,
          quoteDiscount,
          quoteDiscountCadence: (CADENCES as string[]).includes(p.quoteDiscountCadence) ? p.quoteDiscountCadence : "one_time",
          sow: {
            title: txt(sow.title, LIMITS.title, "SOW title"), objectives: txt(sow.objectives, LIMITS.text, "Objectives"),
            exclusions: txt(sow.exclusions, LIMITS.text, "Exclusions"), timeline: txt(sow.timeline, LIMITS.text, "Timeline"),
            responsibilities: txt(sow.responsibilities, LIMITS.text, "Responsibilities"), paymentTerms: txt(sow.paymentTerms, LIMITS.text, "Payment terms"),
            assumptions: txt(sow.assumptions, LIMITS.text, "Assumptions"), notes: txt(sow.notes, LIMITS.text, "Notes"),
          },
          signatures: action === "duplicate" ? { clientDate: "", providerDate: "" } : {
            clientDate: optDate(p.signatures?.clientDate, "Client date signed") ?? "",
            providerDate: optDate(p.signatures?.providerDate, "Aetheris date signed") ?? "",
          },
        };
        txt(p.quoteNumber, LIMITS.quoteNumber, "Quote number");
      } catch (e) {
        if (e instanceof Invalid) return json({ error: e.message }, 400);
        throw e;
      }
      const quoteDiscountCadence: QuoteCadence = payload.quoteDiscountCadence;
      const totals = computeQuote(lines, quoteDiscount, quoteDiscountCadence);
      if (status === "issued" && action === "save") {
        if (!totals.valid) return json({ error: `Fix before issuing: ${totals.errors.slice(0, 3).join(" ")}` }, 400);
        if (!payload.client.company.trim() || !payload.client.contact.trim()) {
          return json({ error: "Client company and contact name are required before issuing." }, 400);
        }
      }
      const isDup = action === "duplicate";
      const id = isDup ? null : (str(p.id, 64) || null);
      let quoteNumber = isDup ? newQuoteNumber() : (str(p.quoteNumber, 60).trim() || newQuoteNumber());
      // Snapshots: existing entries on a saved quote are never replaced; only new services are appended.
      let snapshot: unknown[];
      if (id) {
        const { data: cur, error: curErr } = await sb.from("admin_quotes").select("catalog_snapshot").eq("id", id).maybeSingle();
        if (curErr) throw curErr;
        if (!cur) return json({ error: "Quote not found" }, 404);
        snapshot = mergeSnapshots(cur.catalog_snapshot, p.catalogSnapshot);
      } else if (isDup) {
        const srcId = str(p.id, 64);
        const { data: src } = srcId ? await sb.from("admin_quotes").select("catalog_snapshot").eq("id", srcId).maybeSingle() : { data: null };
        snapshot = mergeSnapshots(src?.catalog_snapshot, p.catalogSnapshot);
      } else {
        snapshot = mergeSnapshots([], p.catalogSnapshot);
      }

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
