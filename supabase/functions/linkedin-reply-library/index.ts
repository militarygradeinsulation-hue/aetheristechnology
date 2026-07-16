// Library of LinkedIn reply attempts per rep — stores the source post (text or
// screenshot), an AI summary of what the post was about, the stance / rationale
// picked by "Think for me", and the final generated reply.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { verifyPortalToken, getPortalTokenFromRequest } from "../_shared/portal-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-portal-token",
};

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const BUCKET = "content-images";
const PREFIX = "rep-reply-library";

async function summarizePost(opts: { postText?: string; imageDataUrl?: string }) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return null;
  const userContent: any[] = [
    {
      type: "text",
      text:
        "Summarize this LinkedIn post in 1-2 short sentences (under 280 chars). Capture the author's main claim or topic, the tone, and any specific number/person mentioned. No preamble.",
    },
  ];
  if (opts.postText) userContent.push({ type: "text", text: opts.postText });
  if (opts.imageDataUrl)
    userContent.push({ type: "image_url", image_url: { url: opts.imageDataUrl } });
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: userContent }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data.choices?.[0]?.message?.content || "").toString().trim().slice(0, 600);
  } catch {
    return null;
  }
}

async function uploadDataUrl(
  supabase: ReturnType<typeof createClient>,
  repCode: string,
  dataUrl: string,
) {
  const m = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!m) return null;
  const mime = m[1];
  const ext = mime.split("/")[1].split("+")[0] || "png";
  const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
  const path = `${PREFIX}/${repCode}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: mime, upsert: false });
  if (error) return null;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const claims = await verifyPortalToken(getPortalTokenFromRequest(req), SERVICE_KEY);
    if (!claims) return json({ error: "Unauthorized" }, 401);
    const repCode = claims.code;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === "list") {
      const { data, error } = await supabase
        .from("linkedin_reply_library")
        .select("id, source_type, post_text, image_url, post_summary, stance, rationale, preset_labels, extra_context, generated_reply, mode, created_at")
        .eq("rep_code", repCode)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return json({ items: data || [] });
    }

    if (action === "delete") {
      const id = body.id as string;
      const { data: row } = await supabase
        .from("linkedin_reply_library")
        .select("rep_code, storage_path")
        .eq("id", id)
        .maybeSingle();
      if (!row || row.rep_code !== repCode) return json({ error: "Not found" }, 404);
      if (row.storage_path) {
        await supabase.storage.from(BUCKET).remove([row.storage_path]);
      }
      await supabase.from("linkedin_reply_library").delete().eq("id", id);
      return json({ ok: true });
    }

    if (action === "save") {
      const sourceType = body.source_type === "image" ? "image" : "text";
      const postText = (body.post_text as string | undefined)?.slice(0, 8000) || null;
      const imageDataUrl = body.image_data_url as string | undefined;
      const generated = (body.generated_reply as string | undefined)?.toString() || "";
      if (!generated.trim()) return json({ error: "generated_reply required" }, 400);

      let image_url: string | null = null;
      let storage_path: string | null = null;
      if (sourceType === "image" && imageDataUrl) {
        const up = await uploadDataUrl(supabase, repCode, imageDataUrl);
        if (up) { image_url = up.url; storage_path = up.path; }
      }

      const summary = await summarizePost({
        postText: postText || undefined,
        imageDataUrl: sourceType === "image" ? imageDataUrl : undefined,
      });

      const { data, error } = await supabase
        .from("linkedin_reply_library")
        .insert({
          rep_code: repCode,
          source_type: sourceType,
          post_text: postText,
          image_url,
          storage_path,
          post_summary: summary,
          stance: body.stance || null,
          rationale: body.rationale || null,
          preset_labels: Array.isArray(body.preset_labels) ? body.preset_labels : [],
          extra_context: (body.extra_context as string | undefined)?.slice(0, 4000) || null,
          generated_reply: generated.slice(0, 8000),
          mode: body.mode === "full" ? "full" : "brief",
        })
        .select()
        .single();
      if (error) throw error;
      return json({ item: data });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e: any) {
    console.error("linkedin-reply-library error", e);
    return json({ error: e?.message || "Unknown error" }, 500);
  }
});
