

## Rebrand Blog Cards to Case File Format with Architect Logo

### What this does

Replaces all per-post blog images with "The Architect" logo and adds sequential case file numbering (CASE FILE #001, #002, etc.) to every blog card. Each card shows the industry label "Commercial playground manufacturer" and the case file ID as a forensic badge.

### Technical details

**1. Copy uploaded image to project: `src/assets/architect-logo.jpg`**

Copy `user-uploads://architect-logo.jpg` into `src/assets/` so it can be imported as an ES6 module.

**2. Update `src/components/BlogCard.tsx`**

- Remove all 26+ individual blog image imports and the `blogImages`, `keywordImageMap`, `allImages` maps, and `getImageForSlug` function
- Import the single Architect logo image
- Accept a new `index` prop (0-based position in the sorted list) to compute the case file number
- Replace the image area: show the Architect logo centered on a dark background
- Add a "CASE FILE #XXX" badge overlay (top-left of the image, crimson background, mono font) where XXX is zero-padded 3-digit number based on index (newest = highest number)
- Add "Industry: Commercial playground manufacturer" as a subtle label below the tags or above the title
- Keep the "Aetheris AI Studio" watermark in bottom-right
- Export `getImageForSlug` as a no-op or remove it (check if it's used elsewhere)

**3. Update `src/components/BlogList.tsx`**

- Pass `index` prop to each `BlogCard` — computed as `(totalCount - currentIndex)` so the newest post gets the highest case file number
- No other changes needed

**4. Check for other usages of `getImageForSlug`**

Search for imports of this function in BlogPostPage or elsewhere and update if needed to use the Architect logo.

### Files touched

| File | Action |
|------|--------|
| `src/assets/architect-logo.jpg` | New — copied from upload |
| `src/components/BlogCard.tsx` | Replace all images with Architect logo, add CASE FILE badge + industry label |
| `src/components/BlogList.tsx` | Pass index prop to BlogCard |
| Any file importing `getImageForSlug` | Update to use Architect logo |

### What does NOT change

- Blog post content, slugs, tags, excerpts — all identical
- Blog detail page layout — only the list/card view changes
- Content generation system — unrelated

