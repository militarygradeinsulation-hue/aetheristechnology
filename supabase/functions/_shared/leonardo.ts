// Shared Leonardo AI helper.
// Docs: https://docs.leonardo.ai/reference
//
// Provides:
//   - generateImage({ prompt, width, height, apiKey, modelId? })
//       → returns { url, dataUrl?, generationId, modelId }
//   - animateImage({ imageUrl, apiKey, motionStrength? })
//       → returns { videoUrl, generationId }
//
// Both helpers throw on failure. The caller handles storage + DB.

// Phoenix 1.0 — Leonardo's flagship, best all-around quality.
export const LEONARDO_PHOENIX_MODEL_ID = "de7d3faf-762f-48e0-b3b7-9d0ac3a3fcf3";

const BASE = "https://cloud.leonardo.ai/api/rest/v1";
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 180_000; // 3 min

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface GenerateImageOpts {
  prompt: string;
  apiKey: string;
  width?: number;
  height?: number;
  modelId?: string;
  numImages?: number;
}

export async function generateImage(opts: GenerateImageOpts): Promise<{
  url: string;
  bytes: Uint8Array;
  contentType: string;
  ext: string;
  generationId: string;
  modelId: string;
}> {
  const modelId = opts.modelId || LEONARDO_PHOENIX_MODEL_ID;
  const width = opts.width || 1024;
  const height = opts.height || 1024;

  const createRes = await fetch(`${BASE}/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      prompt: opts.prompt,
      modelId,
      width,
      height,
      num_images: opts.numImages || 1,
      alchemy: true,
      photoReal: false,
      public: false,
    }),
  });

  if (!createRes.ok) {
    const t = await createRes.text();
    throw new Error(`Leonardo generate ${createRes.status}: ${t.slice(0, 400)}`);
  }
  const created = await createRes.json();
  const generationId: string | undefined = created?.sdGenerationJob?.generationId;
  if (!generationId) {
    throw new Error(`Leonardo: no generationId in response: ${JSON.stringify(created).slice(0, 300)}`);
  }

  // Poll for result.
  const started = Date.now();
  let imageUrl: string | undefined;
  while (Date.now() - started < POLL_TIMEOUT_MS) {
    await sleep(POLL_INTERVAL_MS);
    const pollRes = await fetch(`${BASE}/generations/${generationId}`, {
      headers: { Authorization: `Bearer ${opts.apiKey}`, accept: "application/json" },
    });
    if (!pollRes.ok) continue;
    const pollData = await pollRes.json();
    const gen = pollData?.generations_by_pk;
    const status: string | undefined = gen?.status;
    if (status === "COMPLETE") {
      imageUrl = gen?.generated_images?.[0]?.url;
      break;
    }
    if (status === "FAILED") {
      throw new Error(`Leonardo generation FAILED: ${gen?.error || "unknown"}`);
    }
  }

  if (!imageUrl) throw new Error("Leonardo: generation timed out or returned no image");

  // Fetch bytes so the caller can upload to storage.
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error(`Leonardo: failed to download image ${imgRes.status}`);
  const buf = new Uint8Array(await imgRes.arrayBuffer());
  const contentType = imgRes.headers.get("content-type") || "image/jpeg";
  const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";

  return { url: imageUrl, bytes: buf, contentType, ext, generationId, modelId };
}

// Upload an arbitrary image URL to Leonardo as an init image so it can be
// used as the source frame for motion / img2img.
async function uploadInitImage(apiKey: string, imageUrl: string): Promise<string> {
  // 1) Fetch bytes.
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error(`Fetch source image failed: ${imgRes.status}`);
  const contentType = imgRes.headers.get("content-type") || "image/jpeg";
  const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  const bytes = new Uint8Array(await imgRes.arrayBuffer());

  // 2) Ask Leonardo for a presigned upload URL.
  const initRes = await fetch(`${BASE}/init-image`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({ extension: ext }),
  });
  if (!initRes.ok) {
    const t = await initRes.text();
    throw new Error(`Leonardo init-image ${initRes.status}: ${t.slice(0, 300)}`);
  }
  const initData = await initRes.json();
  const upload = initData?.uploadInitImage;
  const imageId: string | undefined = upload?.id;
  const uploadUrl: string | undefined = upload?.url;
  const fieldsRaw = upload?.fields;
  if (!imageId || !uploadUrl || !fieldsRaw) {
    throw new Error(`Leonardo init-image: bad response ${JSON.stringify(initData).slice(0, 300)}`);
  }
  const fields = typeof fieldsRaw === "string" ? JSON.parse(fieldsRaw) : fieldsRaw;

  // 3) Multipart POST to S3.
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, String(v));
  form.append("file", new Blob([bytes as unknown as BlobPart], { type: contentType }), `init.${ext}`);
  const putRes = await fetch(uploadUrl, { method: "POST", body: form });
  if (!putRes.ok && putRes.status !== 204) {
    const t = await putRes.text();
    throw new Error(`Leonardo S3 upload ${putRes.status}: ${t.slice(0, 200)}`);
  }
  return imageId;
}

export async function animateImage(opts: {
  imageUrl: string;
  apiKey: string;
  motionStrength?: number; // 1-10
}): Promise<{ videoUrl: string; generationId: string }> {
  const initImageId = await uploadInitImage(opts.apiKey, opts.imageUrl);

  const createRes = await fetch(`${BASE}/generations-motion-svd`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      imageId: initImageId,
      motionStrength: Math.max(1, Math.min(10, opts.motionStrength ?? 5)),
      isInitImage: true,
      isPublic: false,
    }),
  });
  if (!createRes.ok) {
    const t = await createRes.text();
    throw new Error(`Leonardo motion ${createRes.status}: ${t.slice(0, 400)}`);
  }
  const created = await createRes.json();
  const generationId: string | undefined =
    created?.motionSvdGenerationJob?.generationId || created?.sdGenerationJob?.generationId;
  if (!generationId) {
    throw new Error(`Leonardo motion: no generationId ${JSON.stringify(created).slice(0, 300)}`);
  }

  // Poll — motion jobs take longer.
  const started = Date.now();
  let videoUrl: string | undefined;
  const timeout = 240_000; // 4 min
  while (Date.now() - started < timeout) {
    await sleep(3000);
    const pollRes = await fetch(`${BASE}/generations/${generationId}`, {
      headers: { Authorization: `Bearer ${opts.apiKey}`, accept: "application/json" },
    });
    if (!pollRes.ok) continue;
    const pollData = await pollRes.json();
    const gen = pollData?.generations_by_pk;
    const status: string | undefined = gen?.status;
    if (status === "COMPLETE") {
      // Motion output can appear as motionMP4URL on the image record.
      const img = gen?.generated_images?.[0];
      videoUrl = img?.motionMP4URL || img?.url;
      break;
    }
    if (status === "FAILED") {
      throw new Error(`Leonardo motion FAILED: ${gen?.error || "unknown"}`);
    }
  }
  if (!videoUrl) throw new Error("Leonardo motion: timed out or returned no video");
  return { videoUrl, generationId };
}
