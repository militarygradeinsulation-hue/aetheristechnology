
Goal: make the entire blog experience static and reliable by removing all visible motion from `/blog` and `/blog/:slug`, not just the card reveals.

What I found:
- `BlogList.tsx` still wraps the hero and bottom CTA in `RevealOnScroll`.
- `BlogPage.tsx` and `BlogPostPage.tsx` both use the animated `Background` canvas, which runs continuously.
- `BlogCard.tsx`, `RelatedPosts.tsx`, `ShareButtons.tsx`, and parts of `BlogPostPage.tsx` still use hover scale/transition classes.
- Loading skeletons still pulse.

What I’ll change:
1. `src/components/BlogList.tsx`
- Remove `RevealOnScroll` import and wrappers.
- Render the hero and bottom CTA as plain static content.

2. `src/pages/BlogPage.tsx`
- Remove the animated `Background` from the blog index page.
- Replace it with a static dark background container so the page still matches the brand without motion.

3. `src/pages/BlogPostPage.tsx`
- Remove the animated `Background` from individual post pages too.
- Keep layout/content intact, just make the page static.

4. `src/components/BlogCard.tsx`
- Remove hover scale and animated image zoom from blog cards.
- Keep premium styling, but static.

5. `src/components/RelatedPosts.tsx`
- Remove hover/transition behavior from related article cards and titles.

6. `src/components/ShareButtons.tsx` + `src/pages/BlogPostPage.tsx`
- Remove decorative transition classes from share buttons and blog CTA links/buttons where possible.
- Keep hover color change only if it’s instant; otherwise make it fully static.

7. Loading state cleanup
- Replace pulsing skeletons on blog pages with non-animated placeholders so “loading” never looks stuck again.

Expected result:
- No reveal animations
- No moving particle background
- No hover zoom/scale on blog cards
- No pulsing loaders on the blog experience
- Blog content should appear immediately and consistently

Files to update:
- `src/components/BlogList.tsx`
- `src/pages/BlogPage.tsx`
- `src/pages/BlogPostPage.tsx`
- `src/components/BlogCard.tsx`
- `src/components/RelatedPosts.tsx`
- `src/components/ShareButtons.tsx`
- possibly `src/components/ui/skeleton.tsx` only if I need a blog-safe non-animated variant without affecting the rest of the site

Validation after implementation:
- Open `/blog` and confirm posts appear without fade/reveal behavior
- Open several `/blog/:slug` pages and confirm no animated background remains
- Confirm related posts, share buttons, and CTAs are static
- Check mobile to ensure removing motion doesn’t break spacing or hierarchy
