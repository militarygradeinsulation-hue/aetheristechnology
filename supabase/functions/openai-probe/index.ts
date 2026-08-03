// Temporary diagnostic: verifies OpenAI chat + image paths and the router chain.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { routedChatCompletion } from "../_shared/ai-router.ts";
import { generateImage } from "../_shared/openai-image.ts";

serve(async () => {
  const out: Record<string, unknown> = {};
  try {
    const r = await routedChatCompletion({ tier: "bulk", messages: [{ role: "user", content: "Say OK" }], max_tokens: 10 });
    out.chat = { provider: r.provider, model: r.model, content: r.content.slice(0, 40) };
  } catch (e) {
    out.chat = { error: e instanceof Error ? e.message : String(e) };
  }
  const key = Deno.env.get("OPENAI_API_KEY");
  try {
    if (!key) throw new Error("OPENAI_API_KEY missing");
    const img = await generateImage({ prompt: "A simple amber ink sketch of a leaking pipe", apiKey: key });
    out.image = { provider: img.provider, model: img.modelId, bytes: img.bytes.length };
  } catch (e) {
    out.image = { error: e instanceof Error ? e.message : String(e) };
  }
  return new Response(JSON.stringify(out), { headers: { "Content-Type": "application/json" } });
});
