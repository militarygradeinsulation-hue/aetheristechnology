import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, User, MapPin, ArrowRight, Tag } from 'lucide-react';
import { format } from 'date-fns';
import architectLogo from '@/assets/architect-logo.jpg';

// Re-export for backwards compat — always returns the Architect logo
export const getImageForSlug = (_slug: string): string => architectLogo;

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  author: string;
  published_at: string | null;
  tags: string[] | null;
  location_focus: string | null;
  featured_image: string | null;
}

interface BlogCardProps {
  post: BlogPost;
  caseFileNumber: number;
}

export const BlogCard: React.FC<BlogCardProps> = ({ post, caseFileNumber }) => {
  const caseId = String(caseFileNumber).padStart(3, '0');

  return (
    <Link
      to={`/blog/${post.slug}`}
      className="block premium-tile rounded-xl overflow-hidden h-full group"
    >
      {/* Case File Image */}
      <div className="h-64 bg-[#0c0c0c] overflow-hidden relative flex items-center justify-center">
        <img
          src={architectLogo}
          alt="The Architect"
          loading="lazy"
          decoding="async"
          className="h-48 w-auto object-contain opacity-90 group-hover:opacity-100 transition-opacity"
        />
        {/* Case File Badge */}
        <span className="absolute top-2 left-2 text-[10px] font-bold tracking-widest text-white bg-crimson px-2 py-1 rounded font-mono uppercase">
          Case File #{caseId}
        </span>
        {/* Watermark */}
        <span className="absolute bottom-2 right-2 text-[10px] font-semibold text-white/70 bg-black/40 px-1.5 py-0.5 rounded backdrop-blur-sm">
          Aetheris AI Studio
        </span>
      </div>

      <div className="p-6">
        {/* Industry Label */}
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono mb-2">
          Industry: Commercial playground manufacturer
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-3">
          {(post.tags && post.tags.length > 0 ? post.tags : ['AI', 'Innovation', 'Technology', 'Leadership', 'DigitalMarketing'])
            .filter(tag => tag !== 'TheArchitect' && tag !== 'AetherisTechnology')
            .slice(0, 5)
            .map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 text-xs bg-amber/10 text-amber px-2 py-1 rounded-full"
              >
                <Tag className="w-3 h-3" />
                #{tag.replace(/\s+/g, '')}
              </span>
            ))}
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold mb-3 line-clamp-2 font-display">
          {post.title}
        </h3>

        {/* Excerpt */}
        <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
          {post.excerpt}
        </p>

        {/* Meta */}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {post.author}
          </div>
          {post.published_at && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(new Date(post.published_at), 'MMM d, yyyy')}
            </div>
          )}
          {post.location_focus && (
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {post.location_focus}
            </div>
          )}
        </div>

        {/* Read More */}
        <div className="flex items-center gap-2 text-amber text-sm font-medium">
          Read More <ArrowRight className="w-4 h-4" />
        </div>
      </div>
    </Link>
  );
};
