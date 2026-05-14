// Polls HubSpot for meeting engagements (bookings on meeting links) and
// upserts them into hubspot_meetings. Idempotent and safe to run on a cron.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getHubSpotAccessToken, HUBSPOT_API_BASE } from "../_shared/hubspot-token.ts";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const PROPS = [
  "hs_meeting_title", "hs_meeting_start_time", "hs_meeting_end_time",
  "hs_meeting_location", "hs_meeting_external_url", "hs_meeting_outcome",
  "hs_meeting_body", "hubspot_owner_id", "hs_createdate", "hs_lastmodifieddate",
  "hs_meeting_source", "hs_activity_type",
];

function htmlToText(s: string | null | undefined): string {
  if (!s) return "";
  return String(s).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Authorize: either admin token (UI/manual) or service-role from cron (no user JWT).
  const adminToken = getAdminTokenFromRequest(req);
  const adminPin = Deno.env.get("ADMIN_PIN") || "";
  const okAdmin = adminToken ? await verifyAdminToken(adminToken, adminPin) : false;
  // pg_cron via net.http_post sends apikey header = service-role/anon; allow when no user context.
  // We always look up the single connected HubSpot account (first row).

  if (!okAdmin && req.headers.get("x-cron-secret") !== Deno.env.get("ADMIN_PIN")) {
    // Allow cron-style invocations that send the PIN as x-cron-secret too.
    // Fall through if neither is present but called with service-role apikey from pg_cron.
    const apikey = req.headers.get("apikey") || "";
    if (apikey !== Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") && apikey !== Deno.env.get("SUPABASE_ANON_KEY")) {
      return json({ ok: false, error: "Unauthorized" }, 401);
    }
  }

  try {
    const { data: account, error: acctErr } = await admin
      .from("accounts")
      .select("*")
      .not("hubspot_portal_id", "is", null)
      .order("hubspot_connected_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    if (acctErr) throw acctErr;
    if (!account) return json({ ok: false, error: "HubSpot not connected" }, 400);

    const { data: state } = await admin.from("hubspot_meetings_state").select("*").eq("id", true).maybeSingle();
    const sinceMs = state?.last_synced_at ? new Date(state.last_synced_at).getTime() - 2 * 60 * 1000 : Date.now() - 1000 * 60 * 60 * 24 * 90;

    const token = await getHubSpotAccessToken(admin, account);

    let after: string | undefined;
    let totalSynced = 0;
    const meetingIds: string[] = [];

    do {
      const searchBody: any = {
        filterGroups: [{
          filters: [{ propertyName: "hs_lastmodifieddate", operator: "GTE", value: String(sinceMs) }],
        }],
        sorts: [{ propertyName: "hs_lastmodifieddate", direction: "ASCENDING" }],
        properties: PROPS,
        limit: 100,
      };
      if (after) searchBody.after = after;

      const sres = await fetch(`${HUBSPOT_API_BASE}/crm/v3/objects/meetings/search`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(searchBody),
      });
      if (!sres.ok) throw new Error(`HubSpot search ${sres.status}: ${(await sres.text()).slice(0, 300)}`);
      const sjson = await sres.json();
      const results: any[] = sjson.results || [];

      for (const m of results) {
        meetingIds.push(m.id);
        const props = m.properties || {};

        // Fetch contact associations for this meeting
        let contactId: string | null = null;
        let attendee: { email?: string; name?: string; company?: string; phone?: string } = {};
        try {
          const ares = await fetch(
            `${HUBSPOT_API_BASE}/crm/v3/objects/meetings/${m.id}/associations/contacts?limit=1`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          if (ares.ok) {
            const aj = await ares.json();
            contactId = aj.results?.[0]?.toObjectId?.toString() || aj.results?.[0]?.id || null;
          }
        } catch (_) { /* ignore */ }

        if (contactId) {
          try {
            const cres = await fetch(
              `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/${contactId}?properties=email,firstname,lastname,company,phone`,
              { headers: { Authorization: `Bearer ${token}` } },
            );
            if (cres.ok) {
              const cj = await cres.json();
              const p = cj.properties || {};
              attendee = {
                email: p.email || undefined,
                name: [p.firstname, p.lastname].filter(Boolean).join(" ") || undefined,
                company: p.company || undefined,
                phone: p.phone || undefined,
              };
            }
          } catch (_) { /* ignore */ }
        }

        // Match rep_code by attendee email against customers.
        let repCode: string | null = null;
        if (attendee.email) {
          const { data: cust } = await admin
            .from("customers")
            .select("rep_code")
            .ilike("email", attendee.email)
            .limit(1)
            .maybeSingle();
          if (cust?.rep_code) repCode = cust.rep_code;
        }

        // Bookings are for clients only. If the attendee email belongs to a
        // careers applicant, flag the meeting and notify admin instead of
        // treating it like a normal client booking.
        let isApplicant = false;
        if (attendee.email) {
          const { data: appRow } = await admin
            .from("careers_applications")
            .select("id, candidate_name")
            .ilike("candidate_email", attendee.email)
            .limit(1)
            .maybeSingle();
          if (appRow) isApplicant = true;
        }

        const source = isApplicant
          ? "applicant_booking_blocked"
          : (props.hs_meeting_source || props.hs_activity_type || "hubspot_meeting_link");

        const row = {
          account_id: account.id,
          hubspot_id: m.id,
          title: props.hs_meeting_title || null,
          meeting_link: props.hs_meeting_external_url || null,
          location: props.hs_meeting_location || null,
          outcome: props.hs_meeting_outcome || null,
          internal_notes: htmlToText(props.hs_meeting_body) || null,
          start_time: props.hs_meeting_start_time ? new Date(Number(props.hs_meeting_start_time) || props.hs_meeting_start_time).toISOString() : null,
          end_time: props.hs_meeting_end_time ? new Date(Number(props.hs_meeting_end_time) || props.hs_meeting_end_time).toISOString() : null,
          organizer_owner_id: props.hubspot_owner_id || null,
          attendee_email: attendee.email || null,
          attendee_name: attendee.name || null,
          attendee_company: attendee.company || null,
          attendee_phone: attendee.phone || null,
          contact_hubspot_id: contactId,
          rep_code: repCode,
          source: String(source),
          raw: { properties: props },
          synced_at: new Date().toISOString(),
        };

        const { error: upErr, data: upRow } = await admin
          .from("hubspot_meetings")
          .upsert(row, { onConflict: "hubspot_id" })
          .select("id, created_at, updated_at, attendee_name, attendee_email, start_time")
          .single();
        if (upErr) {
          console.error("upsert meeting failed", m.id, upErr.message);
          continue;
        }
        totalSynced++;

        // Notify on freshly created rows only.
        const isNew = upRow && upRow.created_at && Math.abs(new Date(upRow.created_at).getTime() - new Date(upRow.updated_at).getTime()) < 2000;
        if (isNew) {
          try {
            await admin.from("shared_notifications").insert({
              recipient: "admin",
              kind: "meeting_booked",
              title: `New meeting: ${upRow.attendee_name || upRow.attendee_email || "Unknown"}`,
              body: upRow.start_time ? `Starts ${new Date(upRow.start_time).toLocaleString()}` : "",
            });
          } catch (_) { /* notifications table may differ — non-fatal */ }
        }
      }

      after = sjson.paging?.next?.after;
    } while (after);

    await admin.from("hubspot_meetings_state").upsert({
      id: true,
      last_synced_at: new Date().toISOString(),
      last_run_at: new Date().toISOString(),
      last_status: "ok",
      last_error: null,
      meetings_synced: (state?.meetings_synced || 0) + totalSynced,
    });

    return json({ ok: true, synced: totalSynced, ids: meetingIds });
  } catch (e: any) {
    console.error("hubspot-meetings-sync error", e?.message || e);
    await admin.from("hubspot_meetings_state").upsert({
      id: true,
      last_run_at: new Date().toISOString(),
      last_status: "error",
      last_error: String(e?.message || e).slice(0, 500),
    });
    return json({ ok: false, error: String(e?.message || e) }, 500);
  }
});
