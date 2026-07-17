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

      const payload = {
        author: `urn:li:person:${sub}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text },
            shareMediaCategory: 'NONE',
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
