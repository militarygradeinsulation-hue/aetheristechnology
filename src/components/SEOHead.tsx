import { Helmet } from 'react-helmet-async';
import React from 'react';

interface SEOHeadProps {
  title: string;
  description: string;
  path: string;
  type?: string;
  image?: string;
  jsonLd?: Record<string, unknown>;
}

const SITE_URL = 'https://aetheris.technology';
const SITE_NAME = 'Aetheris AI';
const OG_IMAGE = `${SITE_URL}/aetheris-logo.png`;

const MAX_TITLE = 60;
const MAX_DESC = 155;

const truncate = (s: string, max: number) => {
  if (!s) return s;
  if (s.length <= max) return s;
  // Trim to last whitespace before max-1 to keep words intact, then add ellipsis
  const cut = s.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max - 25 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…';
};

export const SEOHead: React.FC<SEOHeadProps> = ({ title, description, path, type = 'website', image, jsonLd }) => {
  const fullUrl = `${SITE_URL}${path}`;
  // Title is exactly what the page sets — no auto-suffix that blows past 70 chars.
  const fullTitle = truncate(title, MAX_TITLE);
  const fullDescription = truncate(description, MAX_DESC);
  const ogImage = image || OG_IMAGE;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={fullDescription} />
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      <link rel="canonical" href={fullUrl} />

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={fullDescription} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_US" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={fullDescription} />
      <meta name="twitter:image" content={ogImage} />

      {/* JSON-LD */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
};
