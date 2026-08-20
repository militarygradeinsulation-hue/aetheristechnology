// Golden Report growth deliverables: background enrichment + backfill.
//
// The scan itself never waits on this. forensic-scan-all attaches the
// deterministic base (6 imagery concepts, 12 posts, 30 schedule days) and
// marks the report completed, then calls this function fire and forget.
//
// Guarantees:
//  - Idempotent. A report already enriched is skipped unless force is set.
//  - Non destructive. AI output is validated and merged over the base; a bad
//    or missing section keeps its deterministic content, never blanks it.
//  - Never touches report findings, chapters, leaks or any financial value.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { routedChatCompletion } from "../_shared/ai-router.ts";
import { verifyAdminToken } from "../_shared/admin-token.ts";
import { stripDashesDeep, NO_DASH_PROMPT_RULE } from "../_shared/no-dashes.ts";
import {
  buildFallbackDeliverables,
  normalizeDeliverables,
  deliverablesComplete,
  topUpConcepts,
  qualifyPosts,
  postsPassGate,
  scheduleTopic,
  TARGET_IMAGERY,
  type ReportDeliverables,
} from "../_shared/report-deliverables.ts";
import { validatePostSet, hasBannedPhrase } from "../_shared/content-uniqueness.ts";
import { narrativeQuality, repairReportNarrative } from "../_shared/narrative-repair.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token, x-internal-key",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

type SB = ReturnType<typeof createClient>;

/* ─────────────────────────────── AI calls ─────────────────────────────── */

const VOICE = `You write for Aetheris, a business forensics operator.
Blunt, concrete, operator grade. No agency filler, no invented statistics, no fabricated awards or client names.
USD only for any money value. Never state or imply a dollar figure that is not already in the provided findings.
${NO_DASH_PROMPT_RULE}
Return ONLY valid JSON in the exact shape requested.`;

async function call(prompt: string, maxTokens: number): Promise<Record<string, unknown>> {
  const res = await routedChatCompletion({
    tier: "bulk",
    messages: [
      { role: "system", content: VOICE },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    max_tokens: maxTokens,
    temperature: 0.5,
  });
  const raw = res.content || "{}";
  try {
    return JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : {};
  }
}

function context(company: string, url: string, report: Record<string, unknown>) {
  const leaks = Array.isArray(report.top_leaks) ? report.top_leaks.slice(0, 6) : [];
  const chapters = Array.isArray(report.chapters) ? report.chapters as Record<string, unknown>[] : [];
  const evidence = chapters.slice(0, 14).map((c) => ({
    chapter: c.title || c.slug,
    verdict: String(c.verdict || "").slice(0, 300),
    found: String(c.what_we_found || "").slice(0, 500),
  }));
  return `COMPANY: ${company || url}
WEBSITE: ${url}
EXECUTIVE SUMMARY: ${String(report.executive_summary || "").slice(0, 1500)}
TOP FINDINGS: ${JSON.stringify(leaks).slice(0, 2500)}
CHAPTER EVIDENCE: ${JSON.stringify(evidence).slice(0, 9000)}

Everything you write must be traceable to the evidence above.`;
}

async function enrichWithAi(company: string, url: string, report: Record<string, unknown>) {
  const ctx = context(company, url, report);

  const imageryPrompt = `${ctx}

Write an IMAGERY DIRECTION BOARD for this company with ready to paste generation prompts.
Return JSON:
{ "visual_style": "<2-3 sentences>",
  "subjects": ["<4-6 concrete subjects>"],
  "composition": "<2-3 sentences>",
  "lighting": "<1-2 sentences>",
  "color_treatment": "<1-2 sentences>",
  "show": ["<4-6 items>"],
  "avoid": ["<4-6 items>"],
  "concepts": [ { "title": "<short label>", "purpose": "<what this image fixes>", "channel": "<where it is used>", "aspect_ratio": "<16:9|1:1|4:5|3:2>", "dimensions": "<e.g. 1920x1080>", "related_leak": "<the finding it supports>", "prompt": "<complete image generation prompt, 50 to 90 words, no placeholders>" } ] }
Include 6 concepts. Every prompt must be usable as is.`;

  const postsPrompt = `${ctx}

Write 12 READY TO PUBLISH posts for this company. Each maps to a real finding.
Return JSON:
{ "posts": [ { "platform": "<LinkedIn|X|Instagram|Facebook|Email>", "hook": "<one scroll stopping line>", "body": "<80 to 150 words of plain sentences>", "cta": "<one short specific action>", "visual": "<one sentence of visual direction>", "related_leak": "<the finding it maps to>" } ] }
Exactly 12 posts. Mix the platforms.`;

  const schedulePrompt = `${ctx}

Build a practical 30 day publishing schedule that sequences the 12 posts plus supporting email and video content.
Return JSON:
{ "overview": "<2-3 sentences>",
  "days": [ { "day": <1-30>, "content_type": "<social post|email|short video|blog>", "platform": "<channel>", "time": "<e.g. 8:30 AM ET>", "purpose": "<authority|proof of process|offer|education|reactivation>", "topic": "<one short line specific to this company>", "goal": "<short line on what this day moves>", "owner": "<Marketing|Owner|Sales>" } ] }
Keep every value short so all 30 entries fit in one response.
Exactly 30 entries, day 1 through 30, no gaps.`;

  const [imagery, posts, schedule] = await Promise.allSettled([
    call(imageryPrompt, 3200),
    call(postsPrompt, 4000),
    call(schedulePrompt, 6000),
  ]);

  const ok = <T>(r: PromiseSettledResult<T>): T | null => (r.status === "fulfilled" ? r.value : null);
  const failures: string[] = [];
  [["imagery", imagery], ["posts", posts], ["schedule", schedule]].forEach(([k, r]) => {
    const res = r as PromiseSettledResult<unknown>;
    if (res.status === "rejected") failures.push(`${k}: ${String(res.reason).slice(0, 140)}`);
  });

  const postsVal = ok(posts) as Record<string, unknown> | null;
  const schedVal = ok(schedule) as Record<string, unknown> | null;

  return {
    ai: stripDashesDeep({
      imagery: ok(imagery) || {},
      posts: Array.isArray(postsVal?.posts) ? postsVal!.posts : [],
      schedule: schedVal || {},
    }) as Record<string, unknown>,
    failures,
  };
}

/* ───────────────────────────── hero image ───────────────────────────── */

async function generateHeroImage(sb: SB, scanId: string, prompt: string): Promise<string | null> {
  if (!LOVABLE_API_KEY) return null;
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });
    if (!r.ok) {
      console.error(`hero image ${r.status}: ${(await r.text().catch(() => "")).slice(0, 200)}`);
      return null;
    }
    const j = await r.json();
    const dataUrl: string = j?.choices?.[0]?.message?.images?.[0]?.image_url?.url || "";
    const m = dataUrl.match(/^data:(image\/[a-z+]+);base64,(.+)$/);
    if (!m) return null;
    const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
    const path = `golden-report/${scanId}/hero.png`;
    const { error } = await sb.storage.from("content-images").upload(path, bytes, {
      contentType: m[1],
      upsert: true,
    });
    if (error) {
      console.error("hero image upload failed:", error.message);
      return null;
    }
    const { data } = sb.storage.from("content-images").getPublicUrl(path);
    return data.publicUrl || null;
  } catch (e) {
    console.error("hero image failed:", (e as Error).message);
    return null;
  }
}

/* ─────────────────────────── enrich one scan ────────────────────────── */

async function enrichScan(sb: SB, scanId: string, opts: { force?: boolean; images?: boolean } = {}) {
  const { data: scan } = await sb.from("forensic_scans")
    .select("id, report, company_name, target_url, status")
    .eq("id", scanId).maybeSingle();
  if (!scan) return { scan_id: scanId, skipped: "not_found" };

  const report = (scan.report || {}) as Record<string, unknown>;
  if (!report || !Object.keys(report).length) return { scan_id: scanId, skipped: "no_report" };

  const company = String(scan.company_name || "");
  const url = String(scan.target_url || "");
  const existing = report.deliverables as ReportDeliverables | undefined;

  // Deterministic base always exists first, so no tab can be empty.
  let deliverables: ReportDeliverables = deliverablesComplete(existing)
    ? existing as ReportDeliverables
    : normalizeDeliverables(
        buildFallbackDeliverables({ company, url, report, brand: (existing?.brand as Record<string, unknown>) || null }),
        // Carry legacy AI content forward when the old shape had it.
        existing as unknown as Record<string, unknown>,
      );

  const alreadyEnriched = deliverables.generation_state === "ready" && !!deliverables.enriched_at;
  if (alreadyEnriched && !opts.force) {
    // Still persist if the report had no deliverables block at all.
    if (!existing) {
      report.deliverables = deliverables;
      await sb.from("forensic_scans").update({ report }).eq("id", scanId);
    }
    return { scan_id: scanId, skipped: "already_enriched", state: deliverables.generation_state };
  }

  const base = deliverablesComplete(existing) && !opts.force
    ? deliverables
    : buildFallbackDeliverables({ company, url, report, brand: (existing?.brand as Record<string, unknown>) || null });

  let failures: string[] = [];
  try {
    const { ai, failures: f } = await enrichWithAi(company, url, report);
    failures = f;
    deliverables = normalizeDeliverables(base, ai);
  } catch (e) {
    failures = [String((e as Error).message).slice(0, 200)];
    deliverables = { ...base, generation_state: "degraded", enriched_at: new Date().toISOString() };
  }
  deliverables.brand = (existing?.brand as Record<string, unknown>) || deliverables.brand || null;
  deliverables.enrichment_error = failures.length ? failures.join(" | ").slice(0, 400) : null;

  // One hero image, best effort. Everything else stays a prompt until asked for.
  if (opts.images !== false) {
    const hero = deliverables.imagery.concepts.find((c) => c.hero) || deliverables.imagery.concepts[0];
    if (hero && !hero.image_url) {
      const urlOut = await generateHeroImage(sb, scanId, hero.prompt);
      if (urlOut) {
        hero.image_url = urlOut;
        hero.status = "generated";
        hero.generated_at = new Date().toISOString();
      }
    }
  }

  report.deliverables = deliverables;
  const { error } = await sb.from("forensic_scans").update({ report }).eq("id", scanId);
  if (error) throw error;

  // Re archive so the library summary reflects the stored report. Idempotent by
  // scan id, and provisioning is skipped because nothing forensic changed.
  await fetch(`${SUPABASE_URL}/functions/v1/golden-report-library`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SVC}`, "x-internal-key": SVC },
    body: JSON.stringify({ action: "archive_scan", scan_id: scanId, provision: false }),
  }).catch(() => undefined);

  return {
    scan_id: scanId,
    state: deliverables.generation_state,
    imagery: deliverables.imagery.concepts.length,
    posts: deliverables.posts.length,
    schedule: deliverables.schedule.days.length,
    hero_image: !!deliverables.imagery.concepts.find((c) => c.image_url),
    failures,
  };
}

/* ─────────────────────────────── handler ─────────────────────────────── */

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const sb = createClient(SUPABASE_URL, SVC);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "enrich");

    const internal = req.headers.get("x-internal-key") === SVC;
    const isAdmin = internal || await verifyAdminToken(req.headers.get("x-admin-token") ?? "", SVC);
    if (!isAdmin) return json({ error: "Unauthorized" }, 401);

    if (action === "enrich") {
      const scanId = String(body.scan_id ?? "");
      if (!scanId) return json({ error: "scan_id required" }, 400);
      const res = await enrichScan(sb as unknown as SB, scanId, { force: body.force === true, images: body.images !== false });
      return json({ ok: true, ...res });
    }

    // Resumable backfill. Deterministic only by default so it can sweep the
    // whole history cheaply; pass ai:true to also run enrichment per batch.
    if (action === "backfill") {
      const batch = Math.max(1, Math.min(50, Number(body.batch) || 20));
      const cursor: string | null = typeof body.cursor === "string" && body.cursor ? body.cursor : null;
      const withAi = body.ai === true;

      let q = sb.from("forensic_scans")
        .select("id, report, company_name, target_url")
        .eq("status", "completed").not("report", "is", null)
        .order("id", { ascending: true }).limit(batch);
      if (cursor) q = q.gt("id", cursor);
      const { data: rows, error } = await q;
      if (error) throw error;
      const scans = (rows || []) as Array<Record<string, unknown>>;

      let repaired = 0, ok = 0;
      const errors: string[] = [];
      for (const s of scans) {
        const id = String(s.id);
        try {
          const report = (s.report || {}) as Record<string, unknown>;
          const existing = report.deliverables as ReportDeliverables | undefined;
          if (deliverablesComplete(existing) && !body.force) { ok++; continue; }
          if (withAi) {
            await enrichScan(sb as unknown as SB, id, { force: body.force === true, images: body.images === true });
          } else {
            report.deliverables = normalizeDeliverables(
              buildFallbackDeliverables({
                company: String(s.company_name || ""),
                url: String(s.target_url || ""),
                report,
                brand: (existing?.brand as Record<string, unknown>) || null,
              }),
              existing as unknown as Record<string, unknown>,
            );
            (report.deliverables as ReportDeliverables).brand =
              (existing?.brand as Record<string, unknown>) || null;
            const { error: upErr } = await sb.from("forensic_scans").update({ report }).eq("id", id);
            if (upErr) throw upErr;
          }
          repaired++;
        } catch (e) {
          errors.push(`${id}: ${(e as Error).message.slice(0, 120)}`);
        }
      }

      return json({
        ok: true,
        processed: scans.length,
        repaired,
        already_complete: ok,
        errors: errors.slice(0, 5),
        cursor: scans.length ? String(scans[scans.length - 1].id) : null,
        done: scans.length < batch,
      });
    }

    /**
     * Targeted historical repair: reports whose imagery.concepts fell below the
     * 6 concept guarantee (AI enrichment used to be allowed to return 4 or 5).
     * It only appends to imagery.concepts/prompts. Findings, dollar amounts,
     * evidence, hashes, posts and schedule are read but never written.
     */
    if (action === "topup_imagery") {
      const batch = Math.max(1, Math.min(100, Number(body.batch) || 25));
      const cursor: string | null = typeof body.cursor === "string" && body.cursor ? body.cursor : null;

      let q = sb.from("forensic_scans")
        .select("id, report, company_name, target_url")
        .eq("status", "completed").not("report", "is", null)
        .order("id", { ascending: true }).limit(batch);
      if (cursor) q = q.gt("id", cursor);
      const { data: rows, error } = await q;
      if (error) throw error;
      const scans = (rows || []) as Array<Record<string, unknown>>;

      let repaired = 0, skipped = 0;
      const errors: string[] = [];
      const repairedIds: string[] = [];

      for (const s of scans) {
        const id = String(s.id);
        try {
          const report = (s.report || {}) as Record<string, unknown>;
          const existing = report.deliverables as ReportDeliverables | undefined;
          const concepts = existing?.imagery?.concepts;
          // Idempotent: anything already at the guarantee is left untouched.
          if (!existing?.imagery || !Array.isArray(concepts) || concepts.length >= TARGET_IMAGERY) {
            skipped++;
            continue;
          }

          // Deterministic, company and finding specific source for the tail.
          const base = buildFallbackDeliverables({
            company: String(s.company_name || ""),
            url: String(s.target_url || ""),
            report,
            brand: (existing.brand as Record<string, unknown>) || null,
          });
          const nextConcepts = topUpConcepts(concepts, base.imagery.concepts);
          if (nextConcepts.length < TARGET_IMAGERY) throw new Error("top up did not reach the guarantee");

          const nextImagery = {
            ...existing.imagery,
            concepts: nextConcepts,
            prompts: nextConcepts.map((c) => ({ title: c.title, prompt: c.prompt })),
          };
          // Surgical write: only the imagery sub object is replaced.
          const nextReport = {
            ...report,
            deliverables: { ...existing, imagery: nextImagery },
          };
          const { error: upErr } = await sb.from("forensic_scans")
            .update({ report: nextReport }).eq("id", id);
          if (upErr) throw upErr;

          // Idempotent re archive, keyed on scan id, no reprovisioning.
          await fetch(`${SUPABASE_URL}/functions/v1/golden-report-library`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${SVC}`, "x-internal-key": SVC },
            body: JSON.stringify({ action: "archive_scan", scan_id: id, provision: false }),
          }).catch(() => undefined);

          repaired++;
          repairedIds.push(id);
        } catch (e) {
          errors.push(`${id}: ${(e as Error).message.slice(0, 120)}`);
        }
      }

      return json({
        ok: true,
        processed: scans.length,
        repaired,
        skipped,
        repaired_ids: repairedIds,
        errors: errors.slice(0, 5),
        cursor: scans.length ? String(scans[scans.length - 1].id) : null,
        done: scans.length < batch,
      });
    }

    // Lightweight audit. Counting happens in SQL friendly pages so the worker
    // never has to hold thousands of report payloads in memory.
    if (action === "audit") {
      const batch = Math.max(1, Math.min(200, Number(body.batch) || 100));
      const cursor: string | null = typeof body.cursor === "string" && body.cursor ? body.cursor : null;
      let q = sb.from("forensic_scans").select("id, report->deliverables")
        .eq("status", "completed").not("report", "is", null)
        .order("id", { ascending: true }).limit(batch);
      if (cursor) q = q.gt("id", cursor);
      const { data: rows, error } = await q;
      if (error) throw error;
      const list = (rows || []) as Array<Record<string, unknown>>;
      let complete = 0, incomplete = 0, enriched = 0;
      for (const r of list) {
        const d = r.deliverables;
        if (deliverablesComplete(d)) {
          complete++;
          if ((d as ReportDeliverables).generation_state === "ready") enriched++;
        } else incomplete++;
      }
      return json({
        ok: true, processed: list.length, complete, incomplete, enriched,
        cursor: list.length ? String(list[list.length - 1].id) : null,
        done: list.length < batch,
      });
    }

    /**
     * READ ONLY content quality audit: banned filler, exact duplicate posts,
     * near duplicate posts and duplicated long-form narrative across sections.
     */
    if (action === "audit_quality") {
      const batch = Math.max(1, Math.min(200, Number(body.batch) || 100));
      const cursor: string | null = typeof body.cursor === "string" && body.cursor ? body.cursor : null;
      let q = sb.from("forensic_scans").select("id, report")
        .eq("status", "completed").not("report", "is", null)
        .order("id", { ascending: true }).limit(batch);
      if (cursor) q = q.gt("id", cursor);
      const { data: rows, error } = await q;
      if (error) throw error;
      const list = (rows || []) as Array<Record<string, unknown>>;

      let banned = 0, exactDupPosts = 0, nearDupPosts = 0, dupNarrative = 0, clean = 0;
      const offenders: string[] = [];
      for (const r of list) {
        const report = (r.report || {}) as Record<string, unknown>;
        const d = report.deliverables as ReportDeliverables | undefined;
        const posts = Array.isArray(d?.posts) ? d!.posts : [];
        const gate = validatePostSet(posts, Math.min(12, posts.length || 12));
        const hasBanned = posts.some((p) => hasBannedPhrase(`${p.hook} ${p.body} ${p.cta}`));
        const nq = narrativeQuality(report);
        const codes = gate.issues.map((i) => String(i.code));
        const eDup = codes.includes("exact_duplicate");
        const nDup = codes.some((c) => ["near_duplicate", "repeated_sentence", "duplicate_hook", "duplicate_cta", "shared_opening"].includes(c));
        if (hasBanned) banned++;
        if (eDup) exactDupPosts++;
        if (nDup) nearDupPosts++;
        if (!nq.ok) dupNarrative++;
        if (!hasBanned && !eDup && !nDup && nq.ok) clean++;
        else if (offenders.length < 20) offenders.push(String(r.id));
      }

      return json({
        ok: true, processed: list.length,
        banned_filler: banned, exact_duplicate_posts: exactDupPosts,
        near_duplicate_posts: nearDupPosts, duplicated_narrative: dupNarrative,
        clean, offenders,
        cursor: list.length ? String(list[list.length - 1].id) : null,
        done: list.length < batch,
      });
    }

    /**
     * Idempotent, paginated content quality repair.
     *  - Posts are growth deliverables, so failing sets are rebuilt from
     *    qualified AI posts merged with distinct deterministic archetypes.
     *  - Narrative repair rewrites ONLY duplicated narrative fields.
     *  - Brand, imagery assets, findings, evidence, citations, confidence and
     *    every dollar field are read but never written.
     */
    if (action === "repair_quality") {
      const batch = Math.max(1, Math.min(50, Number(body.batch) || 20));
      const cursor: string | null = typeof body.cursor === "string" && body.cursor ? body.cursor : null;
      const only: string[] = Array.isArray(body.scan_ids) ? body.scan_ids.map(String) : [];

      let q = sb.from("forensic_scans")
        .select("id, report, company_name, target_url")
        .eq("status", "completed").not("report", "is", null)
        .order("id", { ascending: true }).limit(batch);
      if (only.length) q = q.in("id", only);
      else if (cursor) q = q.gt("id", cursor);
      const { data: rows, error } = await q;
      if (error) throw error;
      const scans = (rows || []) as Array<Record<string, unknown>>;

      let repaired = 0, skipped = 0;
      const repairedIds: string[] = [];
      const errors: string[] = [];

      for (const s of scans) {
        const id = String(s.id);
        try {
          const report = (s.report || {}) as Record<string, unknown>;
          const existing = report.deliverables as ReportDeliverables | undefined;
          const posts = Array.isArray(existing?.posts) ? existing!.posts : [];
          const postsOk = posts.length >= 12 &&
            !posts.some((p) => hasBannedPhrase(`${p.hook} ${p.body} ${p.cta}`)) &&
            postsPassGate(posts);
          const nq = narrativeQuality(report);
          if (postsOk && nq.ok && !body.force) { skipped++; continue; }

          const next: Record<string, unknown> = { ...report };
          const meta: Record<string, unknown> = { repaired_at: new Date().toISOString() };

          if (!postsOk || body.force) {
            const base = buildFallbackDeliverables({
              company: String(s.company_name || ""),
              url: String(s.target_url || ""),
              report,
              brand: (existing?.brand as Record<string, unknown>) || null,
            });
            const keep = posts.filter((p) => !hasBannedPhrase(`${p.hook} ${p.body} ${p.cta}`));
            const merged = qualifyPosts(keep, base.posts);
            const finalPosts = merged.posts;
            const baseDays = existing?.schedule?.days?.length ? existing.schedule.days : base.schedule.days;
            const days = baseDays.map((d, i) => {
              const post = finalPosts[i % finalPosts.length];
              return {
                ...d,
                post_id: d.post_id ? post.id : d.post_id,
                topic: scheduleTopic(post),
                goal: String(post.takeaway || d.goal || "").slice(0, 160),
                related_leak: post.related_leak,
              };
            });
            next.deliverables = {
              ...(existing || base),
              posts: finalPosts,
              schedule: { ...(existing?.schedule || base.schedule), days },
              quality: merged.manifest,
            };
            meta.posts = { ai_kept: merged.ai_kept, replaced: posts.length, passed: merged.ok };
          }

          if (!nq.ok) {
            const fixed = repairReportNarrative(next);
            meta.narrative = {
              repairs: fixed.repairs,
              passed: fixed.ok,
              before: nq.manifest,
              after: fixed.manifest,
            };
            next.content_quality = { ...fixed.manifest, repairs: fixed.repairs.slice(0, 40) };
          }
          next.content_quality_repair = meta;

          const { error: upErr } = await sb.from("forensic_scans").update({ report: next }).eq("id", id);
          if (upErr) throw upErr;

          await fetch(`${SUPABASE_URL}/functions/v1/golden-report-library`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${SVC}`, "x-internal-key": SVC },
            body: JSON.stringify({ action: "archive_scan", scan_id: id, provision: false }),
          }).catch(() => undefined);

          repaired++;
          repairedIds.push(id);
        } catch (e) {
          errors.push(`${id}: ${(e as Error).message.slice(0, 140)}`);
        }
      }

      return json({
        ok: true, processed: scans.length, repaired, skipped,
        repaired_ids: repairedIds.slice(0, 50), errors: errors.slice(0, 5),
        cursor: scans.length ? String(scans[scans.length - 1].id) : null,
        done: scans.length < batch,
      });
    }

    return json({ error: "Unknown action" }, 400);

  } catch (e) {
    console.error("report-deliverables error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
