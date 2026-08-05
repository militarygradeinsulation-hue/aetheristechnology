// Golden Report Financial Leak Ledger — browser entry point.
//
// There is exactly ONE implementation of the financial model in this
// repository: supabase/functions/_shared/golden-ledger.ts. The Deno edge
// functions and this Vite app import the same file, so the website, portal,
// PDFs, report history and email previews cannot drift apart.
//
// Do NOT add money math here or anywhere else.

export * from "../../supabase/functions/_shared/golden-ledger.ts";
