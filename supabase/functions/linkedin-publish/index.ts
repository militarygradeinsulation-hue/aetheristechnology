import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';
import { verifyAdminToken, getAdminTokenFromRequest } from '../_shared/admin-token.ts';
import {
  LI_GATEWAY, liHeaders, publishPost, addComment, deletePost, updatePostText, LinkedInError,
} from '../_shared/linkedin.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-token',
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function fail(e: unknown) {
  if (e instanceof LinkedInError) {
    return json({ error: `LinkedIn ${e.label} failed`, status: e.status, details: e.details }, e.status);
  }
  console.error('[linkedin-publish]', e);
  return json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const svcKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const ok = await verifyAdminToken(getAdminTokenFromRequest(req), svcKey);
    if (!ok) return json({ error: 'Unauthorized' }, 401);

    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', svcKey);
    const body = await req.json().catch(() => ({}));
    const action = body?.action ?? 'publish';

    // ---------------- profile ----------------
    if (action === 'profile') {
      const res = await fetch(`${LI_GATEWAY}/v2/userinfo`, { headers: liHeaders() });
      if (!res.ok) {
        const details = await res.text();
        return json({ error: 'LinkedIn userinfo failed', status: res.status, details }, res.status);
      }
      return new Response(await res.text(), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---------------- history ----------------
    if (action === 'history') {
      const limit = Math.min(Math.max(parseInt(body?.limit) || 50, 1), 200);
      const { data, error } = await supabase
        .from('linkedin_publications')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return json({ history: data ?? [] });
    }

    // ---------------- publish ----------------
    if (action === 'publish') {
      const text = String(body?.text ?? '').trim();
      const visibility = body?.visibility === 'CONNECTIONS' ? 'CONNECTIONS' : 'PUBLIC';
      const autoComment = String(body?.autoComment ?? '').trim();
      const contentPostId: string | null = body?.contentPostId ?? null;

      const { postUrn, sub } = await publishPost({
        text,
        visibility,
        imageBase64: body?.imageBase64 ?? null,
        imageMime: body?.imageMime ?? null,
        imageUrl: body?.imageUrl ?? null,
        imageAlt: body?.imageAlt ?? null,
      });

      let commentUrn: string | null = null;
      let commentStatus: string | null = null;
      if (autoComment) {
        try {
          commentUrn = await addComment(postUrn, sub, autoComment);
          commentStatus = 'posted';
        } catch (e) {
          commentStatus = 'failed';
          console.error('[linkedin-publish] auto-comment failed', e);
        }
      }

      await supabase.from('linkedin_publications').upsert({
        post_urn: postUrn,
        content_post_id: contentPostId,
        text,
        visibility,
        image_url: body?.imageUrl ?? null,
        auto_comment: autoComment || null,
        auto_comment_urn: commentUrn,
        auto_comment_status: commentStatus,
        source: contentPostId ? 'calendar' : 'manual',
        status: 'published',
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'post_urn' });

      if (contentPostId) {
        await supabase.from('content_engine_posts').update({
          status: 'posted',
          linkedin_status: 'published',
          linkedin_post_urn: postUrn,
          linkedin_published_at: new Date().toISOString(),
          linkedin_error: null,
        }).eq('id', contentPostId);
      }

      return json({ postId: postUrn, commentStatus });
    }

    // ---------------- edit a live post ----------------
    if (action === 'update') {
      const postUrn = String(body?.postUrn ?? '').trim();
      const text = String(body?.text ?? '').trim();
      if (!postUrn) return json({ error: 'postUrn required' }, 400);
      if (!text) return json({ error: 'text required' }, 400);
      if (text.length > 3000) return json({ error: 'text exceeds 3000 chars' }, 400);

      await updatePostText(postUrn, text);
      await supabase.from('linkedin_publications')
        .update({ text, edited_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('post_urn', postUrn);
      return json({ success: true });
    }

    // ---------------- delete a live post ----------------
    if (action === 'delete') {
      const postUrn = String(body?.postUrn ?? '').trim();
      if (!postUrn) return json({ error: 'postUrn required' }, 400);

      await deletePost(postUrn);
      await supabase.from('linkedin_publications')
        .update({ status: 'deleted', deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('post_urn', postUrn);
      await supabase.from('content_engine_posts')
        .update({ linkedin_status: 'deleted', linkedin_post_urn: null })
        .eq('linkedin_post_urn', postUrn);
      return json({ success: true });
    }

    // ---------------- remove a history row only ----------------
    if (action === 'forget') {
      const id = String(body?.id ?? '');
      if (!id) return json({ error: 'id required' }, 400);
      const { error } = await supabase.from('linkedin_publications').delete().eq('id', id);
      if (error) throw error;
      return json({ success: true });
    }

    // ---------------- comment on an existing post ----------------
    if (action === 'comment') {
      const postUrn = String(body?.postUrn ?? '').trim();
      const message = String(body?.message ?? '').trim();
      if (!postUrn || !message) return json({ error: 'postUrn and message required' }, 400);
      const uRes = await fetch(`${LI_GATEWAY}/v2/userinfo`, { headers: liHeaders() });
      if (!uRes.ok) return json({ error: 'LinkedIn userinfo failed', details: await uRes.text() }, uRes.status);
      const sub = (await uRes.json())?.sub;
      const commentUrn = await addComment(postUrn, sub, message);
      await supabase.from('linkedin_publications')
        .update({ auto_comment: message, auto_comment_urn: commentUrn, auto_comment_status: 'posted', updated_at: new Date().toISOString() })
        .eq('post_urn', postUrn);
      return json({ success: true, commentUrn });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (e) {
    return fail(e);
  }
});
