// Client wrapper for the per-rep workspace (settings, notes, history) edge function.
import { supabase } from '@/integrations/supabase/client';
import { getPortalToken } from '@/lib/portalAuth';
import { getAdminToken } from '@/lib/adminAuth';

export interface RepLibraryItem {
  id: string;
  tool_type: string;
  title: string;
  input_data: Record<string, unknown>;
  output_data: Record<string, unknown>;
  file_url: string | null;
  lead_id: string | null;
  created_at: string;
}

export interface RepNoteAttachment {
  name: string;
  url: string;
  path: string;
  size: number;
  type: string;
  uploaded_at: string;
}

export interface RepNote {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  tags: string[];
  attachments: RepNoteAttachment[];
  created_at: string;
  updated_at: string;
}

export interface RepSettings {
  defaults: Record<string, any>;
  preferences: Record<string, any>;
  updated_at: string | null;
}

async function call(action: string, payload: Record<string, unknown> = {}) {
  const token = getPortalToken();
  const adminToken = getAdminToken();
  if (!token && !adminToken) throw new Error('Not signed in to portal');
  const headers: Record<string, string> = {};
  if (token) headers['x-portal-token'] = token;
  if (adminToken) headers['x-admin-token'] = adminToken;
  const { data, error } = await supabase.functions.invoke('portal-workspace', {
    body: { action, ...payload },
    headers,
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

// Settings
export const getRepSettings = (): Promise<RepSettings> =>
  call('settings_get').then(d => d.settings);
export const saveRepSettings = (defaults: Record<string, any>, preferences: Record<string, any> = {}) =>
  call('settings_save', { defaults, preferences });

// Notes
export const listRepNotes = (q?: string): Promise<RepNote[]> =>
  call('notes_list', { q }).then(d => d.notes);
export const upsertRepNote = (note: Partial<RepNote>): Promise<RepNote> =>
  call('notes_upsert', note as any).then(d => d.note);
export const deleteRepNote = (id: string) => call('notes_delete', { id });

// Library
export const listRepLibrary = (opts: { q?: string; tool_type?: string; lead_id?: string } = {}): Promise<RepLibraryItem[]> =>
  call('library_list', opts).then(d => d.items);
export const saveToRepLibrary = (args: {
  tool_type: string;
  title: string;
  input_data?: unknown;
  output_data?: unknown;
  file_url?: string | null;
  lead_id?: string | null;
}): Promise<RepLibraryItem> => call('library_save', args).then(d => d.item);
export const deleteFromRepLibrary = (id: string) => call('library_delete', { id });

// Unified search
export const searchWorkspace = (q: string) => call('search', { q }) as Promise<{ ok: true; notes: RepNote[]; items: RepLibraryItem[] }>;

// Helper: hasPortalToken (used by tools to decide which library to save into)
export const isPortalSession = () => !!getPortalToken();
