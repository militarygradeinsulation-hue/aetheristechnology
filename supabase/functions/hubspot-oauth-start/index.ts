import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---------------------------------------------------------------------------
// HubSpot OAuth scope strategy
// ---------------------------------------------------------------------------
// HubSpot enforces that EVERY scope marked "Required" in the app config must
// appear in the authorize URL's `scope` parameter, otherwise the install is
// blocked with: "Authorization failed because the provided scopes are missing
// [...]".
//
// Optional / hub-specific scopes (CMS, marketing, custom industry objects,
// commerce, etc.) belong in `optional_scope` — they are only granted if the
// connecting portal actually has the relevant hub. Putting them in `scope`
// would fail the install on portals missing that hub.
// ---------------------------------------------------------------------------

const REQUIRED_SCOPES = [
  // OAuth + identity
  "oauth",

  // Core CRM objects (always available on every portal)
  "crm.objects.contacts.read",
  "crm.objects.contacts.write",
  "crm.objects.companies.read",
  "crm.objects.companies.write",
  "crm.objects.deals.read",
  "crm.objects.deals.write",
  "crm.objects.owners.read",

  // Core CRM schemas (custom properties, pipelines, etc.)
  "crm.schemas.contacts.read",
  "crm.schemas.contacts.write",
  "crm.schemas.companies.read",
  "crm.schemas.companies.write",
  "crm.schemas.deals.read",
  "crm.schemas.deals.write",

  // Lists, imports, exports
  "crm.lists.read",
  "crm.lists.write",
  "crm.import",
  "crm.export",

  // Files & file manager
  "files",
  "files.ui_hidden.read",

  // Timeline events
  "timeline",

  // Settings / users / business units
  "settings.users.read",
  "settings.users.write",
  "settings.users.teams.read",
  "settings.users.teams.write",
  "account-info.security.read",

  // Engagements / communications
  "sales-email-read",
  "communication_preferences.read",
  "communication_preferences.write",
  "communication_preferences.read_write",
];

const OPTIONAL_SCOPES = [
  // Tickets
  "tickets",
  "crm.objects.feedback_submissions.read",
  "crm.objects.feedback_submissions.write",
  "crm.schemas.feedback_submissions.read",
  "crm.schemas.feedback_submissions.write",

  // Quotes / line items / products
  "crm.objects.quotes.read",
  "crm.objects.quotes.write",
  "crm.schemas.quotes.read",
  "crm.schemas.quotes.write",
  "crm.objects.line_items.read",
  "crm.objects.line_items.write",
  "crm.schemas.line_items.read",
  "crm.schemas.line_items.write",
  "crm.objects.products.read",
  "crm.objects.products.write",
  "crm.schemas.products.read",
  "crm.schemas.products.write",

  // Invoices / Subscriptions / Orders / Carts / Commerce / Payments
  "crm.objects.invoices.read",
  "crm.objects.invoices.write",
  "crm.schemas.invoices.read",
  "crm.schemas.invoices.write",
  "crm.objects.subscriptions.read",
  "crm.objects.subscriptions.write",
  "crm.schemas.subscriptions.read",
  "crm.schemas.subscriptions.write",
  "crm.objects.commercepayments.read",
  "crm.objects.orders.read",
  "crm.objects.orders.write",
  "crm.schemas.orders.read",
  "crm.schemas.orders.write",
  "crm.objects.carts.read",
  "crm.objects.carts.write",
  "crm.schemas.carts.read",
  "crm.schemas.carts.write",
  "e-commerce",
  "tax_rates.read",
  "accounting",

  // Goals
  "crm.objects.goals.read",
  "crm.objects.goals.write",

  // Custom objects
  "crm.objects.custom.read",
  "crm.objects.custom.write",
  "crm.schemas.custom.read",
  "crm.schemas.custom.write",

  // Marketing Hub
  "content",
  "social",
  "forms",
  "forms-uploaded-files",
  "hubdb",
  "marketing-email",
  "marketing.campaigns.read",
  "marketing.campaigns.write",
  "marketing.campaigns.revenue.read",
  "transactional-email",
  "automation",
  "automation.sequences.read",
  "automation.sequences.enrollments.write",
  "business-intelligence",

  // Conversations / Inbox
  "conversations.read",
  "conversations.write",
  "conversations.visitor_identification.tokens.create",

  // CMS / Content Hub
  "cms.knowledge_base.articles.read",
  "cms.knowledge_base.articles.write",
  "cms.knowledge_base.articles.publish",
  "cms.knowledge_base.settings.read",
  "cms.knowledge_base.settings.write",
  "cms.domains.read",
  "cms.domains.write",
  "cms.functions.read",
  "cms.functions.write",
  "cms.performance.read",
  "cms.membership.access_groups.read",
  "cms.membership.access_groups.write",

  // Calls / Meetings / Scheduler
  "crm.objects.calls.read",
  "crm.objects.calls.write",
  "crm.objects.meetings.read",
  "crm.objects.meetings.write",
  "scheduler.meetings.meeting-link.read",

  // Industry-specific objects
  "crm.objects.appointments.read",
  "crm.objects.appointments.write",
  "crm.schemas.appointments.read",
  "crm.schemas.appointments.write",
  "crm.objects.services.read",
  "crm.objects.services.write",
  "crm.schemas.services.read",
  "crm.schemas.services.write",
  "crm.objects.courses.read",
  "crm.objects.courses.write",
  "crm.schemas.courses.read",
  "crm.schemas.courses.write",
  "crm.objects.listings.read",
  "crm.objects.listings.write",
  "crm.schemas.listings.read",
  "crm.schemas.listings.write",

  // Users object / Partner objects
  "crm.objects.users.read",
  "crm.objects.users.write",
  "crm.schemas.users.read",
  "crm.schemas.users.write",
  "crm.objects.partner-clients.read",
  "crm.objects.partner-clients.write",
  "crm.schemas.partner-clients.read",
  "crm.schemas.partner-clients.write",
  "crm.objects.partner-services.read",

  // Actions / workflows / integration sync
  "actions",
  "integration-sync",
  "external_integrations.forms.access",
  "collector.graphql_query.execute",
  "collector.graphql_schema.read",

  // Media / signals
  "media_bridge.read",
  "media_bridge.write",
  "record_images.signed_urls.read",
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const clientId = Deno.env.get("HUBSPOT_CLIENT_ID");
    if (!clientId) {
      return new Response(
        JSON.stringify({ error: "HubSpot integration not yet configured. Add HUBSPOT_CLIENT_ID to enable." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth header");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) throw new Error("Not authenticated");

    // Ensure account row exists
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: account } = await admin
      .from("accounts")
      .upsert({ user_id: userData.user.id }, { onConflict: "user_id" })
      .select()
      .single();

    // State token = base64(account_id:nonce)
    const nonce = crypto.randomUUID();
    const state = btoa(`${account.id}:${nonce}`);

    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/hubspot-oauth-callback`;

    // Dedupe + ensure required and optional don't overlap.
    const requiredSet = new Set(REQUIRED_SCOPES);
    const optionalSet = new Set(OPTIONAL_SCOPES.filter((s) => !requiredSet.has(s)));
    const required = Array.from(requiredSet).join(" ");
    const optional = Array.from(optionalSet).join(" ");

    const authorizeUrl =
      `https://app.hubspot.com/oauth/authorize?client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(required)}` +
      `&optional_scope=${encodeURIComponent(optional)}` +
      `&state=${encodeURIComponent(state)}`;

    console.log("[hubspot-oauth-start] authorize URL built", {
      client_id_preview: clientId.slice(0, 8),
      redirect_uri: redirectUri,
      account_id: account.id,
      required_count: requiredSet.size,
      optional_count: optionalSet.size,
    });

    return new Response(JSON.stringify({ authorizeUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
