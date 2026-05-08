import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getPortalToken } from '@/lib/portalAuth';
import {
  Loader2, RefreshCw, Briefcase, Eye, MousePointerClick, Users, FileText,
  CheckCircle2, XCircle, Mail, Phone, ExternalLink, Search, Download, Save, Flame
} from 'lucide-react';

interface Attempt {
  id: string;
  candidate_name: string | null;
  candidate_email: string;
  candidate_phone: string | null;
  score_pct: number | null;
  correct_count: number | null;
  total_count: number | null;
  status: string;
  started_at: string;
  submitted_at: string | null;
  share_code: string | null;
  notes_to_admin: string | null;
  admin_notes: string | null;
}

interface Application {
  id: string;
  share_code: string;
  candidate_name: string;
  candidate_email: string;
  candidate_phone: string | null;
  resume_path: string | null;
  resume_filename: string | null;
  notes: string | null;
  score_pct: number | null;
  reviewed: boolean;
  reviewed_at: string | null;
  created_at: string;
  ai_fit_score: number | null;
  ai_summary: string | null;
  ai_strengths: string[] | null;
  ai_concerns: string[] | null;
  ai_analyzed_at: string | null;
}

interface Analytics {
  total_views: number;
  unique_visitors: number;
  total_cta_clicks: number;
  by_path: { path: string; count: number }[];
  by_cta: { cta: string; count: number }[];
}

function csvEscape(v: unknown): string {
  if (v == null) return '';
  const s = String(v).replace(/"/g, '""');
  return /[",\n]/.test(s) ? `"${s}"` : s;
}
function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => csvEscape(r[h])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export const PortalCareersPanel: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [filter, setFilter] = useState('');
  const [tab, setTab] = useState<'all' | 'passed' | 'apps'>('apps');
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [editingAttempt, setEditingAttempt] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingAttemptId, setSavingAttemptId] = useState<string | null>(null);

  const invokeWithAuth = async (body: Record<string, unknown>) => {
    const token = getPortalToken();
    if (!token) throw new Error('Portal session expired');
    const { data, error } = await supabase.functions.invoke('careers-test', {
      body, headers: { 'x-portal-token': token },
    });
    if (error) throw new Error(error.message);
    if ((data as any)?.error) throw new Error((data as any).error);
    return data as any;
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await invokeWithAuth({ action: 'admin_list' });
      setAttempts(data.attempts || []);
      setApplications(data.applications || []);
      setAnalytics(data.analytics || null);
    } catch (e) {
      toast({ title: 'Failed to load', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const fmt = (s: string | null) => s ? new Date(s).toLocaleString() : '—';
  const q = filter.trim().toLowerCase();
  const filteredAttempts = useMemo(() => q ? attempts.filter(a =>
    (a.candidate_name || '').toLowerCase().includes(q) ||
    a.candidate_email.toLowerCase().includes(q) ||
    (a.share_code || '').toLowerCase().includes(q)
  ) : attempts, [q, attempts]);
  const passedAttempts = filteredAttempts.filter(a => a.status === 'passed');
  const filteredApps = useMemo(() => q ? applications.filter(a =>
    a.candidate_name.toLowerCase().includes(q) ||
    a.candidate_email.toLowerCase().includes(q) ||
    a.share_code.toLowerCase().includes(q)
  ) : applications, [q, applications]);

  const openResume = async (shareCode: string) => {
    try {
      const data = await invokeWithAuth({ action: 'admin_lookup', share_code: shareCode });
      if (data?.resume_url) window.open(data.resume_url, '_blank');
      else toast({ title: 'Resume not available', variant: 'destructive' });
    } catch (e) {
      toast({ title: 'Failed to open resume', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    }
  };

  const saveNotes = async (a: Application) => {
    setSavingId(a.id);
    try {
      const next = editing[a.id] ?? a.notes ?? '';
      await invokeWithAuth({ action: 'admin_update_application', share_code: a.share_code, notes: next });
      setApplications(prev => prev.map(x => x.id === a.id ? { ...x, notes: next } : x));
      toast({ title: 'Saved' });
    } catch (e) {
      toast({ title: 'Save failed', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally { setSavingId(null); }
  };

  const toggleReviewed = async (a: Application) => {
    try {
      const next = !a.reviewed;
      await invokeWithAuth({ action: 'admin_update_application', share_code: a.share_code, reviewed: next });
      setApplications(prev => prev.map(x => x.id === a.id ? { ...x, reviewed: next, reviewed_at: next ? new Date().toISOString() : null } : x));
    } catch (e) {
      toast({ title: 'Update failed', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    }
  };

  const saveAttemptNotes = async (a: Attempt) => {
    setSavingAttemptId(a.id);
    try {
      const next = editingAttempt[a.id] ?? a.admin_notes ?? '';
      await invokeWithAuth({ action: 'admin_update_attempt', attempt_id: a.id, admin_notes: next });
      setAttempts(prev => prev.map(x => x.id === a.id ? { ...x, admin_notes: next } : x));
      toast({ title: 'Saved' });
    } catch (e) {
      toast({ title: 'Save failed', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally { setSavingAttemptId(null); }
  };

  // "Who to contact first": prioritize unreviewed applications with the highest score and most recent submission.
  // Falls back to top-scoring un-contacted passed attempts (no application yet).
  const contactFirst = useMemo(() => {
    const appCandidates = applications
      .filter(a => !a.reviewed)
      .sort((a, b) =>
        ((b.score_pct ?? 0) - (a.score_pct ?? 0)) ||
        (new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      );
    if (appCandidates[0]) {
      const a = appCandidates[0];
      return {
        kind: 'app' as const,
        name: a.candidate_name,
        email: a.candidate_email,
        phone: a.candidate_phone,
        score: a.score_pct,
        share_code: a.share_code,
        why: a.score_pct != null ? `Top unreviewed application · ${a.score_pct}%` : 'Newest unreviewed application',
      };
    }
    const appCodes = new Set(applications.map(a => a.share_code));
    const passedNoApp = attempts
      .filter(a => a.status === 'passed' && a.share_code && !appCodes.has(a.share_code))
      .sort((a, b) =>
        ((b.score_pct ?? 0) - (a.score_pct ?? 0)) ||
        (new Date(b.submitted_at || b.started_at).getTime() - new Date(a.submitted_at || a.started_at).getTime())
      );
    if (passedNoApp[0]) {
      const a = passedNoApp[0];
      return {
        kind: 'attempt' as const,
        name: a.candidate_name || a.candidate_email,
        email: a.candidate_email,
        phone: a.candidate_phone,
        score: a.score_pct,
        share_code: a.share_code,
        why: `Passed test · awaiting application · ${a.score_pct}%`,
      };
    }
    return null;
  }, [applications, attempts]);

  const exportAttempts = () => {
    downloadCsv(`careers-attempts-${new Date().toISOString().slice(0,10)}.csv`,
      filteredAttempts.map(a => ({
        name: a.candidate_name, email: a.candidate_email, phone: a.candidate_phone,
        status: a.status, score_pct: a.score_pct, correct: a.correct_count, total: a.total_count,
        share_code: a.share_code, started_at: a.started_at, submitted_at: a.submitted_at,
        notes_to_admin: a.notes_to_admin,
      })));
  };
  const exportApps = () => {
    downloadCsv(`careers-applications-${new Date().toISOString().slice(0,10)}.csv`,
      filteredApps.map(a => ({
        name: a.candidate_name, email: a.candidate_email, phone: a.candidate_phone,
        share_code: a.share_code, score_pct: a.score_pct, reviewed: a.reviewed,
        resume: a.resume_filename, applied_at: a.created_at, notes: a.notes,
      })));
  };

  const StatusBadge = ({ s }: { s: string }) => {
    const map: Record<string, string> = {
      passed: 'bg-green-500/20 text-green-400 border-green-500/30',
      failed: 'bg-destructive/20 text-destructive border-destructive/30',
      expired: 'bg-muted text-muted-foreground border-border',
      in_progress: 'bg-amber/20 text-amber border-amber/30',
    };
    return <Badge className={`border ${map[s] || 'bg-muted'}`}>{s}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-amber" /> Careers Page Analytics (last 90 days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && !analytics ? <Loader2 className="w-5 h-5 animate-spin" /> : analytics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-secondary/40 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase"><Eye className="w-3 h-3" /> Page Views</div>
                <div className="text-2xl font-bold font-display mt-1">{analytics.total_views}</div>
              </div>
              <div className="bg-secondary/40 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase"><Users className="w-3 h-3" /> Unique Visitors</div>
                <div className="text-2xl font-bold font-display mt-1">{analytics.unique_visitors}</div>
              </div>
              <div className="bg-secondary/40 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase"><MousePointerClick className="w-3 h-3" /> CTA Clicks</div>
                <div className="text-2xl font-bold font-display mt-1">{analytics.total_cta_clicks}</div>
              </div>
              <div className="bg-secondary/40 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase"><FileText className="w-3 h-3" /> Tests Started</div>
                <div className="text-2xl font-bold font-display mt-1">{attempts.length}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <CardTitle className="font-display flex items-center gap-2">
              <Users className="w-5 h-5 text-amber" /> Candidates & Applications
            </CardTitle>
            {contactFirst && (
              <div className="flex items-center gap-2 rounded-lg border border-amber/40 bg-amber/10 px-3 py-2 text-xs">
                <Flame className="w-4 h-4 text-amber flex-shrink-0" />
                <div className="leading-tight">
                  <div className="font-mono uppercase tracking-wider text-[10px] text-amber">Contact first</div>
                  <div className="font-display font-bold text-foreground">{contactFirst.name}</div>
                  <div className="text-muted-foreground">{contactFirst.why}</div>
                  <div className="flex gap-2 mt-1">
                    <a href={`mailto:${contactFirst.email}`} className="flex items-center gap-1 hover:text-amber"><Mail className="w-3 h-3" /> Email</a>
                    {contactFirst.phone && <a href={`tel:${contactFirst.phone}`} className="flex items-center gap-1 hover:text-amber"><Phone className="w-3 h-3" /> Call</a>}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 flex-wrap mt-3">
            <div className="flex gap-2 flex-wrap">
              {([
                { k: 'apps', label: `Applications (${filteredApps.length})` },
                { k: 'passed', label: `Passed (${passedAttempts.length})` },
                { k: 'all', label: `All Attempts (${filteredAttempts.length})` },
              ] as const).map(t => (
                <Button key={t.k} size="sm" variant={tab === t.k ? 'default' : 'outline'} onClick={() => setTab(t.k)}
                  className={tab === t.k ? 'bg-amber text-background hover:bg-amber/90' : ''}>
                  {t.label}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search name, email, code…" className="pl-7 h-8 w-64" />
              </div>
              <Button size="sm" variant="outline" onClick={tab === 'apps' ? exportApps : exportAttempts}>
                <Download className="w-3 h-3 mr-1" /> CSV
              </Button>
              <Button size="sm" variant="outline" onClick={load} disabled={loading}>
                <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div> : (
            <div className="space-y-2">
              {tab === 'apps' ? (
                filteredApps.length === 0 ? <p className="text-muted-foreground text-sm text-center py-6">No applications submitted yet.</p> :
                filteredApps.map(a => {
                  const noteVal = editing[a.id] ?? a.notes ?? '';
                  const dirty = noteVal !== (a.notes ?? '');
                  return (
                    <div key={a.id} className="rounded-lg border border-border/50 bg-secondary/20 p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-display font-bold text-foreground">{a.candidate_name}</span>
                            <Badge variant="outline" className="font-mono text-xs">{a.share_code}</Badge>
                            {a.score_pct != null && <Badge className="bg-green-500/20 text-green-400 border-green-500/30">{a.score_pct}%</Badge>}
                            <Button size="sm" variant={a.reviewed ? 'default' : 'outline'} className={`h-6 px-2 text-xs ${a.reviewed ? 'bg-amber text-background hover:bg-amber/90' : ''}`} onClick={() => toggleReviewed(a)}>
                              {a.reviewed ? 'Reviewed' : 'Mark reviewed'}
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
                            <a href={`mailto:${a.candidate_email}`} className="flex items-center gap-1 hover:text-amber"><Mail className="w-3 h-3" /> {a.candidate_email}</a>
                            {a.candidate_phone && <a href={`tel:${a.candidate_phone}`} className="flex items-center gap-1 hover:text-amber"><Phone className="w-3 h-3" /> {a.candidate_phone}</a>}
                            <span>Applied {fmt(a.created_at)}</span>
                          </div>
                        </div>
                        {a.resume_path && (
                          <Button size="sm" variant="outline" onClick={() => openResume(a.share_code)}>
                            <FileText className="w-3 h-3 mr-1" /> Resume <ExternalLink className="w-3 h-3 ml-1" />
                          </Button>
                        )}
                      </div>
                      <Textarea
                        value={noteVal}
                        onChange={e => setEditing(prev => ({ ...prev, [a.id]: e.target.value }))}
                        placeholder="Notes about this candidate…"
                        className="min-h-[60px] text-sm bg-background/40"
                      />
                      {dirty && (
                        <div className="flex justify-end">
                          <Button size="sm" onClick={() => saveNotes(a)} disabled={savingId === a.id} className="bg-amber text-background hover:bg-amber/90">
                            {savingId === a.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                            Save notes
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                (tab === 'passed' ? passedAttempts : filteredAttempts).length === 0 ? <p className="text-muted-foreground text-sm text-center py-6">No attempts yet.</p> :
                (tab === 'passed' ? passedAttempts : filteredAttempts).map(a => {
                  const noteVal = editingAttempt[a.id] ?? a.admin_notes ?? '';
                  const dirty = noteVal !== (a.admin_notes ?? '');
                  return (
                    <div key={a.id} className="rounded-lg border border-border/50 bg-secondary/20 p-3 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display font-bold text-foreground">{a.candidate_name || '—'}</span>
                        <StatusBadge s={a.status} />
                        {a.score_pct != null && (
                          <Badge variant="outline" className="font-mono">
                            {a.status === 'passed' ? <CheckCircle2 className="w-3 h-3 mr-1 text-green-400" /> : <XCircle className="w-3 h-3 mr-1 text-destructive" />}
                            {a.score_pct}% ({a.correct_count}/{a.total_count})
                          </Badge>
                        )}
                        {a.share_code && <Badge variant="outline" className="font-mono text-xs">{a.share_code}</Badge>}
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
                        <a href={`mailto:${a.candidate_email}`} className="flex items-center gap-1 hover:text-amber"><Mail className="w-3 h-3" /> {a.candidate_email}</a>
                        {a.candidate_phone && <a href={`tel:${a.candidate_phone}`} className="flex items-center gap-1 hover:text-amber"><Phone className="w-3 h-3" /> {a.candidate_phone}</a>}
                        <span>Started {fmt(a.started_at)}</span>
                        {a.submitted_at && <span>· Submitted {fmt(a.submitted_at)}</span>}
                      </div>
                      {a.notes_to_admin && <p className="text-xs text-foreground/80 italic">Candidate said: "{a.notes_to_admin}"</p>}
                      <Textarea
                        value={noteVal}
                        onChange={e => setEditingAttempt(prev => ({ ...prev, [a.id]: e.target.value }))}
                        placeholder="Internal notes about this candidate…"
                        className="min-h-[50px] text-sm bg-background/40"
                      />
                      {dirty && (
                        <div className="flex justify-end">
                          <Button size="sm" onClick={() => saveAttemptNotes(a)} disabled={savingAttemptId === a.id} className="bg-amber text-background hover:bg-amber/90">
                            {savingAttemptId === a.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                            Save notes
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PortalCareersPanel;
