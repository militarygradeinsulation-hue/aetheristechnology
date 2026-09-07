import React, { useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getAdminToken } from '@/lib/adminAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Copy, Check, Loader2, ShieldCheck, Sparkles, Download } from 'lucide-react';
import {
  ZERO_BURDEN_COMPARISON,
  ZERO_BURDEN_HEADLINE,
  ZERO_BURDEN_PRIMARY,
  ZERO_BURDEN_QUALIFIER,
  ZERO_BURDEN_SUPPORTING,
  ZERO_BURDEN_VARIATIONS,
  ZERO_OUTCOMES,
  adaptOutcome,
  buildZeroBurdenBrief,
  type DigitalYouContext,
} from '@/lib/zeroBurden';

type AssetType = 'linkedin post' | 'email' | 'landing page copy' | 'sales message';

const ASSETS: { id: AssetType; platform: string; preset: string; label: string }[] = [
  { id: 'linkedin post', platform: 'linkedin', preset: 'social', label: 'LinkedIn post' },
  { id: 'email', platform: 'general', preset: 'expanded', label: 'Email' },
  { id: 'landing page copy', platform: 'blog', preset: 'expanded', label: 'Landing page copy' },
  { id: 'sales message', platform: 'general', preset: 'short', label: 'Sales message' },
];

export const ZeroBurdenPack: React.FC = () => {
  const { toast } = useToast();
  const [asset, setAsset] = useState<AssetType>('linkedin post');
  const [outcomeIds, setOutcomeIds] = useState<string[]>(['integration', 'maintenance', 'prompting']);
  const [variationIds, setVariationIds] = useState<string[]>(['A', 'D']);
  const [industry, setIndustry] = useState('');
  const [tools, setTools] = useState('');
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);

  const context: DigitalYouContext = useMemo(
    () => ({
      industry: industry.trim() || null,
      tools: tools.split(',').map((t) => t.trim()).filter(Boolean),
    }),
    [industry, tools],
  );

  const toggle = (arr: string[], set: (v: string[]) => void, id: string) =>
    set(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

  const generate = async () => {
    setLoading(true);
    setOutput('');
    try {
      const cfg = ASSETS.find((a) => a.id === asset)!;
      const brief = buildZeroBurdenBrief({ variationIds, outcomeIds, context, assetType: asset });
      const token = getAdminToken();
      const { data, error } = await supabase.functions.invoke('content-engine-generate', {
        body: {
          action: 'random_post',
          platform: cfg.platform,
          preset: cfg.preset,
          mode: 'custom',
          topic: 'Zero Burden Technology. Aetheris carries the technical burden so the client team does not.',
          angle: `Write a ${asset} using only the approved Zero Burden message pack.`,
          seed: `zero-burden-${Date.now()}`,
          brief,
        },
        headers: token ? { 'x-admin-token': token } : undefined,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const post = data?.post;
      setOutput([post?.title, post?.body].filter(Boolean).join('\n\n'));
    } catch (e) {
      toast({ title: 'Generation failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast({ title: 'Copied' });
  };

  const adapted = ZERO_OUTCOMES.map((o) => adaptOutcome(o, context));

  return (
    <div className="space-y-6">
      <div className="border border-border/60 bg-card/40 p-5">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="w-4 h-4 text-amber" />
          <h2 className="font-forensic text-xl font-semibold">Zero Burden message pack</h2>
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider">Approved copy</Badge>
        </div>
        <p className="text-sm text-foreground">{ZERO_BURDEN_HEADLINE}</p>
        <p className="text-sm text-muted-foreground mt-2">{ZERO_BURDEN_PRIMARY}</p>
        <p className="text-xs uppercase tracking-[0.14em] text-amber mt-2">{ZERO_BURDEN_SUPPORTING}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Industry (optional)</label>
          <Input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="commercial roofing" className="mt-1" />
        </div>
        <div>
          <label className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Current tools, comma separated</label>
          <Input value={tools} onChange={(e) => setTools(e.target.value)} placeholder="HubSpot, Outlook, QuickBooks" className="mt-1" />
        </div>
      </div>

      <div>
        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground mb-2">Asset</p>
        <div className="flex flex-wrap gap-2">
          {ASSETS.map((a) => (
            <button
              key={a.id}
              onClick={() => setAsset(a.id)}
              className={`px-3 py-1.5 text-xs border transition-colors ${asset === a.id ? 'bg-amber text-background border-amber' : 'border-border text-muted-foreground hover:text-foreground'}`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground mb-2">Outcomes to feature</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {adapted.map((o) => (
            <button
              key={o.id}
              onClick={() => toggle(outcomeIds, setOutcomeIds, o.id)}
              className={`text-left p-3 border text-xs transition-colors ${outcomeIds.includes(o.id) ? 'border-amber bg-amber/10' : 'border-border/60 hover:border-amber/40'}`}
            >
              <span className="block font-semibold text-amber">{o.label}</span>
              <span className="block text-muted-foreground mt-1">{o.text}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground mb-2">Short copy variations</p>
        <div className="space-y-2">
          {ZERO_BURDEN_VARIATIONS.map((v) => (
            <div key={v.id} className="flex items-start gap-2">
              <button
                onClick={() => toggle(variationIds, setVariationIds, v.id)}
                className={`shrink-0 w-7 h-7 border text-xs font-mono ${variationIds.includes(v.id) ? 'bg-amber text-background border-amber' : 'border-border text-muted-foreground'}`}
                aria-pressed={variationIds.includes(v.id)}
                aria-label={`Toggle variation ${v.id}`}
              >
                {v.id}
              </button>
              <p className="text-xs text-muted-foreground leading-relaxed flex-1">{v.text}</p>
              <Button variant="ghost" size="sm" onClick={() => copy(v.text)} aria-label={`Copy variation ${v.id}`}>
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="border border-border/60">
        <div className="grid grid-cols-2 border-b border-border/60 text-[10px] uppercase tracking-[0.16em]">
          <div className="p-3 text-muted-foreground">Typical technology</div>
          <div className="p-3 text-amber border-l border-border/60">Aetheris</div>
        </div>
        {ZERO_BURDEN_COMPARISON.map((r) => (
          <div key={r.typical} className="grid grid-cols-2 border-b border-border/60 last:border-b-0 text-xs">
            <div className="p-3 text-muted-foreground">{r.typical}</div>
            <div className="p-3 border-l border-border/60">{r.aetheris}</div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground border-l-2 border-crimson pl-4 leading-relaxed">
        {ZERO_BURDEN_QUALIFIER}
      </p>

      <div className="flex flex-wrap gap-2">
        <Button onClick={generate} disabled={loading} className="bg-amber text-background hover:bg-amber/90">
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
          Generate {asset}
        </Button>
        <Button variant="outline" onClick={() => copy(buildZeroBurdenBrief({ variationIds, outcomeIds, context, assetType: asset }))}>
          <Download className="w-4 h-4 mr-2" /> Copy brief
        </Button>
      </div>

      {output && (
        <div className="border border-border/60 bg-background/50 p-5">
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => copy(output)}>
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{output}</p>
        </div>
      )}
    </div>
  );
};

export default ZeroBurdenPack;
