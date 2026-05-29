import { supabase } from '@/integrations/supabase/client';
import { getPortalToken } from '@/lib/portalAuth';
import { getAdminToken } from '@/lib/adminAuth';

export interface ClueEvent {
  id: string;
  lead_id: string;
  rep_code: string | null;
  rep_name: string | null;
  kind: string;
  label: string;
  tool_key: string | null;
  stage_from: string | null;
  stage_to: string | null;
  tip: string | null;
  meta: Record<string, unknown>;
  created_at: string;
}

export interface NextMove {
  tool: string;
  toolLabel: string;
  cta: string;
  rule: string;
  tip: string;
  targetStatus?: string;
}

function headers() {
  const portal = getPortalToken();
  const admin = getAdminToken();
  const h: Record<string, string> = {};
  if (portal) h['x-portal-token'] = portal;
  if (admin) h['x-admin-token'] = admin;
  return h;
}

async function call(action: string, payload: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke('lead-clues', {
    body: { action, ...payload },
    headers: headers(),
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

export const leadClues = {
  log: (lead_id: string, opts: {
    kind: string; label: string; tool_key?: string;
    stage_from?: string; stage_to?: string; tip?: string;
    meta?: Record<string, unknown>;
  }) => call('log', { lead_id, ...opts }).catch((e) => {
    console.warn('clue log failed', e); return null;
  }),
  list: (lead_id: string, limit = 50) =>
    call('list', { lead_id, limit }) as Promise<{ ok: true; trail: ClueEvent[] }>,
  next: (lead_id: string, status: string, lead?: Record<string, unknown>) =>
    call('next', { lead_id, status, lead }) as Promise<{ ok: true; next: NextMove }>,
};
