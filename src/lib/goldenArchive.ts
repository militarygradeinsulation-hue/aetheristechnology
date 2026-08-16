// Golden Report Library archive shaping — browser entry point.
//
// There is exactly ONE implementation:
// supabase/functions/_shared/golden-archive.ts. The edge functions and this
// Vite app import the same file so company identity, archive summaries and
// blueprint eligibility cannot drift apart.

export * from "../../supabase/functions/_shared/golden-archive.ts";
