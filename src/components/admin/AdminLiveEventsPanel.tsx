import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Trash2, Edit, Plus, Users, X, Eye, EyeOff, Upload, Loader2 } from 'lucide-react';

interface LiveEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  notes: string | null;
  image_url: string | null;
  signup_url: string | null;
  is_published: boolean;
  display_order: number;
}

interface Signup {
  id: string;
  event_id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  notes: string | null;
  created_at: string;
}

const empty = (): Partial<LiveEvent> => ({
  title: '',
  description: '',
  event_type: 'webinar',
  starts_at: '',
  ends_at: '',
  location: '',
  notes: '',
  image_url: '',
  signup_url: '',
  is_published: true,
  display_order: 0,
});

export const AdminLiveEventsPanel: React.FC = () => {
  const { toast } = useToast();
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<LiveEvent> | null>(null);
  const [signupsFor, setSignupsFor] = useState<LiveEvent | null>(null);
  const [signups, setSignups] = useState<Signup[]>([]);
  const [uploading, setUploading] = useState(false);

  const uploadImage = async (file: File) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast({ title: 'Image too large', description: 'Max 8MB.', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('event-images').upload(path, file, {
        cacheControl: '3600', upsert: false, contentType: file.type,
      });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('event-images').getPublicUrl(path);
      setEditing((prev) => prev ? { ...prev, image_url: data.publicUrl } : prev);
      toast({ title: 'Image uploaded' });
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e?.message || String(e), variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('events' as any)
      .select('*')
      .order('starts_at', { ascending: true });
    if (error) {
      toast({ title: 'Failed to load events', description: error.message, variant: 'destructive' });
    } else {
      setEvents((data as any) || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing?.title || !editing?.starts_at) {
      toast({ title: 'Title and start time are required', variant: 'destructive' });
      return;
    }
    const payload: any = {
      title: editing.title,
      description: editing.description || null,
      event_type: editing.event_type || 'webinar',
      starts_at: new Date(editing.starts_at).toISOString(),
      ends_at: editing.ends_at ? new Date(editing.ends_at).toISOString() : null,
      location: editing.location || null,
      notes: editing.notes || null,
      image_url: editing.image_url || null,
      signup_url: editing.signup_url || null,
      is_published: editing.is_published ?? true,
      display_order: editing.display_order ?? 0,
    };
    const q = editing.id
      ? supabase.from('events' as any).update(payload).eq('id', editing.id)
      : supabase.from('events' as any).insert(payload);
    const { error } = await q;
    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: editing.id ? 'Event updated' : 'Event created' });
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this event? Signups will be removed too.')) return;
    const { error } = await supabase.from('events' as any).delete().eq('id', id);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
      return;
    }
    load();
  };

  const togglePublish = async (e: LiveEvent) => {
    await supabase.from('events' as any).update({ is_published: !e.is_published }).eq('id', e.id);
    load();
  };

  const loadSignups = async (e: LiveEvent) => {
    setSignupsFor(e);
    const { data } = await supabase
      .from('event_signups' as any)
      .select('*')
      .eq('event_id', e.id)
      .order('created_at', { ascending: false });
    setSignups((data as any) || []);
  };

  const toLocalInput = (iso?: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-forensic text-2xl font-bold text-foreground">Live Events & Webinars</h2>
          <p className="text-sm text-muted-foreground">Manage events shown on the public home page.</p>
        </div>
        <Button onClick={() => setEditing(empty())} className="bg-amber hover:bg-amber/90 text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" /> New Event
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : events.length === 0 ? (
        <div className="forensic-tile rounded-sm border border-border/60 p-8 text-center">
          <Calendar className="w-10 h-10 mx-auto text-amber mb-3" />
          <p className="text-muted-foreground">No events yet. Click "New Event" to add a webinar or live meeting.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {events.map((e) => (
            <div key={e.id} className="forensic-tile rounded-sm border border-border/60 p-4 flex flex-col md:flex-row gap-4">
              {e.image_url && (
                <img src={e.image_url} alt={e.title} className="w-full md:w-40 h-28 object-cover rounded-sm border border-border/60" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <div className="font-case text-[10px] uppercase tracking-widest text-amber">{e.event_type}</div>
                    <h3 className="font-forensic text-lg font-bold text-foreground">{e.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(e.starts_at).toLocaleString()} {e.location ? `· ${e.location}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => togglePublish(e)}>
                      {e.is_published ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => loadSignups(e)}>
                      <Users className="w-3.5 h-3.5 mr-1" /> Signups
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing({ ...e, starts_at: toLocalInput(e.starts_at), ends_at: toLocalInput(e.ends_at) })}>
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => remove(e.id)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
                {e.description && <p className="text-sm text-foreground/80 mt-2 line-clamp-2">{e.description}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-sm max-w-2xl w-full p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-forensic text-xl font-bold text-foreground">{editing.id ? 'Edit Event' : 'New Event'}</h3>
              <Button size="sm" variant="ghost" onClick={() => setEditing(null)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-4">
              <div>
                <Label>Title *</Label>
                <Input value={editing.title || ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={editing.event_type || 'webinar'}
                    onChange={(e) => setEditing({ ...editing, event_type: e.target.value })}
                  >
                    <option value="webinar">Webinar</option>
                    <option value="live meeting">Live Meeting</option>
                    <option value="workshop">Workshop</option>
                    <option value="office hours">Office Hours</option>
                    <option value="event">Event</option>
                  </select>
                </div>
                <div>
                  <Label>Display Order</Label>
                  <Input type="number" value={editing.display_order ?? 0} onChange={(e) => setEditing({ ...editing, display_order: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Starts *</Label>
                  <Input type="datetime-local" value={editing.starts_at || ''} onChange={(e) => setEditing({ ...editing, starts_at: e.target.value })} />
                </div>
                <div>
                  <Label>Ends</Label>
                  <Input type="datetime-local" value={editing.ends_at || ''} onChange={(e) => setEditing({ ...editing, ends_at: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Location (Zoom link, address, etc.)</Label>
                <Input value={editing.location || ''} onChange={(e) => setEditing({ ...editing, location: e.target.value })} />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea rows={3} value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
              <div>
                <Label>Notes (extra details shown on signup)</Label>
                <Textarea rows={2} value={editing.notes || ''} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
              </div>
              <div>
                <Label>Event Image</Label>
                {editing.image_url && (
                  <div className="relative mt-2 mb-2 inline-block">
                    <img src={editing.image_url} alt="Event preview" className="h-32 rounded-sm border border-border/60 object-cover" />
                    <button
                      type="button"
                      onClick={() => setEditing({ ...editing, image_url: '' })}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow"
                      aria-label="Remove image"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <div className="flex gap-2 items-center">
                  <label className="inline-flex items-center gap-2 cursor-pointer rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent">
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {uploading ? 'Uploading…' : 'Upload image'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = ''; }}
                    />
                  </label>
                  <Input
                    value={editing.image_url || ''}
                    onChange={(e) => setEditing({ ...editing, image_url: e.target.value })}
                    placeholder="…or paste an image URL"
                  />
                </div>
              </div>
              <div>
                <Label>External Signup URL (optional — uses built-in form if blank)</Label>
                <Input value={editing.signup_url || ''} onChange={(e) => setEditing({ ...editing, signup_url: e.target.value })} placeholder="https://..." />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editing.is_published ?? true} onChange={(e) => setEditing({ ...editing, is_published: e.target.checked })} />
                Published (visible on home page)
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                <Button onClick={save} className="bg-amber hover:bg-amber/90 text-primary-foreground">Save</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {signupsFor && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-sm max-w-3xl w-full p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-forensic text-xl font-bold text-foreground">Signups</h3>
                <p className="text-sm text-muted-foreground">{signupsFor.title} — {signups.length} total</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setSignupsFor(null)}><X className="w-4 h-4" /></Button>
            </div>
            {signups.length === 0 ? (
              <p className="text-muted-foreground text-sm">No signups yet.</p>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {signups.map((s) => (
                  <div key={s.id} className="border border-border/60 rounded-sm p-3 text-sm">
                    <div className="flex justify-between gap-2 flex-wrap">
                      <div className="font-semibold text-foreground">{s.name}</div>
                      <div className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</div>
                    </div>
                    <div className="text-muted-foreground mt-1">
                      {s.email}{s.phone ? ` · ${s.phone}` : ''}{s.company ? ` · ${s.company}` : ''}
                    </div>
                    {s.notes && <div className="mt-1 text-foreground/80 text-xs">{s.notes}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLiveEventsPanel;
