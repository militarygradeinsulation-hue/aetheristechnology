import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ContactModal } from "@/components/ContactModal";
import { SEOHead } from "@/components/SEOHead";
import { listNews, type NewsPost } from "@/lib/newsFeed";
import { Badge } from "@/components/ui/badge";
import { Newspaper, Loader2, ArrowRight, ExternalLink, RefreshCw } from "lucide-react";
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

const NewsPage = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [items, setItems] = useState<IndustryItem[]>([]);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState<string>("all");

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
        <div className="max-w-7xl mx-auto">
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
                  <a href={top.link} target="_blank" rel="noopener noreferrer" className="group block border border-border rounded-xl overflow-hidden bg-card/40 hover:border-amber/50 transition">
                    {top.image_url && (
                      <div className="aspect-[2.4/1] overflow-hidden bg-secondary/30">
                        <img src={top.image_url} alt={top.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="eager" referrerPolicy="no-referrer" onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")} />
                      </div>
                    )}
                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-widest">{top.source_label}</Badge>
                        <Badge className="bg-amber/10 text-amber border border-amber/30 font-mono text-[10px] uppercase">{top.category}</Badge>
                        {top.published_at && <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{formatDistanceToNow(new Date(top.published_at), { addSuffix: true })}</span>}
                      </div>
                      <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground group-hover:text-amber transition-colors leading-tight">{top.title}</h2>
                      {top.summary && <p className="text-muted-foreground mt-3 leading-relaxed line-clamp-3">{top.summary}</p>}
                      <div className="flex items-center gap-2 mt-4 text-amber font-mono text-xs uppercase tracking-widest">Read at source <ExternalLink className="w-3.5 h-3.5" /></div>
                    </div>
                  </a>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {rest.map(it => (
                    <a key={it.id} href={it.link} target="_blank" rel="noopener noreferrer" className="group block border border-border rounded-xl overflow-hidden bg-card/30 hover:border-amber/50 transition">
                      {it.image_url ? (
                        <div className="aspect-[16/10] overflow-hidden bg-secondary/30">
                          <img src={it.image_url} alt={it.title} loading="lazy" referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")} />
                        </div>
                      ) : (
                        <div className="aspect-[16/10] flex items-center justify-center bg-gradient-to-br from-secondary/30 to-card/40">
                          <Newspaper className="w-8 h-8 text-muted-foreground/50" />
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge variant="outline" className="font-mono text-[9px] uppercase tracking-widest">{it.source_label}</Badge>
                          <Badge className="bg-amber/10 text-amber border border-amber/30 font-mono text-[9px] uppercase">{it.category}</Badge>
                        </div>
                        <h3 className="font-display text-base font-semibold text-foreground group-hover:text-amber transition-colors leading-snug line-clamp-3">{it.title}</h3>
                        {it.published_at && <p className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mt-2">{formatDistanceToNow(new Date(it.published_at), { addSuffix: true })}</p>}
                      </div>
                    </a>
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

                <Link to="/leak-audit" className="block border border-amber/40 rounded-xl bg-amber/5 p-5 hover:border-amber transition">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-amber mb-2">While you're here</div>
                  <div className="font-display text-lg font-semibold text-foreground">Run the free Leak Audit™ <ArrowRight className="w-4 h-4 inline ml-1" /></div>
                  <p className="text-sm text-muted-foreground mt-1">Find where your business is bleeding money in 2 minutes.</p>
                </Link>
              </aside>
            </div>
          )}
        </div>
      </main>

      <Footer />
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default NewsPage;
