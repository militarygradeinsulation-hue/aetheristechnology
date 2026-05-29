// Easy Mode tool: takes pasted text and/or an uploaded image and rewrites it
// as a plain-English, fifth-grader-friendly version. Backed by the
// admin_library table (tool_type = "easy_mode") for save/list/delete.
//
// Accepts EITHER an admin token (x-admin-token) OR a portal token
// (x-portal-token) so both staff and reps can use it.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";
import { verifyPortalToken, getPortalTokenFromRequest } from "../_shared/portal-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token, x-portal-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface AuthInfo {
  source: "admin" | "rep" | "partner";
  code: string; // "admin" for admins, rep/partner code otherwise
}

async function authorize(req: Request, serviceKey: string): Promise<AuthInfo | null> {
  const adminTok = getAdminTokenFromRequest(req);
  if (adminTok) {
    const ok = await verifyAdminToken(adminTok, serviceKey);
    if (ok) return { source: "admin", code: "admin" };
  }
  const portalTok = getPortalTokenFromRequest(req);
  if (portalTok) {
    const claims = await verifyPortalToken(portalTok, serviceKey);
    if (claims) return { source: claims.role, code: claims.code };
  }
  return null;
}

const SYSTEM_PROMPT = `You are the "Easy Mode" translator. Your job is to take ANY input — dense business writing, jargon, technical docs, a screenshot of a page, contract clauses, marketing copy, AI output, an email — and rewrite it so a busy non-expert (or even a smart 5th grader) instantly understands it.

Rules:
- Plain, friendly English. Short sentences. No corporate fluff.
- Keep the core meaning, numbers, names, and any specific terms that matter.
- Use bullets, short headings, or numbered steps when it helps clarity. Otherwise just clean prose.
- If the input is an image, read EVERYTHING visible (text, labels, buttons, prices, charts) and explain what it actually means.
- Start with a one-sentence "TL;DR:" line, then the simplified version.
- Never invent facts. If something is unclear, say "(unclear in source)".
- Output is markdown. No preamble like "Sure, here is...".`;

async function callLovableAI(text: string, imageDataUrl: string | null): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const userContent: any[] = [];
  if (text && text.trim()) {
    userContent.push({ type: "text", text: `Rewrite this in Easy Mode:\n\n${text.trim()}` });
  } else {
    userContent.push({ type: "text", text: "Rewrite what's in this image in Easy Mode." });
  }
  if (imageDataUrl) {
    userContent.push({ type: "image_url", image_url: { url: imageDataUrl } });
  }

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (resp.status === 429) throw new Error("RATE_LIMIT");
  if (resp.status === 402) throw new Error("PAYMENT_REQUIRED");
  if (!resp.ok) {
    const t = await resp.text();
    console.error("AI gateway error:", resp.status, t);
    throw new Error(`AI gateway error: ${resp.status}`);
  }
  const data = await resp.json();
  return data?.choices?.[0]?.message?.content || "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const auth = await authorize(req, SUPABASE_SERVICE_ROLE_KEY);
    if (!auth) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "generate");

    if (action === "generate") {
      const text = typeof body.text === "string" ? body.text : "";
      const image = typeof body.image === "string" ? body.image : null;
      if (!text.trim() && !image) return json({ error: "Provide text, an image, or both." }, 400);

      try {
        const output = await callLovableAI(text, image);
        return json({ output });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg === "RATE_LIMIT") return json({ error: "Rate limit hit. Try again in a moment." }, 429);
        if (msg === "PAYMENT_REQUIRED") return json({ error: "AI credits exhausted. Add funds in Lovable Cloud settings." }, 402);
        throw e;
      }
    }

    if (action === "save") {
      const title = (body.title || "Easy Mode note").toString().slice(0, 200);
      const text = (body.text || "").toString();
      const output = (body.output || "").toString();
      const hadImage = !!body.had_image;
      if (!output.trim()) return json({ error: "Nothing to save" }, 400);
      const { data, error } = await supabase.from("admin_library").insert({
        tool_type: "easy_mode",
        title,
        input_data: { text, had_image: hadImage, author: auth.code, source: auth.source },
        output_data: { output },
      }).select().single();
      if (error) throw error;
      return json({ item: data });
    }

    if (action === "list") {
      const limit = Math.max(1, Math.min(100, Number(body.limit) || 30));
      const { data, error } = await supabase
        .from("admin_library")
        .select("id, title, input_data, output_data, created_at")
        .eq("tool_type", "easy_mode")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return json({ items: data || [] });
    }

    if (action === "delete") {
      const id = body.id;
      if (!id) return json({ error: "id required" }, 400);
      const { error } = await supabase.from("admin_library").delete().eq("id", id).eq("tool_type", "easy_mode");
      if (error) throw error;
      return json({ success: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("easy-mode error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
