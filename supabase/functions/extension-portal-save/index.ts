// Aetheris extension → rep portal bridge.
// Lets the Chrome extension persist whatever it just generated (scans, fixes,
// LinkedIn drafts, CRM autopsies, agent plans, golden reports, …) into the
// signed-in rep / partner's portal Library so it shows up alongside everything
// else and can be downloaded as an Aetheris-branded PDF.
//
// Auth: an access code (rep_codes.code or claim_codes.code). Same model the
// other extension-* functions already use. No JWT required.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_TITLE = 240;
const MAX_JSON = 200_000; // bytes per blob, sanity cap

function clean(v: unknown, max = 1000): string {
  if (v == null) return "";
  const s = String(v).trim();
  return s.length > max ? s.slice(0, max) : s;
}

function safeJson(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== "object") return {};
  try {
    const s = JSON.stringify(v);
    if (s.length > MAX_JSON) {
      // truncate by re-stringifying a trimmed version
      return { _truncated: true, preview: s.slice(0, MAX_JSON) };
    }
    return v as Record<string, unknown>;
  } catch {
    return {};
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(url, key);

    const body = await req.json().catch(() => ({}));
    const accessCode = clean(body.accessCode, 64).toUpperCase();
    const tool_type = clean(body.tool_type, 64) || "extension_misc";
    const title = clean(body.title, MAX_TITLE) || "Extension capture";
    const file_url = clean(body.file_url, 1000) || null;
    const lead_id = clean(body.lead_id, 64) || null;
    const input_data = safeJson(body.input_data);
    const output_data = safeJson(body.output_data);

    if (!accessCode) {
      return new Response(JSON.stringify({ error: "Missing accessCode" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate against rep_codes (preferred) or claim_codes (client unlock)
    const { data: rep } = await sb
      .from("rep_codes")
      .select("code, rep_name, is_active")
      .eq("code", accessCode)
      .maybeSingle();

    let codeForRow = rep?.is_active ? rep.code : null;
    let label = rep?.rep_name || "";

    if (!codeForRow) {
      const { data: claim } = await sb
        .from("claim_codes")
        .select("code")
        .eq("code", accessCode)
        .maybeSingle();
      if (claim?.code) codeForRow = claim.code;
    }

    if (!codeForRow) {
      return new Response(JSON.stringify({ error: "Invalid access code" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await sb
      .from("rep_library")
      .insert({
        code: codeForRow,
        tool_type,
        title,
        input_data: { ...input_data, _source: "chrome_extension" },
        output_data,
        file_url,
        lead_id,
      })
      .select("id, tool_type, title, created_at")
      .maybeSingle();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, item: data, rep: label }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
