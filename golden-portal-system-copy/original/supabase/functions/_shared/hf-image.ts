// Shared Hugging Face image-generation helper (FLUX.1-dev via the HF Inference router).
//
// Mirrors the shape of ../_shared/leonardo.ts `generateImage` so callers can swap
// providers without changing storage/DB code.
//
// Equivalent of:
//   client = InferenceClient(provider="fal-ai", api_key=HF_TOKEN)
//   client.text_to_image(prompt, model="black-forest-labs/FLUX.1-dev")

export const HF_FLUX_DEV_MODEL = "black-forest-labs/FLUX.1-dev";

const ROUTER = "https://router.huggingface.co";

interface HfGenerateOpts {
  prompt: string;
  apiKey: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  model?: string;
}

interface HfGenerateResult {
  bytes: Uint8Array;
  contentType: string;
  ext: string;
  modelId: string;
  provider: string;
}

const extFor = (contentType: string) =>
  contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";

// fal image_size preset closest to the requested dimensions.
function falImageSize(width: number, height: number): string {
  if (width === height) return "square_hd";
  return height > width ? "portrait_4_3" : "landscape_4_3";
}

async function bytesFromUrl(url: string): Promise<{ bytes: Uint8Array; contentType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HF: failed to download image ${res.status}`);
  return {
    bytes: new Uint8Array(await res.arrayBuffer()),
    contentType: res.headers.get("content-type") || "image/jpeg",
  };
}

function b64ToBytes(b64: string): Uint8Array {
  const clean = b64.includes(",") ? b64.split(",").pop()! : b64;
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// Normalises any of the shapes the router can return (raw bytes, fal JSON with
// an image url, or an OpenAI-style base64 payload) into raw bytes.
async function readImageResponse(res: Response): Promise<{ bytes: Uint8Array; contentType: string }> {
  const ct = res.headers.get("content-type") || "";
  if (ct.startsWith("image/")) {
    return { bytes: new Uint8Array(await res.arrayBuffer()), contentType: ct };
  }
  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`HF: unexpected response (${ct}): ${text.slice(0, 200)}`);
  }
  const first = data?.images?.[0] ?? data?.data?.[0] ?? data?.image ?? data;
  const url: string | undefined = typeof first === "string" ? undefined : first?.url;
  const b64: string | undefined =
    typeof first === "string" ? first : first?.b64_json ?? first?.image_base64 ?? first?.content;
  if (url) return await bytesFromUrl(url);
  if (b64) return { bytes: b64ToBytes(b64), contentType: "image/png" };
  throw new Error(`HF: no image in response: ${text.slice(0, 200)}`);
}

export async function generateImage(opts: HfGenerateOpts): Promise<HfGenerateResult> {
  const model = opts.model || HF_FLUX_DEV_MODEL;
  const width = opts.width || 1024;
  const height = opts.height || 1024;
  const prompt = opts.prompt.slice(0, 1800);

  // Try fal-ai first (fast, matches the reference snippet), then fall back to
  // HF's own inference endpoint for the same model.
  const attempts: { name: string; url: string; body: unknown }[] = [
    {
      name: "fal-ai",
      url: `${ROUTER}/fal-ai/fal-ai/flux/dev`,
      body: {
        prompt,
        image_size: falImageSize(width, height),
        num_images: 1,
        sync_mode: true,
        enable_safety_checker: false,
        ...(opts.negativePrompt ? { negative_prompt: opts.negativePrompt.slice(0, 400) } : {}),
      },
    },
    {
      name: "hf-inference",
      url: `${ROUTER}/hf-inference/models/${model}`,
      body: {
        inputs: prompt,
        parameters: {
          width,
          height,
          ...(opts.negativePrompt ? { negative_prompt: opts.negativePrompt.slice(0, 400) } : {}),
        },
      },
    },
  ];

  const errors: string[] = [];

  for (const attempt of attempts) {
    // The router returns 503 while a cold model loads — retry a bounded number of times.
    for (let tryIdx = 0; tryIdx < 3; tryIdx++) {
      let res: Response;
      try {
        res = await fetch(attempt.url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${opts.apiKey}`,
            "Content-Type": "application/json",
            Accept: "image/png, application/json",
          },
          body: JSON.stringify(attempt.body),
        });
      } catch (e) {
        errors.push(`${attempt.name}: network ${e instanceof Error ? e.message : "error"}`);
        break;
      }

      if (res.status === 503 || res.status === 429) {
        await new Promise((r) => setTimeout(r, 4000 * (tryIdx + 1)));
        if (tryIdx === 2) errors.push(`${attempt.name}: ${res.status} after retries`);
        continue;
      }

      if (!res.ok) {
        const t = await res.text();
        errors.push(`${attempt.name}: ${res.status} ${t.slice(0, 200)}`);
        break;
      }

      try {
        const { bytes, contentType } = await readImageResponse(res);
        if (!bytes.length) throw new Error("empty image body");
        return {
          bytes,
          contentType,
          ext: extFor(contentType),
          modelId: model,
          provider: `huggingface:${attempt.name}`,
        };
      } catch (e) {
        errors.push(`${attempt.name}: ${e instanceof Error ? e.message : "parse error"}`);
        break;
      }
    }
  }

  throw new Error(`Hugging Face image generation failed — ${errors.join(" | ")}`);
}
