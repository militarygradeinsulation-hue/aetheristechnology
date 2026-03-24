import { Helmet } from 'react-helmet-async';
import React from 'react';

interface SEOHeadProps {
  title: string;
  description: string;
  path: string;
  type?: string;
  jsonLd?: Record<string, unknown>;
}

const SITE_URL = 'https://aetheristechnology.lovable.app';
const SITE_NAME = 'Aetheris AI';
const OG_IMAGE = `${SITE_URL}/aetheris-logo.png`;

export const SEOHead: React.FC<SEOHeadProps> = ({ title, description, path, type = 'website', jsonLd }) => {
  const fullUrl = `${SITE_URL}${path}`;
  const fullTitle = `${title} | Aetheris AI — Business Consulting & AI Technology`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      <link rel="canonical" href={fullUrl} />

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={OG_IMAGE} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_US" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={OG_IMAGE} />

      {/* JSON-LD */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
};
