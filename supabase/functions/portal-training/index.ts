// Team Training area — gated CRUD + attempt scoring + Q&A with AI auto-answer.
// Admin actions require x-admin-token; rep actions require x-portal-token.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyPortalToken } from "../_shared/portal-token.ts";
import { verifyAdminToken } from "../_shared/admin-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-portal-token, x-admin-token",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-2.5-flash";

async function aiChat(messages: Array<{ role: string; content: string }>, opts: { jsonMode?: boolean } = {}) {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const body: Record<string, unknown> = { model: AI_MODEL, messages };
  if (opts.jsonMode) body.response_format = { type: "json_object" };
  const r = await fetch(AI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`AI gateway ${r.status}: ${t.slice(0, 200)}`);
  }
  const data = await r.json();
  return String(data.choices?.[0]?.message?.content ?? "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");

    const adminToken = req.headers.get("x-admin-token");
    const portalToken = req.headers.get("x-portal-token");
    const isAdmin = adminToken ? await verifyAdminToken(adminToken, SERVICE_ROLE) : false;
    const claims = portalToken ? await verifyPortalToken(portalToken, SERVICE_ROLE) : null;

    // ─────────── ADMIN ACTIONS ───────────
    if (action.startsWith("admin_")) {
      if (!isAdmin) return json(401, { error: "Admin only" });

      if (action === "admin_list_trainings") {
        const { data, error } = await supabase
          .from("trainings")
          .select("*")
          .order("order_index", { ascending: true })
          .order("created_at", { ascending: false });
        if (error) return json(500, { error: error.message });
        return json(200, { trainings: data ?? [] });
      }

      if (action === "admin_get_training") {
        const id = String(body.id ?? "");
        if (!id) return json(400, { error: "id required" });
        const { data: training, error } = await supabase.from("trainings").select("*").eq("id", id).maybeSingle();
        if (error) return json(500, { error: error.message });
        const { data: questions } = await supabase
          .from("training_questions")
          .select("*")
          .eq("training_id", id)
          .order("order_index", { ascending: true });
        return json(200, { training, questions: questions ?? [] });
      }

      if (action === "admin_save_training") {
        const t = body.training ?? {};
        const payload = {
          title: String(t.title ?? "Untitled training"),
          description: t.description ?? null,
          kind: t.kind === "open" ? "open" : "mcq",
          passing_score: Math.max(0, Math.min(100, Number(t.passing_score) || 70)),
          attachments: Array.isArray(t.attachments) ? t.attachments : [],
          reference_text: t.reference_text ?? null,
          is_published: !!t.is_published,
          order_index: Number(t.order_index) || 0,
        };
        let trainingId = t.id as string | undefined;
        if (trainingId) {
          const { error } = await supabase.from("trainings").update(payload).eq("id", trainingId);
          if (error) return json(500, { error: error.message });
        } else {
          const { data, error } = await supabase.from("trainings").insert(payload).select("id").single();
          if (error) return json(500, { error: error.message });
          trainingId = data.id;
        }

        // Replace questions if provided
        if (Array.isArray(body.questions)) {
          await supabase.from("training_questions").delete().eq("training_id", trainingId);
          if (body.questions.length) {
            const rows = body.questions.map((q: any, i: number) => ({
              training_id: trainingId,
              question_text: String(q.question_text ?? ""),
              options: Array.isArray(q.options) ? q.options : null,
              correct_index: typeof q.correct_index === "number" ? q.correct_index : null,
              rubric: q.rubric ?? null,
              weight: Number(q.weight) || 1,
              order_index: i,
            }));
            const { error } = await supabase.from("training_questions").insert(rows);
            if (error) return json(500, { error: error.message });
          }
        }
        return json(200, { id: trainingId });
      }

      if (action === "admin_delete_training") {
        const id = String(body.id ?? "");
        if (!id) return json(400, { error: "id required" });
        const { error } = await supabase.from("trainings").delete().eq("id", id);
        if (error) return json(500, { error: error.message });
        return json(200, { ok: true });
      }

      if (action === "admin_list_attempts") {
        const trainingId = body.training_id ? String(body.training_id) : null;
        let q = supabase
          .from("training_attempts")
          .select("*, trainings(title, kind, passing_score)")
          .order("completed_at", { ascending: false, nullsFirst: false })
          .order("started_at", { ascending: false })
          .limit(500);
        if (trainingId) q = q.eq("training_id", trainingId);
        const { data, error } = await q;
        if (error) return json(500, { error: error.message });
        return json(200, { attempts: data ?? [] });
      }

      if (action === "admin_list_qa") {
        const { data, error } = await supabase
          .from("training_qa")
          .select("*, trainings(title)")
          .order("created_at", { ascending: false })
          .limit(200);
        if (error) return json(500, { error: error.message });
        return json(200, { qa: data ?? [] });
      }

      if (action === "admin_answer_qa") {
        const id = String(body.id ?? "");
        const answer = String(body.admin_answer ?? "");
        if (!id || !answer) return json(400, { error: "id + admin_answer required" });
        const { error } = await supabase
          .from("training_qa")
          .update({ admin_answer: answer, status: "answered" })
          .eq("id", id);
        if (error) return json(500, { error: error.message });
        return json(200, { ok: true });
      }

      return json(400, { error: `Unknown admin action: ${action}` });
    }

    // ─────────── REP / PARTNER ACTIONS ───────────
    // Allow admin token to act as a preview rep so the admin dashboard
    // iframe preview of the portal works without a real rep code.
    if (!claims && isAdmin) {
      claims = { code: "ADMIN_PREVIEW", role: "partner", exp: Date.now() + 60_000 } as any;
    }
    if (!claims) return json(401, { error: "Invalid portal session" });

    if (action === "list_trainings") {
      const { data: trainings, error } = await supabase
        .from("trainings")
        .select("id, title, description, kind, passing_score, attachments, order_index, is_published, created_at")
        .eq("is_published", true)
        .order("order_index", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) return json(500, { error: error.message });

      // Fetch this rep's attempts (best score per training)
      const { data: attempts } = await supabase
        .from("training_attempts")
        .select("training_id, score, passed, completed_at")
        .eq("rep_code", claims.code)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false });

      const byTraining: Record<string, { best: number; passed: boolean; last_at: string | null; attempts: number }> = {};
      for (const a of attempts ?? []) {
        const slot = byTraining[a.training_id] ?? { best: 0, passed: false, last_at: null, attempts: 0 };
        slot.attempts += 1;
        if ((a.score ?? 0) > slot.best) slot.best = a.score ?? 0;
        if (a.passed) slot.passed = true;
        if (!slot.last_at) slot.last_at = a.completed_at;
        byTraining[a.training_id] = slot;
      }

      const enriched = (trainings ?? []).map((t) => ({ ...t, my_progress: byTraining[t.id] ?? null }));
      return json(200, { trainings: enriched });
    }

    if (action === "get_training") {
      const id = String(body.id ?? "");
      if (!id) return json(400, { error: "id required" });
      const { data: training, error } = await supabase
        .from("trainings")
        .select("id, title, description, kind, passing_score, attachments, is_published")
        .eq("id", id)
        .maybeSingle();
      if (error) return json(500, { error: error.message });
      if (!training || !training.is_published) return json(404, { error: "Not found" });

      const { data: questions } = await supabase
        .from("training_questions")
        .select("id, question_text, options, weight, order_index")
        .eq("training_id", id)
        .order("order_index", { ascending: true });

      // Strip correct_index from rep view
      return json(200, { training, questions: questions ?? [] });
    }

    if (action === "submit_attempt") {
      const trainingId = String(body.training_id ?? "");
      const answers: Array<{ question_id: string; answer: string | number }> = Array.isArray(body.answers) ? body.answers : [];
      if (!trainingId) return json(400, { error: "training_id required" });

      const { data: training, error: tErr } = await supabase
        .from("trainings")
        .select("id, kind, passing_score, reference_text, title, description")
        .eq("id", trainingId)
        .maybeSingle();
      if (tErr || !training) return json(404, { error: "Training not found" });

      const { data: questions } = await supabase
        .from("training_questions")
        .select("id, question_text, options, correct_index, rubric, weight")
        .eq("training_id", trainingId)
        .order("order_index", { ascending: true });

      const qList = questions ?? [];
      let score = 0;
      let perQ: Array<{ question_id: string; score: number; comment: string }> = [];
      let overallFeedback = "";

      if (training.kind === "mcq") {
        let totalWeight = 0;
        let earned = 0;
        for (const q of qList) {
          const w = q.weight || 1;
          totalWeight += w;
          const ans = answers.find((a) => a.question_id === q.id);
          const correct = ans && Number(ans.answer) === q.correct_index;
          if (correct) earned += w;
          perQ.push({
            question_id: q.id,
            score: correct ? 100 : 0,
            comment: correct
              ? "Correct."
              : `Correct answer: ${typeof q.correct_index === "number" && Array.isArray(q.options) ? q.options[q.correct_index] : "—"}`,
          });
        }
        score = totalWeight > 0 ? Math.round((earned / totalWeight) * 100) : 0;
        overallFeedback = `${earned}/${totalWeight} weighted points correct.`;
      } else {
        // AI-graded open answers
        const prompt = `You are grading a sales-rep training. Score each answer 0-100 against the rubric.
Training: ${training.title}
${training.description ? `Context: ${training.description}\n` : ""}${training.reference_text ? `Source material:\n${training.reference_text}\n` : ""}
Return STRICT JSON: {"per_question":[{"question_id":"...","score":0-100,"comment":"..."}],"overall":"<2-3 sentence summary>"}.
Questions and answers:
${qList.map((q) => {
  const a = answers.find((x) => x.question_id === q.id);
  return `Q (${q.id}, weight ${q.weight}): ${q.question_text}
Rubric: ${q.rubric || "(none)"}
Answer: ${a?.answer ?? "(no answer)"}`;
}).join("\n\n")}`;

        try {
          const raw = await aiChat(
            [
              { role: "system", content: "You grade strictly but fairly. Output only valid JSON." },
              { role: "user", content: prompt },
            ],
            { jsonMode: true },
          );
          const parsed = JSON.parse(raw);
          perQ = (parsed.per_question ?? []).map((p: any) => ({
            question_id: String(p.question_id),
            score: Math.max(0, Math.min(100, Math.round(Number(p.score) || 0))),
            comment: String(p.comment ?? ""),
          }));
          overallFeedback = String(parsed.overall ?? "");
          // weighted score
          let totalWeight = 0;
          let weighted = 0;
          for (const q of qList) {
            const w = q.weight || 1;
            totalWeight += w;
            const r = perQ.find((x) => x.question_id === q.id);
            weighted += ((r?.score ?? 0) / 100) * w;
          }
          score = totalWeight > 0 ? Math.round((weighted / totalWeight) * 100) : 0;
        } catch (e) {
          return json(500, { error: `AI grading failed: ${(e as Error).message}` });
        }
      }

      const passed = score >= (training.passing_score ?? 70);
      const { data: attempt, error: aErr } = await supabase
        .from("training_attempts")
        .insert({
          training_id: trainingId,
          rep_code: claims.code,
          answers,
          score,
          passed,
          ai_feedback: overallFeedback,
          per_question_feedback: perQ,
          completed_at: new Date().toISOString(),
        })
        .select("*")
        .single();
      if (aErr) return json(500, { error: aErr.message });
      return json(200, { attempt });
    }

    if (action === "my_attempts") {
      const { data, error } = await supabase
        .from("training_attempts")
        .select("*, trainings(title, kind, passing_score)")
        .eq("rep_code", claims.code)
        .order("completed_at", { ascending: false, nullsFirst: false })
        .limit(100);
      if (error) return json(500, { error: error.message });
      return json(200, { attempts: data ?? [] });
    }

    // ── Q&A ──
    if (action === "list_qa") {
      // Rep sees their own + global (no training_id) + same training questions
      const trainingId = body.training_id ? String(body.training_id) : null;
      let q = supabase
        .from("training_qa")
        .select("*, trainings(title)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (trainingId) q = q.eq("training_id", trainingId);
      const { data, error } = await q;
      if (error) return json(500, { error: error.message });
      return json(200, { qa: data ?? [] });
    }

    if (action === "ask_qa") {
      const question = String(body.question ?? "").trim();
      if (!question) return json(400, { error: "question required" });
      const trainingId = body.training_id ? String(body.training_id) : null;

      // Build AI context: pull all published trainings + their reference text
      let context = "";
      try {
        const { data: ctx } = await supabase
          .from("trainings")
          .select("title, description, reference_text")
          .eq("is_published", true);
        context = (ctx ?? [])
          .map((t) => `### ${t.title}\n${t.description ?? ""}\n${t.reference_text ?? ""}`)
          .join("\n\n")
          .slice(0, 12000);
      } catch { /* ignore */ }

      let aiAnswer = "";
      try {
        aiAnswer = await aiChat([
          {
            role: "system",
            content:
              "You are the in-house sales coach for Aetheris (Business Forensics). Answer the rep's question using the company training context below. Be blunt, tactical, and specific. If the context does not cover it, say so and give your best operator answer. Keep under 250 words.",
          },
          { role: "user", content: `Training context:\n${context}\n\nRep question: ${question}` },
        ]);
      } catch (e) {
        aiAnswer = `(AI unavailable: ${(e as Error).message}) — admin will follow up.`;
      }

      // Get rep name for display
      const { data: rep } = await supabase
        .from("rep_codes")
        .select("rep_name")
        .eq("code", claims.code)
        .maybeSingle();

      const { data, error } = await supabase
        .from("training_qa")
        .insert({
          training_id: trainingId,
          rep_code: claims.code,
          rep_name: rep?.rep_name ?? null,
          question,
          ai_answer: aiAnswer,
          status: "answered",
        })
        .select("*")
        .single();
      if (error) return json(500, { error: error.message });
      return json(200, { qa: data });
    }

    return json(400, { error: `Unknown action: ${action}` });
  } catch (err) {
    return json(500, { error: (err as Error).message });
  }
});
