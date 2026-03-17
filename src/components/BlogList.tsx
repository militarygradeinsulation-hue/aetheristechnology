import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { BlogCard } from './BlogCard';
import { RevealOnScroll } from './RevealOnScroll';
import { Skeleton } from './ui/skeleton';

export const BlogList: React.FC = () => {
  const { data: posts, isLoading, error } = useQuery({
    queryKey: ['blog-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  return (
    <section className="pt-32 pb-20 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <RevealOnScroll>
          <div className="text-center mb-16">
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
        </RevealOnScroll>

        {/* Blog Posts Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass rounded-xl p-6">
                <Skeleton className="h-48 w-full mb-4 rounded-lg" />
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">
              Unable to load blog posts. Please try again later.
            </p>
          </div>
        ) : posts && posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post, index) => (
              <RevealOnScroll key={post.id} delay={index * 0.1}>
                <BlogCard post={post} />
              </RevealOnScroll>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-muted-foreground">
              No blog posts available yet. Check back soon!
            </p>
          </div>
        )}

        {/* Newsletter CTA */}
        <RevealOnScroll>
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
                className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-md hover:bg-primary/90 transition-colors font-medium"
              >
                <span>Book Your Diagnostic</span>
                <ArrowRight className="w-4 h-4" />
              </a>
              <a 
                href="https://www.linkedin.com/company/aetheris-ai" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 text-amber hover:text-amber/80 transition-colors"
              >
                <span>Connect on LinkedIn</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
};
