import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getAdminToken } from '@/lib/adminAuth';
import {
  Loader2, RefreshCw, Briefcase, Eye, MousePointerClick, Users, FileText,
  CheckCircle2, XCircle, Mail, Phone, ExternalLink, Search, Sparkles, PhoneCall,
  ArrowDownAZ, ArrowUpAZ, CalendarCheck, Clock, Ban, StickyNote
} from 'lucide-react';
import { AdminCareersTest } from './AdminCareersTest';

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
}

interface Application {
  id: string;
  share_code: string;
  candidate_name: string;
  candidate_email: string;
  candidate_phone: string | null;
  resume_path: string | null;
  resume_filename: string | null;
  resume_extract_method?: string | null;
  resume_extract_error?: string | null;
  resume_recreated_at?: string | null;
  notes: string | null;
  admin_notes?: string | null;
  stage?: 'new' | 'interview' | 'wait' | 'no' | string | null;
  score_pct: number | null;
  reviewed: boolean;
  reviewed_at: string | null;
  contacted?: boolean;
  contacted_at?: string | null;
  created_at: string;
  ai_fit_score?: number | null;
  ai_summary?: string | null;
  ai_strengths?: string[] | null;
  ai_concerns?: string[] | null;
  ai_analyzed_at?: string | null;
}

interface Analytics {
  total_views: number;
  unique_visitors: number;
  total_cta_clicks: number;
  by_path: { path: string; count: number }[];
  by_cta: { cta: string; count: number }[];
}

export const AdminCareersPanel: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [filter, setFilter] = useState('');
  const [tab, setTab] = useState<'all' | 'passed' | 'apps'>('all');
  const [minTestScore, setMinTestScore] = useState<string>('');
  const [minFitScore, setMinFitScore] = useState<string>('');
  const [contactFilter, setContactFilter] = useState<'any' | 'not' | 'yes'>('any');

  const load = async () => {
    setLoading(true);
    try {
      const token = getAdminToken();
      if (!token) throw new Error('Admin session expired');
      const { data, error } = await supabase.functions.invoke('careers-test', {
        body: { action: 'admin_list' },
        headers: { 'x-admin-token': token },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      setAttempts((data as any).attempts || []);
      setApplications((data as any).applications || []);
      setAnalytics((data as any).analytics || null);
    } catch (e) {
      toast({ title: 'Failed to load careers data', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const fmt = (s: string | null | undefined) => s ? new Date(s).toLocaleString() : '—';
  const q = filter.trim().toLowerCase();
  const minTest = minTestScore === '' ? null : Number(minTestScore);
  const minFit = minFitScore === '' ? null : Number(minFitScore);
  const matchesText = (name: string | null, email: string, code: string | null) =>
    !q || (name || '').toLowerCase().includes(q) || email.toLowerCase().includes(q) || (code || '').toLowerCase().includes(q);
  const filteredAttempts = attempts.filter(a =>
    matchesText(a.candidate_name, a.candidate_email, a.share_code) &&
    (minTest == null || (a.score_pct ?? -1) >= minTest)
  );
  const passedAttempts = filteredAttempts.filter(a => a.status === 'passed');
  const filteredApps = applications.filter(a =>
    matchesText(a.candidate_name, a.candidate_email, a.share_code) &&
    (minTest == null || (a.score_pct ?? -1) >= minTest) &&
    (minFit == null || (a.ai_fit_score ?? -1) >= minFit) &&
    (contactFilter === 'any' || (contactFilter === 'yes' ? !!a.contacted : !a.contacted))
  );

  const openResume = async (shareCode: string) => {
    const popup = window.open('', '_blank');
    if (popup) popup.opener = null;
    popup?.document.write('<!doctype html><title>Loading resume</title><body style="font-family:system-ui;padding:24px">Rebuilding readable resume…</body>');
    try {
      const token = getAdminToken();
      if (!token) throw new Error('Admin session expired');
      const { data, error } = await supabase.functions.invoke('careers-test', {
        body: { action: 'admin_resume_url', share_code: shareCode },
        headers: { 'x-admin-token': token },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      const html = (data as any)?.html;
      if (html) {
        if (popup) {
          popup.document.open();
          popup.document.write(html);
          popup.document.close();
        } else {
          const blobUrl = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
          window.open(blobUrl, '_blank', 'noopener,noreferrer');
          window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
        }
        return;
      }
      const url = (data as any)?.url;
      if (!url) throw new Error('No readable resume returned');
      if (popup) popup.location.href = url;
      else window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      popup?.close();
      toast({ title: 'Could not open resume', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    }
  };

  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const analyzeResume = async (shareCode: string) => {
    setAnalyzingId(shareCode);
    try {
      const token = getAdminToken();
      if (!token) throw new Error('Admin session expired');
      const { data, error } = await supabase.functions.invoke('careers-test', {
        body: { action: 'ai_analyze_resume', share_code: shareCode },
        headers: { 'x-admin-token': token },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      const d = data as any;
      setApplications(prev => prev.map(a => a.share_code === shareCode ? {
        ...a,
        ai_fit_score: d.fit_score,
        ai_summary: d.summary,
        ai_strengths: d.strengths,
        ai_concerns: d.concerns,
        ai_analyzed_at: new Date().toISOString(),
      } : a));
      toast({ title: `Fit score: ${d.fit_score}/100` });
    } catch (e) {
      toast({ title: 'AI analysis failed', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally { setAnalyzingId(null); }
  };

  const [contactingId, setContactingId] = useState<string | null>(null);
  const toggleContacted = async (shareCode: string, next: boolean) => {
    setContactingId(shareCode);
    try {
      const token = getAdminToken();
      if (!token) throw new Error('Admin session expired');
      const { data, error } = await supabase.functions.invoke('careers-test', {
        body: { action: 'admin_update_application', share_code: shareCode, contacted: next },
        headers: { 'x-admin-token': token },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      setApplications(prev => prev.map(a => a.share_code === shareCode ? {
        ...a, contacted: next, contacted_at: next ? new Date().toISOString() : null,
      } : a));
      toast({ title: next ? 'Marked as contacted' : 'Unmarked contacted' });
    } catch (e) {
      toast({ title: 'Update failed', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally { setContactingId(null); }
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
      {/* Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-amber" /> Careers Page Analytics (last 90 days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && !analytics ? <Loader2 className="w-5 h-5 animate-spin" /> : analytics && (
            <div className="space-y-4">
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
              {analytics.by_path.length > 0 && (
                <div>
                  <p className="text-xs font-mono uppercase text-muted-foreground mb-2">Views by path</p>
                  <div className="space-y-1">
                    {analytics.by_path.map(p => (
                      <div key={p.path} className="flex justify-between text-sm">
                        <span className="font-mono text-foreground">{p.path}</span>
                        <span className="text-amber">{p.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {analytics.by_cta.length > 0 && (
                <div>
                  <p className="text-xs font-mono uppercase text-muted-foreground mb-2">CTA clicks</p>
                  <div className="space-y-1">
                    {analytics.by_cta.map(c => (
                      <div key={c.cta} className="flex justify-between text-sm">
                        <span className="text-foreground">{c.cta}</span>
                        <span className="text-amber">{c.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Candidates */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="font-display flex items-center gap-2">
              <Users className="w-5 h-5 text-amber" /> Candidates & Applications
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search name, email, code…" className="pl-7 h-8 w-64" />
              </div>
              <Button size="sm" variant="outline" onClick={load} disabled={loading}>
                <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </Button>
            </div>
          </div>
          <div className="flex gap-2 mt-3 flex-wrap">
            {([
              { k: 'all', label: `All Attempts (${filteredAttempts.length})` },
              { k: 'passed', label: `Passed (${passedAttempts.length})` },
              { k: 'apps', label: `Applications (${filteredApps.length})` },
            ] as const).map(t => (
              <Button key={t.k} size="sm" variant={tab === t.k ? 'default' : 'outline'} onClick={() => setTab(t.k)}
                className={tab === t.k ? 'bg-amber text-background hover:bg-amber/90' : ''}>
                {t.label}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
            <span className="font-mono uppercase text-muted-foreground">Filters:</span>
            <label className="flex items-center gap-1">
              <span className="text-muted-foreground">Min test %</span>
              <Input type="number" min={0} max={100} value={minTestScore}
                onChange={e => setMinTestScore(e.target.value)}
                placeholder="0" className="h-7 w-16" />
            </label>
            {tab === 'apps' && (
              <>
                <label className="flex items-center gap-1">
                  <span className="text-muted-foreground">Min fit</span>
                  <Input type="number" min={0} max={100} value={minFitScore}
                    onChange={e => setMinFitScore(e.target.value)}
                    placeholder="0" className="h-7 w-16" />
                </label>
                {(['any', 'not', 'yes'] as const).map(v => (
                  <Button key={v} size="sm" variant={contactFilter === v ? 'default' : 'outline'}
                    onClick={() => setContactFilter(v)}
                    className={`h-7 ${contactFilter === v ? 'bg-amber text-background hover:bg-amber/90' : ''}`}>
                    {v === 'any' ? 'All' : v === 'not' ? 'Not contacted' : 'Contacted'}
                  </Button>
                ))}
              </>
            )}
            {(minTestScore || minFitScore || contactFilter !== 'any') && (
              <Button size="sm" variant="ghost" className="h-7 text-muted-foreground"
                onClick={() => { setMinTestScore(''); setMinFitScore(''); setContactFilter('any'); }}>
                Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div> : (
            <div className="space-y-2">
              {tab === 'apps' ? (
                filteredApps.length === 0 ? <p className="text-muted-foreground text-sm text-center py-6">No applications submitted yet.</p> :
                filteredApps.map(a => (
                  <div key={a.id} className="rounded-lg border border-border/50 bg-secondary/20 p-3">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-display font-bold text-foreground">{a.candidate_name}</span>
                          <Badge variant="outline" className="font-mono text-xs">{a.share_code}</Badge>
                          {a.score_pct != null && <Badge className="bg-green-500/20 text-green-400 border-green-500/30">{a.score_pct}%</Badge>}
                          {a.ai_fit_score != null && (
                            <Badge className={`border ${a.ai_fit_score >= 80 ? 'bg-green-500/20 text-green-400 border-green-500/40' : a.ai_fit_score >= 60 ? 'bg-amber/20 text-amber border-amber/40' : 'bg-destructive/20 text-destructive border-destructive/40'}`}>
                              <Sparkles className="w-3 h-3 mr-1" />Fit {a.ai_fit_score}/100
                            </Badge>
                          )}
                          {a.reviewed && <Badge variant="outline" className="text-xs">Reviewed</Badge>}
                          {a.resume_recreated_at && <Badge variant="outline" className="text-xs">Readable resume</Badge>}
                          {a.contacted && (
                            <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/40 text-xs">
                              <PhoneCall className="w-3 h-3 mr-1" />Contacted
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
                          <a href={`mailto:${a.candidate_email}`} className="flex items-center gap-1 hover:text-amber"><Mail className="w-3 h-3" /> {a.candidate_email}</a>
                          {a.candidate_phone && <a href={`tel:${a.candidate_phone}`} className="flex items-center gap-1 hover:text-amber"><Phone className="w-3 h-3" /> {a.candidate_phone}</a>}
                          <span>Applied {fmt(a.created_at)}</span>
                        </div>
                        {a.notes && <p className="text-sm text-foreground mt-2 whitespace-pre-wrap bg-background/40 p-2 rounded">{a.notes}</p>}
                        {a.resume_extract_error && <p className="text-xs text-destructive mt-2">Resume extraction note: {a.resume_extract_error}</p>}
                        {a.ai_summary && (
                          <div className="mt-2 rounded border border-amber/30 bg-amber/5 p-2 space-y-1">
                            <p className="text-xs whitespace-pre-wrap">{a.ai_summary}</p>
                            {!!a.ai_strengths?.length && (
                              <div>
                                <div className="text-[10px] font-mono uppercase text-green-400 mt-1">Strengths</div>
                                <ul className="text-xs list-disc list-inside">{a.ai_strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
                              </div>
                            )}
                            {!!a.ai_concerns?.length && (
                              <div>
                                <div className="text-[10px] font-mono uppercase text-destructive mt-1">Concerns</div>
                                <ul className="text-xs list-disc list-inside">{a.ai_concerns.map((s, i) => <li key={i}>{s}</li>)}</ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        {a.resume_path && (
                          <Button size="sm" variant="outline" onClick={() => openResume(a.share_code)}>
                            <FileText className="w-3 h-3 mr-1" /> Resume <ExternalLink className="w-3 h-3 ml-1" />
                          </Button>
                        )}
                        {a.resume_path && (
                          <Button size="sm" onClick={() => analyzeResume(a.share_code)} disabled={analyzingId === a.share_code} className="bg-amber text-background hover:bg-amber/90">
                            {analyzingId === a.share_code ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                            {a.ai_analyzed_at ? 'Re-analyze' : 'Analyze AI'}
                          </Button>
                        )}
                        <Button size="sm" variant={a.contacted ? 'outline' : 'default'}
                          onClick={() => toggleContacted(a.share_code, !a.contacted)}
                          disabled={contactingId === a.share_code}
                          className={a.contacted ? '' : 'bg-blue-500 text-white hover:bg-blue-500/90'}>
                          {contactingId === a.share_code ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <PhoneCall className="w-3 h-3 mr-1" />}
                          {a.contacted ? 'Mark not contacted' : 'Mark contacted'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                (tab === 'passed' ? passedAttempts : filteredAttempts).length === 0 ? <p className="text-muted-foreground text-sm text-center py-6">No attempts yet.</p> :
                (tab === 'passed' ? passedAttempts : filteredAttempts).map(a => (
                  <div key={a.id} className="rounded-lg border border-border/50 bg-secondary/20 p-3">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
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
                        {a.notes_to_admin && <p className="text-xs text-foreground/80 mt-2 italic">"{a.notes_to_admin}"</p>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AdminCareersTest />
    </div>
  );
};

export default AdminCareersPanel;
