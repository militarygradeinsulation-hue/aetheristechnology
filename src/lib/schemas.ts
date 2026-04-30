// Reusable JSON-LD schema builders for SEO + AEO
// Centralizes schema.org markup so every page emits consistent, AI-engine-friendly metadata.

const SITE_URL = 'https://aetheris.technology';
const ORG_NAME = 'Aetheris AI';
const ORG_LOGO = `${SITE_URL}/aetheris-logo.png`;

export const ORG_SAME_AS = [
  'https://www.linkedin.com/in/thejosephtoney',
  'https://ctoguy.ai',
  'https://aetheristechnology.lovable.app',
];

export const PUBLISHER = {
  '@type': 'Organization',
  name: ORG_NAME,
  url: SITE_URL,
  logo: { '@type': 'ImageObject', url: ORG_LOGO },
  sameAs: ORG_SAME_AS,
};

export interface BreadcrumbItem {
  name: string;
  path: string;
}

export const breadcrumbSchema = (items: BreadcrumbItem[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: item.name,
    item: `${SITE_URL}${item.path}`,
  })),
});

export interface FAQItem {
  question: string;
  answer: string;
}

export const faqSchema = (faqs: FAQItem[]) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map(faq => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer,
    },
  })),
});

export interface HowToStep {
  name: string;
  text: string;
  url?: string;
}

export const howToSchema = (
  name: string,
  description: string,
  steps: HowToStep[],
  totalTime?: string
) => ({
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name,
  description,
  ...(totalTime && { totalTime }),
  step: steps.map((step, i) => ({
    '@type': 'HowToStep',
    position: i + 1,
    name: step.name,
    text: step.text,
    ...(step.url && { url: step.url }),
  })),
});

export const speakableSchema = (cssSelectors: string[] = ['.tldr', 'h1', 'h2']) => ({
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  speakable: {
    '@type': 'SpeakableSpecification',
    cssSelector: cssSelectors,
  },
});

export const serviceSchema = (
  name: string,
  description: string,
  options: {
    price?: string;
    priceCurrency?: string;
    serviceType?: string;
    areaServed?: string | string[];
  } = {}
) => ({
  '@context': 'https://schema.org',
  '@type': 'Service',
  name,
  description,
  provider: PUBLISHER,
  ...(options.serviceType && { serviceType: options.serviceType }),
  areaServed: Array.isArray(options.areaServed)
    ? options.areaServed.map(a => ({ '@type': 'Place', name: a }))
    : { '@type': 'Country', name: options.areaServed || 'United States' },
  ...(options.price && {
    offers: {
      '@type': 'Offer',
      price: options.price,
      priceCurrency: options.priceCurrency || 'USD',
      availability: 'https://schema.org/InStock',
    },
  }),
});

export interface ArticleData {
  title: string;
  description: string;
  author: string;
  datePublished?: string | null;
  dateModified?: string | null;
  image?: string | null;
  url: string;
  keywords?: string[];
  section?: string;
}

export const articleSchema = (article: ArticleData) => ({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: article.title,
  description: article.description,
  author: {
    '@type': 'Person',
    name: article.author,
    url: 'https://www.linkedin.com/in/thejosephtoney',
  },
  publisher: PUBLISHER,
  datePublished: article.datePublished || undefined,
  dateModified: article.dateModified || article.datePublished || undefined,
  image: article.image || ORG_LOGO,
  mainEntityOfPage: { '@type': 'WebPage', '@id': article.url },
  url: article.url,
  ...(article.keywords && { keywords: article.keywords.join(', ') }),
  ...(article.section && { articleSection: article.section }),
});

export const personSchema = (
  name: string,
  jobTitle: string,
  description: string,
  sameAs: string[] = []
) => ({
  '@context': 'https://schema.org',
  '@type': 'Person',
  name,
  jobTitle,
  description,
  worksFor: PUBLISHER,
  url: `${SITE_URL}/about`,
  sameAs,
});

export const softwareAppSchema = (
  name: string,
  description: string,
  url: string,
  category = 'BusinessApplication'
) => ({
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name,
  description,
  url: `${SITE_URL}${url}`,
  applicationCategory: category,
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
});

// Combine multiple schemas into a single @graph
export const combineSchemas = (...schemas: Record<string, unknown>[]) => ({
  '@context': 'https://schema.org',
  '@graph': schemas.map(s => {
    const { '@context': _ctx, ...rest } = s as Record<string, unknown>;
    return rest;
  }),
});
