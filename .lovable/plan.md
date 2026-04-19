
## Diagnosis (confirmed against the database)

**The blogs are all there — 173 published posts in the DB.** The page just can't render them.

Two compounding bugs in `src/components/BlogList.tsx`:

### Bug 1 — Animation delay scales with index (the killer)
```tsx
{posts.map((post, index) => (
  <RevealOnScroll key={post.id} delay={index * 0.1}>
```
With 173 posts, the last card is told to wait **17.3 seconds** before animating in. Cards 30+ basically never appear because their containers stay at `opacity: 0` until you scroll past them, and even then they wait their assigned delay. To the user it looks like an endless skeleton/loading state.

### Bug 2 — Loading all 173 at once
Every card statically imports ~26 thumbnail images and pulls full row data (`select('*')` includes the entire `content` field, ~20KB per row = ~3.5MB payload). Even after fixing Bug 1, the page would render 173 large cards with motion wrappers — slow on every device.

There's also a small contributing issue: `select('*')` pulls the giant `content` column for every card when the list only needs title/excerpt/slug/tags/etc.

---

## The fix

### 1. `src/components/BlogList.tsx` — kill the index-based delay, paginate, slim the query
- Change select from `*` to only the fields the card needs: `id, title, slug, excerpt, author, published_at, tags, location_focus, featured_image`
- Remove the per-card `RevealOnScroll` wrapper (or cap delay at `Math.min(index, 6) * 0.05`) so every card is visible immediately
- Add **client-side pagination**: show 12 posts initially, "Load More" button reveals 12 more at a time. (Simple, no infinite-scroll observer complexity, works offline-first with the cached query.)
- Add a small post count + tag filter chips above the grid (optional but nice — uses the tags already on the posts)

### 2. `src/components/BlogCard.tsx` — add lazy loading to the `<img>`
- Add `loading="lazy"` and `decoding="async"` to the thumbnail `<img>`. Browser then only fetches images for cards near the viewport.

### 3. Verification
- After the change, `/blog` should render the first 12 cards in <1s, with "Load More (161 remaining)" at the bottom.
- All 173 posts remain accessible by clicking Load More repeatedly, and individual `/blog/:slug` pages were never broken.

---

## Out of scope
- No DB changes, no edge function changes, no design overhaul — visuals stay identical
- Not touching `BlogPostPage`, `RelatedPosts`, or `BlogCard` styling
- Not changing the existing image mapping logic

## Files touched
- `src/components/BlogList.tsx` — pagination, slim query, removed exponential delay
- `src/components/BlogCard.tsx` — `loading="lazy"` on the thumbnail

## Expected result
All 173 published posts immediately discoverable on `/blog`, page loads in under a second instead of appearing to hang forever.
