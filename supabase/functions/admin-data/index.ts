// PIN-token-gated admin data endpoint. Reads/writes the dashboard tables using
// the service role so we don't need a Supabase Auth session for the admin UI.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";
import { sendTemplateEmail } from "../_shared/transactional-email-templates/send-email.ts";
import { SCANNED_LEADS_PAGE_SIZE, safeDirectoryPage, safeDirectorySearch, websiteScanIssues, enrichedLeadIssues, indexedReportIssue, scanCompanyName, safePublicUrl, contactNameList } from "../_shared/scanned-leads-directory.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const token = getAdminTokenFromRequest(req);
    const ok = await verifyAdminToken(token, SUPABASE_SERVICE_ROLE_KEY);
    if (!ok) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json().catch(() => ({}));
    const { action } = body;

    if (action === "dashboard") {
      // Hard-cap both queries — site_events grows fast and an unbounded
      // SELECT was hitting Postgres statement_timeout (57014) and bubbling
      // up to the client as a 500 / blank screen.
      // Run independently so a slow site_events query can't fail the whole response.
      const subRes = await supabase
        .from("contact_submissions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200)
        .then((r) => r, (e) => ({ data: [], error: e }));

      let events: any[] = [];
      try {
        const evtRes = await supabase
          .from("site_events")
          .select("id,event_type,session_id,user_agent,created_at")
          .order("created_at", { ascending: false })
          .limit(200);
        if (evtRes.error) console.error("dashboard events error:", evtRes.error);
        events = evtRes.data || [];
      } catch (e) {
        console.error("dashboard events exception:", e);
      }
      if ((subRes as any).error) console.error("dashboard submissions error:", (subRes as any).error);
      return new Response(
        JSON.stringify({ submissions: (subRes as any).data || [], events }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "crm") {
      const env = body.env || null;
      let salesQ = supabase.from("sales").select("*").order("occurred_at", { ascending: false }).limit(500);
      let commQ = supabase.from("commissions").select("*").order("created_at", { ascending: false }).limit(500);
      if (env) { salesQ = salesQ.eq("environment", env); commQ = commQ.eq("environment", env); }
      const [salesR, custR, commR, actR] = await Promise.all([
        salesQ,
        supabase.from("customers").select("*").order("last_seen_at", { ascending: false }).limit(500),
        commQ,
        supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(500),
      ]);
      return new Response(JSON.stringify({
        sales: salesR.data || [], customers: custR.data || [],
        commissions: commR.data || [], activity: actR.data || [],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "mark_commission_paid") {
      const { id, payout_reference } = body;
      const { error } = await supabase.from("commissions").update({
        status: "paid", paid_at: new Date().toISOString(), payout_reference: payout_reference || null,
      }).eq("id", id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "toggle_read") {
      const { id, is_read } = body;
      if (!id) {
        return new Response(JSON.stringify({ error: "id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await supabase.from("contact_submissions").update({ is_read }).eq("id", id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete_submission") {
      const { id } = body;
      if (!id) {
        return new Response(JSON.stringify({ error: "id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await supabase.from("contact_submissions").delete().eq("id", id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Read-only admin directory for existing scans. Never initiates enrichment,
    // Firecrawl, AI requests, or prospect discovery.
    if (action === "scanned_leads_directory") {
      const source = ["forensic", "website", "enriched"].includes(body.source) ? body.source : "forensic";
      const page = safeDirectoryPage(body.page);
      const search = safeDirectorySearch(body.search);
      const from = page * SCANNED_LEADS_PAGE_SIZE;
      const to = from + SCANNED_LEADS_PAGE_SIZE - 1;
      const searchValue = search ? `%${search}%` : "";
      const countsQuery = async () => {
        const [f, w, e] = await Promise.all([
          supabase.from("forensic_scans").select("id", { count: "exact", head: true }),
          supabase.from("website_scans").select("id", { count: "exact", head: true }),
          supabase.from("rep_leads").select("id", { count: "exact", head: true }).not("enrichment", "is", null),
        ]);
        for (const r of [f,w,e]) if (r.error) throw r.error;
        return { forensic: f.count || 0, website: w.count || 0, enriched: e.count || 0 };
      };
      const counts = await countsQuery();
      let rows: Record<string, unknown>[] = [];
      let total = 0;
      if (source === "forensic") {
        let q = supabase.from("forensic_scans")
          .select("id,target_url,company_name,lead_name,lead_email,lead_phone,status,error_message,created_at,completed_at", { count: "exact" })
          .order("created_at", { ascending: false });
        if (search) q = q.or(`company_name.ilike.${searchValue},target_url.ilike.${searchValue},lead_name.ilike.${searchValue},lead_email.ilike.${searchValue}`);
        const scans = await q.range(from,to);
        if (scans.error) throw scans.error;
        total = scans.count || 0;
        const found = scans.data || [];
        const ids = found.map((item: any) => item.id);
        const ar = ids.length
          ? await supabase.from("golden_report_archive")
            .select("id,scan_id,company_id,report_state,report_source,leak_count,finding_count,score,grade,executive_summary,annual_low,annual_high")
            .in("scan_id",ids)
          : { data: [], error: null };
        if (ar.error) throw ar.error;
        const archives = ar.data || [];
        const archiveIds = archives.map((a: any)=>a.id);
        const companyIds = [...new Set(archives.map((a: any)=>a.company_id).filter(Boolean))];
        const [companiesRes, findingsRes] = await Promise.all([
          companyIds.length
            ? supabase.from("golden_report_companies").select("id,display_name,website_url,industry,location,poc_name,poc_title,poc_email,poc_phone,contact_names").in("id",companyIds)
            : Promise.resolve({ data: [], error: null }),
          archiveIds.length
            ? supabase.from("golden_report_findings_index")
              .select("archive_id,title,detail,category,evidence_grade,priority,recommended_action,annual_low,annual_high")
              .in("archive_id",archiveIds).order("priority", { ascending: true }).limit(1200)
            : Promise.resolve({ data: [], error: null }),
        ]);
        if (companiesRes.error) throw companiesRes.error;
        if (findingsRes.error) throw findingsRes.error;
        const byScan = new Map(archives.map((item:any)=>[item.scan_id,item]));
        const companies = new Map((companiesRes.data||[]).map((item:any)=>[item.id,item]));
        const byArchive = new Map<string, any[]>();
        for (const finding of findingsRes.data || []) {
          const list = byArchive.get(finding.archive_id) || [];
          if (list.length < 50) list.push(finding);
          byArchive.set(finding.archive_id,list);
        }
        rows = found.map((item:any) => {
          const archive: any = byScan.get(item.id) || null;
          const company: any = archive ? companies.get(archive.company_id) || null : null;
          const issues = (archive ? byArchive.get(archive.id) || [] : [])
            .map(indexedReportIssue).filter(Boolean);
          return {
            id:item.id, source:"forensic", name:scanCompanyName(item.target_url,company?.display_name || item.company_name),
            website:safePublicUrl(company?.website_url || item.target_url),
            contactName:item.lead_name || company?.poc_name || contactNameList(company?.contact_names).join(", ") || null,
            contactEmail:item.lead_email || company?.poc_email || null,
            contactPhone:item.lead_phone || company?.poc_phone || null,
            contactTitle:company?.poc_title || null, industry:company?.industry || null, location:company?.location || null,
            date:item.completed_at || item.created_at, status:item.status,
            score:archive?.score ?? null, grade:archive?.grade || null,
            summary:archive?.executive_summary || item.error_message || null,
            reportState:archive?.report_state || null, reportSource:archive?.report_source || null,
            issues, issueCount:archive?.finding_count ?? issues.length, leakCount:archive?.leak_count ?? null,
            annualLow:archive?.annual_low ?? null, annualHigh:archive?.annual_high ?? null,
            archiveId:archive?.id || null, scanId:item.id,
          };
        });
      } else if (source === "website") {
        let q = supabase.from("website_scans")
          .select("id,url,score,gaps,created_at", { count: "exact" })
          .order("created_at", { ascending: false });
        if (search) q = q.ilike("url",searchValue);
        const data = await q.range(from,to);
        if (data.error) throw data.error;
        total = data.count || 0;
        rows = (data.data || []).map((item:any)=>{
          const body = item.gaps || {};
          const issues = websiteScanIssues(body);
          return {
            id:item.id, source:"website", name:scanCompanyName(item.url,body.companyName),
            website:safePublicUrl(item.url), contactName:null,contactEmail:null,contactPhone:null,
            contactTitle:null,industry:null,location:null,date:item.created_at,status:"completed",
            score:item.score,grade:body.grade || null,summary:body.executiveSummary || null,
            reportState:body._fallback ? "fallback" : "website scan",reportSource:"website scan",
            issues, issueCount:issues.length, leakCount:null,annualLow:null,annualHigh:null,archiveId:null,scanId:null,
          };
        });
      } else {
        let q = supabase.from("rep_leads")
          .select("id,business_name,contact_name,email,phone,website,industry,location,score,why_fit,status,enrichment,enriched_at,created_at,notes", { count: "exact" })
          .not("enrichment","is",null).order("created_at", { ascending: false });
        if (search) q = q.or(`business_name.ilike.${searchValue},contact_name.ilike.${searchValue},email.ilike.${searchValue},website.ilike.${searchValue}`);
        const data = await q.range(from,to);
        if (data.error) throw data.error;
        total = data.count || 0;
        rows = (data.data || []).map((item:any)=>{
          const e = item.enrichment || {};
          const rr = e.rocketreach || {};
          const scan = e.scan || {};
          const issues = enrichedLeadIssues(e);
          return {
            id:item.id,source:"enriched",name:scanCompanyName(item.website,item.business_name),
            website:safePublicUrl(item.website || scan.scanned_url),
            contactName:item.contact_name || rr.name || null,
            contactEmail:item.email || rr.best_email || null,
            contactPhone:item.phone || (Array.isArray(rr.phones) && typeof rr.phones[0] === "string" ? rr.phones[0] : null),
            contactTitle:rr.title || null,linkedinUrl:safePublicUrl(rr.linkedin_url),
            industry:item.industry || e.industry_refined || null,location:item.location || rr.location || null,
            date:item.enriched_at || item.created_at,status:item.status || "enriched",
            score:item.score ?? scan.score ?? null,grade:scan.grade || null,
            summary:scan.executiveSummary || item.why_fit || item.notes || null,
            reportState:scan._fallback ? "fallback" : "enriched",reportSource:"lead enrichment",
            issues,issueCount:issues.length,leakCount:null,annualLow:null,annualHigh:null,archiveId:null,scanId:null,
          };
        });
      }
      return new Response(JSON.stringify({ rows, counts, source, page, pageSize:SCANNED_LEADS_PAGE_SIZE, total }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "leads_browser") {
      const filter = (body.filter as string) || "pool";
      const search = (body.search as string) || "";
      const minScore = typeof body.minScore === "number" ? body.minScore : null;

      let q = supabase
        .from("rep_leads")
        .select(
          "id,business_name,contact_name,email,phone,website,industry,location,score,why_fit,status,source,claimed_by_code,assigned_to_code,assignment_expires_at,enrichment,enriched_at,created_at,notes,low_hanging_fruit,admin_holding",
        )
        .order("score", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(200);

      if (filter === "pool") q = q.is("claimed_by_code", null).is("assigned_to_code", null).eq("admin_holding", false);
      if (filter === "assigned") q = q.is("claimed_by_code", null).not("assigned_to_code", "is", null);
      if (filter === "claimed") q = q.not("claimed_by_code", "is", null);
      if (filter === "holding") q = q.eq("admin_holding", true);

      if (search.trim()) {
        const s = search.trim().replace(/[,()*\\%:\r\n]/g, " ").trim();
        if (s) q = q.or(`business_name.ilike.%${s}%,website.ilike.%${s}%,industry.ilike.%${s}%`);
      }
      if (minScore !== null) q = q.gte("score", minScore);

      const nowIso = new Date().toISOString();
      const [leadsR, repsR, dripR, claimedR] = await Promise.all([
        q,
        supabase.from("rep_codes").select("code,rep_name,is_active,role").order("rep_name"),
        supabase
          .from("rep_leads")
          .select("assigned_to_code")
          .is("claimed_by_code", null)
          .not("assigned_to_code", "is", null)
          .gt("assignment_expires_at", nowIso)
          .limit(5000),
        supabase
          .from("rep_leads")
          .select("claimed_by_code")
          .not("claimed_by_code", "is", null)
          .limit(10000),
      ]);

      if (leadsR.error) throw leadsR.error;
      const dripCounts: Record<string, number> = {};
      (dripR.data || []).forEach((r: any) => {
        if (r.assigned_to_code) dripCounts[r.assigned_to_code] = (dripCounts[r.assigned_to_code] || 0) + 1;
      });
      const claimedCounts: Record<string, number> = {};
      (claimedR.data || []).forEach((r: any) => {
        if (r.claimed_by_code) claimedCounts[r.claimed_by_code] = (claimedCounts[r.claimed_by_code] || 0) + 1;
      });
      const totalCounts: Record<string, number> = {};
      for (const code of new Set([...Object.keys(dripCounts), ...Object.keys(claimedCounts)])) {
        totalCounts[code] = (dripCounts[code] || 0) + (claimedCounts[code] || 0);
      }

      return new Response(
        JSON.stringify({
          leads: leadsR.data || [],
          reps: repsR.data || [],
          dripCounts,
          claimedCounts,
          totalCounts,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "lead_pool_stats") {
      const [tot, un, dr, cl, wo, dd] = await Promise.all([
        supabase.from("rep_leads").select("id", { count: "exact", head: true }),
        supabase.from("rep_leads").select("id", { count: "exact", head: true })
          .is("claimed_by_code", null).is("assigned_to_code", null),
        supabase.from("rep_leads").select("id", { count: "exact", head: true })
          .is("claimed_by_code", null).not("assigned_to_code", "is", null),
        supabase.from("rep_leads").select("id", { count: "exact", head: true })
          .not("claimed_by_code", "is", null).not("status", "in", "(won,lost,dead)"),
        supabase.from("rep_leads").select("id", { count: "exact", head: true }).in("status", ["won"]),
        supabase.from("rep_leads").select("id", { count: "exact", head: true }).in("status", ["lost", "dead"]),
      ]);
      return new Response(JSON.stringify({
        ok: true,
        stats: {
          total: tot.count ?? 0,
          unassigned: un.count ?? 0,
          dripped: dr.count ?? 0,
          claimed: cl.count ?? 0,
          worked: wo.count ?? 0,
          dead: dd.count ?? 0,
        },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "lead_pool_recent") {
      const limit = Math.min(Math.max(Number(body.limit) || 50, 1), 200);
      const { data, error } = await supabase
        .from("rep_leads")
        .select("id,business_name,industry,location,website,score,why_fit,source,status,claimed_by_code,created_at")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, leads: data || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "delete_lead") {
      const id = String(body.id || "");
      if (!id) {
        return new Response(JSON.stringify({ error: "Missing id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await supabase.from("rep_leads").delete().eq("id", id);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "get_drip_settings") {
      const { data, error } = await supabase.from("lead_drip_settings").select("*").maybeSingle();
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, settings: data || null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "update_drip_settings") {
      const patch = (body.patch || {}) as Record<string, unknown>;
      const allowed = [
        "daily_per_rep", "enabled", "require_email", "indianapolis_only",
        "scraper_enabled", "scraper_target_per_run", "hold_hours", "blocked_keywords",
      ];
      const clean: Record<string, unknown> = { updated_at: new Date().toISOString() };
      for (const k of allowed) if (k in patch) clean[k] = (patch as any)[k];
      const id = String(body.id || "");
      if (!id) return new Response(JSON.stringify({ error: "Missing id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { error } = await supabase.from("lead_drip_settings").update(clean).eq("id", id);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "careers_payments") {
      const { data, error } = await supabase
        .from("sales")
        .select("id,email,amount_cents,currency,status,environment,occurred_at,stripe_session_id,metadata")
        .eq("metadata->>purpose", "careers_test_fee")
        .order("occurred_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const rows = data || [];
      const paid = rows.filter((r: any) => r.status === "paid");
      const total_cents = paid.reduce((s: number, r: any) => s + (r.amount_cents || 0), 0);
      const emails = Array.from(new Set(paid.map((r: any) => (r.email || "").toLowerCase()).filter(Boolean)));
      const attempts_by_email: Record<string, any> = {};
      if (emails.length) {
        const { data: at } = await supabase
          .from("careers_attempts")
          .select("id,candidate_email,candidate_name,status,score_pct,share_code,submitted_at")
          .in("candidate_email", emails);
        for (const a of at || []) {
          const k = (a.candidate_email || "").toLowerCase();
          if (!attempts_by_email[k]) attempts_by_email[k] = a;
        }
      }
      // Look up delivery status of the careers-test-access email for these recipients.
      const email_send_status: Record<string, { status: string; error: string | null; sent_at: string | null }> = {};
      if (emails.length) {
        const { data: logs } = await supabase
          .from("email_send_log")
          .select("recipient_email,status,error_message,created_at")
          .eq("template_name", "careers-test-access")
          .in("recipient_email", emails)
          .order("created_at", { ascending: false })
          .limit(2000);
        for (const l of logs || []) {
          const k = (l.recipient_email || "").toLowerCase();
          if (!email_send_status[k]) {
            email_send_status[k] = { status: l.status, error: l.error_message, sent_at: l.created_at };
          }
        }
      }
      const siteUrlPub = Deno.env.get("PUBLIC_SITE_URL") || "https://aetheris.technology";
      return new Response(JSON.stringify({
        payments: rows,
        summary: { count: paid.length, total_cents, unique_emails: emails.length },
        attempts_by_email,
        email_send_status,
        test_link_base: `${siteUrlPub}/careers/test?session_id=`,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "send_careers_test_link") {
      const email = String(body.email || "").trim().toLowerCase();
      const sessionId = String(body.stripe_session_id || "").trim();
      if (!email || !sessionId) {
        return new Response(JSON.stringify({ error: "email and stripe_session_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const siteUrl = Deno.env.get("PUBLIC_SITE_URL") || "https://aetheris.technology";
      const testUrl = `${siteUrl}/careers/test?session_id=${sessionId}`;
      const sendData = await sendTemplateEmail("careers-test-access", email, {
        idempotencyKey: `careers-test-resend-${sessionId}-${Date.now()}`,
        templateData: { testUrl },
      });
      // Poll email_send_log briefly for confirmation
      let confirmation: any = null;
      for (let i = 0; i < 5; i++) {
        const { data: log } = await supabase
          .from("email_send_log")
          .select("status,error_message,created_at,message_id")
          .eq("template_name", "careers-test-access")
          .eq("recipient_email", email)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (log) { confirmation = log; if (log.status === 'sent' || log.status === 'suppressed' || log.status === 'failed') break; }
        await new Promise(r => setTimeout(r, 400));
      }
      return new Response(JSON.stringify({ ok: true, testUrl, send: sendData || null, log: confirmation }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }





    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("admin-data error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
