import { useEffect, useState } from 'react';
import { listRecordings, deleteRecording, formatBytes, formatDuration, type Recording } from '@/lib/recordings';
import { Loader2, Download, Trash2, Video, Mic, RefreshCw, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

type Props = {
  repCode?: string;
  leadId?: string;
  /** When true, hide rows whose lead_id doesn't match leadId (defensive). */
  strictLead?: boolean;
  title?: string;
  allowDelete?: boolean;
  maxHeightClass?: string;
};

/**
 * RecordingsHistoryPanel
 *
 * Same component is used in two places:
 *   - Rep portal "History" tab  → pass `repCode`
 *   - Lead detail drawer        → pass `leadId` (and optional `repCode`)
 */
export function RecordingsHistoryPanel({
  repCode,
  leadId,
  strictLead,
  title = 'Recordings',
  allowDelete = true,
  maxHeightClass = 'max-h-[60vh]',
}: Props) {
  const [items, setItems] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    if (!repCode && !leadId) return;
    setLoading(true);
    try {
      let rows = await listRecordings({ repCode, leadId, limit: 100 });
      if (strictLead && leadId) rows = rows.filter((r) => r.lead_id === leadId);
      setItems(rows);
    } catch (e: any) {
      toast.error('Could not load recordings', { description: e?.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // refresh when something else in the app saves a new recording
    const onSaved = () => refresh();
    window.addEventListener('aetheris:recording-saved', onSaved);
    return () => window.removeEventListener('aetheris:recording-saved', onSaved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repCode, leadId]);

  async function onDelete(r: Recording) {
    if (!r.rep_code) return;
    if (!confirm('Delete this recording? This cannot be undone.')) return;
    setBusyId(r.id);
    try {
      await deleteRecording(r.id, r.rep_code);
      setItems((prev) => prev.filter((x) => x.id !== r.id));
      toast.success('Recording deleted');
    } catch (e: any) {
      toast.error('Delete failed', { description: e?.message });
    } finally {
      setBusyId(null);
    }
  }

  function download(r: Recording) {
    const url = r.video_url || r.audio_url;
    if (!url) {
      toast.error('No file available');
      return;
    }
    const ext = (r.mime_type?.split('/')[1] || 'webm').split(';')[0];
    const safeLabel = (r.title || `recording-${r.id}`).replace(/[^\w.-]+/g, '_');
    fetch(url)
      .then((res) => res.blob())
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${safeLabel}.${ext}`;
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => toast.error('Download failed'));
  }

  return (
    <div className="rounded-lg border border-amber/30 bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-amber" />
          <h3 className="font-display font-bold text-sm">{title}</h3>
          <span className="font-mono text-[10px] text-muted-foreground">{items.length}</span>
        </div>
        <button
          onClick={refresh}
          className="text-xs text-muted-foreground hover:text-amber inline-flex items-center gap-1"
          disabled={loading}
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {loading && items.length === 0 ? (
        <div className="text-xs text-muted-foreground flex items-center gap-2 py-6 justify-center">
          <Loader2 className="w-3 h-3 animate-spin" /> Loading recordings…
        </div>
      ) : items.length === 0 ? (
        <div className="text-xs text-muted-foreground py-6 text-center">
          No recordings yet. Hit <strong>Record</strong> in the Chrome extension or the Aetheris Operator app
          and they'll appear here automatically.
        </div>
      ) : (
        <ul className={`space-y-2 overflow-y-auto ${maxHeightClass} pr-1`}>
          {items.map((r) => {
            const isAudio = !!r.audio_path && !r.video_path;
            const url = r.video_url || r.audio_url;
            return (
              <li key={r.id} className="border border-border/60 rounded-md p-3 bg-background/40">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded bg-amber/10 text-amber flex items-center justify-center shrink-0">
                    {isAudio ? <Mic className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold truncate">
                        {r.title || (isAudio ? 'Audio recording' : 'Screen recording')}
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-amber/80">
                        {r.source}
                      </span>
                      {r.lead_business && (
                        <span className="font-mono text-[10px] text-muted-foreground">
                          · {r.lead_business}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                      {new Date(r.started_at).toLocaleString()} ·{' '}
                      {formatDuration(r.duration_sec)} · {formatBytes(r.size_bytes)}
                    </div>
                    {url && (
                      <div className="mt-2">
                        {isAudio ? (
                          <audio controls preload="none" src={url} className="w-full h-9" />
                        ) : (
                          <video
                            controls
                            preload="metadata"
                            src={url}
                            className="w-full max-h-56 rounded border border-border/50 bg-black"
                          />
                        )}
                      </div>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => download(r)}
                        className="text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded border border-amber/40 text-amber hover:bg-amber/10"
                      >
                        <Download className="w-3 h-3" /> Download
                      </button>
                      {url && (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded border border-border/60 text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="w-3 h-3" /> Open
                        </a>
                      )}
                      {allowDelete && (
                        <button
                          onClick={() => onDelete(r)}
                          disabled={busyId === r.id}
                          className="text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded border border-destructive/40 text-destructive hover:bg-destructive/10 ml-auto"
                        >
                          {busyId === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default RecordingsHistoryPanel;
