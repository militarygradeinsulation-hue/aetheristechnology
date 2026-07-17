import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { verifyAdminToken, getAdminTokenFromRequest } from '../_shared/admin-auth.ts';

const GATEWAY = 'https://connector-gateway.lovable.dev/linkedin';

function headers() {
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
    // Admin auth
    const token = getAdminTokenFromRequest(req);
    if (!token || !(await verifyAdminToken(token))) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action ?? 'publish';

    if (action === 'profile') {
      const res = await fetch(`${GATEWAY}/v2/userinfo`, { headers: headers() });
      if (!res.ok) return relay(res, 'userinfo');
      const data = await res.json();
      return new Response(JSON.stringify(data), {
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

      // 1) Get member sub
      const uRes = await fetch(`${GATEWAY}/v2/userinfo`, { headers: headers() });
      if (!uRes.ok) return relay(uRes, 'userinfo');
      const user = await uRes.json();
      const sub = user?.sub;
      if (!sub) {
        return new Response(JSON.stringify({ error: 'No LinkedIn member sub returned', user }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // 2) Publish UGC post (text-only)
      const author = `urn:li:person:${sub}`;
      const payload = {
        author,
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
        headers: { ...headers(), 'X-Restli-Protocol-Version': '2.0.0' },
        body: JSON.stringify(payload),
      });
      if (!pRes.ok) return relay(pRes, 'ugcPosts');

      const postId = pRes.headers.get('x-restli-id') || pRes.headers.get('X-RestLi-Id');
      const respBody = await pRes.text();
      return new Response(JSON.stringify({ ok: true, postId, response: respBody }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
