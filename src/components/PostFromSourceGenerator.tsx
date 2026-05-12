import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Copy, Check, Sparkles, FileText, BookOpen, Lightbulb } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { PostImageGenerator } from './admin/PostImageGenerator';

type SourceType = 'idea' | 'blog' | 'playbook';

interface GeneratedPost {
  angle: string;
  hook: string;
  caption: string;
  hashtags: string[];
}

export const PostFromSourceGenerator: React.FC<{ adminMode?: boolean }> = ({ adminMode = false }) => {
  const [sourceType, setSourceType] = useState<SourceType>('idea');
  const [ideaPrompt, setIdeaPrompt] = useState('');
  const [count, setCount] = useState(3);
  const [blogs, setBlogs] = useState<{ id: string; title: string }[]>([]);
  const [playbooks, setPlaybooks] = useState<{ id: string; title: string }[]>([]);
  const [sourceId, setSourceId] = useState('');
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState<GeneratedPost[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: b }, { data: p }] = await Promise.all([
        supabase.from('blog_posts').select('id, title').eq('is_published', true).order('published_at', { ascending: false }).limit(50),
        supabase.from('playbooks').select('id, title').order('created_at', { ascending: false }).limit(50),
      ]);
      setBlogs(b || []);
      setPlaybooks(p || []);
    })();
  }, []);

  const handleGenerate = async () => {
    if (sourceType === 'idea' && !ideaPrompt.trim()) {
      toast({ title: 'Add an idea or notes', variant: 'destructive' });
      return;
    }
    if (sourceType !== 'idea' && !sourceId) {
      toast({ title: `Pick a ${sourceType}`, variant: 'destructive' });
      return;
    }
    setLoading(true);
    setPosts([]);
    try {
      const { data, error } = await supabase.functions.invoke('generate-posts-from-source', {
        body: { sourceType, sourceId: sourceType === 'idea' ? undefined : sourceId, ideaPrompt: sourceType === 'idea' ? ideaPrompt : undefined, count },
      });
      if (error || !data) throw new Error(error?.message || 'Failed');
      if (data.error) throw new Error(data.error);
      setPosts(data.posts || []);
      toast({ title: `Generated ${data.posts?.length || 0} posts` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const copy = (post: GeneratedPost, idx: number) => {
    const text = `${post.hook}\n\n${post.caption}\n\n${(post.hashtags || []).map(h => `#${h.replace(/^#/, '')}`).join(' ')}`;
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
    toast({ title: 'Copied!' });
  };

  return (
    <div className="max-w-4xl mx-auto mt-12">
      <div className="glass rounded-xl p-6 md:p-8 border border-border">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-6 h-6 text-amber" />
          <h2 className="text-2xl font-bold text-foreground font-display">Post Generator</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">Turn a blog, a playbook, or your raw idea into ready-to-post LinkedIn content.</p>

        <div className="grid grid-cols-3 gap-2 mb-5">
          {([
            { v: 'idea', label: 'Idea / Prompt', icon: Lightbulb },
            { v: 'blog', label: 'From Blog', icon: FileText },
            { v: 'playbook', label: 'From Playbook', icon: BookOpen },
          ] as { v: SourceType; label: string; icon: any }[]).map(({ v, label, icon: Icon }) => (
            <button
              key={v}
              onClick={() => { setSourceType(v); setSourceId(''); }}
              className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-semibold transition ${sourceType === v ? 'border-amber bg-amber/10 text-amber' : 'border-border text-muted-foreground hover:text-foreground'}`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {sourceType === 'idea' && (
          <div className="mb-4">
            <Label>Your idea, notes, angle, or rough draft</Label>
            <Textarea
              value={ideaPrompt}
              onChange={(e) => setIdeaPrompt(e.target.value)}
              placeholder="e.g. Most CRMs aren't broken, they're just unowned. I audited a $7M shop last week with 312 deals 'open' and no one can name who owns followup..."
              rows={5}
              className="mt-1"
            />
          </div>
        )}

        {sourceType === 'blog' && (
          <div className="mb-4">
            <Label>Pick a blog</Label>
            <select value={sourceId} onChange={(e) => setSourceId(e.target.value)} className="w-full mt-1 bg-background border border-input rounded-md px-3 py-2 text-sm">
              <option value="">— Select a blog post —</option>
              {blogs.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
            </select>
          </div>
        )}

        {sourceType === 'playbook' && (
          <div className="mb-4">
            <Label>Pick a playbook</Label>
            <select value={sourceId} onChange={(e) => setSourceId(e.target.value)} className="w-full mt-1 bg-background border border-input rounded-md px-3 py-2 text-sm">
              <option value="">— Select a playbook —</option>
              {playbooks.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
        )}

        <div className="flex items-end gap-3 mb-5">
          <div className="w-32">
            <Label>How many?</Label>
            <Input type="number" min={1} max={10} value={count} onChange={(e) => setCount(Math.max(1, Math.min(10, Number(e.target.value) || 1)))} className="mt-1" />
          </div>
          <Button onClick={handleGenerate} disabled={loading} className="bg-amber hover:bg-amber/90 text-background font-bold flex-1 sm:flex-none">
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating…</> : 'Generate Posts'}
          </Button>
        </div>

        {posts.length > 0 && (
          <div className="space-y-4 mt-6">
            {posts.map((post, i) => (
              <div key={i} className="rounded-lg border border-border bg-background/40 p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <span className="text-xs uppercase font-bold text-amber bg-amber/10 px-2 py-1 rounded">{post.angle}</span>
                  <Button variant="ghost" size="sm" onClick={() => copy(post, i)}>
                    {copiedIdx === i ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-base font-bold text-foreground mb-3">{post.hook}</p>
                <p className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed">{post.caption}</p>
                {post.hashtags?.length > 0 && (
                  <p className="text-xs text-primary mt-3">{post.hashtags.map(h => `#${h.replace(/^#/, '')}`).join(' ')}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
