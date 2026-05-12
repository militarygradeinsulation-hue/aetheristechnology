import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Newspaper, Loader2, ArrowLeft, RefreshCw, Search, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { listNews, getNews, incrementNewsView, type NewsPost } from '@/lib/newsFeed';
import { useToast } from '@/hooks/use-toast';

/**
 * Live in-portal Aetheris News reader.
 * Lists every published dispatch and opens it inline — no leaving the portal.
 */
export const NewsFeedPanel: React.FC = () => {
  const { toast } = useToast();
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [active, setActive] = useState<NewsPost | null>(null);
  const [filter, setFilter] = useState('');

  const load = async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const data = await listNews(100);
      setPosts(data);
    } catch (e) {
      toast({ title: 'Could not load news', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false); setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  // light auto-refresh every 60s while panel is mounted
  useEffect(() => {
    const id = window.setInterval(() => load(true), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const open = async (slug: string) => {
    try {
      const post = await getNews(slug);
      setActive(post);
      incrementNewsView(slug);
    } catch (e) {
      toast({ title: 'Could not open dispatch', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const filtered = posts.filter(p => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      p.title.toLowerCase().includes(q)
      || (p.summary || '').toLowerCase().includes(q)
      || (p.category || '').toLowerCase().includes(q)
      || (p.tags || []).some(t => t.toLowerCase().includes(q))
    );
  });

  if (active) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setActive(null)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to all dispatches
        </Button>
        <Card className="border-amber/30 bg-card/60">
          {active.cover_image_url && (
            <img src={active.cover_image_url} alt={active.title} className="w-full h-56 object-cover rounded-t-lg" />
          )}
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {active.category && (
                <Badge variant="outline" className="font-mono text-[10px] uppercase border-amber/40 text-amber">
                  {active.category}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground font-mono">
                {active.published_at ? format(new Date(active.published_at), 'MMM d, yyyy') : format(new Date(active.created_at), 'MMM d, yyyy')}
              </span>
              <span className="text-xs text-muted-foreground font-mono">· {active.author_name}</span>
              <span className="text-xs text-muted-foreground font-mono inline-flex items-center gap-1"><Eye className="w-3 h-3" /> {active.view_count}</span>
            </div>
            <CardTitle className="font-display text-2xl leading-tight">{active.title}</CardTitle>
            {active.summary && <p className="text-muted-foreground mt-1">{active.summary}</p>}
          </CardHeader>
          <CardContent>
            <div className="prose prose-invert prose-sm max-w-none whitespace-pre-line text-foreground/90 leading-relaxed">
              {active.body}
            </div>
            {active.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-6">
                {active.tags.map(t => (
                  <Badge key={t} variant="outline" className="text-[10px] uppercase border-border">{t}</Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="glass p-4 rounded-xl flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Newspaper className="w-5 h-5 text-amber" />
          <div>
            <h2 className="text-lg font-bold text-foreground font-display leading-tight">Aetheris News — Live Feed</h2>
            <p className="text-xs text-muted-foreground">Operator dispatches, case files, and field notes. Updates auto-refresh every minute.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search dispatches…" className="h-9 w-64 pl-8" />
          </div>
          <Button variant="outline" size="sm" onClick={() => load()} disabled={refreshing}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-border bg-card/30 p-10 text-center text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" /> Loading dispatches…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card/30 p-10 text-center text-sm text-muted-foreground">
          {posts.length === 0 ? 'No dispatches published yet.' : 'No dispatches match your search.'}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => open(p.slug)}
              className="text-left rounded-xl border border-border/50 bg-card/40 hover:border-amber/40 hover:bg-amber/5 transition-colors overflow-hidden group"
            >
              {p.cover_image_url && (
                <img src={p.cover_image_url} alt={p.title} className="w-full h-32 object-cover" />
              )}
              <div className="p-4">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  {p.category && (
                    <Badge variant="outline" className="font-mono text-[10px] uppercase border-amber/40 text-amber">
                      {p.category}
                    </Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {p.published_at ? format(new Date(p.published_at), 'MMM d, yyyy') : format(new Date(p.created_at), 'MMM d, yyyy')}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono inline-flex items-center gap-1"><Eye className="w-3 h-3" /> {p.view_count}</span>
                </div>
                <div className="font-display font-semibold text-foreground group-hover:text-amber transition-colors">{p.title}</div>
                {p.summary && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{p.summary}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default NewsFeedPanel;
