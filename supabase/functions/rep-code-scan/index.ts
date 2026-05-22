// Free rep-code-gated website audit scan.
// Validates the operator rep code, captures the prospect lead, runs the
// existing scan-website pipeline, and returns ONLY a teaser (not the full report).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const clean = (v: unknown, max: number): string =>
  String(v ?? "").trim().slice(0, max);

const isEmail = (s: string) => /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(s);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SVC);

    const body = await req.json().catch(() => ({}));
    const repCode = clean(body.rep_code, 32).toUpperCase();
    const name = clean(body.name, 120);
    const email = clean(body.email, 255).toLowerCase();
    const phone = clean(body.phone, 40);
    const company = clean(body.company, 200);
    let url = clean(body.url, 500);

    if (!repCode) return json(400, { error: "Rep code required" });
    if (!email || !isEmail(email)) return json(400, { error: "Valid email required" });
    if (!url) return json(400, { error: "Website URL required" });
    if (!url.startsWith("http://") && !url.startsWith("https://")) url = `https://${url}`;

    // 1) Validate rep code
    const { data: codeRow, error: codeErr } = await supabase
      .from("rep_codes")
      .select("code, rep_name, is_active")
      .eq("code", repCode)
      .maybeSingle();
    if (codeErr) throw codeErr;
    if (!codeRow || !codeRow.is_active) {
      return json(403, { error: "That operator code isn't active. Double-check with your operator." });
    }

    // 2) Run the existing scan-website function
    const scanRes = await fetch(`${SUPABASE_URL}/functions/v1/scan-website`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SVC}`,
        apikey: SVC,
      },
      body: JSON.stringify({ url }),
    });
    if (!scanRes.ok) {
      const t = await scanRes.text();
      console.error("scan-website failed:", scanRes.status, t);
      return json(scanRes.status, { error: "Scan failed. Try again or contact your operator." });
    }
    const full = await scanRes.json();

    // 3) Build the teaser — enough to be useful, not enough to skip the call
    const gaps: any[] = Array.isArray(full?.gaps) ? full.gaps : [];
    const critical = gaps.filter((g) => g?.severity === "critical");
    const warning = gaps.filter((g) => g?.severity === "warning");

    const pickPreview = (g: any) => ({
      category: g?.category || "",
      severity: g?.severity || "info",
      title: g?.title || "",
      hint: typeof g?.description === "string" ? g.description.split(/\\.\\s/)[0].slice(0, 180) + "." : "",
    });

    const teaser = {
      score: full?.score ?? null,
      grade: full?.grade ?? null,
      companyName: full?.companyName ?? "",
      executiveSummary: typeof full?.executiveSummary === "string"
        ? full.executiveSummary.slice(0, 480)
        : "",
      gapCount: gaps.length,
      criticalCount: critical.length,
      warningCount: warning.length,
      topIssues: [...critical.slice(0, 2), ...warning.slice(0, 2)].slice(0, 4).map(pickPreview),
      contradictions: (gaps.filter((g) => /contradict/i.test(g?.category || "") || /contradict/i.test(g?.title || "")).slice(0, 2)).map(pickPreview),
      friction: (gaps.filter((g) => /friction/i.test(g?.category || "") || /friction/i.test(g?.title || "")).slice(0, 2)).map(pickPreview),
      nextSteps: Array.isArray(full?.nextSteps) ? full.nextSteps.slice(0, 2) : [],
    };

    // 4) Find the scan row we just saved (best-effort)
    const { data: scanRow } = await supabase
      .from("website_scans")
      .select("id")
      .eq("url", url)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // 5) Capture lead
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const ua = req.headers.get("user-agent");
    const referrer = req.headers.get("referer");

    const { data: leadRow, error: leadErr } = await supabase
      .from("rep_code_scan_leads")
      .insert({
        rep_code: repCode,
        prospect_name: name || null,
        prospect_email: email,
        prospect_phone: phone || null,
        company: company || null,
        website_url: url,
        score: typeof full?.score === "number" ? full.score : null,
        grade: full?.grade || null,
        gap_count: gaps.length,
        critical_count: critical.length,
        teaser,
        scan_id: scanRow?.id || null,
        ip,
        user_agent: ua,
        referrer,
      })
      .select("id")
      .single();
    if (leadErr) console.error("lead insert error:", leadErr);

    return json(200, {
      ok: true,
      lead_id: leadRow?.id || null,
      operator: codeRow.rep_name || null,
      teaser,
    });
  } catch (e) {
    console.error("rep-code-scan error:", e);
    return json(500, { error: e instanceof Error ? e.message : "Unknown error" });
  }
});
