// Save & list rep call/screen recordings.
//
// POST  (multipart/form-data): save a new recording into Storage + DB
//   fields: file (Blob), rep_code, lead_id?, lead_business?, source?, mode?,
//           duration_sec?, mime_type?, title?, outcome?, rep_notes?
//
// GET    ?rep_code=...&lead_id=...&limit=50
//        returns rows + signed download URLs
//
// DELETE ?id=...&rep_code=...
//        rep can delete their own recordings (storage object + row)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
};

const BUCKET = 'call-recordings';
const SIGNED_URL_TTL = 60 * 60 * 6; // 6 hours

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function safeExt(mime: string | null): string {
  if (!mime) return 'webm';
  if (mime.includes('mp4')) return 'mp4';
  if (mime.includes('quicktime')) return 'mov';
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('mpeg')) return 'mp3';
  if (mime.includes('wav')) return 'wav';
  return 'webm';
}

async function signPath(supabase: any, path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL);
  if (error) return null;
  return data?.signedUrl ?? null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const url = new URL(req.url);

  try {
    // ----- LIST -----
    if (req.method === 'GET') {
      const repCode = url.searchParams.get('rep_code')?.trim();
      const leadId = url.searchParams.get('lead_id');
      const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 1), 200);
      if (!repCode && !leadId) return json({ error: 'rep_code or lead_id required' }, 400);

      let q = supabase
        .from('call_recordings')
        .select('id, rep_code, lead_id, lead_business, mode, source, title, audio_path, video_path, mime_type, size_bytes, duration_sec, outcome, rep_notes, started_at, ended_at, created_at')
        .order('started_at', { ascending: false })
        .limit(limit);
      if (repCode) q = q.eq('rep_code', repCode);
      if (leadId) q = q.eq('lead_id', leadId);

      const { data, error } = await q;
      if (error) return json({ error: error.message }, 500);

      const enriched = await Promise.all(
        (data ?? []).map(async (r: any) => ({
          ...r,
          video_url: await signPath(supabase, r.video_path),
          audio_url: await signPath(supabase, r.audio_path),
        })),
      );
      return json({ recordings: enriched });
    }

    // ----- SAVE -----
    if (req.method === 'POST') {
      const form = await req.formData();
      const file = form.get('file');
      const repCode = String(form.get('rep_code') || '').trim();
      const leadId = String(form.get('lead_id') || '').trim() || null;
      const leadBusiness = String(form.get('lead_business') || '').trim() || null;
      const source = String(form.get('source') || 'extension').trim().slice(0, 32);
      const mode = String(form.get('mode') || 'record').trim().slice(0, 32);
      const title = String(form.get('title') || '').trim().slice(0, 200) || null;
      const outcome = String(form.get('outcome') || '').trim().slice(0, 200) || null;
      const repNotes = String(form.get('rep_notes') || '').trim().slice(0, 5000) || null;
      const durationRaw = String(form.get('duration_sec') || '0');
      const durationSec = Math.max(0, Math.floor(Number(durationRaw) || 0));

      if (!repCode) return json({ error: 'rep_code required' }, 400);
      if (!(file instanceof File) && !(file instanceof Blob)) {
        return json({ error: 'file (Blob) required' }, 400);
      }

      // Validate rep_code exists & is active
      const { data: ok } = await supabase.rpc('validate_rep_code', { _code: repCode });
      if (!ok) return json({ error: 'Invalid rep code' }, 403);

      const blob = file as Blob;
      const mimeType = (file as any).type || String(form.get('mime_type') || 'video/webm');
      const ext = safeExt(mimeType);
      const id = crypto.randomUUID();
      const objectPath = `${repCode}/${id}.${ext}`;
      const isAudioOnly = mimeType.startsWith('audio/');

      const arrayBuf = await blob.arrayBuffer();
      const sizeBytes = arrayBuf.byteLength;

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(objectPath, new Uint8Array(arrayBuf), {
          contentType: mimeType,
          upsert: false,
        });
      if (upErr) return json({ error: `upload failed: ${upErr.message}` }, 500);

      // Look up rep display name (used by lead_clue_trail label)
      const { data: repRow } = await supabase
        .from('rep_codes')
        .select('rep_name')
        .eq('code', repCode)
        .maybeSingle();
      const repName = repRow?.rep_name ?? null;

      // Resolve lead_business if a lead_id was supplied but no business name was passed
      let resolvedBusiness = leadBusiness;
      if (leadId && !resolvedBusiness) {
        const { data: leadRow } = await supabase
          .from('rep_leads')
          .select('business_name, company_name, name')
          .eq('id', leadId)
          .maybeSingle();
        resolvedBusiness =
          (leadRow as any)?.business_name ||
          (leadRow as any)?.company_name ||
          (leadRow as any)?.name ||
          null;
      }

      const insertRow: Record<string, unknown> = {
        id,
        rep_code: repCode,
        lead_id: leadId,
        lead_business: resolvedBusiness,
        mode,
        source,
        title: title || `${source} recording · ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`,
        duration_sec: durationSec,
        mime_type: mimeType,
        size_bytes: sizeBytes,
        outcome,
        rep_notes: repNotes,
        started_at: new Date(Date.now() - durationSec * 1000).toISOString(),
        ended_at: new Date().toISOString(),
      };
      if (isAudioOnly) insertRow.audio_path = objectPath;
      else insertRow.video_path = objectPath;

      const { data: row, error: insErr } = await supabase
        .from('call_recordings')
        .insert(insertRow)
        .select('*')
        .single();

      if (insErr) {
        // best-effort cleanup of orphan object
        await supabase.storage.from(BUCKET).remove([objectPath]);
        return json({ error: `db insert failed: ${insErr.message}` }, 500);
      }

      // Rep history feed
      await supabase.from('rep_activity').insert({
        rep_code: repCode,
        rep_name: repName,
        event: 'recording_saved',
        meta: {
          recording_id: id,
          source,
          mode,
          duration_sec: durationSec,
          size_bytes: sizeBytes,
          mime_type: mimeType,
          lead_id: leadId,
          lead_business: resolvedBusiness,
        },
      });

      // Lead history feed (if attached to a lead)
      if (leadId) {
        await supabase.from('lead_clue_trail').insert({
          lead_id: leadId,
          rep_code: repCode,
          rep_name: repName,
          kind: 'recording',
          label: title || `${mode === 'audio' || isAudioOnly ? 'Audio' : 'Screen'} recording (${durationSec}s)`,
          tool_key: 'call-recording',
          tip: 'Open in Recordings to play or download.',
          meta: {
            recording_id: id,
            source,
            mode,
            duration_sec: durationSec,
            mime_type: mimeType,
            size_bytes: sizeBytes,
          },
        });
      }

      const videoUrl = await signPath(supabase, (row as any).video_path);
      const audioUrl = await signPath(supabase, (row as any).audio_path);
      return json({ recording: { ...row, video_url: videoUrl, audio_url: audioUrl } });
    }

    // ----- DELETE -----
    if (req.method === 'DELETE') {
      const id = url.searchParams.get('id');
      const repCode = url.searchParams.get('rep_code');
      if (!id || !repCode) return json({ error: 'id and rep_code required' }, 400);

      const { data: row } = await supabase
        .from('call_recordings')
        .select('id, rep_code, video_path, audio_path')
        .eq('id', id)
        .maybeSingle();
      if (!row) return json({ error: 'not found' }, 404);
      if (row.rep_code !== repCode) return json({ error: 'forbidden' }, 403);

      const paths = [row.video_path, row.audio_path].filter(Boolean) as string[];
      if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
      await supabase.from('call_recordings').delete().eq('id', id);
      return json({ ok: true });
    }

    return json({ error: 'Method not allowed' }, 405);
  } catch (e: any) {
    console.error('save-recording error', e);
    return json({ error: e?.message || 'unknown error' }, 500);
  }
});
