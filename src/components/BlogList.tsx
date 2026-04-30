import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, ArrowRight, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { BlogCard } from './BlogCard';
import { Button } from './ui/button';

const PAGE_SIZE = 12;

export const BlogList: React.FC = () => {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const { data: posts, isLoading, error } = useQuery({
    queryKey: ['blog-posts-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, author, published_at, tags, location_focus, featured_image')
        .eq('is_published', true)
        .order('published_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Top tags for filter chips
  const topTags = useMemo(() => {
    if (!posts) return [];
    const counts = new Map<string, number>();
    posts.forEach((p) => {
      (p.tags || []).forEach((t) => {
        if (t === 'TheArchitect' || t === 'AetherisTechnology') return;
        counts.set(t, (counts.get(t) || 0) + 1);
      });
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag]) => tag);
  }, [posts]);

  const filteredPosts = useMemo(() => {
    if (!posts) return [];
    if (!activeTag) return posts;
    return posts.filter((p) => (p.tags || []).includes(activeTag));
  }, [posts, activeTag]);

  const visiblePosts = filteredPosts.slice(0, visibleCount);
  const remaining = filteredPosts.length - visiblePosts.length;

  return (
    <section className="pt-32 pb-20 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-amber text-sm font-medium mb-6">
            <BookOpen className="w-4 h-4" />
            AI Education for Business Leaders
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 font-display">
            Stop Guessing.{' '}
            <span className="text-gradient-amber">
              Start Understanding.
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            We break down exactly how businesses waste money on AI, marketing, and disconnected systems —
            with real numbers, real costs, and real solutions. No fluff. No hype.
          </p>
        </div>

        {/* Stats + Tag Filter */}
        {!isLoading && posts && posts.length > 0 && (
          <div className="mb-8 space-y-4">
            <div className="text-center text-sm text-muted-foreground">
              <span className="text-amber font-semibold">{filteredPosts.length}</span>
              {' '}article{filteredPosts.length !== 1 ? 's' : ''}
              {activeTag && <> tagged <span className="text-foreground">#{activeTag.replace(/\s+/g, '')}</span></>}
            </div>
            {topTags.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2">
                {activeTag && (
                  <button
                    onClick={() => { setActiveTag(null); setVisibleCount(PAGE_SIZE); }}
                    className="inline-flex items-center gap-1 text-xs bg-amber/20 text-amber px-3 py-1.5 rounded-full hover:bg-amber/30 transition-colors"
                  >
                    <X className="w-3 h-3" />
                    Clear filter
                  </button>
                )}
                {topTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      setActiveTag(activeTag === tag ? null : tag);
                      setVisibleCount(PAGE_SIZE);
                    }}
                    className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                      activeTag === tag
                        ? 'bg-amber text-background'
                        : 'glass text-muted-foreground hover:text-amber'
                    }`}
                  >
                    #{tag.replace(/\s+/g, '')}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Blog Posts Grid */}
        {isLoading ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">Loading articles…</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">
              Unable to load blog posts. Please try again later.
            </p>
          </div>
        ) : visiblePosts.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {visiblePosts.map((post, idx) => (
                <BlogCard key={post.id} post={post} caseFileNumber={filteredPosts.length - idx} />
              ))}
            </div>

            {remaining > 0 && (
              <div className="mt-12 flex justify-center">
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  className="gap-2"
                >
                  Load More ({remaining} remaining)
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <p className="text-muted-foreground">
              {activeTag ? 'No posts match this tag.' : 'No blog posts available yet. Check back soon!'}
            </p>
          </div>
        )}

        {/* Newsletter CTA */}
        <div className="mt-20 glass rounded-2xl p-8 md:p-12 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4 font-display">
            Stop Wasting Money on Broken Systems
          </h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Our 14-Day Operational Systems Diagnostic tears apart your marketing, AI, and CRM
            systems — and rebuilds them to actually generate revenue. Investment: $5,000-$10,000.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="mailto:aetheris.technology@outlook.com?subject=14-Day%20Operational%20Systems%20Diagnostic"
              className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-md hover:bg-primary/90 font-medium"
            >
              <span>Book Your Diagnostic</span>
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="https://www.linkedin.com/in/thejosephtoney"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 text-amber hover:text-amber/80"
            >
              <span>Connect on LinkedIn</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
