

# Create Standalone Website Scanner Page

## What We'll Build
A dedicated `/scan` page containing the Website Scanner tool, so you can share `https://aetheris.technology/scan` on LinkedIn. The page will have its own SEO metadata, navbar, footer, and the full scanner experience — identical functionality to what's on the homepage.

## Changes

### 1. Create `src/pages/ScanPage.tsx`
- New page with Background, Navbar, WebsiteScanner, and Footer
- Custom SEO head: title "Free Website Gap Analysis | Aetheris AI", description optimized for LinkedIn sharing (OpenGraph tags will be picked up automatically via SEOHead)
- ContactModal wired up the same way as on the homepage

### 2. Add route in `src/App.tsx`
- Add `<Route path="/scan" element={<ScanPage />} />` above the catch-all

### 3. Update `public/sitemap.xml`
- Add `https://aetheris.technology/scan` entry

**Shareable link**: `https://aetheris.technology/scan`

No database or backend changes needed — uses the existing scanner component and edge function.

