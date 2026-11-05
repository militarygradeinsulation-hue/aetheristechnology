// Golden Report leakage resolver — browser entry point.
//
// There is exactly ONE implementation of the annual revenue loss math in this
// repository: supabase/functions/_shared/golden-leakage.ts. Both the Deno edge
// functions and this Vite app import that file, so the website, portal,
// pre-download summary, and every PDF entry point cannot drift apart.
//
// Do NOT add leakage math here or anywhere else.

export * from "../../supabase/functions/_shared/golden-leakage.ts";
