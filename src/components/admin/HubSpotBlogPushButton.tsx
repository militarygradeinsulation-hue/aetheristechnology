import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getAdminToken } from '@/lib/adminAuth';
import { toast } from '@/hooks/use-toast';

interface Props {
  title: string;
  body: string;
  metaDescription?: string;
  size?: 'sm' | 'default';
  variant?: 'default' | 'outline' | 'ghost';
  className?: string;
}

interface Blog { id: string; name: string; slug?: string }

export const HubSpotBlogPushButton: React.FC<Props> = ({ title, body, metaDescription = '', size = 'sm', variant = 'outline', className }) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(title);
  const [postBody, setPostBody] = useState(body);
  const [meta, setMeta] = useState(metaDescription);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [blogId, setBlogId] = useState('');
  const [scheduleAt, setScheduleAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingBlogs, setLoadingBlogs] = useState(false);

  useEffect(() => { setName(title); }, [title]);
  useEffect(() => { setPostBody(body); }, [body]);
  useEffect(() => { setMeta(metaDescription); }, [metaDescription]);

  useEffect(() => {
    if (!open || blogs.length) return;
    (async () => {
      setLoadingBlogs(true);
      try {
        const token = getAdminToken();
        const { data, error } = await supabase.functions.invoke('hubspot-blog-publish', {
          body: { action: 'list-blogs' },
          headers: { 'x-admin-token': token! },
        });
        if (error || data?.error) throw new Error(data?.error || error?.message);
        setBlogs(data.blogs || []);
        if (data.blogs?.[0]) setBlogId(data.blogs[0].id);
      } catch (e) {
        toast({ title: 'Could not load HubSpot blogs', description: e instanceof Error ? e.message : 'Unknown', variant: 'destructive' });
      } finally {
        setLoadingBlogs(false);
      }
    })();
  }, [open, blogs.length]);

  const submit = async (immediate: boolean) => {
    if (!blogId) { toast({ title: 'Pick a blog', variant: 'destructive' }); return; }
    if (!name.trim() || !postBody.trim()) { toast({ title: 'Title and body required', variant: 'destructive' }); return; }
    if (!immediate && !scheduleAt) { toast({ title: 'Pick a date/time', variant: 'destructive' }); return; }
    setBusy(true);
    try {
      const token = getAdminToken();
      const { data, error } = await supabase.functions.invoke('hubspot-blog-publish', {
        body: {
          action: immediate ? 'publish-now' : 'schedule-post',
          contentGroupId: blogId,
          name,
          postBody,
          metaDescription: meta,
          publishDate: immediate ? undefined : new Date(scheduleAt).toISOString(),
        },
        headers: { 'x-admin-token': token! },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast({ title: immediate ? 'Published to HubSpot' : 'Scheduled on HubSpot', description: data.post?.url || '' });
      setOpen(false);
    } catch (e) {
      toast({ title: 'HubSpot push failed', description: e instanceof Error ? e.message : 'Unknown', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button size={size} variant={variant} className={className} onClick={() => setOpen(true)}>
        <FileUp className="w-4 h-4 mr-1.5" /> Push to HubSpot Blog
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Push to HubSpot Blog</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Blog</Label>
              {loadingBlogs ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1.5"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
              ) : (
                <Select value={blogId} onValueChange={setBlogId}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select blog" /></SelectTrigger>
                  <SelectContent>
                    {blogs.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Title</Label>
              <Input value={name} onChange={e => setName(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Meta description</Label>
              <Input value={meta} onChange={e => setMeta(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Body (HTML allowed)</Label>
              <Textarea value={postBody} onChange={e => setPostBody(e.target.value)} rows={10} className="mt-1.5 font-mono text-xs" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Schedule for (leave empty to publish immediately)</Label>
              <Input type="datetime-local" value={scheduleAt} onChange={e => setScheduleAt(e.target.value)} className="mt-1.5" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button variant="outline" onClick={() => submit(true)} disabled={busy}>
              {busy && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} Publish now
            </Button>
            <Button onClick={() => submit(false)} disabled={busy}>
              {busy && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
