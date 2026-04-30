import { supabase } from '@/integrations/supabase/client';
import { getPortalToken } from '@/lib/portalAuth';

export interface RepLead {
  id: string;
  business_name: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  industry: string | null;
  location: string | null;
  notes: string | null;
  source: string;
  score: number | null;
  why_fit: string | null;
  claimed_by_code: string | null;
  claimed_at: string | null;
  status: LeadStatus;
  last_touched_at: string | null;
  touch_count: number;
  created_at: string;
  assigned_to_code?: string | null;
  assignment_expires_at?: string | null;
}

export type LeadStatus = 'new' | 'outreach' | 'touched' | 'replied' | 'meeting' | 'won' | 'lost' | 'dead';

export const STATUS_LABEL: Record<LeadStatus, string> = {
  new: 'New', outreach: 'Outreach', touched: 'Touched', replied: 'Replied',
  meeting: 'Meeting', won: 'Won', lost: 'Lost', dead: 'Dead',
};

export const STATUS_COLOR: Record<LeadStatus, string> = {
  new: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  outreach: 'bg-amber/15 text-amber border-amber/30',
  touched: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  replied: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  meeting: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  won: 'bg-green-500/15 text-green-400 border-green-500/30',
  lost: 'bg-muted text-muted-foreground border-border',
  dead: 'bg-red-500/15 text-red-400 border-red-500/30',
};

async function callPortalLeads(action: string, payload: Record<string, unknown> = {}) {
  const token = getPortalToken();
  if (!token) throw new Error('Not signed in');
  const { data, error } = await supabase.functions.invoke('portal-leads', {
    body: { action, ...payload },
    headers: { 'x-portal-token': token },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

export const portalLeads = {
  list: (view: 'pool' | 'mine' | 'drip', filters: { industry?: string; location?: string; minScore?: number } = {}) =>
    callPortalLeads('list', { view, ...filters }) as Promise<{ ok: true; leads: RepLead[]; activeClaimed: number; maxActive: number; dripCount: number }>,
  claim: (id: string) => callPortalLeads('claim', { id }),
  skipDrip: (id: string) => callPortalLeads('skip_drip', { id }),
  release: (id: string) => callPortalLeads('release', { id }),
  updateStatus: (id: string, opts: { status?: LeadStatus; notes?: string; touch?: boolean }) =>
    callPortalLeads('update_status', { id, ...opts }),
  upload: (rows: Partial<RepLead>[]) => callPortalLeads('upload', { rows }) as Promise<{ ok: true; inserted: number }>,
  download: () => callPortalLeads('download') as Promise<{ ok: true; rows: any[] }>,
};

export async function logPortalActivity(event: string, meta: Record<string, unknown> = {}) {
  try {
    const token = getPortalToken();
    if (!token) return;
    await supabase.functions.invoke('portal-activity', {
      body: { event, meta },
      headers: { 'x-portal-token': token },
    });
  } catch {
    // silent
  }
}

export function leadsToCsv(rows: any[]): string {
  if (!rows.length) return '';
  const cols = ['business_name','contact_name','email','phone','website','industry','location','status','touch_count','last_touched_at','notes','created_at'];
  const esc = (v: any) => {
    if (v == null) return '';
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  return [cols.join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\n');
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function parseCsv(text: string): Record<string, string>[] {
  // Minimal CSV parser (no quoted-newline support — sufficient for typical lead exports)
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return [];
  const splitRow = (line: string) => {
    const out: string[] = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQ) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') inQ = false;
        else cur += ch;
      } else {
        if (ch === ',') { out.push(cur); cur = ''; }
        else if (ch === '"') inQ = true;
        else cur += ch;
      }
    }
    out.push(cur);
    return out;
  };
  const headers = splitRow(lines[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
  return lines.slice(1).map(line => {
    const cells = splitRow(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = (cells[i] || '').trim(); });
    return obj;
  });
}
