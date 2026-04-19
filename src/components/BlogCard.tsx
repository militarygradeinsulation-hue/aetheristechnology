import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, User, MapPin, ArrowRight, Tag } from 'lucide-react';
import { format } from 'date-fns';

// Import blog images - unique per post
import marketingVoidImage from '@/assets/blog/marketing-posting-void.jpg';
import chatgptOperatorImage from '@/assets/blog/chatgpt-operator-waste.jpg';
import aiHammerImage from '@/assets/blog/ai-not-same-hammer.jpg';
import crmGraveyardImage from '@/assets/blog/crm-graveyard-leads.jpg';
import budgetWastedImage from '@/assets/blog/200k-budget-wasted.jpg';
import healthcareBleedingImage from '@/assets/blog/healthcare-bleeding-money.jpg';
import constructionMarketingImage from '@/assets/blog/construction-website-marketing.jpg';
import restaurantWasteImage from '@/assets/blog/restaurant-social-media-waste.jpg';
import digitalTransformImage from '@/assets/blog/digital-transformation-waste.jpg';
import websiteTombstoneImage from '@/assets/blog/website-digital-tombstone.jpg';
import socialMediaLeadsImage from '@/assets/blog/social-media-zero-leads.jpg';
import emailMarketingImage from '@/assets/blog/email-marketing-dead.jpg';
import logisticsDrowningImage from '@/assets/blog/logistics-drowning-data.jpg';
import manufacturingCashImage from '@/assets/blog/manufacturing-bleeding-cash.jpg';
import seoScamImage from '@/assets/blog/seo-scam-agency.jpg';
import competitorsImage from '@/assets/blog/competitors-eating-lunch.jpg';
// New category images
import excelNotCrmImage from '@/assets/blog/team-using-excel-not-crm.jpg';
import echoChamberImage from '@/assets/blog/echo-chamber-engagement.jpg';
import resistanceChangeImage from '@/assets/blog/resistance-to-change.jpg';
import outdatedMarketingImage from '@/assets/blog/outdated-marketing-tactics.jpg';
import linkedinZeroImage from '@/assets/blog/linkedin-zero-engagement.jpg';
import teamDysfunctionImage from '@/assets/blog/internal-team-dysfunction.jpg';
import manualProcessesImage from '@/assets/blog/manual-processes-burning-cash.jpg';
import ceoCrossroadsImage from '@/assets/blog/ceo-crossroads-change.jpg';
import salesIgnoringCrmImage from '@/assets/blog/sales-team-ignoring-crm.jpg';
import linkedinNotTiktokImage from '@/assets/blog/linkedin-not-tiktok.jpg';

// Map slugs to their unique themed images
const blogImages: Record<string, string> = {
  'your-marketing-team-posting-into-void': marketingVoidImage,
  'you-hired-65k-chatgpt-operator': chatgptOperatorImage,
  'not-all-ai-same-stop-treating-like-hammer': aiHammerImage,
  'your-crm-graveyard-dead-leads': crmGraveyardImage,
  'the-200k-marketing-budget-zero-trackable-revenue': budgetWastedImage,
  'healthcare-bleeding-money-bad-digital-strategy': healthcareBleedingImage,
  'construction-companies-think-website-is-marketing': constructionMarketingImage,
  'restaurants-spending-3k-social-media-no-reservations': restaurantWasteImage,
  'stop-calling-it-digital-transformation': digitalTransformImage,
  'your-website-isnt-a-sales-tool': websiteTombstoneImage,
  'paying-4000-month-social-media-zero-leads': socialMediaLeadsImage,
  'email-marketing-dead-bad-automation': emailMarketingImage,
  'logistics-companies-drowning-data-never-use': logisticsDrowningImage,
  'manufacturing-lean-operation-bleeding-cash': manufacturingCashImage,
  'seo-scam-agency-cant-show-single-customer': seoScamImage,
  'competitors-eating-lunch-same-ai-tools': competitorsImage,
};

// Keyword-based image matching for dynamic posts
const keywordImageMap: Array<{ keywords: string[]; image: string }> = [
  { keywords: ['excel', 'spreadsheet', 'data-team', 'manual-data'], image: excelNotCrmImage },
  { keywords: ['echo-chamber', 'same-people', 'employees-like', 'hostage', 'followers'], image: echoChamberImage },
  { keywords: ['resist', 'wont-change', 'always-done', 'fax', 'vetoes', 'old-way'], image: resistanceChangeImage },
  { keywords: ['outdated', '2019', '2018', 'old-marketing', 'hubspot-blog', 'post-3-times'], image: outdatedMarketingImage },
  { keywords: ['linkedin', 'zero-engagement', '12-likes', 'zero-comments', 'no-engagement'], image: linkedinZeroImage },
  { keywords: ['internal-team', 'team-hurt', 'dysfunction', 'department', 'it-bottleneck'], image: teamDysfunctionImage },
  { keywords: ['manual', 'burning-cash', 'onboarding', 'paper', 'hr-process'], image: manualProcessesImage },
  { keywords: ['ceo', 'crossroads', 'growth', 'leadership', 'owner-won'], image: ceoCrossroadsImage },
  { keywords: ['sales-team', 'crm-avoid', 'sticky-note', 'pipeline', 'sales-ignor'], image: salesIgnoringCrmImage },
  { keywords: ['tiktok', 'not-tiktok', 'treating-like', 'dance', 'casual'], image: linkedinNotTiktokImage },
  { keywords: ['marketing', 'posting', 'void', 'content'], image: marketingVoidImage },
  { keywords: ['chatgpt', 'operator', 'salary', 'prompt'], image: chatgptOperatorImage },
  { keywords: ['ai-tool', 'hammer', 'same-ai', 'different-tool'], image: aiHammerImage },
  { keywords: ['crm', 'graveyard', 'dead-lead', 'lead-scor'], image: crmGraveyardImage },
  { keywords: ['budget', 'wasted', 'revenue', 'attribution', 'utm'], image: budgetWastedImage },
  { keywords: ['healthcare', 'patient', 'practice', 'medical'], image: healthcareBleedingImage },
  { keywords: ['construction', 'contractor', 'bid'], image: constructionMarketingImage },
  { keywords: ['restaurant', 'reservation', 'food'], image: restaurantWasteImage },
  { keywords: ['transform', 'digital-transform'], image: digitalTransformImage },
  { keywords: ['website', 'tombstone', 'brochure'], image: websiteTombstoneImage },
  { keywords: ['social-media', 'social', 'zero-leads'], image: socialMediaLeadsImage },
  { keywords: ['email', 'automation', 'newsletter'], image: emailMarketingImage },
  { keywords: ['logistics', 'supply-chain', 'warehouse'], image: logisticsDrowningImage },
  { keywords: ['manufacturing', 'lean', 'factory'], image: manufacturingCashImage },
  { keywords: ['seo', 'agency', 'scam'], image: seoScamImage },
  { keywords: ['competitor', 'eating-lunch', 'behind'], image: competitorsImage },
];

const allImages = [
  marketingVoidImage, chatgptOperatorImage, aiHammerImage, crmGraveyardImage,
  budgetWastedImage, healthcareBleedingImage, constructionMarketingImage,
  restaurantWasteImage, digitalTransformImage, websiteTombstoneImage,
  socialMediaLeadsImage, emailMarketingImage, logisticsDrowningImage,
  manufacturingCashImage, seoScamImage, competitorsImage,
  excelNotCrmImage, echoChamberImage, resistanceChangeImage, outdatedMarketingImage,
  linkedinZeroImage, teamDysfunctionImage, manualProcessesImage, ceoCrossroadsImage,
  salesIgnoringCrmImage, linkedinNotTiktokImage,
];

export const getImageForSlug = (slug: string): string => {
  // 1. Exact slug match
  if (blogImages[slug]) return blogImages[slug];
  
  // 2. Keyword-based match from slug
  for (const entry of keywordImageMap) {
    if (entry.keywords.some(kw => slug.includes(kw))) {
      return entry.image;
    }
  }
  
  // 3. Deterministic fallback from expanded pool
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = ((hash << 5) - hash) + slug.charCodeAt(i);
    hash |= 0;
  }
  return allImages[Math.abs(hash) % allImages.length];
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
  // Prioritize unique featured_image from DB, fall back to static mapping
  const imageUrl = post.featured_image || getImageForSlug(post.slug);

  return (
    <Link 
      to={`/blog/${post.slug}`}
      className="block glass rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-lg group h-full"
    >
      {/* Featured Image */}
      <div className="h-48 bg-gradient-to-br from-primary/20 to-amber/20 overflow-hidden relative">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={post.title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-6xl opacity-50">📝</div>
          </div>
        )}
        <span className="absolute bottom-2 right-2 text-[10px] font-semibold text-white/70 bg-black/40 px-1.5 py-0.5 rounded backdrop-blur-sm">
          Aetheris AI Studio
        </span>
      </div>

      <div className="p-6">
        {/* Tags - top 5 trending hashtags */}
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
