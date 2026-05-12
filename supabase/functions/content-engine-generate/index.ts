// Content Engine — admin-gated edge function for LinkedIn content planning + generation.
// Powered by Lovable AI Gateway (no external keys).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";
import { FORENSIC_BLUEPRINT_COMPACT } from "../_shared/contentBlueprint.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const PLAN_MODEL = "google/gemini-2.5-flash";
const SCRIPT_MODEL = "openai/gpt-5-mini";

type Strategy = {
  business_description: string;
  niche: string;
  target_buyer: string;
  goals: string[];
  frequency: string;
  posting_days: string[];
  posting_times: string[];
  format_mix: Record<string, number>;
  voice_reference: string;
  cta_link: string;
};

// ---- date helpers ----
function pad(n: number) { return String(n).padStart(2, "0"); }
function ymd(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function dayShort(d: Date) { return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()]; }

function getNextNDates(strategy: Strategy, count: number) {
  const postsPerDay = strategy.frequency === "2x/day" ? 2 : 1;
  const dates: { date: string; time: string }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cursor = new Date(today);
  let safety = 0;
  while (dates.length < count && safety < 365) {
    const dn = dayShort(cursor);
    if (strategy.posting_days.includes(dn)) {
      const times = postsPerDay === 2
        ? strategy.posting_times.slice(0, 2)
        : [strategy.posting_times[0] || "07:30"];
      for (const t of times) {
        if (dates.length < count) dates.push({ date: ymd(cursor), time: t });
      }
    }
    cursor.setDate(cursor.getDate() + 1);
    safety++;
  }
  return dates;
}

// ---- AI prompts ----
function systemPrompt(s: Strategy) {
  return `${FORENSIC_BLUEPRINT_COMPACT}

═══════════════════════════════════════════════════════════════════
CHANNEL: LINKEDIN SHORT-FORM VIDEO (60–90s scripts)
═══════════════════════════════════════════════════════════════════

You are a LinkedIn short-form video strategist writing for ${s.business_description}.

NICHE: ${s.niche}
TARGET BUYER: ${s.target_buyer}
GOALS: ${s.goals.join(", ")}
CTA URL: ${s.cta_link}

VOICE REFERENCE (mimic this tone exactly):
${s.voice_reference}

CHANNEL-SPECIFIC RULES:
- First 1.5 seconds = Phase 1 Hook. Punchline, dollar figure, contrarian claim. NEVER "Hey guys" or "Today I'm going to talk about."
- 60–90 second scripts (~150–220 words). Re-hook every 20–30 seconds with a Loop Opener or Contrast Word — "but actually," "turns out," "the part nobody mentions."
- Real numbers beat round numbers. "$847K" beats "almost a million."
- One idea per video. Operator Close at the end — drop and move.
- End with soft CTA: "if this hits, the link in bio runs this scan on your business free."
- Max 3 niche hashtags. No emoji decoration.`;
}

async function callAI(model: string, system: string, user: string, tool: any) {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY missing");

  const res = await fetch(LOVABLE_AI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      tools: [tool],
      tool_choice: { type: "function", function: { name: tool.function.name } },
    }),
  });

  if (!res.ok) {
    if (res.status === 429) throw new Error("Rate limited. Try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Top up in workspace settings.");
    const t = await res.text();
    throw new Error(`AI gateway ${res.status}: ${t.slice(0, 200)}`);
  }

  const data = await res.json();
  const call = data?.choices?.[0]?.message?.tool_calls?.[0];
  if (!call?.function?.arguments) throw new Error("No tool call returned");
  return JSON.parse(call.function.arguments);
}

const PLAN_TOOL = {
  type: "function",
  function: {
    name: "plan_posts",
    description: "Plan a batch of LinkedIn video posts.",
    parameters: {
      type: "object",
      properties: {
        slots: {
          type: "array",
          items: {
            type: "object",
            properties: {
              date: { type: "string" },
              format: { type: "string", enum: ["auditRoast","patternReveal","founderPOV","counterTake"] },
              topicAngle: { type: "string" },
              targetEmotion: { type: "string", enum: ["curiosity","urgency","validation","contrarian"] },
            },
            required: ["date","format","topicAngle","targetEmotion"],
            additionalProperties: false,
          },
        },
      },
      required: ["slots"],
      additionalProperties: false,
    },
  },
};

const SCRIPT_TOOL = {
  type: "function",
  function: {
    name: "write_script",
    description: "Write a LinkedIn video script package.",
    parameters: {
      type: "object",
      properties: {
        hook: { type: "string", description: "Under 12 words. Stops the scroll." },
        script: { type: "string", description: "Full 60-90s script with line breaks." },
        caption: { type: "string", description: "LinkedIn caption, 2-3 short paragraphs." },
        hashtags: { type: "array", items: { type: "string" }, description: "Max 3, no # symbol." },
      },
      required: ["hook","script","caption","hashtags"],
      additionalProperties: false,
    },
  },
};

function scriptUserPrompt(s: Strategy, slot: { format: string; topicAngle: string; targetEmotion: string }) {
  const guides: Record<string, string> = {
    auditRoast: `Write an AUDIT ROAST. Open with the dollar figure or the most broken thing. Walk through 2-3 specific findings about a hypothetical ${s.niche} business with real numbers. End: "wonder what we'd find on yours? link in bio runs this scan free."`,
    patternReveal: `Write a PATTERN REVEAL. Open with "Here's a leak I find in 80% of ${s.niche} businesses." Expose the pattern with real numbers. Give the EXACT fix (workflow, sequence, automation). End with the soft CTA.`,
    founderPOV: `Write a FOUNDER POV. Behind-the-scenes of building or finding a recent win. First-person, specific. Show momentum without bragging. End with the soft CTA.`,
    counterTake: `Write a COUNTER-TAKE. Open with "Everyone tells [target buyer] to [common advice]. That's wrong." Explain why with reasoning. Give the better play. End with the soft CTA.`,
  };
  return `${guides[slot.format] || guides.auditRoast}

TOPIC ANGLE: ${slot.topicAngle}
TARGET EMOTION: ${slot.targetEmotion}`;
}

// ---- handlers ----
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const token = getAdminTokenFromRequest(req);
    const ok = await verifyAdminToken(token, SUPABASE_SERVICE_ROLE_KEY);
    if (!ok) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json().catch(() => ({}));
    const { action } = body;

    // ---- read strategy ----
    if (action === "get_strategy") {
      const { data, error } = await supabase
        .from("content_engine_strategy")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return json({ strategy: data });
    }

    // ---- save strategy ----
    if (action === "save_strategy") {
      const s = body.strategy;
      if (!s?.id) {
        return json({ error: "strategy.id required" }, 400);
      }
      const { error } = await supabase
        .from("content_engine_strategy")
        .update({
          business_description: s.business_description,
          niche: s.niche,
          target_buyer: s.target_buyer,
          goals: s.goals,
          frequency: s.frequency,
          posting_days: s.posting_days,
          posting_times: s.posting_times,
          format_mix: s.format_mix,
          voice_reference: s.voice_reference,
          cta_link: s.cta_link,
        })
        .eq("id", s.id);
      if (error) throw error;
      return json({ success: true });
    }

    // ---- list posts ----
    if (action === "get_posts") {
      const { data, error } = await supabase
        .from("content_engine_posts")
        .select("*")
        .order("scheduled_date", { ascending: true })
        .order("scheduled_time", { ascending: true });
      if (error) throw error;
      return json({ posts: data || [] });
    }

    // ---- update single post ----
    if (action === "update_post") {
      const { id, updates } = body;
      if (!id) return json({ error: "id required" }, 400);
      const { error } = await supabase.from("content_engine_posts").update(updates).eq("id", id);
      if (error) throw error;
      return json({ success: true });
    }

    // ---- delete post ----
    if (action === "delete_post") {
      const { id } = body;
      if (!id) return json({ error: "id required" }, 400);
      const { error } = await supabase.from("content_engine_posts").delete().eq("id", id);
      if (error) throw error;
      return json({ success: true });
    }

    // ---- clear all scheduled posts ----
    if (action === "clear_posts") {
      const { error } = await supabase
        .from("content_engine_posts")
        .delete()
        .not("id", "is", null);
      if (error) throw error;
      return json({ success: true });
    }

    // ---- duplicate post +7d ----
    if (action === "duplicate_post") {
      const { id } = body;
      const { data: post, error: rerr } = await supabase
        .from("content_engine_posts").select("*").eq("id", id).maybeSingle();
      if (rerr || !post) throw rerr || new Error("Not found");
      const d = new Date(post.scheduled_date + "T00:00:00");
      d.setDate(d.getDate() + 7);
      const { data: created, error: ierr } = await supabase
        .from("content_engine_posts")
        .insert({
          scheduled_date: ymd(d),
          scheduled_time: post.scheduled_time,
          format: post.format,
          topic_angle: post.topic_angle,
          target_emotion: post.target_emotion,
          hook: post.hook,
          script: post.script,
          caption: post.caption,
          hashtags: post.hashtags,
          status: "draft",
        })
        .select()
        .single();
      if (ierr) throw ierr;
      return json({ post: created });
    }

    // ---- regenerate post ----
    if (action === "regenerate_post") {
      const { id } = body;
      const { data: post, error: perr } = await supabase
        .from("content_engine_posts").select("*").eq("id", id).maybeSingle();
      if (perr || !post) throw perr || new Error("Post not found");
      const { data: strategy, error: serr } = await supabase
        .from("content_engine_strategy").select("*").limit(1).maybeSingle();
      if (serr || !strategy) throw serr || new Error("Strategy missing");

      const result = await callAI(
        SCRIPT_MODEL,
        systemPrompt(strategy as Strategy),
        scriptUserPrompt(strategy as Strategy, {
          format: post.format,
          topicAngle: post.topic_angle,
          targetEmotion: post.target_emotion || "curiosity",
        }),
        SCRIPT_TOOL,
      );

      const { data: updated, error: uerr } = await supabase
        .from("content_engine_posts")
        .update({
          hook: result.hook,
          script: result.script,
          caption: result.caption,
          hashtags: result.hashtags || [],
          generated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();
      if (uerr) throw uerr;
      return json({ post: updated });
    }

    // ---- plan + generate batch ----
    if (action === "plan_and_generate") {
      const numPosts = Math.min(Math.max(parseInt(body.numPosts) || 12, 1), 30);
      const userPrompt: string = (body.userPrompt || "").toString().trim();
      const blogIds: string[] = Array.isArray(body.blogIds) ? body.blogIds.slice(0, 10) : [];
      const playbookIds: string[] = Array.isArray(body.playbookIds) ? body.playbookIds.slice(0, 10) : [];
      const topicSeeds: string[] = Array.isArray(body.topicSeeds)
        ? body.topicSeeds.map((t: any) => String(t).trim()).filter(Boolean).slice(0, 20)
        : [];

      const { data: strategy, error: serr } = await supabase
        .from("content_engine_strategy").select("*").limit(1).maybeSingle();
      if (serr || !strategy) throw serr || new Error("Strategy missing");

      const slots = getNextNDates(strategy as Strategy, numPosts);
      if (slots.length === 0) {
        return json({ error: "No posting slots available. Configure posting days in Strategy." }, 400);
      }

      // Pull source context (blogs + playbooks) if any selected
      const sourceSnippets: string[] = [];
      if (blogIds.length) {
        const { data: blogs } = await supabase
          .from("blog_posts")
          .select("title, excerpt, content")
          .in("id", blogIds);
        for (const b of blogs || []) {
          const body = (b.excerpt || b.content || "").toString().replace(/<[^>]+>/g, " ").slice(0, 1200);
          sourceSnippets.push(`BLOG — ${b.title}\n${body}`);
        }
      }
      if (playbookIds.length) {
        const { data: pbs } = await supabase
          .from("playbooks")
          .select("title, description, content")
          .in("id", playbookIds);
        for (const p of pbs || []) {
          const body = (p.description || p.content || "").toString().replace(/<[^>]+>/g, " ").slice(0, 1200);
          sourceSnippets.push(`PLAYBOOK — ${p.title}\n${body}`);
        }
      }

      const directionBlock = [
        userPrompt && `OPERATOR DIRECTION (highest priority — every post must serve this):\n${userPrompt}`,
        topicSeeds.length && `TOPIC SEEDS (mix into the angles, do not just repeat):\n- ${topicSeeds.join("\n- ")}`,
        sourceSnippets.length && `SOURCE MATERIAL (mine these for hooks, numbers, and angles — do not paraphrase, extract the sharpest insights):\n\n${sourceSnippets.join("\n\n---\n\n")}`,
      ].filter(Boolean).join("\n\n");

      const planUserPrompt = `Plan ${slots.length} LinkedIn video posts across these dates: ${slots.map(s => s.date).join(", ")}.

Format mix to respect approximately: ${JSON.stringify((strategy as Strategy).format_mix)}

For each date return: date, format (auditRoast|patternReveal|founderPOV|counterTake), topicAngle (1 sentence), targetEmotion (curiosity|urgency|validation|contrarian).

${directionBlock || `Topic angles must be DIVERSE. Mine the full landscape of ${(strategy as Strategy).niche} pain points: lead leakage, follow-up failures, sales process gaps, CRM hygiene, quote-to-close gaps, ghosted deals, owner workload, missed re-engagement, broken intake forms, response time, attribution gaps, automation gaps.`}

${directionBlock ? `Topic angles must still be DIVERSE — do not repeat the same angle twice.` : ""}`;

      const plan = await callAI(PLAN_MODEL, systemPrompt(strategy as Strategy), planUserPrompt, PLAN_TOOL);
      if (!plan?.slots?.length) throw new Error("Planner returned no slots");

      const scriptResults = await Promise.all(plan.slots.map(async (planSlot: any, i: number) => {
        try {
          const r = await callAI(
            SCRIPT_MODEL,
            systemPrompt(strategy as Strategy),
            scriptUserPrompt(strategy as Strategy, planSlot),
            SCRIPT_TOOL,
          );
          return { ok: true, planSlot, script: r, i };
        } catch (e) {
          console.error("Script gen failed:", e);
          return { ok: false, i, error: (e as Error).message };
        }
      }));

      const rows = scriptResults
        .filter((r: any) => r.ok)
        .map((r: any) => {
          const slot = slots[r.i];
          return {
            scheduled_date: slot.date,
            scheduled_time: slot.time,
            format: r.planSlot.format,
            topic_angle: r.planSlot.topicAngle,
            target_emotion: r.planSlot.targetEmotion,
            hook: r.script.hook,
            script: r.script.script,
            caption: r.script.caption,
            hashtags: r.script.hashtags || [],
            status: "draft",
          };
        });

      if (rows.length === 0) throw new Error("All script generations failed");

      const { data: inserted, error: ierr } = await supabase
        .from("content_engine_posts")
        .insert(rows)
        .select();
      if (ierr) throw ierr;

      const failures = scriptResults.filter((r: any) => !r.ok).length;
      return json({ posts: inserted, generated: inserted?.length || 0, failures });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("content-engine-generate error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(payload: any, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
