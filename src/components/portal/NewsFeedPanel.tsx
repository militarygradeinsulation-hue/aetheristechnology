import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Newspaper, Loader2, ArrowLeft, RefreshCw, ExternalLink, X, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { listNews, type NewsPost } from '@/lib/newsFeed';
import { useToast } from '@/hooks/use-toast';

interface IndustryItem {
  id: string;
  source: string;
  source_label: string;
  category: string;
  title: string;
  link: string;
  summary: string | null;
  image_url: string | null;
  author: string | null;
  published_at: string | null;
}

const CATEGORIES: { id: string; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'ai', label: 'AI' },
  { id: 'business', label: 'Business' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'sales', label: 'Sales' },
  { id: 'security', label: 'Cybersecurity' },
  { id: 'finance', label: 'Finance' },
  { id: 'healthcare', label: 'Healthcare' },
  { id: 'manufacturing', label: 'Manufacturing' },
  { id: 'construction', label: 'Construction' },
  { id: 'logistics', label: 'Logistics' },
];

const FALLBACK = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&q=70&auto=format&fit=crop';

const fnUrl = () => `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/industry-news`;

export const NewsFeedPanel: React.FC = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<IndustryItem[]>([]);
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState('all');
  const [filter, setFilter] = useState('');
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);
  const [active, setActive] = useState<IndustryItem | null>(null);
  const [articleBlocks, setArticleBlocks] = useState<{ tag: string; text: string }[] | null>(null);
  const [articleHero, setArticleHero] = useState<string | null>(null);
  const [articleLoading, setArticleLoading] = useState(false);
  const [articleError, setArticleError] = useState<string | null>(null);
  const [take, setTake] = useState<string | null>(null);
  const [takeLoading, setTakeLoading] = useState(false);

  const fetchIndustry = async (cat: string) => {
    const r = await fetch(fnUrl(), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list', category: cat, limit: 80 }),
    });
    if (!r.ok) throw new Error(`status ${r.status}`);
    const j = await r.json();
    setItems(j.items || []);
    setLastRefresh(j.last_refresh || null);
  };

  useEffect(() => {
    Promise.all([
      fetchIndustry(category).catch(() => setItems([])),
      listNews(20).then(setPosts).catch(() => setPosts([])),
    ]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading) fetchIndustry(category).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch(fnUrl(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'refresh' }) });
      await fetchIndustry(category);
    } catch (e) {
      toast({ title: 'Refresh failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setRefreshing(false);
    }
  };

  const openItem = async (it: IndustryItem) => {
    setActive(it);
    setArticleBlocks(null);
    setArticleHero(it.image_url || null);
    setArticleError(null);
    setTake(null);
    setArticleLoading(true);
    try {
      const r = await fetch(fnUrl(), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fetch_article', url: it.link }),
      });
      const j = await r.json();
      if (j.ok && Array.isArray(j.blocks) && j.blocks.length > 0) {
        setArticleBlocks(j.blocks);
        if (j.hero_image && !it.image_url) setArticleHero(j.hero_image);
      } else {
        setArticleError("Couldn't extract the full article. Use the link below to read it at the source.");
      }
    } catch {
      setArticleError("Couldn't load the article right now.");
    } finally {
      setArticleLoading(false);
    }
  };

  const loadTake = async () => {
    if (!active || takeLoading || take) return;
    setTakeLoading(true);
    try {
      const r = await fetch(fnUrl(), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'aetheris_take',
          title: active.title,
          summary: active.summary || '',
          source_label: active.source_label,
          category: active.category,
        }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || 'Failed');
      setTake(j.take || '');
    } catch (e) {
      toast({ title: "Couldn't generate take", description: (e as Error).message, variant: 'destructive' });
    } finally {
      setTakeLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!filter) return items;
    const q = filter.toLowerCase();
    return items.filter(i => i.title.toLowerCase().includes(q) || (i.summary || '').toLowerCase().includes(q));
  }, [items, filter]);

  const top = filtered[0];
  const rest = filtered.slice(1);
  const dispatches = posts.slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="glass p-4 rounded-xl flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Newspaper className="w-5 h-5 text-amber" />
          <div>
            <h2 className="text-lg font-bold text-foreground font-display leading-tight">Aetheris News — Live Wire</h2>
            <p className="text-xs text-muted-foreground">
              The same intelligence feed at <Link to="/news" className="text-amber hover:underline">businessforensics.tech/news</Link>
              {lastRefresh && <> · refreshed {formatDistanceToNow(new Date(lastRefresh), { addSuffix: true })}</>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search…" className="h-9 w-56" />
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshing}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map(c => (
          <button key={c.id} onClick={() => setCategory(c.id)} className={`premium-pill-btn ${category === c.id ? 'active' : ''}`}>
            {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-xl border border-border bg-card/30 p-10 text-center text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" /> Loading the wire…
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            {top && (
              <button onClick={() => openItem(top)} className="group block w-full text-left border border-border rounded-xl overflow-hidden bg-card/40 hover:border-amber/50 transition">
                <div className="aspect-[2.4/1] overflow-hidden bg-secondary/30">
                  <img src={top.image_url || FALLBACK} alt={top.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" referrerPolicy="no-referrer" onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK; }} />
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge variant="outline" className="font-mono text-[10px] uppercase">{top.source_label}</Badge>
                    <Badge className="bg-amber/10 text-amber border border-amber/30 font-mono text-[10px] uppercase">{top.category}</Badge>
                    {top.published_at && <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{formatDistanceToNow(new Date(top.published_at), { addSuffix: true })}</span>}
                  </div>
                  <h3 className="font-display text-xl md:text-2xl font-semibold text-foreground group-hover:text-amber transition leading-tight">{top.title}</h3>
                  {top.summary && <p className="text-muted-foreground mt-2 leading-relaxed line-clamp-3">{top.summary}</p>}
                </div>
              </button>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {rest.map(it => (
                <button key={it.id} onClick={() => openItem(it)} className="group block w-full text-left border border-border rounded-xl overflow-hidden bg-card/30 hover:border-amber/50 transition">
                  <div className="aspect-[16/10] overflow-hidden bg-secondary/30">
                    <img src={it.image_url || FALLBACK} alt={it.title} loading="lazy" referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK; }} />
                  </div>
                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant="outline" className="font-mono text-[9px] uppercase">{it.source_label}</Badge>
                      <Badge className="bg-amber/10 text-amber border border-amber/30 font-mono text-[9px] uppercase">{it.category}</Badge>
                    </div>
                    <h4 className="font-display text-sm font-semibold text-foreground group-hover:text-amber transition leading-snug line-clamp-3">{it.title}</h4>
                    {it.published_at && <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-1">{formatDistanceToNow(new Date(it.published_at), { addSuffix: true })}</p>}
                  </div>
                </button>
              ))}
            </div>
            {filtered.length === 0 && (
              <div className="border border-border rounded-xl p-10 text-center bg-card/30">
                <Newspaper className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No items right now. Try Refresh.</p>
              </div>
            )}
          </div>

          {/* Aetheris Dispatches */}
          <aside className="space-y-4">
            <div className="border border-amber/30 rounded-xl bg-card/40 p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-amber animate-pulse" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-amber">Aetheris Dispatches</span>
              </div>
              {dispatches.length === 0 ? (
                <p className="text-sm text-muted-foreground">No operator dispatches yet.</p>
              ) : (
                <div className="space-y-3">
                  {dispatches.map(p => (
                    <Link key={p.id} to={`/news/${p.slug}`} className="block group">
                      <div className="font-display text-sm font-semibold text-foreground group-hover:text-amber transition leading-snug">{p.title}</div>
                      {p.summary && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{p.summary}</p>}
                      {p.published_at && <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-1">{formatDistanceToNow(new Date(p.published_at), { addSuffix: true })}</p>}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Article dialog */}
      <Dialog open={!!active} onOpenChange={(o) => { if (!o) setActive(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {active && (
            <div className="space-y-4">
              {articleHero && (
                <img src={articleHero} alt={active.title} className="w-full h-56 object-cover rounded-lg" referrerPolicy="no-referrer" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="font-mono text-[10px] uppercase">{active.source_label}</Badge>
                <Badge className="bg-amber/10 text-amber border border-amber/30 font-mono text-[10px] uppercase">{active.category}</Badge>
                {active.published_at && <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{formatDistanceToNow(new Date(active.published_at), { addSuffix: true })}</span>}
              </div>
              <h2 className="font-display text-2xl font-semibold text-foreground leading-tight">{active.title}</h2>
              {active.summary && <p className="text-muted-foreground">{active.summary}</p>}

              {articleLoading && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading article…</div>
              )}
              {articleError && <p className="text-sm text-muted-foreground italic">{articleError}</p>}
              {articleBlocks && (
                <div className="space-y-3 text-foreground/90 leading-relaxed">
                  {articleBlocks.map((b, i) => b.tag === 'h2' || b.tag === 'h3'
                    ? <h3 key={i} className="font-display text-lg font-semibold text-foreground mt-4">{b.text}</h3>
                    : <p key={i}>{b.text}</p>
                  )}
                </div>
              )}

              <div className="border-t border-border/50 pt-3 flex flex-wrap items-center gap-2">
                <a href={active.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-amber hover:underline text-sm">
                  <ExternalLink className="w-3.5 h-3.5" /> Read at source
                </a>
                <Button size="sm" variant="outline" onClick={loadTake} disabled={takeLoading || !!take}>
                  {takeLoading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1 text-amber" />}
                  {take ? 'Aetheris Take loaded' : 'Get Aetheris Take'}
                </Button>
              </div>
              {take && (
                <div className="rounded-lg border-l-4 border-amber bg-amber/5 p-3">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-amber mb-1">Aetheris Take</div>
                  <p className="text-sm text-foreground/90 whitespace-pre-line">{take}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NewsFeedPanel;
