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
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-cyan text-sm font-medium mb-6">
              <BookOpen className="w-4 h-4" />
              AI Insights for Indiana Businesses
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              The Aetheris{' '}
              <span className="bg-gradient-to-r from-cyan to-primary bg-clip-text text-transparent">
                AI Blog
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Expert insights on AI automation, machine learning, and digital transformation 
              for Indiana businesses. Stay ahead of the curve with our latest articles.
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
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Stay Updated on AI Trends
            </h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Get the latest AI insights delivered to your inbox. We share practical tips, 
              industry news, and success stories from Indiana businesses.
            </p>
            <div className="flex items-center justify-center gap-2 text-cyan">
              <span>Contact us to subscribe</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
};
