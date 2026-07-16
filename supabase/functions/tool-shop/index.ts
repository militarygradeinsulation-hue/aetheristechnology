// Tool Shop backend — handles: check-license, redeem-code, consume-free-run,
// get-memory, save-memory. All operations use service role; browsers hit this
// function instead of the tables directly.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FREE_RUNS_PER_TOOL = 3;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normEmail(e?: string | null) {
  return e ? String(e).trim().toLowerCase() : "";
}

function isValidEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 255;
}

async function loadLicense(code: string) {
  const c = String(code || "").trim().toUpperCase();
  if (!c || c.length > 32) return null;
  const { data } = await supabase
    .from("tool_licenses")
    .select("*")
    .eq("code", c)
    .maybeSingle();
  return data;
}

function licenseCovers(lic: any, toolId: string) {
  if (!lic) return false;
  if (lic.plan === "unlimited") return true;
  return Array.isArray(lic.tool_ids) && lic.tool_ids.includes(toolId);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");

    // ---- redeem: validate code, return owned tool_ids + plan ----
    if (action === "redeem") {
      const lic = await loadLicense(body.code);
      if (!lic) return json({ ok: false, error: "Code not found" }, 404);
      await supabase.from("tool_licenses").update({ last_used_at: new Date().toISOString() }).eq("id", lic.id);
      return json({
        ok: true,
        code: lic.code,
        plan: lic.plan,
        tool_ids: lic.tool_ids ?? [],
        email: lic.email,
      });
    }

    // ---- check: is this code+tool entitled? or how many free runs left? ----
    if (action === "check") {
      const toolId = String(body.tool_id || "");
      if (!toolId) return json({ error: "tool_id required" }, 400);
      if (body.code) {
        const lic = await loadLicense(body.code);
        if (lic && licenseCovers(lic, toolId)) {
          return json({ ok: true, mode: "licensed", plan: lic.plan, code: lic.code });
        }
      }
      const email = normEmail(body.email);
      if (email && isValidEmail(email)) {
        const { data: fr } = await supabase
          .from("tool_free_runs")
          .select("runs_used")
          .eq("email", email)
          .eq("tool_id", toolId)
          .maybeSingle();
        const used = fr?.runs_used ?? 0;
        return json({
          ok: true,
          mode: "free",
          runs_used: used,
          runs_remaining: Math.max(0, FREE_RUNS_PER_TOOL - used),
          runs_total: FREE_RUNS_PER_TOOL,
        });
      }
      return json({ ok: true, mode: "gated", runs_total: FREE_RUNS_PER_TOOL });
    }

    // ---- consume: record a run (bumps free-run counter unless licensed) ----
    if (action === "consume") {
      const toolId = String(body.tool_id || "");
      if (!toolId) return json({ error: "tool_id required" }, 400);
      if (body.code) {
        const lic = await loadLicense(body.code);
        if (lic && licenseCovers(lic, toolId)) {
          return json({ ok: true, mode: "licensed" });
        }
      }
      const email = normEmail(body.email);
      if (!email || !isValidEmail(email)) return json({ error: "valid email required" }, 400);
      const { data: fr } = await supabase
        .from("tool_free_runs")
        .select("id, runs_used")
        .eq("email", email)
        .eq("tool_id", toolId)
        .maybeSingle();
      const used = fr?.runs_used ?? 0;
      if (used >= FREE_RUNS_PER_TOOL) {
        return json({ ok: false, error: "Free runs exhausted", runs_remaining: 0 }, 402);
      }
      if (fr) {
        await supabase.from("tool_free_runs").update({
          runs_used: used + 1,
          updated_at: new Date().toISOString(),
        }).eq("id", fr.id);
      } else {
        await supabase.from("tool_free_runs").insert({
          email, tool_id: toolId, runs_used: 1,
        });
      }
      return json({
        ok: true,
        mode: "free",
        runs_used: used + 1,
        runs_remaining: Math.max(0, FREE_RUNS_PER_TOOL - (used + 1)),
      });
    }

    // ---- memory get / save ----
    if (action === "memory_get") {
      const lic = await loadLicense(body.code);
      const toolId = String(body.tool_id || "");
      if (!lic || !toolId) return json({ ok: false, memory: {} });
      if (!licenseCovers(lic, toolId)) return json({ ok: false, memory: {} });
      const { data } = await supabase
        .from("tool_memory")
        .select("memory, updated_at")
        .eq("license_code", lic.code)
        .eq("tool_id", toolId)
        .maybeSingle();
      return json({ ok: true, memory: data?.memory ?? {}, updated_at: data?.updated_at ?? null });
    }

    if (action === "memory_save") {
      const lic = await loadLicense(body.code);
      const toolId = String(body.tool_id || "");
      const memory = body.memory ?? {};
      if (!lic || !toolId) return json({ error: "code + tool_id required" }, 400);
      if (!licenseCovers(lic, toolId)) return json({ error: "not licensed for this tool" }, 403);
      const asStr = JSON.stringify(memory);
      if (asStr.length > 200_000) return json({ error: "memory too large" }, 413);
      await supabase.from("tool_memory").upsert({
        license_code: lic.code,
        tool_id: toolId,
        memory,
        updated_at: new Date().toISOString(),
      }, { onConflict: "license_code,tool_id" });
      return json({ ok: true });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    console.error("tool-shop error", e);
    return json({ error: e instanceof Error ? e.message : "server error" }, 500);
  }
});
