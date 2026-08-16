// Shared LinkedIn helpers — used by linkedin-publish (admin) and linkedin-scheduler (cron).
// All calls route through the Lovable connector gateway.

export const LI_GATEWAY = 'https://connector-gateway.lovable.dev/linkedin';

export function liHeaders(): Record<string, string> {
  const lovable = Deno.env.get('LOVABLE_API_KEY');
  const li = Deno.env.get('LINKEDIN_API_KEY');
  if (!lovable) throw new Error('LOVABLE_API_KEY missing');
  if (!li) throw new Error('LINKEDIN_API_KEY missing — connect LinkedIn in Connectors');
  return {
    Authorization: `Bearer ${lovable}`,
    'X-Connection-Api-Key': li,
    'Content-Type': 'application/json',
    'X-Restli-Protocol-Version': '2.0.0',
  };
}

export class LinkedInError extends Error {
  status: number;
  details: string;
  label: string;
  constructor(label: string, status: number, details: string) {
    super(`LinkedIn ${label} failed [${status}]: ${details.slice(0, 500)}`);
    this.label = label;
    this.status = status;
    this.details = details;
  }
}

async function ensureOk(res: Response, label: string) {
  if (!res.ok) {
    const body = await res.text();
    console.error(`[linkedin] ${label} ${res.status}: ${body}`);
    throw new LinkedInError(label, res.status, body);
  }
  return res;
}

export async function getMemberSub(): Promise<string> {
  const res = await fetch(`${LI_GATEWAY}/v2/userinfo`, { headers: liHeaders() });
  await ensureOk(res, 'userinfo');
  const user = await res.json();
  if (!user?.sub) throw new LinkedInError('userinfo', 500, 'No member sub returned');
  return user.sub as string;
}

export function base64ToBytes(input: string): Uint8Array {
  const raw = input.includes(',') ? input.split(',')[1] : input;
  const bin = atob(raw);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export async function fetchImageBytes(url: string): Promise<{ bytes: Uint8Array; mime: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new LinkedInError('imageFetch', res.status, await res.text());
  const mime = res.headers.get('content-type') || 'image/png';
  const buf = new Uint8Array(await res.arrayBuffer());
  return { bytes: buf, mime };
}

export async function uploadImage(sub: string, bytes: Uint8Array, mime: string): Promise<string> {
  const regRes = await fetch(`${LI_GATEWAY}/v2/assets?action=registerUpload`, {
    method: 'POST',
    headers: liHeaders(),
    body: JSON.stringify({
      registerUploadRequest: {
        owner: `urn:li:person:${sub}`,
        recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
        serviceRelationships: [{
          relationshipType: 'OWNER',
          identifier: 'urn:li:userGeneratedContent',
        }],
        supportedUploadMechanism: ['SYNCHRONOUS_UPLOAD'],
      },
    }),
  });
  await ensureOk(regRes, 'registerUpload');
  const reg = await regRes.json();
  const mech = reg?.value?.uploadMechanism?.[
    'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
  ];
  const uploadUrl: string | undefined = mech?.uploadUrl;
  const assetUrn: string | undefined = reg?.value?.asset;
  if (!uploadUrl || !assetUrn) {
    throw new LinkedInError('registerUpload', 502, JSON.stringify(reg).slice(0, 500));
  }

  const { 'Content-Type': _ct, ...authHeaders } = liHeaders();
  const proxiedUrl = uploadUrl.replace(/^https:\/\/[^/]*linkedin\.com/, LI_GATEWAY);

  // The signed upload URL is served by LinkedIn's media host, which the connector
  // gateway does not always allow for binary PUTs (nginx 405). Try the known-good
  // variants in order and keep the first one that succeeds.
  const attempts: Array<{ label: string; url: string; method: string; headers: Record<string, string> }> = [
    { label: 'gateway-put', url: proxiedUrl, method: 'PUT', headers: { ...authHeaders, 'Content-Type': mime } },
    { label: 'gateway-post', url: proxiedUrl, method: 'POST', headers: { ...authHeaders, 'Content-Type': mime } },
    { label: 'direct-put', url: uploadUrl, method: 'PUT', headers: { 'Content-Type': mime } },
    { label: 'direct-post', url: uploadUrl, method: 'POST', headers: { 'Content-Type': mime } },
  ];

  const failures: string[] = [];
  for (const attempt of attempts) {
    try {
      const upRes = await fetch(attempt.url, {
        method: attempt.method,
        headers: attempt.headers,
        body: bytes,
      });
      if (upRes.ok) {
        console.log(`[linkedin] imageUpload succeeded via ${attempt.label}`);
        return assetUrn;
      }
      const body = await upRes.text();
      failures.push(`${attempt.label} ${upRes.status}: ${body.slice(0, 200)}`);
    } catch (e) {
      failures.push(`${attempt.label} threw: ${(e as Error).message}`);
    }
  }

  console.error(`[linkedin] imageUpload all attempts failed: ${failures.join(' | ')}`);
  throw new LinkedInError('imageUpload', 502, failures.join(' | '));
}


export type PublishInput = {
  text: string;
  visibility?: 'PUBLIC' | 'CONNECTIONS';
  imageBase64?: string | null;
  imageMime?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
};

export async function publishPost(input: PublishInput): Promise<{ postUrn: string; sub: string }> {
  const text = (input.text || '').trim();
  if (!text) throw new LinkedInError('publish', 400, 'text is required');
  if (text.length > 3000) throw new LinkedInError('publish', 400, 'text exceeds 3000 chars');
  const visibility = input.visibility === 'CONNECTIONS' ? 'CONNECTIONS' : 'PUBLIC';

  const sub = await getMemberSub();

  let assetUrn: string | null = null;
  if (input.imageBase64) {
    const bytes = base64ToBytes(input.imageBase64);
    if (bytes.length > 10 * 1024 * 1024) throw new LinkedInError('publish', 400, 'Image exceeds 10MB');
    assetUrn = await uploadImage(sub, bytes, input.imageMime || 'image/png');
  } else if (input.imageUrl) {
    const { bytes, mime } = await fetchImageBytes(input.imageUrl);
    assetUrn = await uploadImage(sub, bytes, mime);
  }

  const alt = (input.imageAlt || '').slice(0, 200);
  const payload = {
    author: `urn:li:person:${sub}`,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text },
        shareMediaCategory: assetUrn ? 'IMAGE' : 'NONE',
        ...(assetUrn
          ? {
              media: [{
                status: 'READY',
                media: assetUrn,
                ...(alt ? { description: { text: alt }, title: { text: alt } } : {}),
              }],
            }
          : {}),
      },
    },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': visibility },
  };

  const res = await fetch(`${LI_GATEWAY}/v2/ugcPosts`, {
    method: 'POST',
    headers: liHeaders(),
    body: JSON.stringify(payload),
  });
  await ensureOk(res, 'ugcPosts');
  const created = await res.json().catch(() => ({}));
  const postUrn = created?.id || res.headers.get('x-restli-id') || '';
  if (!postUrn) throw new LinkedInError('ugcPosts', 502, 'No post id returned');
  return { postUrn, sub };
}

export async function addComment(postUrn: string, sub: string, message: string): Promise<string> {
  const res = await fetch(`${LI_GATEWAY}/v2/socialActions/${encodeURIComponent(postUrn)}/comments`, {
    method: 'POST',
    headers: liHeaders(),
    body: JSON.stringify({
      actor: `urn:li:person:${sub}`,
      object: postUrn,
      message: { text: message.slice(0, 1250) },
    }),
  });
  await ensureOk(res, 'comment');
  const created = await res.json().catch(() => ({}));
  return created?.id || 'comment';
}

export async function deletePost(postUrn: string): Promise<void> {
  const res = await fetch(`${LI_GATEWAY}/v2/ugcPosts/${encodeURIComponent(postUrn)}`, {
    method: 'DELETE',
    headers: liHeaders(),
  });
  await ensureOk(res, 'deletePost');
}

export async function updatePostText(postUrn: string, text: string): Promise<void> {
  const res = await fetch(`${LI_GATEWAY}/v2/ugcPosts/${encodeURIComponent(postUrn)}`, {
    method: 'POST',
    headers: { ...liHeaders(), 'X-RESTLI-METHOD': 'PARTIAL_UPDATE' },
    body: JSON.stringify({
      patch: {
        $set: {
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: { text: text.trim() },
            },
          },
        },
      },
    }),
  });
  await ensureOk(res, 'updatePost');
}
