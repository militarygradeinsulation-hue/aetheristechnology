// Rep + Partner leaderboard for the new portal.
// Aggregates last-7-day activity per rep and returns a ranked list, plus the
// caller's own row so we can highlight it. All reps see the same board — this
// is intentional: leaderboards work by being visible.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { verifyPortalToken, getPortalTokenFromRequest } from "../_shared/portal-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-portal-token",
};

interface Row {
  code: string;
  rep_name: string;
  role: "rep" | "partner" | string;
  logins: number;
  lead_claims: number;
  lead_touches: number;
  lead_uploads: number;
  emails_sent: number;
  leads_owned: number;
  score: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const claims = await verifyPortalToken(getPortalTokenFromRequest(req), secret);
    if (!claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, secret);
    const since = new Date(Date.now() - 7 * 86400000).toISOString();

    const [{ data: reps }, { data: events }, { data: leads }, { data: mailboxes }] =
      await Promise.all([
        supabase
          .from("rep_codes")
          .select("code,rep_name,role")
          .eq("is_active", true),
        supabase
          .from("rep_activity")
          .select("rep_code,event,created_at")
          .gte("created_at", since)
          .limit(10000),
        supabase
          .from("rep_leads")
          .select("claimed_by_code,assigned_to_code")
          .or("claimed_by_code.not.is.null,assigned_to_code.not.is.null")
          .limit(5000),
        supabase
          .from("rep_mailboxes")
          .select("code,address")
          .eq("is_active", true),
      ]);

    // Map mailbox address -> rep code, then count outbound emails in last 7d.
    const addrToCode = new Map<string, string>();
    (mailboxes || []).forEach((m: any) => {
      if (m.address && m.code) addrToCode.set(m.address.toLowerCase(), m.code);
    });

    const emailCounts = new Map<string, number>();
    if (addrToCode.size > 0) {
      const addrs = Array.from(addrToCode.keys());
      const { data: msgs } = await supabase
        .from("rep_email_messages")
        .select("mailbox_address,direction,created_at")
        .eq("direction", "outbound")
        .gte("created_at", since)
        .in("mailbox_address", addrs)
        .limit(10000);
      (msgs || []).forEach((m: any) => {
        const code = addrToCode.get((m.mailbox_address || "").toLowerCase());
        if (!code) return;
        emailCounts.set(code, (emailCounts.get(code) || 0) + 1);
      });
    }

    const map = new Map<string, Row>();
    (reps || []).forEach((r: any) => {
      map.set(r.code, {
        code: r.code,
        rep_name: r.rep_name || r.code,
        role: r.role || "rep",
        logins: 0,
        lead_claims: 0,
        lead_touches: 0,
        lead_uploads: 0,
        emails_sent: emailCounts.get(r.code) || 0,
        leads_owned: 0,
        score: 0,
      });
    });

    (events || []).forEach((e: any) => {
      const row = map.get(e.rep_code);
      if (!row) return;
      if (e.event === "login") row.logins++;
      else if (e.event === "lead_claim") row.lead_claims++;
      else if (e.event === "lead_touch") row.lead_touches++;
      else if (e.event === "lead_upload") row.lead_uploads++;
    });

    (leads || []).forEach((l: any) => {
      const owner = l.claimed_by_code || l.assigned_to_code;
      if (!owner) return;
      const row = map.get(owner);
      if (row) row.leads_owned++;
    });

    // Composite activity score — weighted toward the actions that matter.
    // Touches and emails are the real revenue signals, claims/logins less so.
    const rows: Row[] = Array.from(map.values()).map((r) => ({
      ...r,
      score:
        r.lead_touches * 4 +
        r.emails_sent * 3 +
        r.lead_claims * 2 +
        r.lead_uploads * 2 +
        r.logins * 1,
    }));

    rows.sort((a, b) => b.score - a.score || b.lead_touches - a.lead_touches);

    return new Response(
      JSON.stringify({ me: claims.code, window_days: 7, rows }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("portal-leaderboard error:", e);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
