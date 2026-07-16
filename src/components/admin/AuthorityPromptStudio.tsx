import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, FileText, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AUTHORITY_PROMPTS, fillPrompt, type AuthorityPromptTemplate } from '@/lib/authorityPrompts';
import { supabase } from '@/integrations/supabase/client';

/**
 * AI Authority Playbook — admin panel.
 *
 * Renders the 7 canonical prompt templates with editable variable slots,
 * substitutes values, copies the compiled prompt, and optionally pipes it to
 * the existing `sales-chat` edge function (Lovable AI gateway) for one-click
 * draft generation.
 */
const AuthorityPromptStudio: React.FC = () => {
  const { toast } = useToast();
  const [active, setActive] = useState<AuthorityPromptTemplate>(AUTHORITY_PROMPTS[0]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [draft, setDraft] = useState('');

  const compiled = fillPrompt(active, values);

  const copy = async () => {
    await navigator.clipboard.writeText(compiled);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast({ title: 'Prompt copied', description: 'Paste into ChatGPT / Claude / Gemini.' });
  };

  const generate = async () => {
    setGenerating(true);
    setDraft('');
    try {
      const { data, error } = await supabase.functions.invoke('sales-chat', {
        body: {
          messages: [
            { role: 'system', content: 'You are an Aetheris Chaos Theory Forensics content writer. Follow the user\'s instructions exactly. Output the finished piece only — no preamble.' },
            { role: 'user', content: compiled },
          ],
        },
      });
      if (error) throw error;
      const text = (data?.message || data?.content || data?.reply || JSON.stringify(data, null, 2)) as string;
      setDraft(text);
    } catch (e: any) {
      toast({ title: 'Generation failed', description: e?.message || 'Try the copy/paste path.', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber" />
          AI Authority Prompt Studio
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Seven canonical templates from the AI Engine Authority Playbook. Fill the slots, copy or generate.
        </p>
      </div>

      {/* Template selector */}
      <div className="flex flex-wrap gap-2">
        {AUTHORITY_PROMPTS.map(p => (
          <Button
            key={p.id}
            size="sm"
            variant={active.id === p.id ? 'default' : 'outline'}
            onClick={() => { setActive(p); setValues({}); setDraft(''); }}
            className={active.id === p.id ? 'bg-amber text-background hover:bg-amber/90' : ''}
          >
            {p.name}
          </Button>
        ))}
      </div>

      <Card className="p-6 space-y-5">
        <div>
          <Badge variant="outline" className="font-case text-[10px] uppercase tracking-widest border-amber/40 text-amber">
            {active.id}
          </Badge>
          <h3 className="font-serif text-xl font-semibold mt-2">{active.name}</h3>
          <p className="text-xs text-muted-foreground mt-1">{active.useFor}</p>
        </div>

        {/* Variable inputs */}
        <div className="space-y-4">
          {active.vars.map(v => (
            <div key={v.key}>
              <label className="text-xs font-case uppercase tracking-widest text-muted-foreground mb-1.5 block">
                {v.label} <span className="text-amber">{`{${v.key}}`}</span>
              </label>
              {v.multiline ? (
                <Textarea
                  rows={3}
                  value={values[v.key] || ''}
                  onChange={e => setValues({ ...values, [v.key]: e.target.value })}
                  placeholder={v.placeholder}
                />
              ) : (
                <Input
                  value={values[v.key] || ''}
                  onChange={e => setValues({ ...values, [v.key]: e.target.value })}
                  placeholder={v.placeholder}
                />
              )}
            </div>
          ))}
        </div>

        {/* Compiled prompt preview */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-case uppercase tracking-widest text-muted-foreground">Compiled prompt</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={copy}>
                {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
              <Button size="sm" onClick={generate} disabled={generating} className="bg-amber text-background hover:bg-amber/90">
                <FileText className="h-3.5 w-3.5 mr-1.5" />
                {generating ? 'Generating...' : 'Generate draft'}
              </Button>
            </div>
          </div>
          <pre className="bg-muted/40 border border-border rounded-md p-4 text-xs whitespace-pre-wrap font-mono max-h-64 overflow-auto">
            {compiled}
          </pre>
        </div>
      </Card>

      {draft && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold">Draft</h4>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { navigator.clipboard.writeText(draft); toast({ title: 'Draft copied' }); }}
            >
              <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy draft
            </Button>
          </div>
          <pre className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{draft}</pre>
        </Card>
      )}
    </div>
  );
};

export default AuthorityPromptStudio;
