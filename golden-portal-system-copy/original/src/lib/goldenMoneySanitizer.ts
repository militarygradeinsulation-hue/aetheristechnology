// Golden Report money sanitizer — browser entry point.
//
// There is exactly ONE implementation:
// supabase/functions/_shared/golden-money-sanitizer.ts. Edge functions and the
// Vite app import the same file so no surface can render a stale leak amount.

export * from "../../supabase/functions/_shared/golden-money-sanitizer.ts";
