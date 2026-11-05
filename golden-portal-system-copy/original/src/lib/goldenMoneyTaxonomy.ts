// Golden Report money taxonomy — browser entry point.
//
// There is exactly ONE implementation:
// supabase/functions/_shared/golden-money-taxonomy.ts. Edge functions, the
// website, the portal and both PDF exports import the same file, so a dollar
// value cannot be categorized one way on screen and another way in the export.

export * from "../../supabase/functions/_shared/golden-money-taxonomy.ts";
