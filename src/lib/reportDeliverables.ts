// Golden Report growth deliverables — browser entry point.
//
// There is exactly ONE implementation:
// supabase/functions/_shared/report-deliverables.ts. The scan orchestration,
// the background enrichment function and this Vite app import the same file so
// imagery, posts and schedule can never drift apart.

export * from "../../supabase/functions/_shared/report-deliverables.ts";
