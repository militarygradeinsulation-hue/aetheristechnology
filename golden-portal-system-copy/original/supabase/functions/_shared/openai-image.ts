// Shared OpenAI image-generation helper (gpt-image-1).
//
// Mirrors the shape of ../_shared/leonardo.ts and ../_shared/hf-image.ts
// `generateImage` so callers can swap providers without touching storage/DB code.

export const OPENAI_IMAGE_MODEL = "gpt-image-1";

const IMAGES_URL = "https://api.openai.com/v1/images/generations";

interface OpenAiImageOpts {
  prompt: string;
  apiKey: string;
  width?: number;
  height?: number;
  model?: string;
  quality?: "low" | "medium" | "high" | "auto";
  timeoutMs?: number;
}

interface OpenAiImageResult {
  bytes: Uint8Array;
  contentType: string;
  ext: string;
  modelId: string;
  provider: string;
}

// gpt-image-1 only accepts a fixed set of sizes.
function sizeFor(width: number, height: number): string {
  if (width === height) return "1024x1024";
  return height > width ? "1024x1536" : "1536x1024";
}

function b64ToBytes(b64: string): Uint8Array {
  const clean = b64.includes(",") ? b64.split(",").pop()! : b64;
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function generateImage(opts: OpenAiImageOpts): Promise<OpenAiImageResult> {
  const model = opts.model || OPENAI_IMAGE_MODEL;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), opts.timeoutMs ?? 120_000);
  let res: Response;
  try {
    res = await fetch(IMAGES_URL, {
      method: "POST",
      signal: ctl.signal,
      headers: {
        Authorization: `Bearer ${opts.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt: opts.prompt.slice(0, 4000),
        n: 1,
        size: sizeFor(opts.width || 1024, opts.height || 1024),
        quality: opts.quality || "medium",
      }),
    });
  } finally {
    clearTimeout(t);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`OpenAI images ${res.status}: ${text.slice(0, 300)}`);
    (err as any).status = res.status;
    throw err;
  }

  const j = await res.json();
  const b64: string | undefined = j?.data?.[0]?.b64_json;
  const url: string | undefined = j?.data?.[0]?.url;

  if (b64) {
    return {
      bytes: b64ToBytes(b64),
      contentType: "image/png",
      ext: "png",
      modelId: model,
      provider: "openai",
    };
  }
  if (url) {
    const dl = await fetch(url);
    if (!dl.ok) throw new Error(`OpenAI: failed to download image ${dl.status}`);
    const contentType = dl.headers.get("content-type") || "image/png";
    return {
      bytes: new Uint8Array(await dl.arrayBuffer()),
      contentType,
      ext: contentType.includes("webp") ? "webp" : contentType.includes("jpeg") ? "jpg" : "png",
      modelId: model,
      provider: "openai",
    };
  }
  throw new Error("OpenAI: no image in response");
}
