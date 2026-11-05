// Golden Report evidence + consistency compiler — browser entry point.
//
// There is exactly ONE implementation of the compiler in this repository:
// supabase/functions/_shared/golden-compiler.ts. The Deno edge functions and
// this Vite app import the same file, so the website, portal, pre-download
// summary and every PDF entry point cannot drift apart.
//
// Do NOT add evidence, counting, pricing or validation logic here.

export * from "../../supabase/functions/_shared/golden-compiler.ts";
