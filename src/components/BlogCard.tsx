import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, User, MapPin, ArrowRight, Tag } from 'lucide-react';
import { format } from 'date-fns';

// Import blog images
import indianapolisAiImage from '@/assets/blog/indianapolis-ai-competition.jpg';
import manufacturingAiImage from '@/assets/blog/manufacturing-ai-guide.jpg';
import healthcareAiImage from '@/assets/blog/healthcare-ai-transformation.jpg';
import logisticsImage from '@/assets/blog/logistics-supply-chain.jpg';
import retailImage from '@/assets/blog/retail-ai-powered.jpg';
import constructionImage from '@/assets/blog/construction-ai-building.jpg';
import smallBusinessImage from '@/assets/blog/small-business-ai.jpg';
import distributionImage from '@/assets/blog/distribution-center-ai.jpg';

// Map slugs to images
// Map slugs to images - for posts without a mapped image, we cycle through defaults
const blogImages: Record<string, string> = {
  'your-marketing-team-posting-into-void': logisticsImage,
  'you-hired-65k-chatgpt-operator': smallBusinessImage,
  'not-all-ai-same-stop-treating-like-hammer': manufacturingAiImage,
  'your-crm-graveyard-dead-leads': distributionImage,
  'the-200k-marketing-budget-zero-trackable-revenue': retailImage,
  'healthcare-bleeding-money-bad-digital-strategy': healthcareAiImage,
  'construction-companies-think-website-is-marketing': constructionImage,
  'restaurants-spending-3k-social-media-no-reservations': indianapolisAiImage,
  'stop-calling-it-digital-transformation': retailImage,
  'your-website-isnt-a-sales-tool': constructionImage,
  'paying-4000-month-social-media-zero-leads': smallBusinessImage,
  'email-marketing-dead-bad-automation': distributionImage,
  'logistics-companies-drowning-data-never-use': logisticsImage,
  'manufacturing-lean-operation-bleeding-cash': manufacturingAiImage,
  'seo-scam-agency-cant-show-single-customer': healthcareAiImage,
  'competitors-eating-lunch-same-ai-tools': indianapolisAiImage,
};

const defaultImages = [logisticsImage, smallBusinessImage, manufacturingAiImage, distributionImage, retailImage, healthcareAiImage, constructionImage, indianapolisAiImage];

export const getImageForSlug = (slug: string): string => {
  if (blogImages[slug]) return blogImages[slug];
  // Deterministic fallback based on slug hash
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = ((hash << 5) - hash) + slug.charCodeAt(i);
    hash |= 0;
  }
  return defaultImages[Math.abs(hash) % defaultImages.length];
};

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
}

export const BlogCard: React.FC<BlogCardProps> = ({ post }) => {
  const imageUrl = blogImages[post.slug] || post.featured_image;

  return (
    <Link 
      to={`/blog/${post.slug}`}
      className="block glass rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-lg group h-full"
    >
      {/* Featured Image */}
      <div className="h-48 bg-gradient-to-br from-primary/20 to-amber/20 overflow-hidden">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={post.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-6xl opacity-50">📝</div>
          </div>
        )}
      </div>

      <div className="p-6">
        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {post.tags.slice(0, 2).map((tag) => (
              <span 
                key={tag}
                className="inline-flex items-center gap-1 text-xs bg-amber/10 text-amber px-2 py-1 rounded-full"
              >
                <Tag className="w-3 h-3" />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h3 className="text-xl font-bold mb-3 group-hover:text-amber transition-colors line-clamp-2 font-display">
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
        <div className="flex items-center gap-2 text-amber text-sm font-medium group-hover:gap-3 transition-all">
          Read More <ArrowRight className="w-4 h-4" />
        </div>
      </div>
    </Link>
  );
};
