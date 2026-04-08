

# Site Optimization Plan for More Views

## Current State
- 266 visitors / 2 weeks, 69% bounce rate, 1.6 pages/visit
- Traffic sources: 81% Direct, 9% LinkedIn, 2% Bing, 2% Google
- Top pages: Home (149), Scan (56), Blog (28), About (18)
- Google is barely sending traffic — organic SEO is the biggest growth lever

## Recommended Optimizations (Priority Order)

### 1. Add Internal Linking Between Blog Posts
Blog posts currently don't link to each other. Adding "Related Posts" at the bottom of each blog post page keeps readers on-site longer (reduces bounce rate) and helps Google crawl/index more pages.

- Add a "Related Posts" section to `BlogPostPage.tsx` showing 3 posts with matching tags
- Query blog_posts table for posts sharing at least one tag, exclude current post

### 2. Add Social Share Buttons to Blog Posts
Blog posts have zero share mechanisms. Adding LinkedIn, X/Twitter, and copy-link buttons to each post lets readers amplify content organically — critical since LinkedIn is already your #2 source.

- Add share buttons to `BlogPostPage.tsx` (LinkedIn share URL, Twitter intent URL, clipboard copy)
- Track shares via the existing `site_events` tracking

### 3. Dynamic Sitemap with All Blog Posts
Current `sitemap.xml` is static with only 9 URLs. You have 135+ blog posts that Google doesn't know about. A dynamic sitemap is the single biggest SEO fix.

- Create an edge function `generate-sitemap` that queries all published blog posts and generates a sitemap XML
- Update `robots.txt` to point to the correct sitemap URL on the custom domain

### 4. Add Blog Post Schema Markup (Article JSON-LD)
Individual blog posts lack Article schema. Adding this helps Google display rich results (author, date, image) which increases click-through rates from search.

- Add Article JSON-LD to `BlogPostPage.tsx` via SEOHead's jsonLd prop
- Include headline, author, datePublished, image, publisher

### 5. Open Graph Images Per Blog Post
Currently all pages share the same `aetheris-logo.png` OG image. When blog posts are shared on LinkedIn, they all look identical. Use each post's unique `featured_image` as the OG image.

- Update `SEOHead` in `BlogPostPage.tsx` to pass the post's `featured_image` as the OG image
- Fall back to the default logo if no featured image exists

### 6. Fix robots.txt Sitemap URL
The sitemap URL in `robots.txt` points to `aetheristechnology.lovable.app` instead of `aetheris.technology`.

- Update to `https://aetheris.technology/sitemap.xml`

## Technical Details

**Files modified:**
- `src/pages/BlogPostPage.tsx` — related posts, share buttons, Article schema, per-post OG image
- `src/components/SEOHead.tsx` — accept optional `image` prop override
- `public/robots.txt` — fix sitemap URL
- `supabase/functions/generate-sitemap/index.ts` — new edge function for dynamic sitemap
- `public/sitemap.xml` — replaced by dynamic generation

**No database changes needed** — all data already exists in `blog_posts` table.

