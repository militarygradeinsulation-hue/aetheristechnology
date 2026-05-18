import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Step { delay_days: number; subject_prompt?: string; body_prompt: string; }
interface Sequence { id: string; name: string; steps: Step[]; }

export const TemplateEditor: React.FC = () => {
  const { toast } = useToast();
  const [seqs, setSeqs] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('drip_sequences').select('id,name,steps').eq('is_active', true);
    setSeqs((data || []).map(d => ({ ...d, steps: (d.steps as unknown as Step[]) || [] })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStep = (sIdx: number, stepIdx: number, patch: Partial<Step>) => {
    const next = [...seqs];
    next[sIdx].steps[stepIdx] = { ...next[sIdx].steps[stepIdx], ...patch };
    setSeqs(next);
  };

  const save = async (s: Sequence) => {
    setSaving(true);
    try {
      const { error } = await supabase.from('drip_sequences').update({ steps: s.steps as unknown as never }).eq('id', s.id);
      if (error) throw error;
      toast({ title: 'Template saved' });
    } catch (e) {
      toast({ title: 'Save failed', description: e instanceof Error ? e.message : 'Unknown', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const regenerate = async () => {
    if (!confirm('This deletes all PENDING (unsent) emails so the next batch run rebuilds them. Continue?')) return;
    const { error } = await supabase.from('drip_emails').delete().eq('status', 'pending');
    if (error) {
      toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Pending emails cleared', description: 'Run "Generate Next Wave" to rebuild them.' });
    }
  };

  if (loading) return <div className="glass p-6 rounded-xl flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading templates...</div>;

  return (
    <div className="glass p-6 rounded-xl space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-foreground font-display">Email Templates</h3>
          <p className="text-xs text-muted-foreground">Edit the AI prompt for each step. Email 1 is hardcoded.</p>
        </div>
        <Button variant="outline" size="sm" onClick={regenerate}><RefreshCw className="w-4 h-4 mr-1" /> Clear Pending</Button>
      </div>

      {seqs.map((s, sIdx) => (
        <div key={s.id} className="space-y-3 border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-amber">{s.name}</h4>
            <Button size="sm" onClick={() => save(s)} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />} Save
            </Button>
          </div>
          {s.steps.map((step, stepIdx) => (
            <div key={stepIdx} className="bg-secondary/40 p-3 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-muted-foreground">Step {stepIdx + 1} {stepIdx === 0 && '(hardcoded, not editable)'}</span>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`d-${sIdx}-${stepIdx}`} className="text-xs">Delay days</Label>
                  <Input id={`d-${sIdx}-${stepIdx}`} type="number" className="w-20 h-8" value={step.delay_days}
                    disabled={stepIdx === 0}
                    onChange={(e) => updateStep(sIdx, stepIdx, { delay_days: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <Textarea
                rows={3}
                disabled={stepIdx === 0}
                value={step.body_prompt}
                onChange={(e) => updateStep(sIdx, stepIdx, { body_prompt: e.target.value })}
                placeholder="Prompt instruction for the AI to generate this email..."
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
