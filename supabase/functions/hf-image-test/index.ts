// Temporary diagnostic: verifies the Hugging Face FLUX image path end to end.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { generateImage } from "../_shared/hf-image.ts";

serve(async () => {
  const key = Deno.env.get("HF_TOKEN");
  if (!key) return new Response(JSON.stringify({ error: "HF_TOKEN missing" }), { status: 500 });
  try {
    const out = await generateImage({ prompt: "Astronaut riding a horse, editorial ink illustration", apiKey: key });
    return new Response(JSON.stringify({ ok: true, provider: out.provider, bytes: out.bytes.length, contentType: out.contentType }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }), {
      status: 502, headers: { "Content-Type": "application/json" },
    });
  }
});
