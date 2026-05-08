// Careers test: start attempt, submit answers, upload resume, admin lookup by code.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";
import { verifyPortalToken, getPortalTokenFromRequest } from "../_shared/portal-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token, x-portal-token",
};

// Reps/partners with elevated access to careers admin data.
const CAREERS_ALLOWED_PORTAL_CODES = new Set(["963169"]); // Bradon Roberts

async function isAuthorizedAdminOrAllowedPortal(req: Request, secret: string): Promise<boolean> {
  if (await verifyAdminToken(getAdminTokenFromRequest(req), secret)) return true;
  const claims = await verifyPortalToken(getPortalTokenFromRequest(req), secret);
  if (claims && CAREERS_ALLOWED_PORTAL_CODES.has(claims.code)) return true;
  return false;
}

const TEST_MINUTES = 45;
const QUESTION_COUNT = 20;
const PASS_PCT = 70;
const MAX_ATTEMPTS_PER_DAY = 5;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function code6() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, SERVICE);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");

    // ---------- START ----------
    if (action === "start") {
      const email = String(body.email || "").trim().toLowerCase();
      const name = String(body.name || "").trim();
      const phone = String(body.phone || "").trim() || null;
      if (!email || !name) return json({ error: "Name and email required" }, 400);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Invalid email" }, 400);

      // Only count *submitted* attempts toward the daily limit so abandoned/lost
      // sessions and quick mis-clicks don't lock candidates out.
      const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const { count } = await admin.from("careers_attempts")
        .select("id", { count: "exact", head: true })
        .ilike("candidate_email", email)
        .not("submitted_at", "is", null)
        .gte("started_at", dayAgo);
      if ((count ?? 0) >= MAX_ATTEMPTS_PER_DAY) {
        return json({ error: `You've used your ${MAX_ATTEMPTS_PER_DAY} attempts for today. Try again tomorrow.` }, 429);
      }

      const { data: pool, error: poolErr } = await admin.from("careers_questions")
        .select("id,question,choices,correct_choice_id")
        .eq("is_active", true);
      if (poolErr) throw poolErr;
      if (!pool || pool.length < QUESTION_COUNT) return json({ error: "Question bank not ready yet." }, 500);

      const picked = shuffle(pool).slice(0, QUESTION_COUNT);
      // Strip correct answers before sending to client
      const clientQuestions = picked.map((q: any) => ({
        id: q.id,
        question: q.question,
        choices: q.choices,
      }));
      const expires = new Date(Date.now() + TEST_MINUTES * 60 * 1000).toISOString();

      const { data: attempt, error: insErr } = await admin.from("careers_attempts").insert({
        candidate_email: email, candidate_name: name, candidate_phone: phone,
        questions: picked, // keep correct answers stored on attempt for grading
        expires_at: expires,
        status: "in_progress",
      }).select("id,expires_at").single();
      if (insErr) throw insErr;

      return json({ ok: true, attempt_id: attempt.id, expires_at: attempt.expires_at, questions: clientQuestions, minutes: TEST_MINUTES, total: QUESTION_COUNT, pass_pct: PASS_PCT });
    }

    // ---------- SUBMIT ----------
    if (action === "submit") {
      const attemptId = String(body.attempt_id || "");
      const answers = body.answers && typeof body.answers === "object" ? body.answers as Record<string, string> : {};
      const notes = (body.notes || "").toString().slice(0, 4000);
      if (!attemptId) return json({ error: "Missing attempt_id" }, 400);

      const { data: attempt, error: getErr } = await admin.from("careers_attempts")
        .select("id,questions,expires_at,status,candidate_email,candidate_name,candidate_phone")
        .eq("id", attemptId).maybeSingle();
      if (getErr) throw getErr;
      if (!attempt) return json({ error: "Attempt not found" }, 404);
      if (attempt.status !== "in_progress") return json({ error: "Attempt already submitted" }, 400);

      const expired = new Date(attempt.expires_at).getTime() < Date.now();
      const total = attempt.questions.length;
      let correct = 0;
      for (const q of attempt.questions as any[]) {
        if (answers[q.id] && answers[q.id] === q.correct_choice_id) correct++;
      }
      const pct = Math.round((correct / total) * 1000) / 10; // 1 decimal
      const passed = !expired && pct >= PASS_PCT;
      const shareCode = passed ? code6() : null;

      const { error: upErr } = await admin.from("careers_attempts").update({
        answers,
        submitted_at: new Date().toISOString(),
        score_pct: pct,
        correct_count: correct,
        total_count: total,
        status: expired ? "expired" : (passed ? "passed" : "failed"),
        share_code: shareCode,
        notes_to_admin: notes || null,
      }).eq("id", attemptId);
      if (upErr) throw upErr;

      return json({ ok: true, passed, score_pct: pct, correct, total, expired, share_code: shareCode });
    }

    // ---------- UPLOAD-RESUME (signed URL) ----------
    if (action === "upload_resume_url") {
      const code = String(body.share_code || "").trim().toUpperCase();
      const filename = String(body.filename || "resume").replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 80);
      if (!code) return json({ error: "Missing share_code" }, 400);
      const { data: attempt } = await admin.from("careers_attempts").select("id,share_code,status").eq("share_code", code).maybeSingle();
      if (!attempt || attempt.status !== "passed") return json({ error: "Invalid share code" }, 404);
      const path = `${code}/${Date.now()}_${filename}`;
      const { data: signed, error } = await admin.storage.from("careers-resumes").createSignedUploadUrl(path);
      if (error) throw error;
      return json({ ok: true, path, token: signed.token, signed_url: signed.signedUrl });
    }

    // ---------- FINALIZE APPLICATION (after upload) ----------
    if (action === "finalize_application") {
      const code = String(body.share_code || "").trim().toUpperCase();
      const resumePath = body.resume_path ? String(body.resume_path) : null;
      const resumeFilename = body.resume_filename ? String(body.resume_filename).slice(0, 200) : null;
      const notes = (body.notes || "").toString().slice(0, 4000) || null;
      if (!code) return json({ error: "Missing share_code" }, 400);

      const { data: attempt } = await admin.from("careers_attempts")
        .select("id,share_code,status,candidate_email,candidate_name,candidate_phone,score_pct")
        .eq("share_code", code).maybeSingle();
      if (!attempt || attempt.status !== "passed") return json({ error: "Invalid share code" }, 404);

      // upsert by share_code
      const { error } = await admin.from("careers_applications").upsert({
        attempt_id: attempt.id,
        share_code: code,
        candidate_name: attempt.candidate_name || "",
        candidate_email: attempt.candidate_email,
        candidate_phone: attempt.candidate_phone,
        resume_path: resumePath,
        resume_filename: resumeFilename,
        notes,
        score_pct: attempt.score_pct,
      }, { onConflict: "share_code" });
      if (error) throw error;

      return json({ ok: true, share_code: code });
    }

    // ---------- ADMIN: lookup by code ----------
    if (action === "admin_lookup") {
      const ok = await isAuthorizedAdminOrAllowedPortal(req, SERVICE);
      if (!ok) return json({ error: "Unauthorized" }, 401);
      const code = String(body.share_code || "").trim().toUpperCase();
      if (!code) return json({ error: "Missing share_code" }, 400);

      const { data: app } = await admin.from("careers_applications").select("*").eq("share_code", code).maybeSingle();
      const { data: attempt } = await admin.from("careers_attempts").select("id,candidate_name,candidate_email,candidate_phone,score_pct,correct_count,total_count,status,started_at,submitted_at,notes_to_admin,questions,answers").eq("share_code", code).maybeSingle();
      if (!app && !attempt) return json({ error: "Code not found" }, 404);

      let resumeUrl: string | null = null;
      if (app?.resume_path) {
        const { data: signed } = await admin.storage.from("careers-resumes").createSignedUrl(app.resume_path, 60 * 30);
        resumeUrl = signed?.signedUrl || null;
      }

      // mark reviewed
      if (app) await admin.from("careers_applications").update({ reviewed: true, reviewed_at: new Date().toISOString() }).eq("share_code", code);

      return json({ ok: true, application: app, attempt, resume_url: resumeUrl });
    }

    // ---------- ADMIN: list everyone ----------
    if (action === "admin_list") {
      const ok = await isAuthorizedAdminOrAllowedPortal(req, SERVICE);
      if (!ok) return json({ error: "Unauthorized" }, 401);

      const { data: attempts } = await admin.from("careers_attempts")
        .select("id,candidate_name,candidate_email,candidate_phone,score_pct,correct_count,total_count,status,started_at,submitted_at,share_code,notes_to_admin")
        .order("started_at", { ascending: false }).limit(500);

      const { data: applications } = await admin.from("careers_applications")
        .select("id,share_code,candidate_name,candidate_email,candidate_phone,resume_path,resume_filename,notes,score_pct,reviewed,reviewed_at,created_at")
        .order("created_at", { ascending: false }).limit(500);

      // Page analytics for /careers and /careers/test
      const { data: events } = await admin.from("site_events")
        .select("event_type,event_data,session_id,created_at")
        .in("event_type", ["page_view", "careers_cta_click"])
        .gte("created_at", new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString())
        .order("created_at", { ascending: false }).limit(5000);

      const careersEvents = (events || []).filter((e: any) => {
        const path = (e.event_data?.path || "") as string;
        return path.startsWith("/careers");
      });

      const views = careersEvents.filter((e: any) => e.event_type === "page_view");
      const ctaClicks = careersEvents.filter((e: any) => e.event_type === "careers_cta_click");
      const uniqueVisitors = new Set(views.map((e: any) => e.session_id)).size;

      const byPath: Record<string, number> = {};
      views.forEach((e: any) => { const p = e.event_data?.path || "/careers"; byPath[p] = (byPath[p] || 0) + 1; });
      const byCta: Record<string, number> = {};
      ctaClicks.forEach((e: any) => { const c = e.event_data?.cta || "unknown"; byCta[c] = (byCta[c] || 0) + 1; });

      return json({
        ok: true,
        attempts: attempts || [],
        applications: applications || [],
        analytics: {
          total_views: views.length,
          unique_visitors: uniqueVisitors,
          total_cta_clicks: ctaClicks.length,
          by_path: Object.entries(byPath).map(([path, count]) => ({ path, count })).sort((a, b) => b.count - a.count),
          by_cta: Object.entries(byCta).map(([cta, count]) => ({ cta, count })).sort((a, b) => b.count - a.count),
        },
      });
    }

    // ---------- ADMIN: update application (notes / reviewed flag) ----------
    if (action === "admin_update_application") {
      const ok = await isAuthorizedAdminOrAllowedPortal(req, SERVICE);
      if (!ok) return json({ error: "Unauthorized" }, 401);
      const code = String(body.share_code || "").trim().toUpperCase();
      if (!code) return json({ error: "Missing share_code" }, 400);
      const patch: Record<string, unknown> = {};
      if (typeof body.notes === "string") patch.notes = body.notes.slice(0, 4000) || null;
      if (typeof body.reviewed === "boolean") {
        patch.reviewed = body.reviewed;
        patch.reviewed_at = body.reviewed ? new Date().toISOString() : null;
      }
      if (Object.keys(patch).length === 0) return json({ error: "Nothing to update" }, 400);
      const { error } = await admin.from("careers_applications").update(patch).eq("share_code", code);
      if (error) throw error;
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("careers-test error:", e);
    return json({ error: e instanceof Error ? e.message : "Server error" }, 500);
  }
});
