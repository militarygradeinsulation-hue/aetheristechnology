import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getAdminToken } from '@/lib/adminAuth';
import { Loader2, FileUp, Sparkles, Download } from 'lucide-react';

interface Analysis {
  candidate_name?: string;
  headline?: string;
  years_experience?: number;
  summary?: string;
  key_skills?: string[];
  strengths?: string[];
  weaknesses?: string[];
  red_flags?: string[];
  fit_score?: number;
  fit_rationale?: string;
  recommended_questions?: string[];
  recommendation?: string;
  raw?: string;
}

interface Result {
  filename: string;
  extract_method: string;
  resume_text: string;
  analysis: Analysis;
}

export const AdminResumeAnalyzer: React.FC = () => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [role, setRole] = useState('Sales Operator at Aetheris (cold outbound, consultative selling, business diagnostics)');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const submit = async () => {
    if (!file) { toast({ title: 'Choose a resume file', variant: 'destructive' }); return; }
    const token = getAdminToken();
    if (!token) { toast({ title: 'Admin session expired', variant: 'destructive' }); return; }
    setBusy(true); setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('role', role);
      const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/resume-analyze`;
      const res = await fetch(url, { method: 'POST', headers: { 'x-admin-token': token }, body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Analysis failed');
      setResult(j);
    } catch (e) {
      toast({ title: 'Failed', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const downloadJson = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result.analysis, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${result.filename}-analysis.json`;
    a.click();
  };

  const a = result?.analysis;
  const recColor = a?.recommendation?.includes('Strong Yes') ? 'bg-emerald-600' :
    a?.recommendation === 'Yes' ? 'bg-emerald-500' :
    a?.recommendation === 'Maybe' ? 'bg-amber-500' :
    a?.recommendation ? 'bg-rose-600' : 'bg-muted';

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <FileUp className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Upload a resume</h3>
        </div>
        <div className="space-y-2">
          <Label>Resume file (PDF, DOCX, TXT, or image)</Label>
          <Input type="file" accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg,.webp" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </div>
        <div className="space-y-2">
          <Label>Target role / context</Label>
          <Textarea rows={3} value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Sales Operator at Aetheris..." />
        </div>
        <Button onClick={submit} disabled={busy || !file} className="w-full">
          {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing…</> : <><Sparkles className="w-4 h-4 mr-2" /> Analyze resume</>}
        </Button>
      </Card>

      {result && a && (
        <Card className="p-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-2xl font-bold">{a.candidate_name || result.filename}</h3>
              {a.headline && <p className="text-muted-foreground mt-1">{a.headline}</p>}
              <p className="text-xs text-muted-foreground mt-2">Extracted via {result.extract_method}</p>
            </div>
            <Button variant="outline" size="sm" onClick={downloadJson}><Download className="w-4 h-4 mr-1" /> JSON</Button>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            {a.recommendation && <Badge className={`${recColor} text-white`}>{a.recommendation}</Badge>}
            {typeof a.fit_score === 'number' && <Badge variant="outline">Fit: {a.fit_score}/100</Badge>}
            {typeof a.years_experience === 'number' && <Badge variant="outline">{a.years_experience} yrs experience</Badge>}
          </div>

          {a.summary && (
            <Section title="Summary"><p className="text-sm leading-relaxed">{a.summary}</p></Section>
          )}
          {a.fit_rationale && (
            <Section title="Fit rationale"><p className="text-sm leading-relaxed">{a.fit_rationale}</p></Section>
          )}
          {a.key_skills?.length ? (
            <Section title="Key skills"><div className="flex flex-wrap gap-2">{a.key_skills.map((s, i) => <Badge key={i} variant="secondary">{s}</Badge>)}</div></Section>
          ) : null}
          {a.strengths?.length ? <BulletSection title="Strengths" items={a.strengths} tone="emerald" /> : null}
          {a.weaknesses?.length ? <BulletSection title="Weaknesses" items={a.weaknesses} tone="amber" /> : null}
          {a.red_flags?.length ? <BulletSection title="Red flags" items={a.red_flags} tone="rose" /> : null}
          {a.recommended_questions?.length ? <BulletSection title="Recommended interview questions" items={a.recommended_questions} tone="primary" /> : null}
          {a.raw && <Section title="Raw output"><pre className="text-xs whitespace-pre-wrap">{a.raw}</pre></Section>}
        </Card>
      )}
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="space-y-2">
    <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
    {children}
  </div>
);

const BulletSection: React.FC<{ title: string; items: string[]; tone: 'emerald' | 'amber' | 'rose' | 'primary' }> = ({ title, items, tone }) => {
  const dot = tone === 'emerald' ? 'bg-emerald-500' : tone === 'amber' ? 'bg-amber-500' : tone === 'rose' ? 'bg-rose-500' : 'bg-primary';
  return (
    <Section title={title}>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-sm leading-relaxed">
            <span className={`mt-1.5 w-1.5 h-1.5 rounded-full ${dot} flex-shrink-0`} />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
};

export default AdminResumeAnalyzer;
