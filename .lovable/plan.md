

# Add Website Scanner to Diagnostic Page

## Change
Add the `WebsiteScanner` component to `src/pages/DiagnosticQuizPage.tsx`, placed below the Business Diagnostic quiz section. It already accepts an `onContactClick` prop which is available in the page.

## Technical Detail
**Modified file:** `src/pages/DiagnosticQuizPage.tsx`
- Import `WebsiteScanner` from `@/components/WebsiteScanner`
- Add `<WebsiteScanner onContactClick={() => setIsContactOpen(true)} />` after the diagnostic card div, before `<Footer />`

One-file change, no new dependencies.

