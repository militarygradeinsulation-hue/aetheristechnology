import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getImageForSlug } from '@/components/BlogCard';
import { blogPostsSnapshot } from '@/data/blogPostsSnapshot';

interface RelatedPostsProps {
  currentPostId: string;
  tags: string[];
}

export const RelatedPosts: React.FC<RelatedPostsProps> = ({ currentPostId, tags }) => {
  const { data: posts } = useQuery({
    queryKey: ['related-posts', currentPostId],
    queryFn: async () => {
      if (!tags || tags.length === 0) return [];
      try {
        const { data, error } = await supabase
          .from('blog_posts')
          .select('id, title, slug, excerpt, published_at, tags')
          .eq('is_published', true)
          .neq('id', currentPostId)
          .overlaps('tags', tags)
          .limit(3);
        if (error) throw error;
        return data || [];
      } catch {
        return Array.from(blogPostsSnapshot as ReadonlyArray<{ id: string; title: string; slug: string; excerpt: string; published_at: string | null; tags: readonly string[] | null }>)
          .filter((post) => post.id !== currentPostId && (post.tags || []).some((tag) => tags.includes(tag)))
          .map((post) => ({ ...post, tags: post.tags ? [...post.tags] : null }))
          .slice(0, 3);
      }
    },
    enabled: !!currentPostId && !!tags?.length,
  });

  if (!posts || posts.length === 0) return null;

  return (
    <section className="mt-16 border-t border-border pt-12">
      <h2 className="text-2xl font-bold mb-8 font-display">Related Articles</h2>
      <div className="grid md:grid-cols-3 gap-6">
        {posts.map((post) => {
          const img = getImageForSlug(post.slug);
          return (
            <Link key={post.id} to={`/blog/${post.slug}`} className="glass rounded-xl overflow-hidden hover:border-amber/40 border border-transparent transition-colors group">
              {img && (
                <img src={img} alt={post.title} className="w-full h-40 object-cover" loading="lazy" />
              )}
              <div className="p-4">
                <h3 className="font-semibold text-sm leading-tight group-hover:text-amber transition-colors line-clamp-2">{post.title}</h3>
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{post.excerpt}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
};
