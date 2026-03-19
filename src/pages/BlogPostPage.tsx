import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Calendar, User, MapPin, Tag } from 'lucide-react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

import { getImageForSlug } from '@/components/BlogCard';

const BlogPostPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  const { data: post, isLoading, error } = useQuery({
    queryKey: ['blog-post', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  const featuredImage = slug ? getImageForSlug(slug) : null;

  // Simple markdown to HTML conversion
  const renderContent = (content: string) => {
    return content
      .split('\n')
      .map((line, index) => {
        // Headers
        if (line.startsWith('# ')) {
          return <h1 key={index} className="text-3xl md:text-4xl font-bold mt-8 mb-4">{line.slice(2)}</h1>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={index} className="text-2xl font-bold mt-6 mb-3">{line.slice(3)}</h2>;
        }
        if (line.startsWith('### ')) {
          return <h3 key={index} className="text-xl font-semibold mt-4 mb-2">{line.slice(4)}</h3>;
        }
        // Bold text
        if (line.startsWith('**') && line.endsWith('**')) {
          return <p key={index} className="font-semibold my-2">{line.slice(2, -2)}</p>;
        }
        // List items
        if (line.startsWith('- ')) {
          return <li key={index} className="ml-6 my-1">{line.slice(2)}</li>;
        }
        // Empty lines
        if (line.trim() === '') {
          return <br key={index} />;
        }
        // Regular paragraphs
        return <p key={index} className="my-2 text-muted-foreground leading-relaxed">{line}</p>;
      });
  };

  return (
    <div className="relative min-h-screen">
      <Background />
      
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />
        
        <article className="pt-32 pb-20 px-4">
          <div className="max-w-4xl mx-auto">
            <Link to="/blog">
              <Button variant="ghost" className="mb-8 gap-2">
                <ArrowLeft className="w-4 h-4" /> Back to Blog
              </Button>
            </Link>

            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-3/4" />
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-96 w-full" />
              </div>
            ) : error || !post ? (
              <div className="text-center py-20">
                <h1 className="text-2xl font-bold mb-4">Post Not Found</h1>
                <p className="text-muted-foreground mb-6">
                  The blog post you're looking for doesn't exist or has been removed.
                </p>
                <Link to="/blog">
                  <Button>View All Posts</Button>
                </Link>
              </div>
            ) : (
              <>
                {/* Featured Image */}
                {featuredImage && (
                  <div className="mb-8 rounded-2xl overflow-hidden">
                    <img 
                      src={featuredImage} 
                      alt={post.title}
                      className="w-full h-64 md:h-96 object-cover"
                    />
                  </div>
                )}

                {/* Post Header */}
                <header className="mb-12">
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
                    {post.title}
                  </h1>
                  
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-6">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {post.author}
                    </div>
                    {post.published_at && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(post.published_at), 'MMMM d, yyyy')}
                      </div>
                    )}
                    {post.location_focus && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {post.location_focus}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center text-sm font-medium text-amber">#TheArchitect</span>
                    <span className="inline-flex items-center text-sm font-medium text-amber">#AetherisTechnology</span>
                    {post.tags && post.tags.length > 0 && post.tags
                      .filter((tag: string) => tag !== 'TheArchitect' && tag !== 'AetherisTechnology')
                      .map((tag: string) => (
                      <span 
                        key={tag}
                        className="inline-flex items-center text-sm font-medium text-amber"
                      >
                        #{tag.replace(/\s+/g, '')}
                      </span>
                    ))}
                  </div>
                </header>

                {/* Post Content */}
                <div className="prose prose-invert max-w-none">
                  {renderContent(post.content)}
                </div>

                {/* CTA */}
                <div className="mt-16 glass rounded-2xl p-8 md:p-12 text-center">
                  <h2 className="text-2xl md:text-3xl font-bold mb-4 font-display">
                    Stop Wasting Money. Start Building Systems That Work.
                  </h2>
                  <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                    Our 14-Day Operational Systems Diagnostic exposes exactly where your business 
                    is leaking revenue — and builds the AI-powered systems to fix it. Investment: $5,000-$10,000.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
                    <a 
                      href="mailto:aetheris.technology@outlook.com?subject=14-Day%20Operational%20Systems%20Diagnostic"
                      className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-md hover:bg-primary/90 transition-colors font-medium"
                    >
                      Book Your Diagnostic
                      <ArrowRight className="w-5 h-5" />
                    </a>
                    <a 
                      href="tel:+13173762110"
                      className="inline-flex items-center justify-center gap-2 glass-hover border border-border px-6 py-3 rounded-md transition-colors font-medium"
                    >
                      Call: (317) 376-2110
                    </a>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-muted-foreground">
                    <a 
                      href="mailto:aetheris.technology@outlook.com" 
                      className="hover:text-amber transition-colors"
                    >
                      📧 aetheris.technology@outlook.com
                    </a>
                    <a 
                      href="https://www.linkedin.com/in/aisystemsarchitect" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:text-amber transition-colors"
                    >
                      🔗 Connect on LinkedIn
                    </a>
                  </div>
                </div>
              </>
            )}
          </div>
        </article>

        <Footer />
      </div>

      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
      />
    </div>
  );
};

export default BlogPostPage;
