// Golden Report shared view model — browser entry point.
//
// There is exactly ONE implementation: supabase/functions/_shared/golden-report-model.ts.
// The website/portal report view, every PDF export and the server-side parity
// audit import that same file, so the surfaces cannot drift apart.
//
// Do NOT add report-shaping logic here or anywhere else.

export * from "../../supabase/functions/_shared/golden-report-model.ts";
