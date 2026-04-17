import { Helmet } from 'react-helmet-async';
import React from 'react';

interface SEOHeadProps {
  title: string;
  description: string;
  path: string;
  type?: string;
  image?: string;
  imageAlt?: string;
  keywords?: string;
  jsonLd?: Record<string, unknown>;
}

const SITE_URL = 'https://aetheris.technology';
const SITE_NAME = 'Aetheris AI';
const OG_IMAGE = `${SITE_URL}/aetheris-logo.png`;
const DEFAULT_IMAGE_ALT = 'Aetheris AI — Indianapolis AI Consulting & Automation';

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

// Smart suffix: only append " | Aetheris AI" when title already lacks brand and has room.
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
}) => {
  const fullUrl = `${SITE_URL}${path}`;
  const fullTitle = finalizeTitle(title);
  const fullDescription = truncate(description, MAX_DESC);
  const ogImage = image || OG_IMAGE;
  const ogImageAlt = imageAlt || DEFAULT_IMAGE_ALT;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={fullDescription} />
      {keywords && <meta name="keywords" content={keywords} />}
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

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={fullDescription} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={ogImageAlt} />

      {/* JSON-LD */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
};
