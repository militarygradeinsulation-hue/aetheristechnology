import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getAdminToken } from '@/lib/adminAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Linkedin, Loader2, CheckCircle2, RefreshCw, ImagePlus, X } from 'lucide-react';

const MAX = 3000;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

type Profile = { name?: string; email?: string; picture?: string; sub?: string };

export const AdminLinkedInPublisher: React.FC = () => {
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'CONNECTIONS'>('PUBLIC');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [lastPostId, setLastPostId] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>('');
  const [imageName, setImageName] = useState<string>('');
  const [imageAlt, setImageAlt] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);


  const invoke = async (action: 'profile' | 'publish', body: Record<string, unknown> = {}) => {
    const token = getAdminToken();
    const { data, error } = await supabase.functions.invoke('linkedin-publish', {
      body: { action, ...body },
      headers: token ? { 'x-admin-token': token } : {},
    });
    if (error) {
      // Try to surface upstream body
      const detail = (error as any)?.context ? await (error as any).context.text().catch(() => '') : '';
      throw new Error(detail || error.message);
    }
    return data;
  };

  const loadProfile = async () => {
    setLoadingProfile(true);
    try {
      const data = await invoke('profile');
      setProfile(data);
    } catch (e) {
      toast({
        title: 'Could not load LinkedIn profile',
        description: (e as Error).message,
        variant: 'destructive',
      });
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => { loadProfile(); }, []);

  const clearImage = () => {
    setImageData(null);
    setImageMime('');
    setImageName('');
    setImageAlt('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const onPickImage = (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Images only', variant: 'destructive' });
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast({ title: 'Image too large', description: 'Max 10MB.', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageData(String(reader.result));
      setImageMime(file.type);
      setImageName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const publish = async () => {
    if (!text.trim()) {
      toast({ title: 'Post is empty', variant: 'destructive' });
      return;
    }
    setPublishing(true);
    setLastPostId(null);
    try {
      const data = await invoke('publish', {
        text: text.trim(),
        visibility,
        ...(imageData ? { imageBase64: imageData, imageMime, imageAlt: imageAlt.trim() } : {}),
      });
      setLastPostId(data?.postId ?? 'published');
      toast({
        title: 'Posted to LinkedIn',
        description: data?.postId ? `Post ID: ${data.postId}` : 'Published successfully.',
      });
      setText('');
      clearImage();
    } catch (e) {
      toast({
        title: 'LinkedIn publish failed',
        description: (e as Error).message,
        variant: 'destructive',
      });
    } finally {
      setPublishing(false);
    }
  };

  const remaining = MAX - text.length;
  const over = remaining < 0;


  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between border border-border rounded-lg p-4 bg-card">
        <div className="flex items-center gap-3">
          <Linkedin className="w-6 h-6 text-[#0A66C2]" />
          <div>
            <div className="font-semibold text-sm">
              {profile?.name ?? (loadingProfile ? 'Loading…' : 'LinkedIn')}
            </div>
            <div className="text-xs text-muted-foreground">
              {profile?.email ?? 'Connected via Lovable connector'}
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={loadProfile} disabled={loadingProfile}>
          {loadingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </Button>
      </div>

      <div>
        <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1 block">
          Post content
        </label>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder="Write your LinkedIn post…"
          className="font-mono text-sm"
        />
        <div className={`text-xs mt-1 ${over ? 'text-destructive' : 'text-muted-foreground'}`}>
          {remaining} characters remaining
        </div>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-xs font-mono uppercase text-muted-foreground">Visibility</label>
        <select
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as any)}
          className="text-sm border border-border rounded px-2 py-1 bg-background"
        >
          <option value="PUBLIC">Public (Anyone)</option>
          <option value="CONNECTIONS">Connections only</option>
        </select>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={publish} disabled={publishing || over || !text.trim()}>
          {publishing ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Publishing…</>
          ) : (
            <><Linkedin className="w-4 h-4 mr-2" />Publish to LinkedIn</>
          )}
        </Button>
        {lastPostId && (
          <span className="text-xs text-green-600 flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" /> Posted • {lastPostId}
          </span>
        )}
      </div>

      <p className="text-xs text-muted-foreground border-t border-border pt-3">
        Publishes to the LinkedIn account linked in Workspace → Connectors. Commenting on posts
        isn't supported by LinkedIn's API through this connector.
      </p>
    </div>
  );
};

export default AdminLinkedInPublisher;
