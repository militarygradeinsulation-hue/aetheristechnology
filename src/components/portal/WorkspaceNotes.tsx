import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, Pin, PinOff, Save } from 'lucide-react';
import { listRepNotes, upsertRepNote, deleteRepNote, type RepNote } from '@/lib/portalWorkspace';

interface Props {
  searchQuery?: string;
}

export const WorkspaceNotes: React.FC<Props> = ({ searchQuery = '' }) => {
  const [notes, setNotes] = useState<RepNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<RepNote | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [draftPinned, setDraftPinned] = useState(false);
  const [saving, setSaving] = useState(false);
  const dirtyRef = useRef(false);

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
    dirtyRef.current = false;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await upsertRepNote({
        id: active?.id,
        title: draftTitle || 'Untitled',
        body: draftBody,
        pinned: draftPinned,
        tags: active?.tags || [],
      });
      setNotes(prev => {
        const others = prev.filter(n => n.id !== saved.id);
        return [saved, ...others].sort((a, b) =>
          (Number(b.pinned) - Number(a.pinned)) ||
          (new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        );
      });
      setActive(saved);
      dirtyRef.current = false;
      toast({ title: 'Saved' });
    } catch (e: any) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleNew = () => {
    selectNote(null);
    setDraftTitle('New note');
    setDraftBody('');
    setDraftPinned(false);
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

  const filtered = notes.filter(n => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q);
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
                  <p className="text-sm font-medium text-foreground truncate">{n.title}</p>
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
              rows={16}
              className="font-mono text-sm"
            />
            <div className="flex items-center gap-2 flex-wrap">
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
