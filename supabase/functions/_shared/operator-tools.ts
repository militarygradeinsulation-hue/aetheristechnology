// Shared smart-connection tools used by admin-assistant and rep-assistant.
// - webSearch: live web search via Firecrawl
// - hubspotMirrorSearch: query mirror_contacts/deals/engagements
// - searchContentLibrary: fuzzy search blog_posts + generated_playbooks
//
// Safe-write helpers (admin only):
// - markContactRead
// - addDripProspect

const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

export async function webSearch(query: string, limit = 5): Promise<unknown> {
  if (!FIRECRAWL_API_KEY) return { error: "Web search not configured (missing FIRECRAWL_API_KEY)." };
  const q = String(query || "").trim();
  if (!q) return { error: "query required" };
  try {
    const r = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: q, limit: Math.min(Math.max(limit, 1), 10) }),
    });
    if (!r.ok) {
      const txt = await r.text();
      return { error: `Firecrawl ${r.status}: ${txt.slice(0, 300)}` };
    }
    const json = await r.json();
    const items = (json?.data || []).map((d: any) => ({
      title: d.title,
      url: d.url,
      description: d.description,
      snippet: (d.markdown || d.content || "").slice(0, 400),
    }));
    return { query: q, results: items };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "web search failed" };
  }
}

export async function hubspotMirrorSearch(
  sb: any,
  query: string,
  type: "contacts" | "deals" | "engagements" | "all" = "all",
): Promise<unknown> {
  const q = String(query || "").trim();
  if (!q) return { error: "query required" };
  const like = `%${q}%`;
  const out: Record<string, unknown> = {};
  if (type === "contacts" || type === "all") {
    const { data } = await sb.from("mirror_contacts")
      .select("hubspot_id,email,first_name,last_name,company,lifecycle_stage,last_activity_date")
      .or(`email.ilike.${like},first_name.ilike.${like},last_name.ilike.${like},company.ilike.${like}`)
      .limit(15);
    out.contacts = data || [];
  }
  if (type === "deals" || type === "all") {
    const { data } = await sb.from("mirror_deals")
      .select("hubspot_id,deal_name,amount,stage,close_date,owner_id,last_activity_date")
      .or(`deal_name.ilike.${like},hubspot_id.ilike.${like}`)
      .order("last_activity_date", { ascending: false })
      .limit(15);
    out.deals = data || [];
  }
  if (type === "engagements" || type === "all") {
    const { data } = await sb.from("mirror_engagements")
      .select("hubspot_id,engagement_type,subject,body_preview,contact_id,deal_id,timestamp")
      .or(`subject.ilike.${like},body_preview.ilike.${like}`)
      .order("timestamp", { ascending: false })
      .limit(10);
    out.engagements = data || [];
  }
  return out;
}

export async function searchContentLibrary(sb: any, query: string): Promise<unknown> {
  const q = String(query || "").trim();
  if (!q) return { error: "query required" };
  const like = `%${q}%`;
  const [blogs, playbooks] = await Promise.all([
    sb.from("blog_posts")
      .select("id,title,slug,tags,excerpt,is_published,published_at")
      .or(`title.ilike.${like},excerpt.ilike.${like},content.ilike.${like}`)
      .limit(10),
    sb.from("generated_playbooks")
      .select("id,title,topic,industry,created_at")
      .or(`title.ilike.${like},topic.ilike.${like},industry.ilike.${like}`)
      .limit(10),
  ]);
  return { blog_posts: blogs.data || [], playbooks: playbooks.data || [] };
}

export async function markContactRead(sb: any, id: string): Promise<unknown> {
  if (!id) return { error: "id required" };
  const { error } = await sb.from("contact_submissions").update({ is_read: true }).eq("id", id);
  if (error) return { error: error.message };
  return { ok: true, id };
}

export async function addDripProspect(
  sb: any,
  args: { email: string; business_name?: string; industry?: string; location?: string; source_url?: string },
): Promise<unknown> {
  const email = String(args.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) return { error: "valid email required" };
  const { data, error } = await sb.from("drip_prospects").insert({
    email,
    business_name: args.business_name || null,
    industry: args.industry || null,
    location: args.location || null,
    source_url: args.source_url || null,
    status: "new",
  }).select("id,email,status").single();
  if (error) return { error: error.message };
  return { ok: true, prospect: data };
}

// Tool schemas (shared)
export const SHARED_TOOL_SCHEMAS = {
  web_search: {
    type: "function",
    function: {
      name: "web_search",
      description:
        "Live internet search via Firecrawl. Use for anything outside our database: company research, news, competitor info, recent events, product info, fact-checks. Returns title/url/snippet.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          limit: { type: "integer", default: 5, maximum: 10 },
        },
        required: ["query"],
      },
    },
  },
  search_content_library: {
    type: "function",
    function: {
      name: "search_content_library",
      description: "Fuzzy search Aetheris content library (blog_posts + generated_playbooks) by title/body/topic.",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
    },
  },
  hubspot_mirror_search: {
    type: "function",
    function: {
      name: "hubspot_mirror_search",
      description:
        "Search the locally-mirrored HubSpot data: contacts (name/email/company), deals (name), engagements (subject/body). Use for any CRM lookup question.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          type: { type: "string", enum: ["contacts", "deals", "engagements", "all"], default: "all" },
        },
        required: ["query"],
      },
    },
  },
  mark_contact_read: {
    type: "function",
    function: {
      name: "mark_contact_read",
      description:
        "WRITE: Mark a contact_submission as read. Confirm with the user before calling. Pass the submission id.",
      parameters: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
      },
    },
  },
  add_drip_prospect: {
    type: "function",
    function: {
      name: "add_drip_prospect",
      description:
        "WRITE: Add a new outbound drip prospect. Confirm with the user before calling. Requires email; business_name/industry/location/source_url optional.",
      parameters: {
        type: "object",
        properties: {
          email: { type: "string" },
          business_name: { type: "string" },
          industry: { type: "string" },
          location: { type: "string" },
          source_url: { type: "string" },
        },
        required: ["email"],
      },
    },
  },
};
