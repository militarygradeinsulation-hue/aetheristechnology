import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, CalendarPlus, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getAdminToken } from '@/lib/adminAuth';
import { toast } from '@/hooks/use-toast';

type Platform = 'linkedin' | 'facebook' | 'twitter' | 'instagram' | 'tiktok' | 'youtube' | 'pinterest' | 'threads' | 'bluesky';

const ALL_PLATFORMS: { id: Platform; label: string }[] = [
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'twitter', label: 'X / Twitter' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'pinterest', label: 'Pinterest' },
  { id: 'threads', label: 'Threads' },
  { id: 'bluesky', label: 'Bluesky' },
];

interface Props {
  content: string;
  source?: string;
  size?: 'sm' | 'default';
  variant?: 'default' | 'outline' | 'ghost';
  className?: string;
  label?: string;
}

export const ScheduleSocialButton: React.FC<Props> = ({
  content,
  source,
  size = 'sm',
  variant = 'outline',
  className,
  label = 'Schedule on Social',
}) => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(content);
  const [platforms, setPlatforms] = useState<Platform[]>(['linkedin']);
  const [scheduleAt, setScheduleAt] = useState('');
  const [media, setMedia] = useState('');
  const [busy, setBusy] = useState(false);
  const [ayrEnabled, setAyrEnabled] = useState<boolean | null>(null);

  useEffect(() => { setText(content); }, [content]);

  useEffect(() => {
    if (!open || ayrEnabled !== null) return;
    (async () => {
      const token = getAdminToken();
      if (!token) { setAyrEnabled(false); return; }
      const { data } = await supabase.functions.invoke('social-scheduler', {
        body: { action: 'status' },
        headers: { 'x-admin-token': token },
      });
      setAyrEnabled(!!data?.enabled);
    })();
  }, [open, ayrEnabled]);

  const togglePlatform = (p: Platform) =>
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const submit = async (immediate: boolean) => {
    if (!text.trim()) { toast({ title: 'Empty post', variant: 'destructive' }); return; }
    if (platforms.length === 0) { toast({ title: 'Pick at least one platform', variant: 'destructive' }); return; }
    if (!immediate && !scheduleAt) { toast({ title: 'Pick a date/time', variant: 'destructive' }); return; }

    setBusy(true);
    try {
      const token = getAdminToken();
      const mediaUrls = media.split('\n').map(s => s.trim()).filter(Boolean);

      // If only LinkedIn AND Ayrshare not configured, fall back to existing queue.
      if (!ayrEnabled && platforms.length === 1 && platforms[0] === 'linkedin') {
        const { data, error } = await supabase.functions.invoke('linkedin-post', {
          body: immediate
            ? { action: 'quick-post', content: text }
            : { action: 'queue-from-content', posts: [{ content: text, format: source || 'manual', scheduled_for: new Date(scheduleAt).toISOString() }] },
          headers: { 'x-admin-token': token! },
        });
        if (error || data?.error) throw new Error(data?.error || error?.message);
        toast({ title: immediate ? 'Posted to LinkedIn' : 'Queued on LinkedIn' });
        setOpen(false);
        return;
      }

      if (!ayrEnabled) {
        toast({
          title: 'Multi-network scheduling not configured',
          description: 'Add an Ayrshare API key (admin → Tools → Social Scheduler) to publish beyond LinkedIn.',
          variant: 'destructive',
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('social-scheduler', {
        body: {
          action: 'schedule',
          content: text,
          platforms,
          scheduleDate: immediate ? null : new Date(scheduleAt).toISOString(),
          mediaUrls,
          source: source || 'generator',
        },
        headers: { 'x-admin-token': token! },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast({ title: immediate ? 'Posted' : 'Scheduled', description: `${platforms.length} network(s)` });
      setOpen(false);
    } catch (e) {
      toast({ title: 'Failed', description: e instanceof Error ? e.message : 'Unknown', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button size={size} variant={variant} className={className} onClick={() => setOpen(true)}>
        <CalendarPlus className="w-4 h-4 mr-1.5" /> {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Schedule social post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Post content</Label>
              <Textarea value={text} onChange={e => setText(e.target.value)} rows={6} className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Platforms</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {ALL_PLATFORMS.map(p => {
                  const active = platforms.includes(p.id);
                  const disabled = !ayrEnabled && p.id !== 'linkedin';
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => togglePlatform(p.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                        active ? 'bg-amber text-background border-amber' : 'bg-transparent text-foreground border-border hover:border-amber/40'
                      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      {p.label}{disabled ? ' (locked)' : ''}
                    </button>
                  );
                })}
              </div>
              {ayrEnabled === false && (
                <p className="text-[11px] text-muted-foreground mt-2">
                  Multi-network locked. LinkedIn works via the built-in queue. Add an <code>AYRSHARE_API_KEY</code> in Tools → Social Scheduler to unlock the rest.
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Schedule for</Label>
                <Input type="datetime-local" value={scheduleAt} onChange={e => setScheduleAt(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Media URLs (optional, one per line)</Label>
                <Textarea value={media} onChange={e => setMedia(e.target.value)} rows={2} placeholder="https://…/image.jpg" className="mt-1.5 text-xs font-mono" />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button variant="outline" onClick={() => submit(true)} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Send className="w-4 h-4 mr-1.5" />}
              Post now
            </Button>
            <Button onClick={() => submit(false)} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <CalendarPlus className="w-4 h-4 mr-1.5" />}
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
