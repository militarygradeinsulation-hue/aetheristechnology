// Gate the public booking link: block any email that matches a careers applicant.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();
    const context = String(body?.context || "book_meeting").slice(0, 64);

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ ok: false, error: "Valid email required" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: app } = await admin
      .from("careers_applications")
      .select("id, candidate_name, candidate_email, created_at")
      .ilike("candidate_email", email)
      .limit(1)
      .maybeSingle();

    if (app) {
      // Notify admin that an applicant tried to slip through.
      try {
        await admin.from("shared_notifications").insert({
          recipient: "admin",
          kind: "applicant_booking_blocked",
          title: `⚠ Applicant blocked from booking: ${app.candidate_name || email}`,
          body: `${email} attempted to book a meeting (${context}). Bookings are for clients only.`,
        });
      } catch (_) { /* non-fatal */ }

      try {
        await admin.from("activity_log").insert({
          kind: "applicant_booking_blocked",
          payload: { email, context, application_id: app.id },
        });
      } catch (_) { /* non-fatal */ }

      return json({
        ok: true,
        allowed: false,
        reason: "applicant",
        message:
          "This calendar is reserved for prospective clients. Your email is on file as a candidate — please continue through the careers process at /careers.",
      });
    }

    return json({ ok: true, allowed: true });
  } catch (e: any) {
    return json({ ok: false, error: String(e?.message || e) }, 500);
  }
});
