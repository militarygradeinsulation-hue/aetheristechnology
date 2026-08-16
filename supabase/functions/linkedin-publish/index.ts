import { verifyAdminToken, getAdminTokenFromRequest } from '../_shared/admin-token.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-token',
};

const GATEWAY = 'https://connector-gateway.lovable.dev/linkedin';

function liHeaders() {
  const lovable = Deno.env.get('LOVABLE_API_KEY');
  const li = Deno.env.get('LINKEDIN_API_KEY');
  if (!lovable) throw new Error('LOVABLE_API_KEY missing');
  if (!li) throw new Error('LINKEDIN_API_KEY missing — connect LinkedIn in Connectors');
  return {
    Authorization: `Bearer ${lovable}`,
    'X-Connection-Api-Key': li,
    'Content-Type': 'application/json',
  };
}

async function relay(res: Response, label: string) {
  const body = await res.text();
  console.error(`[linkedin-publish] ${label} ${res.status}: ${body}`);
  return new Response(
    JSON.stringify({ error: `LinkedIn ${label} failed`, status: res.status, details: body }),
    { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const svcKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const ok = await verifyAdminToken(getAdminTokenFromRequest(req), svcKey);
    if (!ok) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action ?? 'publish';

    if (action === 'profile') {
      const res = await fetch(`${GATEWAY}/v2/userinfo`, { headers: liHeaders() });
      if (!res.ok) return relay(res, 'userinfo');
      return new Response(await res.text(), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'publish') {
      const text: string = String(body?.text ?? '').trim();
      const visibility: string = body?.visibility === 'CONNECTIONS' ? 'CONNECTIONS' : 'PUBLIC';
      if (!text) {
        return new Response(JSON.stringify({ error: 'text is required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (text.length > 3000) {
        return new Response(JSON.stringify({ error: 'text exceeds 3000 chars' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const uRes = await fetch(`${GATEWAY}/v2/userinfo`, { headers: liHeaders() });
      if (!uRes.ok) return relay(uRes, 'userinfo');
      const user = await uRes.json();
      const sub = user?.sub;
      if (!sub) {
        return new Response(JSON.stringify({ error: 'No LinkedIn member sub returned', user }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ---- optional image upload ----
      const imageData: string = String(body?.imageBase64 ?? '');
      const imageMime: string = String(body?.imageMime ?? 'image/png');
      const imageAlt: string = String(body?.imageAlt ?? '').slice(0, 200);
      let assetUrn: string | null = null;

      if (imageData) {
        const raw = imageData.includes(',') ? imageData.split(',')[1] : imageData;
        let bytes: Uint8Array;
        try {
          const bin = atob(raw);
          bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        } catch {
          return new Response(JSON.stringify({ error: 'Invalid image data' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (bytes.length > 10 * 1024 * 1024) {
          return new Response(JSON.stringify({ error: 'Image exceeds 10MB' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const regRes = await fetch(`${GATEWAY}/v2/assets?action=registerUpload`, {
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
        if (!regRes.ok) return relay(regRes, 'registerUpload');
        const reg = await regRes.json();
        const mech = reg?.value?.uploadMechanism?.[
          'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
        ];
        const uploadUrl: string | undefined = mech?.uploadUrl;
        assetUrn = reg?.value?.asset ?? null;
        if (!uploadUrl || !assetUrn) {
          return new Response(JSON.stringify({ error: 'registerUpload returned no upload URL', reg }), {
            status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Route the upload through the connector gateway (member token lives there).
        const proxiedUrl = uploadUrl.replace(/^https:\/\/[^/]*linkedin\.com/, GATEWAY);
        const { 'Content-Type': _ct, ...authHeaders } = liHeaders() as Record<string, string>;
        const upRes = await fetch(proxiedUrl, {
          method: 'PUT',
          headers: { ...authHeaders, 'Content-Type': imageMime },
          body: bytes,
        });
        if (!upRes.ok) return relay(upRes, 'imageUpload');
      }

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
                    ...(imageAlt
                      ? { description: { text: imageAlt }, title: { text: imageAlt } }
                      : {}),
                  }],
                }
              : {}),
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': visibility,
        },
      };


      const pRes = await fetch(`${GATEWAY}/v2/ugcPosts`, {
        method: 'POST',
        headers: { ...liHeaders(), 'X-Restli-Protocol-Version': '2.0.0' },
        body: JSON.stringify(payload),
      });
      if (!pRes.ok) return relay(pRes, 'ugcPosts');

      const postId = pRes.headers.get('x-restli-id') || pRes.headers.get('X-RestLi-Id');
      return new Response(JSON.stringify({
        ok: true,
        postId,
        member: { name: user?.name, email: user?.email },
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[linkedin-publish] fatal', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
