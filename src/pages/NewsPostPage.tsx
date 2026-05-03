import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ContactModal } from "@/components/ContactModal";
import { SEOHead } from "@/components/SEOHead";
import { getNews, incrementNewsView, type NewsPost } from "@/lib/newsFeed";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";

const NewsPostPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [post, setPost] = useState<NewsPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    getNews(slug)
      .then((p) => {
        setPost(p);
        incrementNewsView(slug);
      })
      .catch((e) => setErr(e.message || "Not found"))
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <div className="relative min-h-screen bg-background">
      <SEOHead
        title={post ? `${post.title} | Aetheris News` : "Aetheris News"}
        description={post?.summary || "Field intelligence from the operator's desk."}
        path={`/news/${slug}`}
        type="article"
        image={post?.cover_image_url || undefined}
      />
      <Navbar onContactClick={() => setIsContactModalOpen(true)} />

      <main className="relative z-10 pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <Link to="/news" className="inline-flex items-center gap-2 text-muted-foreground hover:text-amber transition mb-8 font-mono text-xs uppercase tracking-widest">
            <ArrowLeft className="w-3.5 h-3.5" /> All dispatches
          </Link>

          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          )}

          {err && !loading && (
            <div className="text-muted-foreground">Dispatch not found.</div>
          )}

          {post && (
            <article>
              <div className="flex items-center gap-2 mb-4">
                {post.category && (
                  <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-widest">{post.category}</Badge>
                )}
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {post.published_at && format(new Date(post.published_at), "MMM d, yyyy")} · {post.author_name}
                </span>
              </div>
              <h1 className="font-display text-3xl md:text-5xl font-bold text-foreground leading-[1.1] mb-6">{post.title}</h1>
              {post.summary && <p className="text-lg text-muted-foreground leading-relaxed mb-8">{post.summary}</p>}
              {post.cover_image_url && (
                <img src={post.cover_image_url} alt={post.title} className="w-full rounded-xl border border-border mb-10" />
              )}
              <div className="prose prose-invert max-w-none prose-headings:font-display prose-a:text-amber">
                <ReactMarkdown>{post.body || ""}</ReactMarkdown>
              </div>
              {post.tags?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-10">
                  {post.tags.map((t) => (
                    <Badge key={t} variant="secondary" className="font-mono text-[10px] uppercase">{t}</Badge>
                  ))}
                </div>
              )}
            </article>
          )}
        </div>
      </main>

      <Footer />
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default NewsPostPage;
