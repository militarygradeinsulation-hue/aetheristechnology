import { supabase } from '@/integrations/supabase/client';

export type Recording = {
  id: string;
  rep_code: string;
  lead_id: string | null;
  lead_business: string | null;
  mode: string;
  source: string;
  title: string | null;
  audio_path: string | null;
  video_path: string | null;
  audio_url: string | null;
  video_url: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  duration_sec: number | null;
  outcome: string | null;
  rep_notes: string | null;
  started_at: string;
  ended_at: string | null;
  created_at: string;
};

const FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-recording`;

function authHeaders(): Record<string, string> {
  const anon = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY
    || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY
    || '';
  return anon ? { apikey: anon, Authorization: `Bearer ${anon}` } : {};
}

export async function listRecordings(opts: { repCode?: string; leadId?: string; limit?: number }): Promise<Recording[]> {
  const params = new URLSearchParams();
  if (opts.repCode) params.set('rep_code', opts.repCode);
  if (opts.leadId) params.set('lead_id', opts.leadId);
  if (opts.limit) params.set('limit', String(opts.limit));
  const res = await fetch(`${FN}?${params}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`list failed (${res.status})`);
  const data = await res.json();
  return data.recordings ?? [];
}

export async function uploadRecording(blob: Blob, opts: {
  repCode: string;
  leadId?: string | null;
  leadBusiness?: string | null;
  source?: 'extension' | 'web' | 'android' | 'ios';
  mode?: 'record' | 'screen' | 'audio';
  durationSec?: number;
  title?: string;
  outcome?: string;
  repNotes?: string;
}): Promise<Recording> {
  const fd = new FormData();
  fd.append('file', blob, `recording.${(blob.type.split('/')[1] || 'webm').split(';')[0]}`);
  fd.append('rep_code', opts.repCode);
  if (opts.leadId) fd.append('lead_id', opts.leadId);
  if (opts.leadBusiness) fd.append('lead_business', opts.leadBusiness);
  fd.append('source', opts.source ?? 'web');
  fd.append('mode', opts.mode ?? 'record');
  if (opts.durationSec != null) fd.append('duration_sec', String(opts.durationSec));
  if (opts.title) fd.append('title', opts.title);
  if (opts.outcome) fd.append('outcome', opts.outcome);
  if (opts.repNotes) fd.append('rep_notes', opts.repNotes);
  fd.append('mime_type', blob.type || 'video/webm');

  const res = await fetch(FN, { method: 'POST', headers: authHeaders(), body: fd });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`upload failed (${res.status}): ${txt}`);
  }
  const data = await res.json();
  return data.recording;
}

export async function deleteRecording(id: string, repCode: string): Promise<void> {
  const params = new URLSearchParams({ id, rep_code: repCode });
  const res = await fetch(`${FN}?${params}`, { method: 'DELETE', headers: authHeaders() });
  if (!res.ok) throw new Error(`delete failed (${res.status})`);
}

export function formatDuration(sec: number | null | undefined): string {
  if (!sec || sec < 1) return '—';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m ? `${m}m ${s}s` : `${s}s`;
}

export function formatBytes(b: number | null | undefined): string {
  if (!b) return '—';
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

// supabase reference kept for tree-shaking parity / future direct queries
export const _sb = supabase;
