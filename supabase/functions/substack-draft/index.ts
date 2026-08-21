// Substack publishing assistant.
// Substack has no public write API, so this builds ready to paste long form
// drafts from LinkedIn posts, stores them, and can email them on a schedule.
//
// Auth: admin token (x-admin-token).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { sendLovableEmail } from "npm:@lovable.dev/email-js";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";
import { stripDashesDeep, NO_DASH_PROMPT_RULE } from "../_shared/no-dashes.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SENDER_DOMAIN = "notify.aetheris.technology";
const FROM_ADDRESS = "Aetheris <substack@aetheris.technology>";

const SYSTEM_PROMPT = `You are the AETHERIS Forensic Operator writing a Substack essay. You diagnose revenue leaks. You do not cheerlead, motivate, or sell.

VOICE: clinical, declarative, systems first causation, operator tier, precise specificity, zero permission directness.

STRUCTURE OF THE ESSAY:
1. Open with the reframe. Name what the leak actually is.
2. Ground it in audit pattern. What you see repeatedly in real operations.
3. Explain the mechanism. The broken loop, step by step, with concrete detail.
4. Show the cost. Where time, margin, or pipeline actually drains.
5. Close with the verdict. One short, quotable indictment.

RULES:
- 700 to 1100 words in the body.
- Prose paragraphs. Sub headings allowed. No bullet lists longer than four items, and never a list of one word fragments.
- No emojis. No hedging. No corporate fluff. No motivational language. No AI tells.
- Never invent client names, numbers, or case studies. Work only from the source post.
- USD only for any money reference.

${NO_DASH_PROMPT_RULE}

Return STRICT JSON only, no markdown fence:
{"title": "...", "subtitle": "...", "body": "..."}
The body uses plain text paragraphs separated by blank lines. Sub headings are their own line.`;

async function generateDraft(sourceText: string, direction: string) {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY is not configured");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Expand this LinkedIn post into a full Substack essay.

SOURCE POST:
${sourceText}

${direction ? `EDITORIAL DIRECTION: ${direction}` : ""}

Return only the JSON object.`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    if (res.status === 429) throw new Error("Rate limited by the AI gateway. Try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits to continue.");
    throw new Error(`AI gateway error ${res.status}: ${detail}`);
  }

  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content?.trim() ?? "";
  const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  let parsed: { title?: string; subtitle?: string; body?: string };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("AI returned an unparseable draft");
    parsed = JSON.parse(cleaned.slice(start, end + 1));
  }
  if (!parsed.body) throw new Error("AI returned an empty draft body");

  return stripDashesDeep({
    title: String(parsed.title ?? "").trim(),
    subtitle: String(parsed.subtitle ?? "").trim(),
    body: String(parsed.body).trim(),
  });
}

function draftHtml(d: { title: string; subtitle: string; body: string }) {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const paras = d.body
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px;line-height:1.65;">${esc(p).replace(/\n/g, "<br/>")}</p>`)
    .join("");
  return `<div style="font-family:Georgia,serif;max-width:640px;color:#1a1a1a;">
    <h1 style="font-size:26px;margin:0 0 6px;">${esc(d.title)}</h1>
    <p style="font-size:16px;color:#666;margin:0 0 24px;">${esc(d.subtitle)}</p>
    ${paras}
    <hr style="margin:28px 0;border:none;border-top:1px solid #ddd;"/>
    <p style="font-size:12px;color:#888;">Paste into Substack at https://substack.com/publish/post</p>
  </div>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const ok = await verifyAdminToken(getAdminTokenFromRequest(req), serviceKey);
    if (!ok) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceKey);
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "list");

    // ---------------- source posts to expand ----------------
    if (action === "sources") {
      const [pubs, engine] = await Promise.all([
        supabase
          .from("linkedin_publications")
          .select("id, post_urn, text, image_url, published_at, status")
          .eq("status", "published")
          .order("published_at", { ascending: false })
          .limit(50),
        supabase
          .from("content_engine_posts")
          .select("id, hook, caption, script, thumbnail_url, scheduled_date, status")
          .order("scheduled_date", { ascending: false })
          .limit(50),
      ]);

      const sources = [
        ...(pubs.data ?? []).map((r: any) => ({
          kind: "linkedin" as const,
          id: r.id,
          urn: r.post_urn,
          text: r.text ?? "",
          image_url: r.image_url,
          date: r.published_at,
        })),
        ...(engine.data ?? []).map((r: any) => ({
          kind: "calendar" as const,
          id: r.id,
          urn: null,
          text: [r.hook, r.caption || r.script].filter(Boolean).join("\n\n"),
          image_url: r.thumbnail_url,
          date: r.scheduled_date,
        })),
      ].filter((s) => s.text.trim().length > 40);

      return json({ sources });
    }

    // ---------------- list drafts ----------------
    if (action === "list") {
      const { data, error } = await supabase
        .from("substack_drafts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return json({ drafts: data ?? [] });
    }

    // ---------------- generate a draft from a source post ----------------
    if (action === "generate") {
      const sourceText = String(body?.sourceText ?? "").trim();
      if (sourceText.length < 40) return json({ error: "sourceText too short" }, 400);
      const draft = await generateDraft(sourceText, String(body?.direction ?? "").trim());

      const { data, error } = await supabase
        .from("substack_drafts")
        .insert({
          source_post_id: body?.sourcePostId ?? null,
          source_urn: body?.sourceUrn ?? null,
          source_kind: body?.sourceKind === "calendar" ? "calendar" : "linkedin",
          title: draft.title,
          subtitle: draft.subtitle,
          body: draft.body,
          image_url: body?.imageUrl ?? null,
          status: "draft",
          created_by: body?.createdBy ?? "admin",
        })
        .select()
        .single();
      if (error) throw error;
      return json({ draft: data });
    }

    // ---------------- save edits ----------------
    if (action === "save") {
      const id = String(body?.id ?? "");
      if (!id) return json({ error: "id required" }, 400);
      const patch: Record<string, unknown> = {};
      for (const f of ["title", "subtitle", "body", "image_url", "status", "published_url"]) {
        if (body[f] !== undefined) patch[f] = body[f];
      }
      if (body.scheduledFor !== undefined) patch.scheduled_for = body.scheduledFor || null;
      if (body.emailTo !== undefined) patch.email_to = body.emailTo || null;
      if (body.status === "published" && !body.publishedAt) {
        patch.published_at = new Date().toISOString();
      }
      const { data, error } = await supabase
        .from("substack_drafts")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return json({ draft: data });
    }

    // ---------------- delete ----------------
    if (action === "delete") {
      const id = String(body?.id ?? "");
      if (!id) return json({ error: "id required" }, 400);
      const { error } = await supabase.from("substack_drafts").delete().eq("id", id);
      if (error) throw error;
      return json({ success: true });
    }

    // ---------------- email a draft (manual or from the cron sweep) ----------------
    if (action === "email" || action === "run_scheduled") {
      const apiKey = Deno.env.get("LOVABLE_API_KEY");
      if (!apiKey) return json({ error: "LOVABLE_API_KEY is not configured" }, 500);

      let rows: any[] = [];
      if (action === "email") {
        const id = String(body?.id ?? "");
        if (!id) return json({ error: "id required" }, 400);
        const { data, error } = await supabase.from("substack_drafts").select("*").eq("id", id).single();
        if (error) throw error;
        if (body?.emailTo) data.email_to = body.emailTo;
        rows = [data];
      } else {
        const { data, error } = await supabase
          .from("substack_drafts")
          .select("*")
          .is("emailed_at", null)
          .not("scheduled_for", "is", null)
          .lte("scheduled_for", new Date().toISOString())
          .limit(20);
        if (error) throw error;
        rows = data ?? [];
      }

      let sent = 0;
      for (const d of rows) {
        const to = d.email_to || Deno.env.get("SUBSTACK_DRAFT_EMAIL") || "joseph@aetheris.technology";
        try {
          await sendLovableEmail(
            {
              to,
              from: FROM_ADDRESS,
              sender_domain: SENDER_DOMAIN,
              subject: `Substack draft ready: ${d.title || "Untitled"}`,
              html: draftHtml(d),
              text: `${d.title}\n${d.subtitle}\n\n${d.body}`,
              purpose: "transactional",
              label: "substack_draft",
              idempotency_key: `substack_draft_${d.id}`,
              message_id: crypto.randomUUID(),
            },
            { apiKey, sendUrl: Deno.env.get("LOVABLE_SEND_URL") },
          );
          await supabase
            .from("substack_drafts")
            .update({ emailed_at: new Date().toISOString(), email_to: to, status: "ready" })
            .eq("id", d.id);
          sent++;
        } catch (e) {
          console.error("[substack-draft] email failed", d.id, e);
          if (action === "email") throw e;
        }
      }
      return json({ success: true, sent });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("[substack-draft]", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
