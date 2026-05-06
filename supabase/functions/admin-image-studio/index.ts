import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const BUCKET = "content-images";
const STUDIO_PREFIX = "admin-studio";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const ok = await verifyAdminToken(getAdminTokenFromRequest(req), SERVICE_KEY);
    if (!ok) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === "list") {
      const { data, error } = await supabase
        .from("admin_image_studio")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return json({ images: data || [] });
    }

    if (action === "delete") {
      const id = body.id as string;
      const { data: row } = await supabase.from("admin_image_studio").select("storage_path").eq("id", id).maybeSingle();
      if (row?.storage_path) {
        await supabase.storage.from(BUCKET).remove([row.storage_path]);
      }
      const { error } = await supabase.from("admin_image_studio").delete().eq("id", id);
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "generate" || action === "edit") {
      if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY not configured" }, 500);
      const prompt = (body.prompt as string || "").trim();
      if (!prompt) return json({ error: "prompt required" }, 400);
      const model = (body.model as string) || "google/gemini-3.1-flash-image-preview";
      const sourceImageUrl = body.source_image_url as string | undefined;

      const messages: any[] = [];
      if (action === "edit" && sourceImageUrl) {
        messages.push({
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: sourceImageUrl } },
          ],
        });
      } else {
        messages.push({ role: "user", content: prompt });
      }

      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages, modalities: ["image", "text"] }),
      });
      if (!aiRes.ok) {
        const t = await aiRes.text();
        if (aiRes.status === 429) return json({ error: "Rate limited. Try again shortly." }, 429);
        if (aiRes.status === 402) return json({ error: "AI credits exhausted." }, 402);
        return json({ error: `AI gateway: ${t}` }, 502);
      }
      const aiData = await aiRes.json();
      const dataUrl: string | undefined = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!dataUrl?.startsWith("data:image/")) return json({ error: "No image returned" }, 502);

      const m = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/)!;
      const ext = m[1] === "jpeg" ? "jpg" : m[1];
      const bytes = Uint8Array.from(atob(m[2]), c => c.charCodeAt(0));
      const path = `${STUDIO_PREFIX}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, bytes, {
        contentType: `image/${ext === "jpg" ? "jpeg" : ext}`, upsert: false,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

      const { data: row, error: insErr } = await supabase.from("admin_image_studio").insert({
        prompt, url: pub.publicUrl, storage_path: path, model,
        source: action === "edit" ? "edited" : "generated",
        metadata: action === "edit" ? { source_image_url: sourceImageUrl } : {},
      }).select().single();
      if (insErr) throw insErr;
      return json({ image: row });
    }

    if (action === "save_upload") {
      // body: { filename, content_type, base64, prompt? }
      const filename = (body.filename as string) || `upload-${Date.now()}.png`;
      const contentType = (body.content_type as string) || "image/png";
      const base64 = body.base64 as string;
      if (!base64) return json({ error: "base64 required" }, 400);
      const ext = (filename.split(".").pop() || "png").toLowerCase();
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const path = `${STUDIO_PREFIX}/upload-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType, upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const { data: row, error: insErr } = await supabase.from("admin_image_studio").insert({
        prompt: (body.prompt as string) || filename,
        url: pub.publicUrl, storage_path: path,
        source: "uploaded", metadata: { filename },
      }).select().single();
      if (insErr) throw insErr;
      return json({ image: row });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("admin-image-studio error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});
