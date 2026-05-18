import { Helmet } from 'react-helmet-async';
import React from 'react';
import {
  breadcrumbSchema,
  faqSchema,
  speakableSchema,
  combineSchemas,
  type BreadcrumbItem,
  type FAQItem,
} from '@/lib/schemas';
import { useSEOOverride } from '@/hooks/useSEOOverride';

interface SEOHeadProps {
  title: string;
  description: string;
  path: string;
  type?: string;
  image?: string;
  imageAlt?: string;
  keywords?: string;
  jsonLd?: Record<string, unknown>;
  breadcrumbs?: BreadcrumbItem[];
  faqs?: FAQItem[];
  speakable?: string[]; // CSS selectors for voice/AEO
  articleMeta?: {
    publishedTime?: string;
    modifiedTime?: string;
    author?: string;
    section?: string;
    tags?: string[];
  };
}

const SITE_URL = 'https://aetheris.technology';
const SITE_NAME = 'Aetheris AI';
const OG_IMAGE = `${SITE_URL}/aetheris-logo.png`;
const DEFAULT_IMAGE_ALT = 'Aetheris AI, Indianapolis AI Consulting & Automation';

const MAX_TITLE = 60;
const MAX_DESC = 155;
const SUFFIX = ' | Aetheris AI';

const truncate = (s: string, max: number) => {
  if (!s) return s;
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max - 25 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…';
};

const finalizeTitle = (title: string): string => {
  const base = truncate(title, MAX_TITLE);
  const hasBrand = /aetheris/i.test(base);
  if (hasBrand) return base;
  if (base.length + SUFFIX.length <= MAX_TITLE) return base + SUFFIX;
  return base;
};

export const SEOHead: React.FC<SEOHeadProps> = ({
  title,
  description,
  path,
  type = 'website',
  image,
  imageAlt,
  keywords,
  jsonLd,
  breadcrumbs,
  faqs,
  speakable,
  articleMeta,
}) => {
  // Live AI-optimized override (DB-driven, applied at render time)
  const override = useSEOOverride(path);
  const effectiveTitle = override?.title || title;
  const effectiveDescription = override?.description || description;
  const effectiveKeywords = override?.keywords || keywords;
  const effectiveFaqs = (override?.faqs && override.faqs.length > 0) ? override.faqs : faqs;

  const fullUrl = `${SITE_URL}${path}`;
  const fullTitle = finalizeTitle(effectiveTitle);
  const fullDescription = truncate(effectiveDescription, MAX_DESC);
  const ogImage = image || OG_IMAGE;
  const ogImageAlt = imageAlt || DEFAULT_IMAGE_ALT;

  // Build combined JSON-LD graph
  const schemas: Record<string, unknown>[] = [];
  if (jsonLd) schemas.push(jsonLd);
  if (breadcrumbs && breadcrumbs.length > 0) schemas.push(breadcrumbSchema(breadcrumbs));
  if (effectiveFaqs && effectiveFaqs.length > 0) schemas.push(faqSchema(effectiveFaqs));
  if (speakable && speakable.length > 0) schemas.push(speakableSchema(speakable));

  const combinedSchema =
    schemas.length === 0
      ? null
      : schemas.length === 1
      ? schemas[0]
      : combineSchemas(...schemas);

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={fullDescription} />
      {effectiveKeywords && <meta name="keywords" content={effectiveKeywords} />}
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      <link rel="canonical" href={fullUrl} />
      <link rel="alternate" hrefLang="en-us" href={fullUrl} />
      <link rel="alternate" hrefLang="x-default" href={fullUrl} />

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={fullDescription} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:alt" content={ogImageAlt} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_US" />

      {/* Article-specific OG (only when type=article) */}
      {type === 'article' && articleMeta?.publishedTime && (
        <meta property="article:published_time" content={articleMeta.publishedTime} />
      )}
      {type === 'article' && articleMeta?.modifiedTime && (
        <meta property="article:modified_time" content={articleMeta.modifiedTime} />
      )}
      {type === 'article' && articleMeta?.author && (
        <meta property="article:author" content={articleMeta.author} />
      )}
      {type === 'article' && articleMeta?.section && (
        <meta property="article:section" content={articleMeta.section} />
      )}
      {type === 'article' &&
        articleMeta?.tags?.map(tag => (
          <meta key={tag} property="article:tag" content={tag} />
        ))}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={fullDescription} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={ogImageAlt} />

      {/* JSON-LD (combined graph if multiple) */}
      {combinedSchema && (
        <script type="application/ld+json">
          {JSON.stringify(combinedSchema)}
        </script>
      )}
    </Helmet>
  );
};
