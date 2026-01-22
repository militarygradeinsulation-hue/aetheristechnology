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
const blogImages: Record<string, string> = {
  'indianapolis-businesses-ai-competition': indianapolisAiImage,
  'ai-automation-indiana-manufacturing-guide': manufacturingAiImage,
  'ai-transforming-indiana-healthcare': healthcareAiImage,
  'ai-indiana-logistics-supply-chain-hub': logisticsImage,
  'ai-powered-retail-indiana-stores-machine-learning': retailImage,
  'ai-transforming-indiana-construction-industry': constructionImage,
  'ai-indiana-small-business-affordable-solutions': smallBusinessImage,
  'optimizing-indiana-distribution-centers-ai-advantage': distributionImage,
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
      <div className="h-48 bg-gradient-to-br from-primary/20 to-cyan/20 overflow-hidden">
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
                className="inline-flex items-center gap-1 text-xs bg-cyan/10 text-cyan px-2 py-1 rounded-full"
              >
                <Tag className="w-3 h-3" />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h3 className="text-xl font-bold mb-3 group-hover:text-cyan transition-colors line-clamp-2">
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
        <div className="flex items-center gap-2 text-cyan text-sm font-medium group-hover:gap-3 transition-all">
          Read More <ArrowRight className="w-4 h-4" />
        </div>
      </div>
    </Link>
  );
};
