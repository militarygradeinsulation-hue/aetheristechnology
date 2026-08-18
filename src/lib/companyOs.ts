// Aetheris Company Operating System derivation layer — browser entry point.
//
// There is exactly ONE implementation:
// supabase/functions/_shared/company-os.ts. The edge functions and this Vite
// app import the same file so teams, tasks, playbooks, seeded memory and the
// typed event contracts cannot drift apart.

export * from "../../supabase/functions/_shared/company-os.ts";
