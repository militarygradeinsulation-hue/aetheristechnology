// Nexus lead-capture: persists to contact_submissions and pushes to HubSpot.
// Public endpoint (verify_jwt=false in config.toml). Never trusts client for role.
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BodySchema = z.object({
  name: z.string().trim().min(1).max(200).optional().nullable(),
  email: z.string().trim().email().max(255),
  company: z.string().trim().max(200).optional().nullable(),
  note: z.string().trim().max(1000).optional().nullable(),
  pathname: z.string().trim().max(500).optional().nullable(),
});

const HUBSPOT_GATEWAY = "https://connector-gateway.lovable.dev/hubspot";

async function pushToHubSpot(input: z.infer<typeof BodySchema>) {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const hubspotKey = Deno.env.get("HUBSPOT_API_KEY");
  if (!lovableKey || !hubspotKey) {
    console.warn("nexus-capture-lead: HubSpot keys missing, skipping push");
    return { skipped: true };
  }
  const [firstname, ...rest] = (input.name || "").trim().split(/\s+/);
  const lastname = rest.join(" ");
  const properties: Record<string, string> = { email: input.email.toLowerCase() };
  if (firstname) properties.firstname = firstname;
  if (lastname) properties.lastname = lastname;
  if (input.company) properties.company = input.company;
  if (input.note) properties.message = input.note;
  properties.hs_lead_status = "NEW";
  properties.lifecyclestage = "lead";

  const res = await fetch(`${HUBSPOT_GATEWAY}/crm/v3/objects/contacts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": hubspotKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ properties }),
  });
  if (!res.ok) {
    const text = await res.text();
    // 409 = already exists — patch instead
    if (res.status === 409) {
      const patch = await fetch(
        `${HUBSPOT_GATEWAY}/crm/v3/objects/contacts/${encodeURIComponent(input.email.toLowerCase())}?idProperty=email`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${lovableKey}`,
            "X-Connection-Api-Key": hubspotKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ properties }),
        },
      );
      if (!patch.ok) {
        const ptext = await patch.text();
        console.error("HubSpot PATCH failed", patch.status, ptext);
        return { error: `hubspot_${patch.status}`, details: ptext };
      }
      return { updated: true };
    }
    console.error("HubSpot POST failed", res.status, text);
    return { error: `hubspot_${res.status}`, details: text };
  }
  return { created: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  try {
    const raw = await req.json();
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const input = parsed.data;

    // 1) Persist to contact_submissions (service role bypass RLS).
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { error: dbErr } = await supabase.from("contact_submissions").insert({
      name: input.name || "Nexus visitor",
      email: input.email.toLowerCase(),
      company: input.company || null,
      message: [input.note, input.pathname ? `[page: ${input.pathname}]` : null]
        .filter(Boolean)
        .join(" ") || "Captured via Aetheris Nexus chat",
      service_interest: "nexus_chat",
    });
    if (dbErr) console.error("contact_submissions insert failed", dbErr);

    // 2) Push to HubSpot (best-effort).
    const hs = await pushToHubSpot(input);

    return new Response(JSON.stringify({ ok: true, hubspot: hs, db: dbErr ? "failed" : "ok" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("nexus-capture-lead error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
