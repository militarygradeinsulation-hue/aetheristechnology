import { verifyAdminToken, getAdminTokenFromRequest } from '../_shared/admin-token.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-token',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

function admin() {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function aiDraft(input: {
  post_context: string;
  post_author?: string;
  tone?: string;
  variants?: number;
}): Promise<string[]> {
  const key = Deno.env.get('LOVABLE_API_KEY');
  if (!key) throw new Error('LOVABLE_API_KEY missing');
  const n = Math.min(Math.max(input.variants ?? 3, 1), 5);
  const tone = input.tone || 'forensic-operator';

  const sys = `You are Joseph Toney, founder of Aetheris Technology — a "Business Forensics Operator".
Voice: blunt, forensic, non-corporate. Operator > consultant. Use short sentences.
Write LinkedIn comment replies (NOT posts). Each reply:
- 1 to 4 sentences, under 500 characters
- No hashtags, no emojis, no "Great post!", no LinkedIn cringe
- Add a real observation, contrarian angle, or specific number/example
- Never sound like AI. Never say "As an operator" or "In my experience"
Return ONLY a JSON array of ${n} distinct reply strings. No prose, no keys.`;

  const user = `POST AUTHOR: ${input.post_author || 'unknown'}
TONE: ${tone}
POST / CONTEXT:
"""
${input.post_context}
"""
Return ${n} reply variants as a JSON array of strings.`;

  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'X-Lovable-AIG-SDK': 'raw',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
      temperature: 0.8,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI ${res.status}: ${t}`);
  }
  const data = await res.json();
  const raw: string = data?.choices?.[0]?.message?.content ?? '';
  const cleaned = raw.replace(/^```(?:json)?/i, '').replace(/```$/,'').trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean).slice(0, n);
  } catch { /* fall through */ }
  // Fallback: split by lines
  return cleaned.split(/\n+/).map((s) => s.replace(/^[-*\d.\s"]+|["]+$/g, '').trim()).filter(Boolean).slice(0, n);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const svcKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const ok = await verifyAdminToken(getAdminTokenFromRequest(req), svcKey);
    if (!ok) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const action = body?.action ?? 'list';
    const sb = admin();

    if (action === 'list') {
      const status = body?.status as string | undefined;
      let q = sb.from('linkedin_comment_drafts').select('*').order('created_at', { ascending: false }).limit(200);
      if (status && status !== 'all') q = q.eq('status', status);
      const { data, error } = await q;
      if (error) return json({ error: error.message }, 500);
      return json({ drafts: data ?? [] });
    }

    if (action === 'create') {
      const draft_text = String(body?.draft_text ?? '').trim();
      if (!draft_text) return json({ error: 'draft_text is required' }, 400);
      const row = {
        post_url: body?.post_url ?? null,
        post_author: body?.post_author ?? null,
        post_context: body?.post_context ?? null,
        draft_text,
        tone: body?.tone ?? null,
        notes: body?.notes ?? null,
        status: 'draft',
      };
      const { data, error } = await sb.from('linkedin_comment_drafts').insert(row).select('*').single();
      if (error) return json({ error: error.message }, 500);
      return json({ draft: data });
    }

    if (action === 'update') {
      const id = String(body?.id ?? '');
      if (!id) return json({ error: 'id required' }, 400);
      const patch: Record<string, unknown> = {};
      for (const k of ['post_url','post_author','post_context','draft_text','tone','notes','status']) {
        if (k in body) patch[k] = body[k];
      }
      if (patch.status === 'posted' && !('posted_at' in patch)) {
        patch.posted_at = new Date().toISOString();
      }
      const { data, error } = await sb.from('linkedin_comment_drafts').update(patch).eq('id', id).select('*').single();
      if (error) return json({ error: error.message }, 500);
      return json({ draft: data });
    }

    if (action === 'delete') {
      const id = String(body?.id ?? '');
      if (!id) return json({ error: 'id required' }, 400);
      const { error } = await sb.from('linkedin_comment_drafts').delete().eq('id', id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (action === 'generate') {
      const post_context = String(body?.post_context ?? '').trim();
      if (!post_context) return json({ error: 'post_context is required' }, 400);
      const variants = await aiDraft({
        post_context,
        post_author: body?.post_author,
        tone: body?.tone,
        variants: body?.variants,
      });
      return json({ variants });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (e) {
    console.error('[linkedin-comments] fatal', e);
    return json({ error: (e as Error).message }, 500);
  }
});
