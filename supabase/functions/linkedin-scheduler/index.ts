// Cron worker — publishes approved, scheduled Content Engine posts to LinkedIn
// at their scheduled time, then fires the auto-comment.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';
import { publishPost, addComment, LinkedInError } from '../_shared/linkedin.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-token',
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const svcKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', svcKey);
  const nowIso = new Date().toISOString();

  try {
    const { data: due, error } = await supabase
      .from('content_engine_posts')
      .select('*')
      .eq('linkedin_enabled', true)
      .eq('linkedin_status', 'queued')
      .lte('linkedin_scheduled_at', nowIso)
      .order('linkedin_scheduled_at', { ascending: true })
      .limit(5);
    if (error) throw error;

    const results: Array<Record<string, unknown>> = [];

    for (const post of due ?? []) {
      // Claim the row so a concurrent run can't double-post.
      const { data: claimed } = await supabase
        .from('content_engine_posts')
        .update({ linkedin_status: 'publishing' })
        .eq('id', post.id)
        .eq('linkedin_status', 'queued')
        .select('id')
        .maybeSingle();
      if (!claimed) continue;

      const text = [post.caption, (post.hashtags || []).map((h: string) => `#${h}`).join(' ')]
        .filter(Boolean).join('\n\n').slice(0, 3000);

      try {
        const { postUrn, sub } = await publishPost({
          text,
          visibility: post.linkedin_visibility === 'CONNECTIONS' ? 'CONNECTIONS' : 'PUBLIC',
          imageUrl: post.thumbnail_url || null,
          imageAlt: post.hook || null,
        });

        let commentUrn: string | null = null;
        let commentStatus: string | null = null;
        if (post.auto_comment?.trim()) {
          try {
            commentUrn = await addComment(postUrn, sub, post.auto_comment.trim());
            commentStatus = 'posted';
          } catch (e) {
            commentStatus = 'failed';
            console.error('[linkedin-scheduler] comment failed', e);
          }
        }

        await supabase.from('linkedin_publications').upsert({
          post_urn: postUrn,
          content_post_id: post.id,
          text,
          visibility: post.linkedin_visibility || 'PUBLIC',
          image_url: post.thumbnail_url || null,
          auto_comment: post.auto_comment || null,
          auto_comment_urn: commentUrn,
          auto_comment_status: commentStatus,
          source: 'calendar',
          status: 'published',
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'post_urn' });

        await supabase.from('content_engine_posts').update({
          status: 'posted',
          linkedin_status: 'published',
          linkedin_post_urn: postUrn,
          linkedin_published_at: new Date().toISOString(),
          linkedin_error: null,
        }).eq('id', post.id);

        results.push({ id: post.id, postUrn, commentStatus });
      } catch (e) {
        const details = e instanceof LinkedInError
          ? `${e.label} ${e.status}: ${e.details.slice(0, 300)}`
          : (e as Error).message;
        console.error('[linkedin-scheduler] publish failed', post.id, details);
        await supabase.from('content_engine_posts').update({
          linkedin_status: 'failed',
          linkedin_error: details,
        }).eq('id', post.id);
        results.push({ id: post.id, error: details });
      }
    }

    return json({ processed: results.length, results });
  } catch (e) {
    console.error('[linkedin-scheduler]', e);
    return json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});
