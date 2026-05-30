// Portal-side READ-ONLY access to the rep playbook: this week's schedule, plays library, idea-of-day.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { verifyPortalToken, getPortalTokenFromRequest } from "../_shared/portal-token.ts";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-portal-token, x-admin-token",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Accept either a portal token (real reps) OR an admin token (admin preview)
    let repCode: string | null = null;
    const portalClaims = await verifyPortalToken(getPortalTokenFromRequest(req), SERVICE).catch(() => null);
    if (portalClaims?.code) {
      repCode = portalClaims.code;
    } else {
      const adminOk = await verifyAdminToken(getAdminTokenFromRequest(req), SERVICE);
      if (!adminOk) return json({ error: "Unauthorized" }, 401);
      repCode = "ADMIN";
    }

    const admin = createClient(SUPABASE_URL, SERVICE);
    const today = new Date().toISOString().slice(0, 10);

    const [schedule, plays, idea, quota] = await Promise.all([
      admin.from("rep_playbook_schedule").select("*").eq("is_active", true).order("day_of_week").order("block_order"),
      admin.from("rep_plays").select("*").eq("is_published", true).order("category").order("title"),
      admin.from("rep_idea_of_day").select("*").eq("for_date", today).eq("is_active", true).maybeSingle(),
      repCode === "ADMIN" ? Promise.resolve({ data: null }) :
        admin.from("rep_quotas").select("*").eq("rep_code", repCode).eq("period", "weekly").maybeSingle(),
    ]);

    // Seed fallbacks so the rep's Playbook tab is never empty. Used only when
    // the admin hasn't published rep-specific plays / schedule / idea yet.
    const SEED_PLAYS = [
      {
        id: "seed-1", category: "Outreach", industry: null, is_published: true,
        title: "Cold email — Leak Audit hook",
        body: `Subject: I found 3 leaks on your site\n\nHi {firstName},\n\nRan a 60-second forensic scan on {company} and tagged three Revenue Leaks costing roughly $X/month combined: a Follow-Up Failure on your contact form, a System Disconnect between your CRM and email, and Vocabulary Friction on your services page.\n\nNot pitching. Sharing the findings. 12-min walkthrough this week?\n\n— {repFirstName}\nAetheris Business Forensics`,
      },
      {
        id: "seed-2", category: "Outreach", industry: null, is_published: true,
        title: "LinkedIn DM — short opener",
        body: `Hey {firstName}, ran a Leak Audit on {company}'s public surface. Found one Conversion Drop-Off that's costing you well-qualified leads every week. Worth a 12-min look?`,
      },
      {
        id: "seed-3", category: "Discovery Call", industry: null, is_published: true,
        title: "Opening 90 seconds — Forensic Diagnostic frame",
        body: `"This isn't a sales call. It's a 12-minute Forensic Diagnostic. I'll ask three questions, name the leak I'm seeing, and quantify what it's costing you per month. If it's worth fixing, we go to the $2,500 deep-dive. If not, you keep the diagnosis. Sound fair?"`,
      },
      {
        id: "seed-4", category: "Objection Handling", industry: null, is_published: true,
        title: "\"We already have a consultant\"",
        body: `"Got it. Consultants opine. We diagnose. The Forensic Diagnostic outputs an evidence-based report with the leak, the cost, and the fix — your consultant can then execute against it. Want me to send a sample report?"`,
      },
      {
        id: "seed-5", category: "Follow-Up", industry: null, is_published: true,
        title: "48-hour follow-up — the COI nudge",
        body: `Hi {firstName} — circling back. The leak we flagged compounds at roughly $X/month. Every quarter you wait is one full cycle of avoidable Revenue Recovery left on the table. Want the 12-minute walkthrough this week or next?`,
      },
      {
        id: "seed-6", category: "Closing", industry: null, is_published: true,
        title: "Trial close — \"Stop the leak\"",
        body: `"Two paths from here. (1) You keep the diagnosis and try to plug the leak internally. (2) We run the Forensic Diagnostic — flat $2,500, applied to engagement, full report in 14 days. Which one fits your next 30 days?"`,
      },
    ];

    const SEED_SCHEDULE = [
      { id: "ss-1", day_of_week: 1, block_order: 1, title: "Power Hour — outbound", description: "60 min: 25 LinkedIn touches + 10 cold emails. No CRM admin allowed.", category: "Outreach", duration_minutes: 60 },
      { id: "ss-2", day_of_week: 1, block_order: 2, title: "Pipeline triage", description: "Move stalled deals. Anything not moved this week = closed_lost or revived with a Leak Audit hook.", category: "Pipeline", duration_minutes: 30 },
      { id: "ss-3", day_of_week: 2, block_order: 1, title: "Discovery calls block", description: "All booked Forensic Diagnostics happen Tue/Thu. Protect this window.", category: "Discovery Call", duration_minutes: 120 },
      { id: "ss-4", day_of_week: 3, block_order: 1, title: "Content + LinkedIn engagement", description: "1 forensic comment on 10 founder posts. Use the LinkedIn Comment Generator in the Workbench.", category: "Content", duration_minutes: 45 },
      { id: "ss-5", day_of_week: 4, block_order: 1, title: "Discovery calls block", description: "Second discovery window.", category: "Discovery Call", duration_minutes: 120 },
      { id: "ss-6", day_of_week: 5, block_order: 1, title: "Forecast + clean handoff", description: "Update forecast, send weekly recap to ops, queue Monday's Power Hour list.", category: "Pipeline", duration_minutes: 45 },
    ];

    const SEED_IDEA = {
      id: "seed-idea",
      title: "Lead with the leak, not the logo.",
      body: "The fastest way to earn 12 minutes from a founder is to name a leak they can feel. Open every cold touch with one specific Revenue Leak you can quantify — not your credentials, not Aetheris's. The diagnosis is the door. The credentials come after.",
    };

    return json({
      rep_code: repCode,
      schedule: (schedule.data && schedule.data.length > 0) ? schedule.data : SEED_SCHEDULE,
      plays: (plays.data && plays.data.length > 0) ? plays.data : SEED_PLAYS,
      idea_today: idea.data || SEED_IDEA,
      quota: quota.data || null,
      seeded: !(plays.data && plays.data.length > 0),
    });
  } catch (e) {
    console.error("portal-playbook error", e);
    return json({ error: (e as Error).message || "Internal error" }, 500);
  }
});
