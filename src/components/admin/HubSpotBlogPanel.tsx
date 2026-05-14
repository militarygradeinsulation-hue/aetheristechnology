import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, RefreshCw, FileUp, ExternalLink, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getAdminToken } from '@/lib/adminAuth';
import { toast } from '@/hooks/use-toast';
import { HubSpotBlogPushButton } from './HubSpotBlogPushButton';

interface BlogRow {
  id: string;
  title: string;
  slug?: string | null;
  excerpt?: string | null;
  content: string | null;
  is_published: boolean;
  published_at: string | null;
}

interface ScheduledPost {
  id: string;
  name: string;
  url?: string;
  publishDate?: number;
  state?: string;
}

export const HubSpotBlogPanel: React.FC = () => {
  const [blogs, setBlogs] = useState<BlogRow[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduledLoading, setScheduledLoading] = useState(false);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, content, is_published, published_at')
        .order('published_at', { ascending: false, nullsFirst: false })
        .limit(100);
      if (error) throw error;
      setBlogs((data || []) as BlogRow[]);
    } catch (e) {
      toast({ title: 'Failed to load blogs', description: e instanceof Error ? e.message : 'Unknown', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadScheduled = async () => {
    setScheduledLoading(true);
    try {
      const token = getAdminToken();
      const { data, error } = await supabase.functions.invoke('hubspot-blog-publish', {
        body: { action: 'list-scheduled' },
        headers: { 'x-admin-token': token! },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      setScheduled(data.posts || []);
    } catch (e) {
      toast({ title: 'Could not load HubSpot scheduled posts', description: e instanceof Error ? e.message : 'Unknown', variant: 'destructive' });
    } finally {
      setScheduledLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = blogs.filter(b => !search || b.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <FileUp className="w-6 h-6 text-amber" />
          <h2 className="text-2xl font-bold text-foreground font-display">HubSpot Blog Publisher</h2>
          <span className="text-xs text-muted-foreground ml-2">Push your local blog posts to HubSpot CMS — schedule or publish now.</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadScheduled} disabled={scheduledLoading}>
            {scheduledLoading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1.5" />}
            Sync HubSpot Scheduled
          </Button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      {scheduled.length > 0 && (
        <div className="glass rounded-xl p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Currently scheduled on HubSpot ({scheduled.length})</div>
          <div className="space-y-1">
            {scheduled.map(p => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{p.name}</span>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {p.publishDate && <span>{new Date(p.publishDate).toLocaleString()}</span>}
                  {p.url && <a href={p.url} target="_blank" rel="noreferrer" className="text-amber hover:underline inline-flex items-center"><ExternalLink className="w-3 h-3 mr-1" />open</a>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search blog posts…" />

      {loading ? (
        <div className="glass rounded-xl p-12 text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Loading blogs…</div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center text-muted-foreground">No blog posts found.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(b => (
            <div key={b.id} className="glass rounded-xl p-4 flex items-start gap-4">
              <FileText className="w-5 h-5 text-amber mt-1" />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-foreground">{b.title}</div>
                {b.excerpt && <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{b.excerpt}</div>}
                <div className="text-[10px] text-muted-foreground mt-1">
                  {b.is_published ? 'Published' : 'Draft'}
                  {b.published_at && ` · ${new Date(b.published_at).toLocaleDateString()}`}
                </div>
              </div>
              <HubSpotBlogPushButton
                title={b.title}
                body={b.content || b.excerpt || ''}
                metaDescription={b.excerpt || ''}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
