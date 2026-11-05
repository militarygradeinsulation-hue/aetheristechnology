// Golden Report generic/template detector — browser entry point.
//
// There is exactly ONE implementation:
// supabase/functions/_shared/golden-generic-detector.ts. The Deno edge
// functions and this Vite app import the same file, so the website, portal and
// every PDF entry point apply an identical credibility test.
//
// Do NOT add detection logic here.

export * from "../../supabase/functions/_shared/golden-generic-detector.ts";
