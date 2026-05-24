import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Loader2, ExternalLink, Copy, Check, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { saveToAdminLibrary, publishPlaybookToWebsite } from '@/lib/adminLibrary';

const PILLARS = ['Sales', 'Marketing', 'AI', 'Strategy', 'Operations', 'Leadership'];

const PHASES = [
  { label: 'Researching topic...', target: 20 },
  { label: 'Writing executive summary...', target: 35 },
  { label: 'Building frameworks...', target: 55 },
  { label: 'Drafting case study & ROI model...', target: 75 },
  { label: 'Rendering PDF...', target: 95 },
];

export const PlaybookCreator: React.FC = () => {
  const [form, setForm] = useState({ title: '', subtitle: '', pillar: 'Strategy', tags: '' });
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phaseLabel, setPhaseLabel] = useState('');
  const [result, setResult] = useState<{ fileUrl: string; title: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);

  const handlePublish = async () => {
    if (!result) return;
    setPublishing(true);
    try {
      const tagArray = form.tags.split(',').map(t => t.trim()).filter(Boolean);
      const res = await publishPlaybookToWebsite({
        title: result.title,
        subtitle: form.subtitle,
        description: form.subtitle || result.title,
        tags: tagArray,
        file_url: result.fileUrl,
        icon_name: 'BookOpen',
      });
      setPublished(true);
      toast({
        title: res.alreadyPublished ? 'Already live' : 'Published to website',
        description: res.alreadyPublished
          ? 'This playbook is already in the free reads library.'
          : 'Visitors can now read this on the Resources page.',
      });
    } catch (e: any) {
      toast({ title: 'Publish failed', description: e.message, variant: 'destructive' });
    } finally {
      setPublishing(false);
    }
  };

  const handleGenerate = async () => {
    if (!form.title.trim() || !form.subtitle.trim()) {
      toast({ title: 'Missing fields', description: 'Title and subtitle are required.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setProgress(0);
    setResult(null);

    let phase = 0;
    const interval = setInterval(() => {
      if (phase < PHASES.length) {
        const p = PHASES[phase];
        setPhaseLabel(p.label);
        setProgress(prev => Math.min(prev + Math.random() * 8 + 4, p.target));
        phase++;
      }
    }, 6000);

    try {
      const tagArray = form.tags.split(',').map(t => t.trim()).filter(Boolean);

      const { data, error } = await supabase.functions.invoke('generate-custom-playbook', {
        body: {
          topicData: {
            title: form.title,
            subtitle: form.subtitle,
            pillar: form.pillar,
            tags: tagArray,
            icon: 'BookOpen',
          },
        },
      });

      clearInterval(interval);
      if (error || !data?.fileUrl) throw new Error(error?.message || data?.error || 'Generation failed');

      setProgress(100);
      setPhaseLabel('Done!');

      await saveToAdminLibrary({
        tool_type: 'playbook',
        title: form.title,
        input_data: { ...form, tags: tagArray },
        output_data: { playbookId: data.playbookId, fileUrl: data.fileUrl },
        file_url: data.fileUrl,
      });

      setTimeout(() => {
        setResult({ fileUrl: data.fileUrl, title: form.title });
        setLoading(false);
      }, 500);
    } catch (err: any) {
      clearInterval(interval);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      setLoading(false);
      setProgress(0);
    }
  };

  const copyUrl = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.fileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Link copied' });
  };

  return (
    <div className="max-w-3xl mx-auto">
      {!result && !loading && (
        <div className="glass rounded-xl p-8 border border-border">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="w-6 h-6 text-amber" />
            <h2 className="text-2xl font-bold text-foreground font-display">Create a Custom Playbook</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">Generates a 4–5k word strategic playbook PDF and saves it to your library.</p>

          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. The AI-First Sales Operations Blueprint" />
            </div>
            <div>
              <Label>Subtitle *</Label>
              <Input value={form.subtitle} onChange={e => setForm(p => ({ ...p, subtitle: e.target.value }))} placeholder="A 90-day execution framework for mid-market revenue teams" />
            </div>
            <div>
              <Label>Pillar</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {PILLARS.map(p => (
                  <button
                    key={p}
                    onClick={() => setForm(prev => ({ ...prev, pillar: p }))}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${form.pillar === p ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}
                  >{p}</button>
                ))}
              </div>
            </div>
            <div>
              <Label>Tags <span className="text-xs text-muted-foreground">(comma-separated)</span></Label>
              <Textarea value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} placeholder="AI automation, pipeline velocity, enterprise sales, CRM integration" rows={2} />
            </div>
            <Button onClick={handleGenerate} className="bg-amber hover:bg-amber/90 text-background font-bold px-8" disabled={!form.title || !form.subtitle}>
              Generate Playbook PDF
            </Button>
            <p className="text-xs text-muted-foreground">Takes ~30–60 seconds. The PDF will save to your library automatically.</p>
          </div>
        </div>
      )}

      {loading && !result && (
        <div className="glass rounded-xl p-8 border border-border text-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber mx-auto mb-4" />
          <p className="text-amber font-semibold mb-4">{phaseLabel}</p>
          <Progress value={progress} className="h-3 mb-2" />
          <p className="text-sm text-muted-foreground">{Math.round(progress)}%</p>
        </div>
      )}

      {result && (
        <div className="glass rounded-xl p-8 border border-border text-center space-y-4">
          <BookOpen className="w-12 h-12 text-amber mx-auto" />
          <h3 className="text-2xl font-bold text-foreground font-display">Playbook Ready</h3>
          <p className="text-muted-foreground">"{result.title}" has been generated and saved to your library.</p>
          <div className="flex flex-wrap gap-2 justify-center">
            <a href={result.fileUrl} target="_blank" rel="noopener noreferrer">
              <Button className="bg-amber hover:bg-amber/90 text-background font-bold">
                <ExternalLink className="w-4 h-4 mr-2" /> Open PDF
              </Button>
            </a>
            <Button variant="outline" onClick={copyUrl}>
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              Copy Link
            </Button>
            <Button variant="ghost" onClick={() => { setResult(null); setForm({ title: '', subtitle: '', pillar: 'Strategy', tags: '' }); }}>
              Create Another
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
