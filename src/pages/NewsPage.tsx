import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ContactModal } from "@/components/ContactModal";
import { SEOHead } from "@/components/SEOHead";
import { listNews, type NewsPost } from "@/lib/newsFeed";
import { Badge } from "@/components/ui/badge";
import { Newspaper, Loader2, ArrowRight, ExternalLink, RefreshCw, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { formatDistanceToNow } from "date-fns";

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
  { id: "all", label: "All" },
  { id: "ai", label: "AI" },
  { id: "business", label: "Business" },
  { id: "marketing", label: "Marketing" },
  { id: "sales", label: "Sales" },
  { id: "security", label: "Cybersecurity" },
  { id: "finance", label: "Finance" },
  { id: "healthcare", label: "Healthcare" },
  { id: "manufacturing", label: "Manufacturing" },
  { id: "construction", label: "Construction" },
  { id: "logistics", label: "Logistics" },
];

// Deterministic fallback thumbnails per category (Unsplash). Guarantees every card has an image.
const FALLBACK_THUMBS: Record<string, string[]> = {
  ai: [
    "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&q=70&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1200&q=70&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1655720828018-edd2daec9349?w=1200&q=70&auto=format&fit=crop",
  ],
  business: [
    "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=70&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=70&auto=format&fit=crop",
  ],
  marketing: [
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=70&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1200&q=70&auto=format&fit=crop",
  ],
  sales: [
    "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200&q=70&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1556745757-8d76bdb6984b?w=1200&q=70&auto=format&fit=crop",
  ],
  security: [
    "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&q=70&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=1200&q=70&auto=format&fit=crop",
  ],
  finance: [
    "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&q=70&auto=format&fit=crop",
  ],
  healthcare: [
    "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&q=70&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=1200&q=70&auto=format&fit=crop",
  ],
  manufacturing: [
    "https://images.unsplash.com/photo-1565043666747-69f6646db940?w=1200&q=70&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1200&q=70&auto=format&fit=crop",
  ],
  construction: [
    "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1200&q=70&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1200&q=70&auto=format&fit=crop",
  ],
  logistics: [
    "https://images.unsplash.com/photo-1494412519320-aa613dfb7738?w=1200&q=70&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200&q=70&auto=format&fit=crop",
  ],
};
const DEFAULT_THUMBS = [
  "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&q=70&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=1200&q=70&auto=format&fit=crop",
];
function thumbFor(item: { id: string; category: string; image_url: string | null }): string {
  if (item.image_url) return item.image_url;
  const pool = FALLBACK_THUMBS[item.category] || DEFAULT_THUMBS;
  let h = 0;
  for (let i = 0; i < item.id.length; i++) h = (h * 31 + item.id.charCodeAt(i)) | 0;
  return pool[Math.abs(h) % pool.length];
}

const NewsPage = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [items, setItems] = useState<IndustryItem[]>([]);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState<string>("all");
  const [activeItem, setActiveItem] = useState<IndustryItem | null>(null);
  const [articleBlocks, setArticleBlocks] = useState<{ tag: string; text: string }[] | null>(null);
  const [articleHero, setArticleHero] = useState<string | null>(null);
  const [articleLoading, setArticleLoading] = useState(false);
  const [articleError, setArticleError] = useState<string | null>(null);
  const [take, setTake] = useState<string | null>(null);
  const [takeLoading, setTakeLoading] = useState(false);
  const [takeError, setTakeError] = useState<string | null>(null);

  const openItem = async (it: IndustryItem) => {
    setActiveItem(it);
    setArticleBlocks(null);
    setArticleHero(it.image_url || null);
    setArticleError(null);
    setTake(null); setTakeError(null); setTakeLoading(false);
    setArticleLoading(true);
    try {
      const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/industry-news`;
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "fetch_article", url: it.link }) });
      const j = await r.json();
      if (j.ok && Array.isArray(j.blocks) && j.blocks.length > 0) {
        setArticleBlocks(j.blocks);
        if (j.hero_image && !it.image_url) setArticleHero(j.hero_image);
      } else {
        setArticleError("Couldn't extract the full article. Use the link below to read it at the source.");
      }
    } catch (e) {
      setArticleError("Couldn't load the article right now.");
    } finally {
      setArticleLoading(false);
    }
  };

  const loadTake = async () => {
    if (!activeItem || takeLoading || take) return;
    setTakeLoading(true); setTakeError(null);
    try {
      const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/industry-news`;
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "aetheris_take",
          title: activeItem.title,
          summary: activeItem.summary || "",
          source_label: activeItem.source_label,
          category: activeItem.category,
        }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "Failed");
      setTake(j.take || "");
    } catch (e) {
      setTakeError((e as Error).message || "Couldn't generate the Aetheris Take.");
    } finally {
      setTakeLoading(false);
    }
  };

  const fetchIndustry = async (cat: string) => {
    const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/industry-news`;
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "list", category: cat, limit: 80 }) });
    if (!r.ok) throw new Error(`status ${r.status}`);
    const j = await r.json();
    setItems(j.items || []);
    setLastRefresh(j.last_refresh || null);
  };

  useEffect(() => {
    Promise.all([
      listNews(20).then(setPosts).catch(() => setPosts([])),
      fetchIndustry(category).catch(() => setItems([])),
    ]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (!loading) fetchIndustry(category).catch(() => {}); /* eslint-disable-next-line */ }, [category]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/industry-news`;
      await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "refresh" }) });
      await fetchIndustry(category);
    } catch (e) { console.error(e); }
    finally { setRefreshing(false); }
  };

  const top = items[0];
  const rest = items.slice(1);
  const aetherisDispatches = useMemo(() => posts.slice(0, 4), [posts]);

  return (
    <div className="relative min-h-screen bg-background">
      <SEOHead
        title="Aetheris News — Live AI & Industry Intelligence Feed"
        description="Live AI, business, marketing, security, and industry news — aggregated from the world's top sources. Stay ahead of what's actually moving."
        path="/news"
        type="website"
        jsonLd={{ "@context": "https://schema.org", "@type": "CollectionPage", name: "Aetheris News", url: "https://aetheris.technology/news" }}
      />
      <Navbar onContactClick={() => setIsContactModalOpen(true)} />

      <main className="relative z-10 pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1600px] mx-auto">
          <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber/30 bg-amber/5 mb-4">
                <Newspaper className="w-3.5 h-3.5 text-amber" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-amber">Aetheris News · Live Wire</span>
              </div>
              <h1 className="font-display text-4xl md:text-6xl font-bold text-foreground leading-[1.05]">The intelligence feed.</h1>
              <p className="text-muted-foreground mt-3 max-w-2xl text-lg">Live AI and industry news from the sources that matter — aggregated, deduped, and refreshed automatically.</p>
              {lastRefresh && (
                <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mt-2">
                  Last refresh · {formatDistanceToNow(new Date(lastRefresh), { addSuffix: true })}
                </p>
              )}
            </div>
            <button onClick={onRefresh} disabled={refreshing} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:border-amber/50 text-sm font-mono uppercase tracking-widest disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          {/* Category tabs */}
          <div className="flex gap-2 mb-8 flex-wrap">
            {CATEGORIES.map(c => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-mono uppercase tracking-widest transition ${
                  category === c.id ? 'bg-amber text-background border border-amber' : 'border border-border text-muted-foreground hover:text-foreground hover:border-amber/40'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading the wire…</div>
          )}

          {!loading && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main wire */}
              <div className="lg:col-span-2 space-y-6">
                {top && (
                  <button onClick={() => openItem(top)} className="group block w-full text-left border border-border rounded-xl overflow-hidden bg-card/40 hover:border-amber/50 transition">
                    <div className="aspect-[2.4/1] overflow-hidden bg-secondary/30">
                      <img src={thumbFor(top)} alt={top.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="eager" referrerPolicy="no-referrer" onError={(e) => { const img = e.currentTarget as HTMLImageElement; const fb = thumbFor({ ...top, image_url: null }); if (img.src !== fb) img.src = fb; }} />
                    </div>
                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-widest">{top.source_label}</Badge>
                        <Badge className="bg-amber/10 text-amber border border-amber/30 font-mono text-[10px] uppercase">{top.category}</Badge>
                        {top.published_at && <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{formatDistanceToNow(new Date(top.published_at), { addSuffix: true })}</span>}
                      </div>
                      <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground group-hover:text-amber transition-colors leading-tight">{top.title}</h2>
                      {top.summary && <p className="text-muted-foreground mt-3 leading-relaxed line-clamp-3">{top.summary}</p>}
                      <div className="flex items-center gap-2 mt-4 text-amber font-mono text-xs uppercase tracking-widest">Read article <ArrowRight className="w-3.5 h-3.5" /></div>
                    </div>
                  </button>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {rest.map(it => (
                    <button key={it.id} onClick={() => openItem(it)} className="group block w-full text-left border border-border rounded-xl overflow-hidden bg-card/30 hover:border-amber/50 transition">
                      <div className="aspect-[16/10] overflow-hidden bg-secondary/30">
                        <img src={thumbFor(it)} alt={it.title} loading="lazy" referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={(e) => { const img = e.currentTarget as HTMLImageElement; const fb = thumbFor({ ...it, image_url: null }); if (img.src !== fb) img.src = fb; }} />
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge variant="outline" className="font-mono text-[9px] uppercase tracking-widest">{it.source_label}</Badge>
                          <Badge className="bg-amber/10 text-amber border border-amber/30 font-mono text-[9px] uppercase">{it.category}</Badge>
                        </div>
                        <h3 className="font-display text-base font-semibold text-foreground group-hover:text-amber transition-colors leading-snug line-clamp-3">{it.title}</h3>
                        {it.published_at && <p className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mt-2">{formatDistanceToNow(new Date(it.published_at), { addSuffix: true })}</p>}
                      </div>
                    </button>
                  ))}
                </div>

                {items.length === 0 && (
                  <div className="border border-border rounded-xl p-12 text-center bg-card/30">
                    <Newspaper className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No items in this category right now. Try Refresh.</p>
                  </div>
                )}
              </div>

              {/* Sidebar: Aetheris dispatches */}
              <aside className="space-y-6">
                <div className="border border-amber/30 rounded-xl bg-card/40 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-2 h-2 rounded-full bg-amber animate-pulse" />
                    <span className="font-mono text-[10px] uppercase tracking-widest text-amber">Aetheris Dispatches</span>
                  </div>
                  {aetherisDispatches.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No operator dispatches yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {aetherisDispatches.map(p => (
                        <Link key={p.id} to={`/news/${p.slug}`} className="block group">
                          <div className="font-display text-sm font-semibold text-foreground group-hover:text-amber transition leading-snug">{p.title}</div>
                          {p.summary && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{p.summary}</p>}
                          {p.published_at && <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-1">{formatDistanceToNow(new Date(p.published_at), { addSuffix: true })}</p>}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border border-border rounded-xl bg-card/30 p-5">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Sources include</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">TechCrunch · The Verge · WIRED · MIT Technology Review · OpenAI · Google AI · Anthropic · VentureBeat · HBR · Entrepreneur · HubSpot · Moz · Krebs on Security · BleepingComputer · The Hacker News · Healthcare IT News · Construction Dive · Manufacturing Dive · Supply Chain Dive · American Banker.</p>
                </div>

                <Link to="/leak-audit" className="block border border-amber/40 rounded-xl bg-gradient-to-br from-amber/10 via-card/40 to-background p-5 hover:border-amber transition group relative overflow-hidden">
                  <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-amber/10 blur-2xl group-hover:bg-amber/20 transition" />
                  <div className="font-mono text-[10px] uppercase tracking-widest text-amber mb-2 relative">While you're here</div>
                  <div className="font-display text-lg font-semibold text-foreground relative leading-tight">Run the free Leak Audit™ <ArrowRight className="w-4 h-4 inline ml-1" /></div>
                  <p className="text-sm text-muted-foreground mt-1 relative">Find where your business is bleeding money in 2 minutes.</p>
                  <ul className="mt-3 space-y-1.5 relative">
                    {[
                      "7-step forensic scan",
                      "Personalized leak report",
                      "No call required",
                    ].map((b) => (
                      <li key={b} className="flex items-start gap-2 text-xs text-foreground/80">
                        <span className="text-amber font-mono mt-0.5">▸</span>{b}
                      </li>
                    ))}
                  </ul>
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-amber/20 relative">
                    <div>
                      <div className="font-display text-base font-bold text-amber leading-none">2m</div>
                      <div className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mt-1">Avg time</div>
                    </div>
                    <div>
                      <div className="font-display text-base font-bold text-amber leading-none">$0</div>
                      <div className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mt-1">Cost</div>
                    </div>
                    <div>
                      <div className="font-display text-base font-bold text-amber leading-none">100%</div>
                      <div className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mt-1">Private</div>
                    </div>
                  </div>
                </Link>

                {/* Operator-led upgrade */}
                <div className="border border-border rounded-xl bg-card/30 p-5">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Operator-led</div>
                  <div className="font-display text-lg font-semibold text-foreground leading-tight">Forensic Diagnostic — $2,500 flat</div>
                  <p className="text-sm text-muted-foreground mt-2">A live, operator-led teardown of your funnel, ops, and tech stack. The full $2,500 applies toward any engagement.</p>
                  <button onClick={() => setIsContactModalOpen(true)} className="mt-3 inline-flex items-center gap-2 text-amber font-mono text-xs uppercase tracking-widest hover:gap-3 transition-all">
                    Book the diagnostic <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Live wire stats */}
                <div className="border border-border rounded-xl bg-card/30 p-5">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Live wire · status</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="font-display text-2xl font-bold text-foreground">{items.length}</div>
                      <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">In feed</div>
                    </div>
                    <div>
                      <div className="font-display text-2xl font-bold text-foreground">21</div>
                      <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Sources</div>
                    </div>
                    <div>
                      <div className="font-display text-2xl font-bold text-foreground">{CATEGORIES.length - 1}</div>
                      <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Categories</div>
                    </div>
                    <div>
                      <div className="font-display text-2xl font-bold text-amber">30m</div>
                      <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Refresh cycle</div>
                    </div>
                  </div>
                </div>

                {/* Newsletter / Field Notes */}
                <div className="border border-amber/30 rounded-xl bg-gradient-to-br from-card/40 to-amber/5 p-5">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-amber mb-2">Field Notes</div>
                  <div className="font-display text-lg font-semibold text-foreground leading-tight">Get the weekly leak report</div>
                  <p className="text-sm text-muted-foreground mt-2">One operator dispatch a week. Real teardowns, no fluff. Unsubscribe anytime.</p>
                  <Link to="/leak-audit" className="mt-3 inline-flex items-center gap-2 text-amber font-mono text-xs uppercase tracking-widest hover:gap-3 transition-all">
                    Subscribe via audit <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* The Leak Audit™ 7 steps */}
                <div className="border border-border rounded-xl bg-card/30 p-5">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-amber mb-3">The Leak Audit™ · 7 steps</div>
                  <ol className="space-y-2 text-sm">
                    {[
                      "Funnel autopsy",
                      "Pipeline pressure test",
                      "Ops & handoff map",
                      "Tech stack reconciliation",
                      "Cash & margin trace",
                      "Team load + bottleneck scan",
                      "Leak report + remediation plan",
                    ].map((s, i) => (
                      <li key={s} className="flex gap-3">
                        <span className="font-mono text-[10px] text-amber w-5 shrink-0 pt-0.5">{String(i + 1).padStart(2, "0")}</span>
                        <span className="text-foreground/90">{s}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Trending categories */}
                <div className="border border-border rounded-xl bg-card/30 p-5">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Jump to a category</div>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.filter(c => c.id !== "all").map(c => (
                      <button
                        key={c.id}
                        onClick={() => setCategory(c.id)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest border transition ${
                          category === c.id ? 'border-amber text-amber bg-amber/10' : 'border-border text-muted-foreground hover:border-amber/40 hover:text-foreground'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Operator doctrine */}
                <div className="border border-border rounded-xl bg-card/40 p-5 relative overflow-hidden">
                  <div className="absolute top-2 right-3 font-display text-6xl text-amber/10 leading-none select-none">"</div>
                  <p className="font-display text-base text-foreground leading-snug italic relative">
                    Your business is leaking. You just can't see it from the inside.
                  </p>
                  <div className="mt-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Aetheris · Operator Doctrine</div>
                </div>

                {/* Direct line */}
                <div className="border border-border rounded-xl bg-card/30 p-5">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Direct line</div>
                  <p className="text-sm text-muted-foreground">No forms-and-funnels routine. If it's urgent, talk to an operator.</p>
                  <button onClick={() => setIsContactModalOpen(true)} className="mt-3 w-full px-4 py-2.5 rounded-lg bg-amber text-background font-mono text-xs uppercase tracking-widest hover:bg-amber/90 transition">
                    Contact an operator
                  </button>
                </div>
              </aside>
            </div>
          )}

          {/* ============== FULL-WIDTH CONTENT BELOW THE WIRE ============== */}
          {!loading && (
            <div className="mt-20 space-y-16">
              {/* Section divider */}
              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-border" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-amber">Below the wire · Operator intel</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              {/* Common leaks by category */}
              <section>
                <div className="mb-6 flex items-end justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground">Common leaks by category</h2>
                    <p className="text-muted-foreground mt-1 text-sm">Where money quietly bleeds out, mapped to the news above.</p>
                  </div>
                  <Link to="/leak-audit" className="font-mono text-[10px] uppercase tracking-widest text-amber hover:gap-3 inline-flex items-center gap-2 transition-all">
                    Run the free Leak Audit™ <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {[
                    { tag: "Funnel", title: "Lead-form abandon ≥ 60%", body: "Most sites lose 6 of 10 visitors at the form. Field count, friction copy, mobile keyboard.", est: "$3K–$18K/mo" },
                    { tag: "Sales", title: "First-touch > 1 hour", body: "Conversion drops ~7x past the first hour. No SLA, no router, no triage.", est: "$5K–$40K/mo" },
                    { tag: "Ops", title: "Manual handoffs between tools", body: "Sales → ops → fulfillment via spreadsheets and DMs. Drops, double-work, missed SLAs.", est: "$2K–$25K/mo" },
                    { tag: "Tech stack", title: "Overlapping SaaS", body: "Two CRMs, three calendars, four chat tools. Paying twice, syncing nothing.", est: "$400–$6K/mo" },
                    { tag: "Retention", title: "No churn signal", body: "You find out customers left when the invoice doesn't clear. No usage telemetry, no save play.", est: "$8K–$60K/mo" },
                    { tag: "Cash", title: "AR aging buried", body: "30/60/90 not reviewed weekly. No reminder cadence. Working capital trapped.", est: "$5K–$50K AR" },
                    { tag: "Marketing", title: "Spend without attribution", body: "Ads run, leads land, nothing tied back to revenue. Optimizing on vibes.", est: "$2K–$30K/mo" },
                    { tag: "Team", title: "Bottleneck = founder", body: "Every approval, every reply routes through one person. Throughput capped at one human.", est: "Capped growth" },
                  ].map((leak) => (
                    <div key={leak.title} className="border border-border rounded-xl bg-card/30 p-5 hover:border-amber/40 transition group">
                      <div className="flex items-center justify-between mb-3">
                        <Badge variant="outline" className="font-mono text-[9px] uppercase tracking-widest">{leak.tag}</Badge>
                        <span className="font-mono text-[9px] uppercase tracking-widest text-crimson">Active</span>
                      </div>
                      <h3 className="font-display text-base font-semibold text-foreground leading-snug group-hover:text-amber transition">{leak.title}</h3>
                      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{leak.body}</p>
                      <div className="mt-4 pt-3 border-t border-border/60">
                        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Typical bleed</div>
                        <div className="font-display text-lg font-bold text-amber leading-none mt-1">{leak.est}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* How to read the wire + Forensic Diagnostic */}
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 border border-border rounded-xl bg-card/30 p-7">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-amber mb-3">How to read the wire</div>
                  <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground leading-tight">Most operators read the news wrong.</h2>
                  <p className="text-muted-foreground mt-3 leading-relaxed">News is a leak detector, not a horoscope. Every headline is a signal that something in the market just shifted — pricing power, attention, regulation, tooling. The question isn't "is this cool?" — it's <span className="text-foreground">"does this widen or narrow my leaks this week?"</span></p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    {[
                      { n: "01", t: "Filter to your stack", d: "Ignore anything that doesn't touch your funnel, ops, retention, or cash." },
                      { n: "02", t: "Map to a leak", d: "If it tightens a leak: act. If it widens one: prepare. Otherwise: skip." },
                      { n: "03", t: "Pick one move", d: "One change per week beats a backlog of brilliant ideas. Ship it, measure it." },
                    ].map((s) => (
                      <div key={s.n} className="border border-border rounded-lg bg-background/40 p-4">
                        <div className="font-mono text-[10px] text-amber tracking-widest">{s.n}</div>
                        <div className="font-display text-base font-semibold text-foreground mt-1">{s.t}</div>
                        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{s.d}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border border-amber/30 rounded-xl bg-gradient-to-br from-amber/10 via-card/40 to-background p-7 relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-amber/10 blur-3xl" />
                  <div className="font-mono text-[10px] uppercase tracking-widest text-amber relative">Operator-led</div>
                  <div className="font-display text-2xl font-semibold text-foreground mt-2 relative leading-tight">Forensic Diagnostic</div>
                  <div className="font-display text-4xl font-bold text-amber mt-2 relative">$2,500 <span className="text-sm font-mono text-muted-foreground tracking-widest uppercase">flat</span></div>
                  <p className="text-sm text-muted-foreground mt-3 relative">A live, operator-led teardown of your funnel, ops, and stack. Full $2,500 applies toward any engagement.</p>
                  <ul className="mt-4 space-y-1.5 relative">
                    {["7-step Leak Audit™ on your real data", "Ranked leak report with $/month estimates", "Remediation plan you can run yourself"].map(b => (
                      <li key={b} className="flex items-start gap-2 text-xs text-foreground/80"><span className="text-amber font-mono mt-0.5">▸</span>{b}</li>
                    ))}
                  </ul>
                  <button onClick={() => setIsContactModalOpen(true)} className="mt-5 w-full px-4 py-3 rounded-lg bg-amber text-background font-mono text-xs uppercase tracking-widest hover:bg-amber/90 transition relative">
                    Book the diagnostic →
                  </button>
                </div>
              </section>

              {/* FAQ + final CTA */}
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-amber mb-3">Wire FAQ</div>
                  <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-6">Questions operators actually ask</h2>
                  <div className="space-y-3">
                    {[
                      { q: "How often does the wire refresh?", a: "Every 30 minutes. Dedupe is automatic across 21 sources, so you don't read the same headline three times." },
                      { q: "Why are some thumbnails generic?", a: "A few sources block scrapers (OpenAI, BleepingComputer, etc.). We fall back to category-relevant imagery so the grid stays clean." },
                      { q: "What's the Aetheris Take?", a: "An operator POV on each story — what it means for funnel, ops, retention, and where the leverage points are. Not a summary, an angle." },
                      { q: "Can I get this as a weekly digest?", a: "Yes. Run the Leak Audit and you're auto-subscribed to the operator dispatch — one email, no fluff, unsubscribe anytime." },
                      { q: "Do you cover my industry?", a: "If it's healthcare, manufacturing, construction, logistics, finance, SaaS, or services — yes. Use the category filter at the top of the wire." },
                    ].map((f) => (
                      <details key={f.q} className="group border border-border rounded-lg bg-card/30 p-4 hover:border-amber/40 transition">
                        <summary className="cursor-pointer flex items-center justify-between gap-4 list-none">
                          <span className="font-display text-base font-semibold text-foreground">{f.q}</span>
                          <span className="font-mono text-amber text-xs group-open:rotate-45 transition-transform">+</span>
                        </summary>
                        <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{f.a}</p>
                      </details>
                    ))}
                  </div>
                </div>

                <div className="border border-border rounded-xl bg-card/30 p-7 flex flex-col">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-amber mb-3">Field notes</div>
                  <div className="font-display text-xl font-semibold text-foreground leading-tight">Get one operator dispatch a week</div>
                  <p className="text-sm text-muted-foreground mt-2">Real teardowns, real leak math, no engagement bait. Sent only when there's something worth sending.</p>
                  <ul className="mt-4 space-y-1.5">
                    {["Anatomy of one real leak per issue", "Tool reviews, not press releases", "Pulled from operator-led engagements"].map(b => (
                      <li key={b} className="flex items-start gap-2 text-xs text-foreground/80"><span className="text-amber font-mono mt-0.5">▸</span>{b}</li>
                    ))}
                  </ul>
                  <Link to="/leak-audit" className="mt-auto pt-5 inline-flex items-center gap-2 text-amber font-mono text-xs uppercase tracking-widest hover:gap-3 transition-all">
                    Subscribe via the audit <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </section>

              {/* Closing operator banner */}
              <section className="border border-amber/30 rounded-2xl bg-gradient-to-br from-card via-background to-card p-10 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--amber)/0.12),transparent_60%)]" />
                <div className="relative">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-amber">Operator doctrine</div>
                  <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground mt-3 leading-[1.05]">Your business is <span className="text-crimson italic">leaking</span>.<br/>You just can't see it from the inside.</h2>
                  <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">Stop scrolling the wire. Run the 7-step Leak Audit™ in 2 minutes and find out exactly where the money is going.</p>
                  <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                    <Link to="/leak-audit" className="px-6 py-3 rounded-lg bg-amber text-background font-mono text-xs uppercase tracking-widest hover:bg-amber/90 transition">
                      Run the free Leak Audit™
                    </Link>
                    <button onClick={() => setIsContactModalOpen(true)} className="px-6 py-3 rounded-lg border border-border text-foreground font-mono text-xs uppercase tracking-widest hover:border-amber transition">
                      Talk to an operator
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </main>

      <Footer />
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />

      <Dialog open={!!activeItem} onOpenChange={(o) => !o && setActiveItem(null)}>
        <DialogContent className="max-w-[96vw] xl:max-w-[1400px] max-h-[92vh] overflow-y-auto p-0 bg-card border border-amber/30">
          {activeItem && (
            <article className="relative">
              <div className="aspect-[2.4/1] overflow-hidden bg-secondary/30">
                <img src={articleHero || thumbFor(activeItem)} alt={activeItem.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" onError={(e) => { const img = e.currentTarget as HTMLImageElement; const fb = thumbFor({ ...activeItem, image_url: null }); if (img.src !== fb) img.src = fb; }} />
              </div>
              <div className="p-6 md:p-8">
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-widest">{activeItem.source_label}</Badge>
                  <Badge className="bg-amber/10 text-amber border border-amber/30 font-mono text-[10px] uppercase">{activeItem.category}</Badge>
                  {activeItem.published_at && <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{formatDistanceToNow(new Date(activeItem.published_at), { addSuffix: true })}</span>}
                  {activeItem.author && <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">· {activeItem.author}</span>}
                </div>
                <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground leading-tight">{activeItem.title}</h2>
                {activeItem.summary && (
                  <p className="text-muted-foreground mt-4 leading-relaxed text-base italic border-l-2 border-amber/40 pl-4">{activeItem.summary}</p>
                )}

                {/* Aetheris Take */}
                <div className="mt-5">
                  {!take && !takeLoading && (
                    <button
                      onClick={loadTake}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-amber/40 bg-amber/10 text-amber font-mono text-xs uppercase tracking-widest hover:bg-amber/20 transition"
                    >
                      ▶ Aetheris Take
                    </button>
                  )}
                  {takeLoading && (
                    <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Pulling the operator's read…</div>
                  )}
                  {takeError && (
                    <p className="text-sm text-destructive">{takeError}</p>
                  )}
                  {take && (
                    <div className="border border-amber/40 rounded-xl bg-gradient-to-br from-amber/10 to-card/40 p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="font-mono text-[10px] uppercase tracking-widest text-amber">Aetheris Take</span>
                        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">· Operator POV</span>
                      </div>
                      <div className="font-display text-base leading-relaxed text-foreground/90 whitespace-pre-wrap">{take}</div>
                    </div>
                  )}
                </div>

                {/* Article body */}
                <div className="mt-6">
                  {articleLoading && (
                    <div className="flex items-center gap-2 text-muted-foreground py-8"><Loader2 className="w-4 h-4 animate-spin" /> Loading article…</div>
                  )}
                  {!articleLoading && articleBlocks && articleBlocks.length > 0 && (
                    <div className="space-y-4 text-foreground/90 leading-relaxed">
                      {articleBlocks.map((b, i) => {
                        if (b.tag === "h1" || b.tag === "h2") return <h3 key={i} className="font-display text-xl font-semibold text-foreground mt-6">{b.text}</h3>;
                        if (b.tag === "h3") return <h4 key={i} className="font-display text-lg font-semibold text-foreground mt-5">{b.text}</h4>;
                        if (b.tag === "blockquote") return <blockquote key={i} className="border-l-2 border-amber/50 pl-4 italic text-foreground/80">{b.text}</blockquote>;
                        if (b.tag === "li") return <li key={i} className="ml-5 list-disc">{b.text}</li>;
                        return <p key={i} className="text-base">{b.text}</p>;
                      })}
                    </div>
                  )}
                  {!articleLoading && articleError && (
                    <p className="text-sm text-muted-foreground py-4">{articleError}</p>
                  )}
                </div>

                <div className="mt-8 p-4 rounded-lg border border-border bg-background/40">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Source</div>
                  <p className="text-sm text-muted-foreground break-all">{activeItem.link}</p>
                </div>
                <div className="mt-6 flex items-center gap-3 flex-wrap">
                  <a href={activeItem.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber text-background font-mono text-xs uppercase tracking-widest hover:bg-amber/90 transition">
                    Read full article <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button onClick={() => setActiveItem(null)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-muted-foreground font-mono text-xs uppercase tracking-widest hover:border-amber/40 hover:text-foreground transition">
                    Close
                  </button>
                </div>
              </div>
            </article>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NewsPage;
