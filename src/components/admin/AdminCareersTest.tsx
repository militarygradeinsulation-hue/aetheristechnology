import React, { useState } from 'react';
import { openRepMail } from '@/lib/repMail';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getAdminToken } from '@/lib/adminAuth';
import { Loader2, Search, Mail, Phone, FileText, ExternalLink, CheckCircle2, XCircle } from 'lucide-react';

export const AdminCareersTest: React.FC = () => {
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const lookup = async () => {
    if (!code.trim()) return;
    setLoading(true); setResult(null);
    try {
      const token = getAdminToken();
      if (!token) throw new Error('Admin session expired');
      const { data, error } = await supabase.functions.invoke('careers-test', {
        body: { action: 'admin_lookup', share_code: code.trim().toUpperCase() },
        headers: { 'x-admin-token': token },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      setResult(data);
    } catch (e) {
      toast({ title: 'Lookup failed', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const a = result?.application;
  const at = result?.attempt;
  const passed = at?.status === 'passed';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2"><Search className="w-5 h-5 text-amber" /> Careers Test — Review by Code</CardTitle>
        <p className="text-sm text-muted-foreground">Enter the 6-character share code the candidate gave you.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="e.g. K7P2X9" maxLength={8} className="font-mono uppercase tracking-widest" onKeyDown={e => e.key === 'Enter' && lookup()} />
          <Button onClick={lookup} disabled={loading} className="bg-amber text-background hover:bg-amber/90">
            {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Search className="w-4 h-4 mr-1" />} Look up
          </Button>
        </div>

        {result && at && (
          <div className="space-y-4 pt-2 border-t border-border/30">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="font-display text-xl">{at.candidate_name || a?.candidate_name}</h3>
              <Badge className={passed ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-destructive/20 text-destructive border border-destructive/30'}>
                {passed ? <><CheckCircle2 className="w-3 h-3 mr-1" />PASSED</> : <><XCircle className="w-3 h-3 mr-1" />{at.status}</>}
              </Badge>
              <Badge variant="outline" className="font-mono">{at.score_pct}% ({at.correct_count}/{at.total_count})</Badge>
            </div>
            <div className="grid sm:grid-cols-2 gap-2 text-sm">
              {at.candidate_email && <div className="flex items-center gap-2"><Mail className="w-3 h-3 text-muted-foreground" /> <a href="#" onClick={(e)=>{e.preventDefault();openRepMail(at.candidate_email);}} className="text-amber hover:underline">{at.candidate_email}</a></div>}
              {at.candidate_phone && <div className="flex items-center gap-2"><Phone className="w-3 h-3 text-muted-foreground" /> {at.candidate_phone}</div>}
              <div className="text-xs text-muted-foreground">Started: {new Date(at.started_at).toLocaleString()}</div>
              {at.submitted_at && <div className="text-xs text-muted-foreground">Submitted: {new Date(at.submitted_at).toLocaleString()}</div>}
            </div>

            {result.resume_url && (
              <a href={result.resume_url} target="_blank" rel="noreferrer">
                <Button variant="outline"><FileText className="w-4 h-4 mr-1" /> Open resume <ExternalLink className="w-3 h-3 ml-1" /></Button>
              </a>
            )}

            {(at.notes_to_admin || a?.notes) && (
              <div>
                <p className="text-xs font-mono uppercase text-muted-foreground mb-1">Candidate notes</p>
                {at.notes_to_admin && <div className="rounded-lg border border-border/50 bg-secondary/30 p-3 text-sm whitespace-pre-wrap">{at.notes_to_admin}</div>}
                {a?.notes && a.notes !== at.notes_to_admin && <div className="rounded-lg border border-border/50 bg-secondary/30 p-3 text-sm whitespace-pre-wrap mt-2">{a.notes}</div>}
              </div>
            )}

            <details className="rounded-lg border border-border/50 bg-secondary/20 p-3">
              <summary className="cursor-pointer text-sm font-mono uppercase text-amber">Per-question breakdown ({at.total_count})</summary>
              <div className="mt-3 space-y-2 text-xs">
                {(at.questions || []).map((q: any, i: number) => {
                  const ans = at.answers?.[q.id];
                  const correct = ans === q.correct_choice_id;
                  return (
                    <div key={q.id} className={`p-2 rounded border ${correct ? 'border-green-500/20 bg-green-500/5' : 'border-destructive/20 bg-destructive/5'}`}>
                      <p className="font-mono text-[10px] text-muted-foreground">Q{i + 1} {correct ? '✓' : '✗'}</p>
                      <p className="font-medium">{q.question}</p>
                      <p className="text-muted-foreground mt-1">
                        Picked: <span className={correct ? 'text-green-400' : 'text-destructive'}>{ans ? `${ans.toUpperCase()} — ${q.choices.find((c: any) => c.id === ans)?.text || '(invalid)'}` : '(skipped)'}</span>
                      </p>
                      {!correct && <p className="text-green-400/80 mt-0.5">Correct: {q.correct_choice_id.toUpperCase()} — {q.choices.find((c: any) => c.id === q.correct_choice_id)?.text}</p>}
                    </div>
                  );
                })}
              </div>
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
