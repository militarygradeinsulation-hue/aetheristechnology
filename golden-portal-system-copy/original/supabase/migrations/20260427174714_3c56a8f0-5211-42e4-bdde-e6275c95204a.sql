UPDATE public.blog_posts
SET featured_image = 'https://ihdjpxhcaiaixmqxyqoe.supabase.co/storage/v1/object/public/blog-thumbnails/' || slug || '.png',
    updated_at = now()
WHERE slug IN (
  'adult-fitness-playscapes-untapped-goldmine','ai-adoption-roadmap','ai-maturity-assessment-guide',
  'chatbot-development-for-noblesville-auto-dealers-2026-04-04','consulting-therapy-systems-alignment-fails',
  'conversion-funnel-operational-gaps','crm-adoption-failure-why-excel-is-still-king',
  'crm-data-swamp-50k-contacts-starve-pipeline','dashboards-are-wallpaper-fix-your-metrics-now',
  'data-intelligence-competitors-outpace-your-customer-insights','data-intelligence-why-your-competitors-see-more',
  'dealership-profit-leaks-ad-spend-zero-automation','digital-transformation-for-anderson-indiana-healthcare-2026-02-05',
  'dirty-data-audit-hubspot-filters','how-to-implement-ai-in-business','hubspot-deal-owner-revenue-leak',
  'hubspot-ghosted-quote-leak','hubspot-lead-scoring-broken','hubspot-reports-that-lie',
  'hubspot-revenue-path-attribution-leak','hubspot-sequences-vs-workflows','hubspot-workflows-that-quietly-break',
  'inclusive-play-2b-opportunity-missed','inclusive-play-2b-opportunity-not-checkbox','inclusive-playground-upsell',
  'lead-scoring-close-rate-killer','lead-scoring-decay-why-crm-misses-leads','nature-play-goldmine-or-grave',
  'nature-play-website-failure','operational-inertia-killing-growth','playground-blind-spot-global-gold-rush',
  'playground-brand-sucks-heres-why','playground-industry-ignoring-senior-fitness-market',
  'playground-sales-stuck-in-2005','playground-sales-value-not-lowest-bid','playground-social-media-garbage-sales',
  'playground-website-killing-deals','playground-website-killing-sales','world-building-youre-not-invited'
);