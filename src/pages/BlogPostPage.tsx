import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Calendar, User, MapPin, Download, Loader2 } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RelatedPosts } from '@/components/RelatedPosts';
import { ShareButtons } from '@/components/ShareButtons';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

import { getImageForSlug } from '@/components/BlogCard';
import { generateBlogPdf } from '@/lib/generateBlogPdf';
import { BlogMidCTA } from '@/components/BlogMidCTA';
import { articleSchema, breadcrumbSchema, speakableSchema, combineSchemas } from '@/lib/schemas';

const SITE_URL = 'https://aetheris.technology';

// Clean up encoding artifacts
const cleanText = (text: string): string => {
  return text
    .replace(/â€"/g, '—')
    .replace(/â€"/g, '–')
    .replace(/â€œ/g, '"')
    .replace(/â€[^a-zA-Z]/g, '"')
    .replace(/â€™/g, "'")
    .replace(/â€˜/g, "'")
    .replace(/Ã©/g, 'é')
    .replace(/Ã¨/g, 'è')
    .replace(/Ã¢/g, 'â')
    .replace(/â€¦/g, '…')
    .replace(/â€¢/g, '•')
    .replace(/[\u0080-\u009F]/g, '')
    .replace(/â/g, '');
};

const isHtmlContent = (content: string): boolean => {
  return /<(table|div|h[1-6]|p|ul|ol|li|tr|td|th|thead|tbody|strong|em|a|br|hr)\b/i.test(content);
};

const markdownToHtml = (content: string): string => {
  return content
    .split('\n')
    .map(line => {
      const t = line.trim();
      if (t.startsWith('### ')) return `<h3>${t.slice(4)}</h3>`;
      if (t.startsWith('## ')) return `<h2>${t.slice(3)}</h2>`;
      if (t.startsWith('# ')) return `<h1>${t.slice(2)}</h1>`;
      if (t.startsWith('- ') || t.startsWith('• ')) return `<li>${t.slice(2)}</li>`;
      if (/^\d+\.\s/.test(t)) return `<li>${t.replace(/^\d+\.\s/, '')}</li>`;
      if (t === '---' || t === '***') return '<hr />';
      if (t === '') return '<br />';
      if (t.startsWith('|') && t.endsWith('|')) {
        if (t.replace(/[|\-\s:]/g, '') === '') return '';
        const cells = t.split('|').filter(c => c.trim() !== '');
        return `<tr>${cells.map(c => `<td>${c.trim()}</td>`).join('')}</tr>`;
      }
      let text = t
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
      return `<p>${text}</p>`;
    })
    .join('\n');
};

const prepareContent = (content: string): string => {
  const cleaned = cleanText(content);
  const html = isHtmlContent(cleaned) ? cleaned : markdownToHtml(cleaned);
  
  return html
    .replace(/<table(?![^>]*class)/g, '<table class="w-full border-collapse my-6 text-sm"')
    .replace(/<th(?![^>]*class)/g, '<th class="text-left p-3 border border-white/10 bg-white/5 font-semibold"')
    .replace(/<td(?![^>]*class)/g, '<td class="p-3 border border-white/10"')
    .replace(/<h1(?![^>]*class)/g, '<h1 class="text-3xl md:text-4xl font-bold mt-8 mb-4"')
    .replace(/<h2(?![^>]*class)/g, '<h2 class="text-2xl font-bold mt-6 mb-3"')
    .replace(/<h3(?![^>]*class)/g, '<h3 class="text-xl font-semibold mt-4 mb-2"')
    .replace(/<p>(?!<)/g, '<p class="my-2 leading-relaxed opacity-80">')
    .replace(/<li>(?!<)/g, '<li class="ml-6 my-1 leading-relaxed opacity-80">')
    .replace(/<a(?![^>]*class)/g, '<a class="text-amber-400 hover:underline"')
    .replace(/<strong>(?!<)/g, '<strong class="font-semibold opacity-100">');
};

const BlogPostPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

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
  const postUrl = `${SITE_URL}/blog/${slug}`;

  // Combined Article + Breadcrumb + Speakable JSON-LD
  const articleJsonLd = post
    ? combineSchemas(
        articleSchema({
          title: post.title,
          description: post.meta_description || post.excerpt,
          author: post.author,
          datePublished: post.published_at,
          dateModified: post.updated_at,
          image: post.featured_image || featuredImage || undefined,
          url: postUrl,
          keywords: post.tags || [],
          section: post.location_focus || 'AI Consulting',
        }),
        breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Blog', path: '/blog' },
          { name: post.title, path: `/blog/${slug}` },
        ]),
        speakableSchema(['h1', '.tldr', 'article p:first-of-type'])
      )
    : undefined;

  const blogKeywords = post
    ? [...(post.tags || []), 'AI consulting Indianapolis', 'AI strategy', 'B2B AI consulting'].join(', ')
    : undefined;

  return (
    <div className="relative min-h-screen bg-background">
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />

        {post && (
          <SEOHead
            title={post.title}
            description={post.meta_description || post.excerpt}
            path={`/blog/${slug}`}
            type="article"
            image={post.featured_image || featuredImage || undefined}
            imageAlt={post.title}
            keywords={blogKeywords}
            jsonLd={articleJsonLd}
            articleMeta={{
              publishedTime: post.published_at || undefined,
              modifiedTime: post.updated_at || undefined,
              author: post.author,
              section: post.location_focus || 'AI Consulting',
              tags: post.tags || [],
            }}
          />
        )}
        
        <article className="pt-32 pb-20 px-4">
          <div className="max-w-4xl mx-auto">
            <Link to="/blog">
              <Button variant="ghost" className="mb-8 gap-2">
                <ArrowLeft className="w-4 h-4" /> Back to Blog
              </Button>
            </Link>

            {isLoading ? (
              <div className="text-center py-20">
                <p className="text-muted-foreground">Loading article…</p>
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
                  <div className="mb-8 rounded-2xl overflow-hidden relative">
                    <img 
                      src={featuredImage} 
                      alt={post.title}
                      className="w-full h-64 md:h-96 object-cover"
                    />
                    <span className="absolute bottom-3 right-3 text-xs font-semibold text-white/80 bg-black/50 px-2 py-1 rounded backdrop-blur-sm">
                      Aetheris AI Studio
                    </span>
                  </div>
                )}

                {/* Post Header */}
                <header className="mb-12">
                  <div className="flex items-start justify-between gap-4 mb-6">
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold">
                      {post.title}
                    </h1>
                    <button
                      onClick={async () => {
                        setIsGeneratingPdf(true);
                        try {
                          await generateBlogPdf({
                            title: post.title,
                            author: post.author,
                            published_at: post.published_at,
                            location_focus: post.location_focus,
                            tags: post.tags,
                            content: post.content,
                            slug: post.slug,
                            imageUrl: featuredImage,
                          });
                        } finally {
                          setIsGeneratingPdf(false);
                        }
                      }}
                      disabled={isGeneratingPdf}
                      className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg glass border border-border text-sm font-medium text-muted-foreground hover:text-amber hover:border-amber/40 transition-colors disabled:opacity-50"
                      title="Download as PDF"
                    >
                      {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      <span className="hidden sm:inline">{isGeneratingPdf ? 'Generating...' : 'Download PDF'}</span>
                    </button>
                  </div>
                  
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

                  {/* AEO TL;DR — AI engines extract this verbatim */}
                  {post.excerpt && (
                    <div
                      className="tldr glass rounded-xl border border-amber/30 p-4 md:p-5 mb-6"
                      data-speakable="true"
                    >
                      <div className="text-xs font-bold text-amber uppercase tracking-wider mb-1">
                        TL;DR
                      </div>
                      <p className="text-sm md:text-base text-foreground/90 leading-relaxed m-0">
                        {post.excerpt}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap gap-2">
                      {(post.tags && post.tags.length > 0 ? post.tags : ['AI', 'Innovation', 'Technology', 'Leadership', 'DigitalMarketing'])
                        .filter((tag: string) => tag !== 'TheArchitect' && tag !== 'AetherisTechnology')
                        .slice(0, 5)
                        .map((tag: string) => (
                        <span 
                          key={tag}
                          className="inline-flex items-center text-sm font-medium text-amber"
                        >
                          #{tag.replace(/\s+/g, '')}
                        </span>
                      ))}
                    </div>
                    <ShareButtons url={postUrl} title={post.title} />
                  </div>
                </header>

                {/* Post Content with Mid-Scroll CTA */}
                {(() => {
                  const html = prepareContent(post.content);
                  const h2Matches = [...html.matchAll(/<h2[\s>]/gi)];
                  const midIndex = h2Matches.length >= 2
                    ? h2Matches[Math.floor(h2Matches.length / 2)].index
                    : Math.floor(html.length / 2);
                  const firstHalf = html.slice(0, midIndex);
                  const secondHalf = html.slice(midIndex);
                  return (
                    <>
                      <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: firstHalf }} />
                      <BlogMidCTA />
                      <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: secondHalf }} />
                    </>
                  );
                })()}

                {/* Share again at bottom */}
                <div className="mt-12 pt-6 border-t border-border">
                  <ShareButtons url={postUrl} title={post.title} />
                </div>

                {/* Related Posts */}
                <RelatedPosts currentPostId={post.id} tags={post.tags || []} />

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
                      href="mailto:hello@aetheris.technology?subject=14-Day%20Operational%20Systems%20Diagnostic"
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
                      href="mailto:hello@aetheris.technology" 
                      className="hover:text-amber transition-colors"
                    >
                      📧 hello@aetheris.technology
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
