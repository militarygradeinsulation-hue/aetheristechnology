import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getAdminToken } from '@/lib/adminAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2, Mic, RefreshCw, Sparkles, Upload, Trash2, Download, FileText, Wand2, Radio,
} from 'lucide-react';

interface Voice { voice_id: string; name: string; category?: string; labels?: Record<string, string>; preview_url?: string }
interface Episode {
  id: string; title: string; topic: string | null; script: string;
  voice_id: string | null; voice_name: string | null;
  audio_url: string | null; image_url: string | null;
  duration_seconds: number | null; created_at: string;
}

const CATEGORIES = ['All', 'Revenue Leaks', 'Systems & Ops', 'AI / Practical', 'Sales & Pipeline', 'Founder POV', 'Industry-Specific'];

function fnHeaders(): Record<string, string> {
  const t = getAdminToken();
  return t ? { 'x-admin-token': t } : {};
}

async function call<T = any>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke('admin-podcast-studio', {
    body: { action, ...body }, headers: fnHeaders(),
  });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as T;
}

function fmtDur(sec: number | null) {
  if (!sec) return '—';
  const m = Math.floor(sec / 60); const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const AdminPodcastStudio: React.FC = () => {
  const { toast } = useToast();
  const [voices, setVoices] = useState<Voice[]>([]);
  const [voiceId, setVoiceId] = useState<string>('');
  const [voicesLoading, setVoicesLoading] = useState(true);

  const [category, setCategory] = useState<string>('All');
  const [topics, setTopics] = useState<string[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);

  const [topic, setTopic] = useState('');
  const [title, setTitle] = useState('');
  const [script, setScript] = useState('');
  const [source, setSource] = useState('');
  const [durationMin, setDurationMin] = useState(5);
  const [scriptLoading, setScriptLoading] = useState(false);
  const [episodeLoading, setEpisodeLoading] = useState(false);

  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [epLoading, setEpLoading] = useState(true);

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const { voices } = await call<{ voices: Voice[] }>('list_voices');
        setVoices(voices);
        if (voices[0]) setVoiceId(voices[0].voice_id);
      } catch (e) {
        toast({ title: 'Voices failed', description: (e as Error).message, variant: 'destructive' });
      } finally { setVoicesLoading(false); }
      refreshTopics();
      loadEpisodes();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadEpisodes = async () => {
    setEpLoading(true);
    try {
      const { episodes } = await call<{ episodes: Episode[] }>('list');
      setEpisodes(episodes);
    } catch (e) {
      toast({ title: 'Load failed', description: (e as Error).message, variant: 'destructive' });
    } finally { setEpLoading(false); }
  };

  const refreshTopics = async () => {
    setTopicsLoading(true);
    try {
      const { topics } = await call<{ topics: string[] }>('suggest_topics', {
        category: category === 'All' ? '' : category, count: 10, exclude: topics,
      });
      setTopics(topics);
    } catch (e) {
      toast({ title: 'Topic refresh failed', description: (e as Error).message, variant: 'destructive' });
    } finally { setTopicsLoading(false); }
  };

  useEffect(() => { refreshTopics(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [category]);

  const onUpload = async (f: File | null) => {
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast({ title: 'File too big (5MB max)', variant: 'destructive' }); return; }
    const text = await f.text();
    setSource(text);
    toast({ title: 'Source loaded', description: `${f.name} (${text.length} chars)` });
  };

  const writeScript = async () => {
    if (!topic && !source) { toast({ title: 'Pick a topic or paste source text', variant: 'destructive' }); return; }
    setScriptLoading(true);
    try {
      const out = await call<{ title: string; script: string }>('generate_script', { topic, source, durationMin });
      setTitle(out.title); setScript(out.script);
      toast({ title: 'Script ready', description: 'Edit it, then generate the episode.' });
    } catch (e) {
      toast({ title: 'Script failed', description: (e as Error).message, variant: 'destructive' });
    } finally { setScriptLoading(false); }
  };

  const createEpisode = async () => {
    if (!script.trim()) { toast({ title: 'Script is empty', variant: 'destructive' }); return; }
    if (!voiceId) { toast({ title: 'Pick a voice', variant: 'destructive' }); return; }
    setEpisodeLoading(true);
    try {
      const v = voices.find(v => v.voice_id === voiceId);
      const { episode } = await call<{ episode: Episode }>('create_episode', {
        title: title || topic || 'Untitled Episode',
        topic, script, voiceId, voiceName: v?.name || null,
        sourceType: source ? 'paste/upload' : 'topic',
        sourceText: source || null,
      });
      toast({ title: 'Episode created', description: episode.title });
      setScript(''); setTitle(''); setSource('');
      setEpisodes(prev => [episode, ...prev]);
    } catch (e) {
      toast({ title: 'Episode failed', description: (e as Error).message, variant: 'destructive' });
    } finally { setEpisodeLoading(false); }
  };

  const deleteEpisode = async (id: string) => {
    if (!confirm('Delete this episode? Audio + image will be removed.')) return;
    try {
      await call('delete', { id });
      setEpisodes(prev => prev.filter(e => e.id !== id));
    } catch (e) {
      toast({ title: 'Delete failed', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const featuredVoices = useMemo(() => {
    return voices.slice().sort((a, b) => {
      const aCloned = a.category === 'cloned' ? 0 : 1;
      const bCloned = b.category === 'cloned' ? 0 : 1;
      if (aCloned !== bCloned) return aCloned - bCloned;
      return a.name.localeCompare(b.name);
    });
  }, [voices]);

  return (
    <div className="space-y-6">
      <div className="glass p-6 rounded-xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-amber/15 text-amber"><Radio className="w-6 h-6" /></div>
          <div>
            <h2 className="text-2xl font-display font-bold text-foreground">Podcast Studio</h2>
            <p className="text-sm text-muted-foreground">Generate short-form podcast episodes in your ElevenLabs voice. Cover art included. Saved automatically.</p>
          </div>
        </div>
      </div>

      <div className="glass p-6 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Voice</label>
          {voicesLoading ? (
            <div className="flex items-center gap-2 mt-2 text-muted-foreground text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading voices…</div>
          ) : (
            <select
              value={voiceId} onChange={(e) => setVoiceId(e.target.value)}
              className="mt-1 w-full bg-background border border-border rounded-md px-3 py-2 text-foreground"
            >
              {featuredVoices.map(v => (
                <option key={v.voice_id} value={v.voice_id}>
                  {v.name} {v.category === 'cloned' ? '· cloned' : v.category ? `· ${v.category}` : ''}
                </option>
              ))}
            </select>
          )}
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Target length (min)</label>
          <Input type="number" min={2} max={15} value={durationMin}
            onChange={(e) => setDurationMin(Math.max(2, Math.min(15, Number(e.target.value) || 5)))}
            className="mt-1" />
        </div>
      </div>

      <div className="glass p-6 rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-bold text-foreground flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber" /> Topic ideas</h3>
          <div className="flex items-center gap-2">
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="bg-background border border-border rounded-md px-2 py-1 text-sm text-foreground">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <Button size="sm" variant="outline" onClick={refreshTopics} disabled={topicsLoading}>
              {topicsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              <span className="ml-1">Refresh</span>
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {topics.map((t, i) => (
            <button key={i} onClick={() => { setTopic(t); setTitle(''); }}
              className={`text-left text-sm px-3 py-2 rounded-md border transition ${topic === t ? 'border-amber bg-amber/10 text-foreground' : 'border-border bg-background/40 hover:border-amber/60 text-muted-foreground hover:text-foreground'}`}>
              {t}
            </button>
          ))}
          {topics.length === 0 && !topicsLoading && (
            <p className="text-sm text-muted-foreground col-span-2">No topics yet — hit Refresh.</p>
          )}
        </div>
      </div>

      <div className="glass p-6 rounded-xl space-y-4">
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Topic</label>
          <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. The $40k/yr leak hiding in your follow-up gap"
            className="mt-1" />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Source (optional — paste article, transcript, notes)</label>
            <div className="flex items-center gap-2">
              <input ref={fileRef} type="file" accept=".txt,.md,text/plain,text/markdown" className="hidden"
                onChange={(e) => onUpload(e.target.files?.[0] || null)} />
              <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                <Upload className="w-4 h-4 mr-1" /> Upload .txt/.md
              </Button>
              {source && <Button size="sm" variant="ghost" onClick={() => setSource('')}>Clear</Button>}
            </div>
          </div>
          <Textarea value={source} onChange={(e) => setSource(e.target.value)} rows={4}
            placeholder="Paste source material here (optional). Used as grounding for the script."
            className="mt-1" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={writeScript} disabled={scriptLoading || (!topic && !source)}>
            {scriptLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Wand2 className="w-4 h-4 mr-1" />}
            Write Script
          </Button>
          {script && (
            <Button variant="outline" onClick={writeScript} disabled={scriptLoading}>
              <RefreshCw className="w-4 h-4 mr-1" /> Rewrite
            </Button>
          )}
        </div>
      </div>

      {(script || title) && (
        <div className="glass p-6 rounded-xl space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Episode title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" /> Script ({script.split(/\s+/).filter(Boolean).length} words)
            </label>
            <Textarea value={script} onChange={(e) => setScript(e.target.value)} rows={14} className="mt-1 font-mono text-sm" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={createEpisode} disabled={episodeLoading || !script.trim() || !voiceId}>
              {episodeLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Mic className="w-4 h-4 mr-1" />}
              {episodeLoading ? 'Generating audio + cover…' : 'Generate Episode'}
            </Button>
            <p className="text-xs text-muted-foreground self-center">Generates voice in ElevenLabs + a cover image, then saves to your podcast library.</p>
          </div>
        </div>
      )}

      <div className="glass p-6 rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-foreground flex items-center gap-2"><Radio className="w-4 h-4 text-amber" /> Episode Library</h3>
          <Button size="sm" variant="outline" onClick={loadEpisodes} disabled={epLoading}>
            {epLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span className="ml-1">Refresh</span>
          </Button>
        </div>
        {epLoading ? (
          <div className="text-center text-muted-foreground py-8"><Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Loading…</div>
        ) : episodes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No episodes yet.</p>
        ) : (
          <div className="space-y-4">
            {episodes.map(ep => (
              <div key={ep.id} className="border border-border rounded-lg p-4 flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-32 shrink-0">
                  {ep.image_url ? (
                    <img src={ep.image_url} alt={ep.title} className="w-full md:w-32 h-32 object-cover rounded-md" />
                  ) : (
                    <div className="w-full md:w-32 h-32 bg-muted/30 rounded-md flex items-center justify-center text-muted-foreground">
                      <Radio className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="font-display font-bold text-foreground truncate">{ep.title}</h4>
                      <p className="text-xs text-muted-foreground">
                        {new Date(ep.created_at).toLocaleString()} · {fmtDur(ep.duration_seconds)}
                        {ep.voice_name ? ` · ${ep.voice_name}` : ''}
                      </p>
                      {ep.topic && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ep.topic}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {ep.audio_url && (
                        <a href={ep.audio_url} download className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-border hover:bg-background/60" title="Download">
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                      <button onClick={() => deleteEpisode(ep.id)} className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-border hover:bg-destructive/10 hover:text-destructive" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {ep.audio_url && (
                    <audio src={ep.audio_url} controls className="w-full mt-3" />
                  )}
                  <details className="mt-3">
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">Show script</summary>
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap mt-2 max-h-60 overflow-auto">{ep.script}</pre>
                  </details>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPodcastStudio;
