import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, Pin, PinOff, Save, Paperclip, X, FileIcon, ImageIcon, Download } from 'lucide-react';
import { listRepNotes, upsertRepNote, deleteRepNote, type RepNote, type RepNoteAttachment } from '@/lib/portalWorkspace';
import { supabase } from '@/integrations/supabase/client';

const BUCKET = 'workspace-files';
const MAX_FILE_MB = 20;

interface Props {
  searchQuery?: string;
}

const isImage = (t: string) => t.startsWith('image/');

export const WorkspaceNotes: React.FC<Props> = ({ searchQuery = '' }) => {
  const [notes, setNotes] = useState<RepNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<RepNote | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [draftPinned, setDraftPinned] = useState(false);
  const [draftAttachments, setDraftAttachments] = useState<RepNoteAttachment[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const dirtyRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listRepNotes();
      setNotes(data);
      if (!active && data.length) selectNote(data[0]);
    } catch (e: any) {
      toast({ title: 'Failed to load notes', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, []); // eslint-disable-line

  const selectNote = (n: RepNote | null) => {
    setActive(n);
    setDraftTitle(n?.title || '');
    setDraftBody(n?.body || '');
    setDraftPinned(n?.pinned || false);
    setDraftAttachments(n?.attachments || []);
    dirtyRef.current = false;
  };

  const persist = async (overrideAttachments?: RepNoteAttachment[]) => {
    setSaving(true);
    try {
      const saved = await upsertRepNote({
        id: active?.id,
        title: draftTitle || 'Untitled',
        body: draftBody,
        pinned: draftPinned,
        tags: active?.tags || [],
        attachments: overrideAttachments ?? draftAttachments,
      });
      setNotes(prev => {
        const others = prev.filter(n => n.id !== saved.id);
        return [saved, ...others].sort((a, b) =>
          (Number(b.pinned) - Number(a.pinned)) ||
          (new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        );
      });
      setActive(saved);
      setDraftAttachments(saved.attachments || []);
      dirtyRef.current = false;
      return saved;
    } catch (e: any) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
      throw e;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    try { await persist(); toast({ title: 'Saved' }); } catch { /* toast already shown */ }
  };

  const handleNew = () => {
    selectNote(null);
    setDraftTitle('New note');
    setDraftBody('');
    setDraftPinned(false);
    setDraftAttachments([]);
  };

  const handleDelete = async () => {
    if (!active) return;
    if (!confirm(`Delete "${active.title}"?`)) return;
    try {
      await deleteRepNote(active.id);
      setNotes(prev => prev.filter(n => n.id !== active.id));
      selectNote(null);
      toast({ title: 'Deleted' });
    } catch (e: any) {
      toast({ title: 'Delete failed', description: e.message, variant: 'destructive' });
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setUploading(true);
    const newAttachments: RepNoteAttachment[] = [...draftAttachments];
    try {
      for (const file of Array.from(files)) {
        if (file.size > MAX_FILE_MB * 1024 * 1024) {
          toast({ title: `${file.name} too large`, description: `Max ${MAX_FILE_MB}MB`, variant: 'destructive' });
          continue;
        }
        const ext = file.name.split('.').pop() || 'bin';
        const path = `notes/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
          cacheControl: '3600', upsert: false, contentType: file.type || undefined,
        });
        if (error) {
          toast({ title: `Upload failed: ${file.name}`, description: error.message, variant: 'destructive' });
          continue;
        }
        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
        newAttachments.push({
          name: file.name, url: pub.publicUrl, path, size: file.size,
          type: file.type || 'application/octet-stream',
          uploaded_at: new Date().toISOString(),
        });
      }
      setDraftAttachments(newAttachments);
      dirtyRef.current = true;
      // Auto-save attachments so reps don't lose them
      try { await persist(newAttachments); } catch { /* swallow */ }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = async (idx: number) => {
    const att = draftAttachments[idx];
    if (!att) return;
    if (!confirm(`Remove "${att.name}"?`)) return;
    const next = draftAttachments.filter((_, i) => i !== idx);
    setDraftAttachments(next);
    dirtyRef.current = true;
    try {
      if (att.path) await supabase.storage.from(BUCKET).remove([att.path]);
    } catch { /* ignore */ }
    try { await persist(next); } catch { /* swallow */ }
  };

  const filtered = notes.filter(n => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return n.title.toLowerCase().includes(q)
      || n.body.toLowerCase().includes(q)
      || (n.attachments || []).some(a => a.name.toLowerCase().includes(q));
  });

  return (
    <div className="grid md:grid-cols-[280px_1fr] gap-4 min-h-[500px]">
      {/* Notes list */}
      <div className="space-y-2">
        <Button onClick={handleNew} className="w-full" size="sm">
          <Plus className="w-4 h-4 mr-1" /> New note
        </Button>
        {loading ? (
          <div className="glass p-6 rounded-lg text-center">
            <Loader2 className="w-5 h-5 animate-spin text-amber mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground p-4 text-center">
            {notes.length === 0 ? 'No notes yet.' : 'No matches.'}
          </p>
        ) : (
          <div className="space-y-1 max-h-[60vh] overflow-y-auto">
            {filtered.map(n => (
              <button
                key={n.id}
                onClick={() => {
                  if (dirtyRef.current && !confirm('Discard unsaved changes?')) return;
                  selectNote(n);
                }}
                className={`w-full text-left p-2 rounded-md border transition-colors ${
                  active?.id === n.id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40'
                }`}
              >
                <div className="flex items-center gap-1">
                  {n.pinned && <Pin className="w-3 h-3 text-amber flex-shrink-0" />}
                  <p className="text-sm font-medium text-foreground truncate flex-1">{n.title}</p>
                  {(n.attachments?.length || 0) > 0 && (
                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                      <Paperclip className="w-3 h-3" />{n.attachments.length}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{n.body || '(empty)'}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{new Date(n.updated_at).toLocaleString()}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Editor */}
      <div className="glass p-4 rounded-lg border border-border space-y-3">
        {!active && !draftTitle ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            Select a note or click "New note" to start writing.
          </p>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Input
                value={draftTitle}
                onChange={e => { setDraftTitle(e.target.value); dirtyRef.current = true; }}
                placeholder="Title"
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                title={draftPinned ? 'Unpin' : 'Pin'}
                onClick={() => { setDraftPinned(p => !p); dirtyRef.current = true; }}
              >
                {draftPinned ? <PinOff className="w-4 h-4 text-amber" /> : <Pin className="w-4 h-4" />}
              </Button>
            </div>
            <Textarea
              value={draftBody}
              onChange={e => { setDraftBody(e.target.value); dirtyRef.current = true; }}
              placeholder="Write your note..."
              rows={12}
              className="font-mono text-sm"
            />

            {/* Attachments section */}
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Paperclip className="w-3 h-3" /> Attachments ({draftAttachments.length})
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={e => handleFiles(e.target.files)}
                />
                <Button
                  variant="outline" size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Plus className="w-3 h-3 mr-1" />}
                  Attach files
                </Button>
              </div>

              {draftAttachments.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  No files attached. Drop screenshots, contracts, recordings, etc. into this note.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {draftAttachments.map((a, i) => (
                    <div key={i} className="relative group border border-border rounded-md p-2 bg-background/30">
                      {isImage(a.type) ? (
                        <a href={a.url} target="_blank" rel="noopener noreferrer">
                          <img src={a.url} alt={a.name} className="w-full h-20 object-cover rounded" />
                        </a>
                      ) : (
                        <a href={a.url} target="_blank" rel="noopener noreferrer"
                           className="flex items-center justify-center h-20 bg-muted/30 rounded">
                          <FileIcon className="w-8 h-8 text-muted-foreground" />
                        </a>
                      )}
                      <p className="text-[11px] text-foreground truncate mt-1" title={a.name}>{a.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {(a.size / 1024).toFixed(1)} KB
                      </p>
                      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a href={a.url} download={a.name} target="_blank" rel="noopener noreferrer"
                           className="bg-background/80 rounded p-1 hover:bg-background">
                          <Download className="w-3 h-3" />
                        </a>
                        <button onClick={() => removeAttachment(i)}
                                className="bg-background/80 rounded p-1 hover:bg-destructive hover:text-destructive-foreground">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-border">
              <Button onClick={handleSave} disabled={saving} size="sm">
                {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                Save
              </Button>
              {active && (
                <Button onClick={handleDelete} variant="ghost" size="sm" className="text-red-400 hover:text-red-500">
                  <Trash2 className="w-4 h-4 mr-1" /> Delete
                </Button>
              )}
              {active && (
                <span className="text-xs text-muted-foreground ml-auto">
                  Last edited {new Date(active.updated_at).toLocaleString()}
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
