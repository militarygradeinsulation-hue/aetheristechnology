// Seeds the mirror_* tables for an account with realistic mock data
// for a fictional commercial playground equipment manufacturer.
// Intentionally embeds the 8 leak patterns so the audit will find findings.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FIRST_NAMES = ["James","Mary","John","Patricia","Robert","Jennifer","Michael","Linda","David","Elizabeth","William","Barbara","Richard","Susan","Joseph","Jessica","Thomas","Sarah","Charles","Karen","Christopher","Nancy","Daniel","Lisa","Matthew","Margaret","Anthony","Betty","Mark","Sandra","Donald","Ashley","Steven","Kimberly","Paul","Emily","Andrew","Donna","Joshua","Michelle","Kenneth","Carol","Kevin","Amanda","Brian","Melissa","George","Deborah","Edward","Stephanie","Ronald","Rebecca","Timothy","Laura","Jason","Sharon","Jeffrey","Cynthia","Ryan","Kathleen","Jacob","Amy","Gary","Shirley","Nicholas","Angela","Eric","Helen","Jonathan","Anna","Stephen","Brenda","Larry","Pamela","Justin","Nicole","Scott","Samantha","Brandon","Katherine","Benjamin","Christine","Samuel","Debra","Gregory","Rachel","Alexander","Catherine","Patrick","Carolyn","Frank","Janet","Raymond","Ruth","Jack","Maria","Dennis","Heather","Jerry","Diane"];
const LAST_NAMES = ["Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez","Hernandez","Lopez","Gonzalez","Wilson","Anderson","Thomas","Taylor","Moore","Jackson","Martin","Lee","Perez","Thompson","White","Harris","Sanchez","Clark","Ramirez","Lewis","Robinson","Walker","Young","Allen","King","Wright","Scott","Torres","Nguyen","Hill","Flores","Green","Adams","Nelson","Baker","Hall","Rivera","Campbell","Mitchell","Carter","Roberts","Gomez","Phillips","Evans","Turner","Diaz","Parker","Cruz","Edwards","Collins","Reyes","Stewart","Morris","Morales","Murphy","Cook","Rogers","Gutierrez","Ortiz","Morgan","Cooper","Peterson","Bailey","Reed","Kelly","Howard","Ramos","Kim","Cox","Ward","Richardson","Watson","Brooks","Chavez","Wood","James","Bennett","Gray","Mendoza","Ruiz","Hughes","Price","Alvarez","Castillo","Sanders","Patel","Myers","Long","Ross","Foster","Jimenez"];
const COMPANIES = ["Sunshine Parks Inc","Rainbow Recreation Co","Emerald City Schools","Pacific Coast YMCA","Mountain View District","Riverside Municipality","Lakeside Community Center","Oakridge Elementary","Pinewood Daycare","Cedar Hills HOA","Westfield Apartments","Northgate Resort","Southport Hotel","Eastbrook Church","Bayview Estates","Hilltop Daycare","Valley Vista Schools","Greenfield Camp","Brookside Park District","Meadowlark Academy","Silver Lake Resort","Golden Valley Schools","Crystal Springs HOA","Forest Glen Camp","Harbor Point Community"];
const STAGES = ["lead","marketingqualifiedlead","salesqualifiedlead","opportunity","customer","other"];
const DEAL_STAGES = ["qualified","demo_scheduled","proposal_sent","negotiation","closed_won","closed_lost"];
const ENGAGEMENT_TYPES = ["EMAIL","CALL","MEETING","NOTE"];

const rand = (n: number) => Math.floor(Math.random() * n);
const pick = <T,>(a: T[]): T => a[rand(a.length)];
const between = (min: number, max: number) => min + rand(max - min + 1);
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const { data: { user }, error: userErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const { account_id } = await req.json();
    if (!account_id) return json({ error: "account_id required" }, 400);

    // Verify ownership
    const { data: acct } = await supabase.from("accounts").select("id,user_id").eq("id", account_id).maybeSingle();
    if (!acct || acct.user_id !== user.id) return json({ error: "Forbidden" }, 403);

    console.log(`[seed] starting seed for account ${account_id}`);

    // Wipe existing mirror data for this account (idempotent reseed)
    await Promise.all([
      supabase.from("mirror_engagements").delete().eq("account_id", account_id),
      supabase.from("mirror_deals").delete().eq("account_id", account_id),
      supabase.from("mirror_contacts").delete().eq("account_id", account_id),
      supabase.from("mirror_owners").delete().eq("account_id", account_id),
    ]);

    // ------- 50 OWNERS -------
    const owners = Array.from({ length: 50 }, (_, i) => {
      const first = pick(FIRST_NAMES); const last = pick(LAST_NAMES);
      return {
        account_id,
        hubspot_id: `owner_${i + 1}`,
        email: `${first.toLowerCase()}.${last.toLowerCase()}@playgroundco.com`,
        first_name: first,
        last_name: last,
      };
    });
    await chunkInsert(supabase, "mirror_owners", owners, 500);

    // ------- 2,500 CONTACTS -------
    const contacts: any[] = [];
    for (let i = 0; i < 2500; i++) {
      const first = pick(FIRST_NAMES); const last = pick(LAST_NAMES);
      const lifecycle = pick(STAGES);
      const created = between(1, 540);
      // Most have recent activity; a chunk of MQL/SQL will be intentionally dead (60+ days)
      let lastAct = between(1, 90);
      if ((lifecycle === "marketingqualifiedlead" || lifecycle === "salesqualifiedlead") && i < 220) {
        lastAct = between(60, 180); // dead MQL/SQL pattern
      }
      contacts.push({
        account_id,
        hubspot_id: `contact_${i + 1}`,
        email: `${first.toLowerCase()}.${last.toLowerCase()}${i}@${pick(COMPANIES).toLowerCase().replace(/[^a-z]/g, "")}.com`,
        first_name: first,
        last_name: last,
        lifecycle_stage: lifecycle,
        lead_status: pick(["NEW","OPEN","IN_PROGRESS","CONNECTED","UNQUALIFIED"]),
        owner_id: pick(owners).hubspot_id,
        created_date: daysAgo(created),
        last_activity_date: daysAgo(lastAct),
        properties: { company: pick(COMPANIES) },
      });
    }
    await chunkInsert(supabase, "mirror_contacts", contacts, 500);

    // ------- 400 DEALS -------
    const deals: any[] = [];
    // Ensure 2 owners get 3x the load
    const overloadedOwners = [owners[0].hubspot_id, owners[1].hubspot_id];
    for (let i = 0; i < 400; i++) {
      let stage = pick(DEAL_STAGES);
      const created = between(1, 540);
      let lastAct = between(1, 60);
      let amount = between(5000, 150000);
      const contact = pick(contacts);

      // Stalled deals pattern: 35 deals with no activity in 45+ days, not closed
      if (i < 35) {
        stage = pick(["qualified","demo_scheduled","negotiation"]);
        lastAct = between(45, 120);
      }
      // Stuck-in-proposal pattern: 16 deals stuck in proposal_sent 30+ days
      if (i >= 35 && i < 51) {
        stage = "proposal_sent";
        lastAct = between(30, 90);
      }
      // Closed-lost reactivation pattern: 42 closed-lost from 6-18 months ago > $1k
      if (i >= 51 && i < 93) {
        stage = "closed_lost";
        lastAct = between(180, 540);
        amount = between(1500, 80000);
      }
      // Owner overload pattern
      const owner = i < 60 ? pick(overloadedOwners) : pick(owners).hubspot_id;

      const stageAvgDays: Record<string, number> = {
        qualified: 14, demo_scheduled: 10, proposal_sent: 21,
        negotiation: 30, closed_won: 0, closed_lost: 0,
      };

      deals.push({
        account_id,
        hubspot_id: `deal_${i + 1}`,
        deal_name: `${pick(COMPANIES)} - ${pick(["Playground","Splash Pad","Outdoor Fitness","Shade Structure","Site Furnishings"])}`,
        amount,
        stage,
        pipeline: "default",
        close_date: stage.startsWith("closed_") ? daysAgo(lastAct) : daysAgo(-between(7, 90)),
        owner_id: owner,
        created_date: daysAgo(created),
        last_activity_date: daysAgo(lastAct),
        days_in_current_stage: lastAct,
        properties: {
          contact_id: contact.hubspot_id,
          stage_avg_days: stageAvgDays[stage] || 14,
        },
      });
    }
    await chunkInsert(supabase, "mirror_deals", deals, 500);

    // ------- 8,000 ENGAGEMENTS -------
    const engagements: any[] = [];
    for (let i = 0; i < 8000; i++) {
      const useDeal = Math.random() < 0.45;
      const target = useDeal ? pick(deals) : pick(contacts);
      engagements.push({
        account_id,
        hubspot_id: `eng_${i + 1}`,
        contact_id: useDeal ? target.properties?.contact_id || null : target.hubspot_id,
        deal_id: useDeal ? target.hubspot_id : null,
        type: pick(ENGAGEMENT_TYPES),
        timestamp: daysAgo(between(1, 540)),
        properties: { source: "seed" },
      });
    }

    // Slow follow-up pattern: 55 form-submission contacts whose first engagement is 4+ hours later
    for (let i = 0; i < 55; i++) {
      const c = contacts[2400 + i];
      const formTime = new Date(Date.now() - between(5, 90) * 86400000);
      const followUpTime = new Date(formTime.getTime() + between(4, 24) * 3600000);
      engagements.push({
        account_id,
        hubspot_id: `eng_form_${i + 1}`,
        contact_id: c.hubspot_id,
        deal_id: null,
        type: "NOTE",
        timestamp: formTime.toISOString(),
        properties: { source: "form_submission", form_name: "Contact Us" },
      });
      engagements.push({
        account_id,
        hubspot_id: `eng_followup_${i + 1}`,
        contact_id: c.hubspot_id,
        deal_id: null,
        type: "EMAIL",
        timestamp: followUpTime.toISOString(),
        properties: { source: "first_response" },
      });
    }
    await chunkInsert(supabase, "mirror_engagements", engagements, 500);

    // Missing contact info pattern: blank email/phone on 10 high-value deals
    const blankIds = deals.slice(100, 110).map(d => d.properties.contact_id).filter(Boolean);
    if (blankIds.length) {
      await supabase.from("mirror_contacts")
        .update({ email: null })
        .eq("account_id", account_id)
        .in("hubspot_id", blankIds);
    }

    // High-intent-not-in-workflow pattern: 30 contacts with recent engagements but no owner activity
    // (handled implicitly by lifecycle + last_activity timing above)

    // Update account
    await supabase.from("accounts").update({
      hubspot_portal_id: "DEMO-12345",
      hubspot_connected_at: new Date().toISOString(),
      last_sync_at: new Date().toISOString(),
      last_sync_status: "complete",
      sync_progress: { contacts: 2500, deals: 400, engagements: engagements.length, owners: 50 },
    }).eq("id", account_id);

    console.log(`[seed] complete: ${owners.length} owners, ${contacts.length} contacts, ${deals.length} deals, ${engagements.length} engagements`);

    return json({
      success: true,
      counts: { owners: owners.length, contacts: contacts.length, deals: deals.length, engagements: engagements.length },
    });
  } catch (err: any) {
    console.error("[seed] error", err);
    return json({ error: err.message || "Seed failed" }, 500);
  }
});

async function chunkInsert(supabase: any, table: string, rows: any[], size: number) {
  for (let i = 0; i < rows.length; i += size) {
    const chunk = rows.slice(i, i + size);
    const { error } = await supabase.from(table).insert(chunk);
    if (error) {
      console.error(`[seed] insert ${table} failed at chunk ${i}:`, error.message);
      throw error;
    }
  }
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
