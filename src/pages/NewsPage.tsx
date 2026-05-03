import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ContactModal } from "@/components/ContactModal";
import { SEOHead } from "@/components/SEOHead";
import { listNews, type NewsPost } from "@/lib/newsFeed";
import { Badge } from "@/components/ui/badge";
import { Newspaper, Loader2, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const NewsPage = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listNews(60)
      .then(setPosts)
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const featured = posts[0];
  const rest = posts.slice(1);

  return (
    <div className="relative min-h-screen bg-background">
      <SEOHead
        title="Aetheris News — Field intelligence from the operator's desk"
        description="Dispatches from Aetheris: the leak audit case files, operator notes, and forensic intelligence on where money is bleeding inside real businesses."
        path="/news"
        type="website"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Aetheris News",
          url: "https://aetheris.technology/news",
        }}
      />
      <Navbar onContactClick={() => setIsContactModalOpen(true)} />

      <main className="relative z-10 pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber/30 bg-amber/5 mb-4">
              <Newspaper className="w-3.5 h-3.5 text-amber" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-amber">Aetheris News · Live Feed</span>
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-bold text-foreground leading-[1.05]">
              Field notes from the operator's desk.
            </h1>
            <p className="text-muted-foreground mt-4 max-w-2xl text-lg">
              Dispatches, case files, and forensic intelligence — published as we find it. No fluff, no influencer takes.
            </p>
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading dispatches…
            </div>
          )}

          {!loading && posts.length === 0 && (
            <div className="border border-border rounded-xl p-12 text-center bg-card/30">
              <Newspaper className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No dispatches yet. Check back soon.</p>
            </div>
          )}

          {featured && (
            <Link
              to={`/news/${featured.slug}`}
              className="group block border border-border rounded-xl overflow-hidden bg-card/40 hover:border-amber/50 transition mb-10"
            >
              {featured.cover_image_url && (
                <div className="aspect-[2.4/1] overflow-hidden bg-secondary/30">
                  <img
                    src={featured.cover_image_url}
                    alt={featured.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    loading="eager"
                  />
                </div>
              )}
              <div className="p-6 md:p-8">
                <div className="flex items-center gap-2 mb-3">
                  {featured.category && (
                    <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-widest">
                      {featured.category}
                    </Badge>
                  )}
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    {featured.published_at && formatDistanceToNow(new Date(featured.published_at), { addSuffix: true })}
                  </span>
                </div>
                <h2 className="font-display text-2xl md:text-4xl font-semibold text-foreground group-hover:text-amber transition-colors leading-tight">
                  {featured.title}
                </h2>
                {featured.summary && (
                  <p className="text-muted-foreground mt-3 text-base md:text-lg leading-relaxed line-clamp-3">
                    {featured.summary}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-5 text-amber font-mono text-xs uppercase tracking-widest">
                  Read dispatch <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          )}

          {rest.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rest.map((p) => (
                <Link
                  key={p.id}
                  to={`/news/${p.slug}`}
                  className="group block border border-border rounded-xl overflow-hidden bg-card/30 hover:border-amber/50 transition"
                >
                  {p.cover_image_url ? (
                    <div className="aspect-[16/10] overflow-hidden bg-secondary/30">
                      <img src={p.cover_image_url} alt={p.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                  ) : (
                    <div className="aspect-[16/10] flex items-center justify-center bg-gradient-to-br from-secondary/30 to-card/40">
                      <Newspaper className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      {p.category && (
                        <Badge variant="outline" className="font-mono text-[9px] uppercase tracking-widest">
                          {p.category}
                        </Badge>
                      )}
                      <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                        {p.published_at && formatDistanceToNow(new Date(p.published_at), { addSuffix: true })}
                      </span>
                    </div>
                    <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-amber transition-colors leading-snug line-clamp-2">
                      {p.title}
                    </h3>
                    {p.summary && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-3 leading-relaxed">{p.summary}</p>
                    )}
                  </div>
                </Link>
              ))}
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
