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
// HubSpot enforces that EVERY scope marked "Required" in the app config (HubSpot
// Developer Portal -> Auth tab) MUST appear in the authorize URL's `scope`
// parameter. If even one is missing, the install fails with:
//   "Authorization failed because the provided scopes are missing [...]"
//
// `optional_scope` is NOT a substitute -- it's only granted if the portal has
// the relevant hub, and HubSpot still validates the Required list against
// `scope` strictly.
//
// MAINTENANCE RULE:
//   This list MUST stay in sync with the Required column in the HubSpot
//   Developer Portal. If you add a scope in the Portal -> add it here ->
//   reconnect HubSpot in the app. If you remove a scope in the Portal ->
//   remove it here too (otherwise HubSpot returns INVALID_SCOPE).
//
// Portal: https://app.hubspot.com/developer/  (App settings -> Auth -> Scopes)
// ---------------------------------------------------------------------------

const ALL_REQUIRED_SCOPES = [
  // OAuth + identity
  "oauth",

  // Account + security + business units
  "account-info.security.read",
  "business_units_view.read",
  "settings.security.security_health.read",
  "settings.billing.write",
  "settings.currencies.read",
  "settings.currencies.write",
  "settings.users.read",
  "settings.users.write",
  "settings.users.teams.read",
  "settings.users.teams.write",

  // Analytics / behavioral events
  "analytics.behavioral_events.send",
  "behavioral_events.event_definitions.read_write",
  "business-intelligence",

  // Accounting / commerce / tax
  "accounting",
  "e-commerce",
  "tax_rates.read",

  // Actions / automation / workflows / integration sync
  "actions",
  "automation",
  "automation.sequences.read",
  "automation.sequences.enrollments.write",
  "integration-sync",
  "external_integrations.forms.access",
  "collector.graphql_query.execute",
  "collector.graphql_schema.read",

  // CMS / Content Hub
  "cms.domains.read",
  "cms.domains.write",
  "cms.functions.read",
  "cms.functions.write",
  "cms.knowledge_base.articles.read",
  "cms.knowledge_base.articles.write",
  "cms.knowledge_base.articles.publish",
  "cms.knowledge_base.settings.read",
  "cms.knowledge_base.settings.write",
  "cms.membership.access_groups.read",
  "cms.membership.access_groups.write",
  "cms.performance.read",
  "content",
  "ctas.read",
  "hubdb",

  // Communications / preferences
  "communication_preferences.read",
  "communication_preferences.write",
  "communication_preferences.read_write",
  "communication_preferences.statuses.batch.read",
  "communication_preferences.statuses.batch.write",
  "sales-email-read",

  // Conversations / Inbox
  "conversations.read",
  "conversations.write",
  "conversations.custom_channels.read",
  "conversations.custom_channels.write",
  "conversations.visitor_identification.tokens.create",

  // CRM core - lists / import / export
  "crm.lists.read",
  "crm.lists.write",
  "crm.import",
  "crm.export",
  "crm.dealsplits.read_write",

  // CRM extensions
  "crm.extensions_calling_transcripts.read",
  "crm.extensions_calling_transcripts.write",

  // CRM objects
  "crm.objects.appointments.read",
  "crm.objects.appointments.write",
  "crm.objects.carts.read",
  "crm.objects.carts.write",
  "crm.objects.commercepayments.read",
  "crm.objects.commercepayments.write",
  "crm.objects.companies.read",
  "crm.objects.companies.write",
  "crm.objects.contacts.read",
  "crm.objects.contacts.write",
  "crm.objects.courses.read",
  "crm.objects.courses.write",
  "crm.objects.custom.read",
  "crm.objects.custom.write",
  "crm.objects.deals.read",
  "crm.objects.deals.write",
  "crm.objects.feedback_submissions.read",
  "crm.objects.forecasts.read",
  "crm.objects.goals.read",
  "crm.objects.goals.write",
  "crm.objects.invoices.read",
  "crm.objects.invoices.write",
  "crm.objects.leads.read",
  "crm.objects.leads.write",
  "crm.objects.line_items.read",
  "crm.objects.line_items.write",
  "crm.objects.listings.read",
  "crm.objects.listings.write",
  "crm.objects.marketing_events.read",
  "crm.objects.marketing_events.write",
  "crm.objects.orders.read",
  "crm.objects.orders.write",
  "crm.objects.owners.read",
  "crm.objects.partner-clients.read",
  "crm.objects.partner-clients.write",
  "crm.objects.partner-services.read",
  "crm.objects.partner-services.write",
  "crm.objects.products.read",
  "crm.objects.products.write",
  "crm.objects.projects.read",
  "crm.objects.projects.write",
  "crm.objects.quotes.read",
  "crm.objects.quotes.write",
  "crm.objects.services.read",
  "crm.objects.services.write",
  "crm.objects.subscriptions.read",
  "crm.objects.subscriptions.write",
  "crm.objects.users.read",
  "crm.objects.users.write",

  // CRM pipelines
  "crm.pipelines.orders.read",
  "crm.pipelines.orders.write",

  // CRM schemas
  "crm.schemas.appointments.read",
  "crm.schemas.appointments.write",
  "crm.schemas.carts.read",
  "crm.schemas.carts.write",
  "crm.schemas.commercepayments.read",
  "crm.schemas.commercepayments.write",
  "crm.schemas.companies.read",
  "crm.schemas.companies.write",
  "crm.schemas.contacts.read",
  "crm.schemas.contacts.write",
  "crm.schemas.courses.read",
  "crm.schemas.courses.write",
  "crm.schemas.custom.read",
  "crm.schemas.deals.read",
  "crm.schemas.deals.write",
  "crm.schemas.forecasts.read",
  "crm.schemas.invoices.read",
  "crm.schemas.invoices.write",
  "crm.schemas.line_items.read",
  "crm.schemas.listings.read",
  "crm.schemas.listings.write",
  "crm.schemas.orders.read",
  "crm.schemas.orders.write",
  "crm.schemas.projects.read",
  "crm.schemas.projects.write",
  "crm.schemas.quotes.read",
  "crm.schemas.quotes.write",
  "crm.schemas.services.read",
  "crm.schemas.services.write",
  "crm.schemas.subscriptions.read",
  "crm.schemas.subscriptions.write",

  // Data integration / data sources
  "data_integration.data_source.file.read",
  "data_integration.data_source.file.write",

  // Files
  "files",
  "files.ui_hidden.read",

  // Forms
  "forms",
  "forms-uploaded-files",

  // Integrations (third-party)
  "integrations.zoom-app.playbooks.read",

  // Marketing Hub
  "marketing-email",
  "marketing.campaigns.read",
  "marketing.campaigns.write",
  "marketing.campaigns.revenue.read",
  "social",
  "transactional-email",

  // MCP
  "mcp.users.read",

  // Media bridge / record images
  "media_bridge.read",
  "media_bridge.write",
  "record_images.signed_urls.read",

  // Scheduler
  "scheduler.meetings.meeting-link.read",

  // Tickets
  "tickets",

  // Timeline events
  "timeline",
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

    // Dedupe + sort for stable URL + easier diff against the HubSpot Portal.
    const scopes = Array.from(new Set(ALL_REQUIRED_SCOPES)).sort();
    const scopeParam = scopes.join(" ");

    const authorizeUrl =
      `https://app.hubspot.com/oauth/authorize?client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scopeParam)}` +
      `&state=${encodeURIComponent(state)}`;

    console.log("[hubspot-oauth-start] authorize URL built", {
      client_id_preview: clientId.slice(0, 8),
      redirect_uri: redirectUri,
      account_id: account.id,
      scope_count: scopes.length,
      scope_bytes: scopeParam.length,
      url_bytes: authorizeUrl.length,
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
