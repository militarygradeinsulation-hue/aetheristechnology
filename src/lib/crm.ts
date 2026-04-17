// Typed CRM helpers + demo data shape used by both the admin CRM and the
// public /crm-demo page. The demo path reads from the public crm_demo_data
// table; the admin path reads from the real crm_* tables (admin-only via RLS).

import { supabase } from "@/integrations/supabase/client";

export type DealStage = "lead" | "qualified" | "proposal" | "won" | "lost";
export const DEAL_STAGES: DealStage[] = ["lead", "qualified", "proposal", "won", "lost"];
export const STAGE_LABEL: Record<DealStage, string> = {
  lead: "Lead",
  qualified: "Qualified",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
};

export type InteractionType = "call" | "email" | "meeting" | "note" | "form" | "task";

export interface CrmCompany {
  id: string;
  name: string;
  website?: string | null;
  industry?: string | null;
  size?: string | null;
  location?: string | null;
  notes?: string | null;
}

export interface CrmContact {
  id: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  title?: string | null;
  company_id?: string | null;
  owner?: string | null;
  tags?: string[];
  source?: string | null;
  notes?: string | null;
  created_at?: string;
}

export interface CrmDeal {
  id: string;
  title: string;
  contact_id?: string | null;
  company_id?: string | null;
  value_cents: number;
  currency?: string;
  stage: DealStage;
  expected_close_date?: string | null;
  notes?: string | null;
  position?: number;
}

export interface CrmInteraction {
  id: string;
  contact_id?: string | null;
  deal_id?: string | null;
  type: InteractionType;
  subject?: string | null;
  body?: string | null;
  occurred_at: string;
}

export interface CrmDataset {
  companies: CrmCompany[];
  contacts: CrmContact[];
  deals: CrmDeal[];
  interactions: CrmInteraction[];
}

export const EMPTY_DATASET: CrmDataset = { companies: [], contacts: [], deals: [], interactions: [] };

export function formatMoney(cents: number, currency = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

/** Public demo — anyone can read. */
export async function loadDemoDataset(): Promise<CrmDataset> {
  const { data, error } = await supabase
    .from("crm_demo_data")
    .select("data")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  const d = (data?.data || {}) as Partial<CrmDataset>;
  return {
    companies: d.companies || [],
    contacts: d.contacts || [],
    deals: d.deals || [],
    interactions: d.interactions || [],
  };
}

/** Real CRM — admin only (RLS-locked, but we also have a service-role
 * edge function `admin-data` you could route through if desired). For now
 * authenticated admin reads work directly via the supabase client. */
export async function loadAdminDataset(): Promise<CrmDataset> {
  const [companies, contacts, deals, interactions] = await Promise.all([
    supabase.from("crm_companies").select("*").order("name"),
    supabase.from("crm_contacts").select("*").order("created_at", { ascending: false }),
    supabase.from("crm_deals").select("*").order("position"),
    supabase
      .from("crm_interactions")
      .select("*")
      .order("occurred_at", { ascending: false })
      .limit(500),
  ]);
  return {
    companies: (companies.data || []) as CrmCompany[],
    contacts: (contacts.data || []) as CrmContact[],
    deals: (deals.data || []) as CrmDeal[],
    interactions: (interactions.data || []) as CrmInteraction[],
  };
}
