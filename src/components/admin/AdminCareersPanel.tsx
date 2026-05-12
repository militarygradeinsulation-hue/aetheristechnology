import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getAdminToken } from '@/lib/adminAuth';
import {
  Loader2, RefreshCw, Briefcase, Eye, MousePointerClick, Users, FileText,
  CheckCircle2, XCircle, Mail, Phone, ExternalLink, Search, Sparkles, PhoneCall,
  ArrowDownAZ, ArrowUpAZ, CalendarCheck, Clock, Ban, StickyNote, Send,
  Star, CalendarPlus, Share2, Copy,
} from 'lucide-react';
import { AdminCareersTest } from './AdminCareersTest';
import { upsertCompanyEntry } from '@/lib/companyCalendar';
import { ReadAloudButton } from '@/components/ReadAloudButton';

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
  ai_section_scores?: Record<string, { rating: number; reason: string }> | null;
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
  const [fitSort, setFitSort] = useState<'none' | 'desc' | 'asc'>('none');
  const [stageFilter, setStageFilter] = useState<'all' | 'new' | 'interview' | 'wait' | 'no'>('all');
  const [detailAttempt, setDetailAttempt] = useState<Attempt | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('aetheris_saved_candidates') || '[]')); }
    catch { return new Set(); }
  });
  const persistSaved = (s: Set<string>) => {
    setSavedIds(new Set(s));
    localStorage.setItem('aetheris_saved_candidates', JSON.stringify(Array.from(s)));
  };
  const toggleSaved = (id: string) => {
    const next = new Set(savedIds);
    if (next.has(id)) { next.delete(id); toast({ title: 'Removed from saved' }); }
    else { next.add(id); toast({ title: 'Saved candidate ★' }); }
    persistSaved(next);
  };
  const [calDate, setCalDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [calTime, setCalTime] = useState<string>('10:00');
  const [calBusy, setCalBusy] = useState(false);
  const [shareNote, setShareNote] = useState<string>('');

  const matchingApp = useMemo(
    () => detailAttempt
      ? applications.find(app =>
          app.candidate_email.toLowerCase() === detailAttempt.candidate_email.toLowerCase()
          || (detailAttempt.share_code && app.share_code === detailAttempt.share_code)
        ) || null
      : null,
    [detailAttempt, applications]
  );

  const moveToCalendar = async () => {
    if (!detailAttempt) return;
    setCalBusy(true);
    try {
      const who = detailAttempt.candidate_name || detailAttempt.candidate_email;
      const body = [
        `Candidate: ${who}`,
        `Email: ${detailAttempt.candidate_email}`,
        detailAttempt.candidate_phone ? `Phone: ${detailAttempt.candidate_phone}` : '',
        detailAttempt.score_pct != null ? `Test score: ${detailAttempt.score_pct}% (${detailAttempt.correct_count}/${detailAttempt.total_count})` : '',
        `Interview time: ${calTime}`,
        detailAttempt.notes_to_admin ? `Notes from candidate: ${detailAttempt.notes_to_admin}` : '',
      ].filter(Boolean).join('\n');
      await upsertCompanyEntry({
        date: calDate,
        kind: 'event',
        title: `Interview ${calTime} — ${who}`,
        body,
        pinned: true,
      });
      toast({ title: 'Added to Company Calendar', description: `${calDate} at ${calTime}` });
    } catch (e) {
      toast({ title: 'Failed to add to calendar', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally { setCalBusy(false); }
  };

  const buildShareText = () => {
    if (!detailAttempt) return '';
    const lines = [
      `Candidate: ${detailAttempt.candidate_name || '—'}`,
      `Email: ${detailAttempt.candidate_email}`,
      detailAttempt.candidate_phone ? `Phone: ${detailAttempt.candidate_phone}` : '',
      detailAttempt.score_pct != null ? `Score: ${detailAttempt.score_pct}% (${detailAttempt.correct_count}/${detailAttempt.total_count})` : '',
      detailAttempt.notes_to_admin ? `Candidate note: "${detailAttempt.notes_to_admin}"` : '',
      matchingApp?.ai_summary ? `AI summary: ${matchingApp.ai_summary}` : '',
      matchingApp?.ai_fit_score != null ? `AI fit score: ${matchingApp.ai_fit_score}/60` : '',
      shareNote ? `\nNotes:\n${shareNote}` : '',
    ].filter(Boolean);
    return lines.join('\n');
  };

  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(buildShareText());
      toast({ title: 'Copied to clipboard' });
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };

  const emailShare = () => {
    const subject = `Candidate: ${detailAttempt?.candidate_name || detailAttempt?.candidate_email || ''}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(buildShareText())}`;
  };

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
  const filteredApps = applications
    .filter(a =>
      matchesText(a.candidate_name, a.candidate_email, a.share_code) &&
      (minTest == null || (a.score_pct ?? -1) >= minTest) &&
      (minFit == null || (a.ai_fit_score ?? -1) >= minFit) &&
      (contactFilter === 'any' || (contactFilter === 'yes' ? !!a.contacted : !a.contacted)) &&
      (stageFilter === 'all' || (a.stage || 'new') === stageFilter)
    )
    .sort((a, b) => {
      if (fitSort === 'none') return 0;
      const av = a.ai_fit_score ?? -1;
      const bv = b.ai_fit_score ?? -1;
      return fitSort === 'desc' ? bv - av : av - bv;
    });

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
  const [analyzingSet, setAnalyzingSet] = useState<Set<string>>(new Set());
  const analyzeResume = async (shareCode: string, opts?: { silent?: boolean }) => {
    setAnalyzingId(shareCode);
    setAnalyzingSet(prev => { const n = new Set(prev); n.add(shareCode); return n; });
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
        ai_section_scores: d.section_scores || a.ai_section_scores || null,
        ai_analyzed_at: new Date().toISOString(),
      } : a));
      if (!opts?.silent) toast({ title: `Fit score: ${d.fit_score}/60` });
      return d.fit_score as number;
    } catch (e) {
      if (!opts?.silent) toast({ title: 'AI analysis failed', description: e instanceof Error ? e.message : '', variant: 'destructive' });
      throw e;
    } finally {
      setAnalyzingId(null);
      setAnalyzingSet(prev => { const n = new Set(prev); n.delete(shareCode); return n; });
    }
  };

  const [bulkAnalyze, setBulkAnalyze] = useState<{ done: number; total: number; current: string | null; recent: { name: string; score: number | null; ok: boolean }[] } | null>(null);
  const analyzeAllPassed = async (onlyMissing = true) => {
    const targets = applications.filter(a => a.resume_path && (!onlyMissing || a.ai_fit_score == null));
    if (!targets.length) {
      toast({ title: onlyMissing ? 'All passed candidates already analyzed' : 'No passed candidates with resumes' });
      return;
    }
    setBulkAnalyze({ done: 0, total: targets.length, current: null, recent: [] });
    let ok = 0, fail = 0;
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      setBulkAnalyze(b => b ? { ...b, current: t.candidate_name } : b);
      let score: number | null = null;
      let success = false;
      try {
        score = await analyzeResume(t.share_code, { silent: true });
        ok++; success = true;
      } catch { fail++; }
      setBulkAnalyze(b => b ? {
        ...b,
        done: i + 1,
        current: null,
        recent: [{ name: t.candidate_name, score, ok: success }, ...b.recent].slice(0, 6),
      } : b);
    }
    setBulkAnalyze(null);
    toast({ title: `Analyzed ${ok}/${targets.length}`, description: fail ? `${fail} failed` : undefined });
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

  const updateApp = async (shareCode: string, patch: Record<string, unknown>) => {
    const token = getAdminToken();
    if (!token) throw new Error('Admin session expired');
    const { data, error } = await supabase.functions.invoke('careers-test', {
      body: { action: 'admin_update_application', share_code: shareCode, ...patch },
      headers: { 'x-admin-token': token },
    });
    if (error) throw new Error(error.message);
    if ((data as any)?.error) throw new Error((data as any).error);
  };

  const [stageSavingId, setStageSavingId] = useState<string | null>(null);
  const setStage = async (shareCode: string, stage: 'new' | 'interview' | 'wait' | 'no') => {
    setStageSavingId(shareCode);
    const prev = applications;
    setApplications(p => p.map(a => a.share_code === shareCode ? { ...a, stage } : a));
    try {
      await updateApp(shareCode, { stage });
      toast({ title: `Moved to ${stage}` });
    } catch (e) {
      setApplications(prev);
      toast({ title: 'Could not update stage', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally { setStageSavingId(null); }
  };

  const notesTimers = useRef<Record<string, number>>({});
  const onNotesChange = (shareCode: string, value: string) => {
    setApplications(p => p.map(a => a.share_code === shareCode ? { ...a, admin_notes: value } : a));
    const existing = notesTimers.current[shareCode];
    if (existing) window.clearTimeout(existing);
    notesTimers.current[shareCode] = window.setTimeout(async () => {
      try { await updateApp(shareCode, { admin_notes: value }); }
      catch (e) { toast({ title: 'Notes save failed', description: e instanceof Error ? e.message : '', variant: 'destructive' }); }
    }, 700);
  };

  const [sendingId, setSendingId] = useState<string | null>(null);
  const sendToWorkspace = async (a: Application, opts: { schedule: boolean }) => {
    setSendingId(a.share_code);
    try {
      let scheduledAt: string | null = null;
      let meetingLink: string | null = null;
      if (opts.schedule) {
        const when = window.prompt(`Schedule interview with ${a.candidate_name}\nEnter date/time (e.g. "2026-05-20 14:30"):`, '');
        if (!when) { setSendingId(null); return; }
        const dt = new Date(when);
        if (isNaN(+dt)) { toast({ title: 'Invalid date', variant: 'destructive' }); setSendingId(null); return; }
        scheduledAt = dt.toISOString();
        meetingLink = window.prompt('Meeting link (optional):', '') || null;
      }
      const { data: ins, error } = await supabase.from('shared_interviews').insert({
        candidate_name: a.candidate_name,
        candidate_email: a.candidate_email,
        candidate_phone: a.candidate_phone,
        share_code: a.share_code,
        resume_path: a.resume_path,
        resume_filename: a.resume_filename,
        ai_fit_score: a.ai_fit_score,
        ai_summary: a.ai_summary,
        ai_strengths: a.ai_strengths as any,
        ai_concerns: a.ai_concerns as any,
        notes: a.admin_notes || a.notes,
        scheduled_at: scheduledAt,
        meeting_link: meetingLink,
        status: scheduledAt ? 'scheduled' : 'pending',
        source: 'careers',
        created_by: 'admin',
      }).select('id').single();
      if (error) throw error;
      if (scheduledAt) {
        const { data: t } = await supabase.from('shared_tasks').insert({
          title: `Interview: ${a.candidate_name}`,
          description: [meetingLink ? `Link: ${meetingLink}` : null, a.candidate_email, a.admin_notes || a.notes].filter(Boolean).join('\n'),
          owner: 'admin', assignee: 'admin',
          priority: 'high', bucket: 'today', due_at: scheduledAt,
        }).select('id').single();
        if (t?.id) await supabase.from('shared_interviews').update({ task_id: (t as any).id }).eq('id', (ins as any).id);
      }
      try { await updateApp(a.share_code, { stage: 'interview' }); } catch {}
      setApplications(prev => prev.map(x => x.share_code === a.share_code ? { ...x, stage: 'interview' } : x));
      toast({ title: 'Sent to Shared Workspace', description: scheduledAt ? 'Interview scheduled and added to calendar.' : 'Open the Workspace → Interviews tab to schedule.' });
    } catch (e) {
      toast({ title: 'Send failed', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally {
      setSendingId(null);
    }
  };

  const applyPreset = (preset: 'top' | 'passedNew' | 'pending' | 'rejected' | 'reset') => {
    setTab('apps');
    setStageFilter('all');
    setContactFilter('any');
    setMinTestScore('');
    setMinFitScore('');
    setFitSort('none');
    if (preset === 'top') { setMinFitScore('80'); setFitSort('desc'); }
    else if (preset === 'passedNew') { setMinTestScore('70'); setStageFilter('new'); setContactFilter('not'); }
    else if (preset === 'pending') { setStageFilter('new'); setFitSort('desc'); }
    else if (preset === 'rejected') { setStageFilter('no'); }
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
            <span className="font-mono uppercase text-muted-foreground">Quick:</span>
            {([
              { k: 'top', label: '🔥 Top fit (80+)' },
              { k: 'passedNew', label: '✅ Passed · uncontacted' },
              { k: 'pending', label: '🕒 Pending review' },
              { k: 'rejected', label: '🚫 Rejected' },
              { k: 'reset', label: 'Reset' },
            ] as const).map(p => (
              <Button key={p.k} size="sm" variant="outline" className="h-7"
                onClick={() => applyPreset(p.k)}>{p.label}</Button>
            ))}
            <Button size="sm" className="h-7 bg-amber text-background hover:bg-amber/90"
              onClick={() => analyzeAllPassed(true)} disabled={!!bulkAnalyze}>
              {bulkAnalyze
                ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Analyzing {bulkAnalyze.done}/{bulkAnalyze.total}</>
                : <><Sparkles className="w-3 h-3 mr-1" />Analyze all passed resumes</>}
            </Button>
            {applications.some(a => a.ai_fit_score != null) && !bulkAnalyze && (
              <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground"
                onClick={() => analyzeAllPassed(false)}>Re-analyze all</Button>
            )}
          </div>
          {bulkAnalyze && (
            <div className="mt-2 rounded-lg border border-amber/30 bg-amber/5 p-2 text-xs space-y-1">
              <div className="flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin text-amber" />
                <span className="font-mono uppercase text-amber">Analyzing {bulkAnalyze.done}/{bulkAnalyze.total}</span>
                {bulkAnalyze.current && <span className="text-muted-foreground truncate">· {bulkAnalyze.current}</span>}
              </div>
              <div className="h-1 w-full bg-background/40 rounded overflow-hidden">
                <div className="h-full bg-amber transition-all" style={{ width: `${(bulkAnalyze.done / bulkAnalyze.total) * 100}%` }} />
              </div>
              {bulkAnalyze.recent.length > 0 && (
                <ul className="space-y-0.5 pt-1">
                  {bulkAnalyze.recent.map((r, i) => (
                    <li key={i} className="flex items-center justify-between gap-2">
                      <span className="truncate text-foreground">{r.name}</span>
                      {r.ok && r.score != null
                        ? <Badge className={`h-4 px-1 text-[10px] ${r.score >= 80 ? 'bg-green-500/20 text-green-400 border-green-500/40' : r.score >= 60 ? 'bg-amber/20 text-amber border-amber/40' : 'bg-destructive/20 text-destructive border-destructive/40'}`}>Fit {r.score}</Badge>
                        : <Badge variant="outline" className="h-4 px-1 text-[10px] text-destructive">failed</Badge>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
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
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Sort fit:</span>
                  <Button size="sm" variant={fitSort === 'desc' ? 'default' : 'outline'}
                    onClick={() => setFitSort(fitSort === 'desc' ? 'none' : 'desc')}
                    className={`h-7 ${fitSort === 'desc' ? 'bg-amber text-background hover:bg-amber/90' : ''}`}>
                    <ArrowDownAZ className="w-3 h-3 mr-1" /> Best
                  </Button>
                  <Button size="sm" variant={fitSort === 'asc' ? 'default' : 'outline'}
                    onClick={() => setFitSort(fitSort === 'asc' ? 'none' : 'asc')}
                    className={`h-7 ${fitSort === 'asc' ? 'bg-amber text-background hover:bg-amber/90' : ''}`}>
                    <ArrowUpAZ className="w-3 h-3 mr-1" /> Worst
                  </Button>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Stage:</span>
                  {(['all', 'new', 'interview', 'wait', 'no'] as const).map(v => (
                    <Button key={v} size="sm" variant={stageFilter === v ? 'default' : 'outline'}
                      onClick={() => setStageFilter(v)}
                      className={`h-7 capitalize ${stageFilter === v ? 'bg-amber text-background hover:bg-amber/90' : ''}`}>
                      {v}
                    </Button>
                  ))}
                </div>
                {(['any', 'not', 'yes'] as const).map(v => (
                  <Button key={v} size="sm" variant={contactFilter === v ? 'default' : 'outline'}
                    onClick={() => setContactFilter(v)}
                    className={`h-7 ${contactFilter === v ? 'bg-amber text-background hover:bg-amber/90' : ''}`}>
                    {v === 'any' ? 'All' : v === 'not' ? 'Not contacted' : 'Contacted'}
                  </Button>
                ))}
              </>
            )}
            {(minTestScore || minFitScore || contactFilter !== 'any' || stageFilter !== 'all' || fitSort !== 'none') && (
              <Button size="sm" variant="ghost" className="h-7 text-muted-foreground"
                onClick={() => { setMinTestScore(''); setMinFitScore(''); setContactFilter('any'); setStageFilter('all'); setFitSort('none'); }}>
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
                            <Badge className={`border ${a.ai_fit_score >= 45 ? 'bg-green-500/20 text-green-400 border-green-500/40' : a.ai_fit_score >= 30 ? 'bg-amber/20 text-amber border-amber/40' : 'bg-destructive/20 text-destructive border-destructive/40'}`}>
                              <Sparkles className="w-3 h-3 mr-1" />Fit {a.ai_fit_score}/60
                            </Badge>
                          )}
                          {analyzingSet.has(a.share_code) && (
                            <Badge className="bg-amber/20 text-amber border border-amber/40 text-xs">
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />Analyzing…
                            </Badge>
                          )}
                          {a.reviewed && <Badge variant="outline" className="text-xs">Reviewed</Badge>}
                          {a.resume_recreated_at && <Badge variant="outline" className="text-xs">Readable resume</Badge>}
                          {a.contacted && (
                            <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/40 text-xs">
                              <PhoneCall className="w-3 h-3 mr-1" />Contacted
                            </Badge>
                          )}
                          {a.stage && a.stage !== 'new' && (
                            <Badge className={`border text-xs capitalize ${
                              a.stage === 'interview' ? 'bg-green-500/20 text-green-400 border-green-500/40' :
                              a.stage === 'wait' ? 'bg-amber/20 text-amber border-amber/40' :
                              a.stage === 'no' ? 'bg-destructive/20 text-destructive border-destructive/40' :
                              'bg-muted'
                            }`}>{a.stage}</Badge>
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
                        <Button size="sm" variant="outline"
                          onClick={() => sendToWorkspace(a, { schedule: false })}
                          disabled={sendingId === a.share_code}
                          className="border-amber/40 text-amber hover:bg-amber/10">
                          {sendingId === a.share_code ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Send className="w-3 h-3 mr-1" />}
                          Send to Workspace
                        </Button>
                        <Button size="sm"
                          onClick={() => sendToWorkspace(a, { schedule: true })}
                          disabled={sendingId === a.share_code}
                          className="bg-amber text-background hover:bg-amber/90">
                          <CalendarCheck className="w-3 h-3 mr-1" /> Schedule interview
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-border/40 flex flex-wrap gap-2 items-center">
                      <span className="text-[10px] font-mono uppercase text-muted-foreground">Stage:</span>
                      {([
                        { k: 'interview', label: 'Move to interview', icon: CalendarCheck, cls: 'bg-green-500/20 text-green-400 border-green-500/40 hover:bg-green-500/30' },
                        { k: 'wait', label: 'Wait', icon: Clock, cls: 'bg-amber/20 text-amber border-amber/40 hover:bg-amber/30' },
                        { k: 'no', label: 'No', icon: Ban, cls: 'bg-destructive/20 text-destructive border-destructive/40 hover:bg-destructive/30' },
                      ] as const).map(s => {
                        const Icon = s.icon;
                        const active = (a.stage || 'new') === s.k;
                        return (
                          <Button key={s.k} size="sm" variant="outline"
                            disabled={stageSavingId === a.share_code}
                            onClick={() => setStage(a.share_code, s.k)}
                            className={`h-7 border ${active ? s.cls : ''}`}>
                            <Icon className="w-3 h-3 mr-1" />{s.label}
                          </Button>
                        );
                      })}
                      {(a.stage && a.stage !== 'new') && (
                        <Button size="sm" variant="ghost" className="h-7 text-muted-foreground"
                          onClick={() => setStage(a.share_code, 'new')}>Reset stage</Button>
                      )}
                    </div>
                    <div className="mt-2">
                      <label className="text-[10px] font-mono uppercase text-muted-foreground flex items-center gap-1 mb-1">
                        <StickyNote className="w-3 h-3" /> Internal notes
                      </label>
                      <Textarea
                        value={a.admin_notes || ''}
                        onChange={e => onNotesChange(a.share_code, e.target.value)}
                        placeholder="Notes only your team will see…"
                        className="min-h-[60px] text-sm bg-background/40"
                      />
                    </div>
                  </div>
                ))
              ) : (
                (tab === 'passed' ? passedAttempts : filteredAttempts).length === 0 ? <p className="text-muted-foreground text-sm text-center py-6">No attempts yet.</p> :
                (tab === 'passed' ? passedAttempts : filteredAttempts).map(a => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setDetailAttempt(a)}
                    className="w-full text-left rounded-lg border border-border/50 bg-secondary/20 p-3 hover:border-amber/60 hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {savedIds.has(a.id) && <Star className="w-3.5 h-3.5 text-amber fill-amber" />}
                          <span className="font-display font-bold text-foreground underline-offset-2 hover:underline">{a.candidate_name || '—'}</span>
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
                          <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {a.candidate_email}</span>
                          {a.candidate_phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {a.candidate_phone}</span>}
                          <span>Started {fmt(a.started_at)}</span>
                          {a.submitted_at && <span>· Submitted {fmt(a.submitted_at)}</span>}
                        </div>
                        {a.notes_to_admin && <p className="text-xs text-foreground/80 mt-2 italic">"{a.notes_to_admin}"</p>}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <Button
                          type="button" size="sm" variant="ghost"
                          className={`h-8 ${savedIds.has(a.id) ? 'text-amber' : 'text-muted-foreground hover:text-amber'}`}
                          onClick={(e) => { e.stopPropagation(); toggleSaved(a.id); }}
                          title={savedIds.has(a.id) ? 'Remove from saved' : 'Save candidate'}
                        >
                          <Star className={`w-4 h-4 ${savedIds.has(a.id) ? 'fill-amber' : ''}`} />
                        </Button>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AdminCareersTest />

      <Dialog open={!!detailAttempt} onOpenChange={(o) => { if (!o) { setDetailAttempt(null); setShareNote(''); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              <span>{detailAttempt?.candidate_name || detailAttempt?.candidate_email || 'Candidate'}</span>
              {detailAttempt && <StatusBadge s={detailAttempt.status} />}
              {detailAttempt?.score_pct != null && (
                <Badge variant="outline" className="font-mono">
                  {detailAttempt.score_pct}% ({detailAttempt.correct_count}/{detailAttempt.total_count})
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {detailAttempt && (
            <div className="space-y-3 text-sm">
              {/* CONTACT — sky */}
              <div className="rounded-lg border-l-4 border-sky-500 bg-sky-500/5 p-3">
                <div className="text-[10px] font-mono uppercase tracking-widest text-sky-400 mb-2">Contact</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Email</div>
                    <a href={`mailto:${detailAttempt.candidate_email}`} className="text-sky-300 hover:underline flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {detailAttempt.candidate_email}
                    </a>
                  </div>
                  {detailAttempt.candidate_phone && (
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">Phone</div>
                      <a href={`tel:${detailAttempt.candidate_phone}`} className="text-sky-300 hover:underline flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {detailAttempt.candidate_phone}
                      </a>
                    </div>
                  )}
                  {detailAttempt.share_code && (
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">Share code</div>
                      <div className="font-mono">{detailAttempt.share_code}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Started</div>
                    <div>{fmt(detailAttempt.started_at)}</div>
                  </div>
                  {detailAttempt.submitted_at && (
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">Submitted</div>
                      <div>{fmt(detailAttempt.submitted_at)}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* CANDIDATE NOTES — amber */}
              {detailAttempt.notes_to_admin && (
                <div className="rounded-lg border-l-4 border-amber bg-amber/10 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-amber">Notes from candidate</div>
                    <ReadAloudButton text={`Notes from candidate. ${detailAttempt.notes_to_admin}`} variant="ghost" />
                  </div>
                  <p className="italic text-foreground/90">"{detailAttempt.notes_to_admin}"</p>
                </div>
              )}

              {matchingApp ? (
                <>
                  {/* AI SUMMARY — purple */}
                  {matchingApp.ai_summary && (
                    <div className="rounded-lg border-l-4 border-purple-500 bg-purple-500/5 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-[10px] font-mono uppercase tracking-widest text-purple-300 flex items-center gap-1">
                          <FileText className="w-3 h-3" /> AI Summary
                        </div>
                        <ReadAloudButton text={`AI summary. ${matchingApp.ai_summary}`} variant="ghost" />
                      </div>
                      <p className="text-foreground/90">{matchingApp.ai_summary}</p>
                    </div>
                  )}

                  {/* AI FIT SCORE — emerald */}
                  {matchingApp.ai_fit_score != null && (
                    <div className="rounded-lg border-l-4 border-emerald-500 bg-emerald-500/5 p-3">
                      <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-300 mb-1">AI Fit Score</div>
                      <Badge variant="outline" className="font-mono border-emerald-500/50 text-emerald-300">{matchingApp.ai_fit_score}/100</Badge>
                    </div>
                  )}

                  {/* STRENGTHS — green */}
                  {matchingApp.ai_strengths && matchingApp.ai_strengths.length > 0 && (
                    <div className="rounded-lg border-l-4 border-green-500 bg-green-500/5 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-[10px] font-mono uppercase tracking-widest text-green-300">Strengths</div>
                        <ReadAloudButton text={`Strengths. ${matchingApp.ai_strengths.join('. ')}`} variant="ghost" />
                      </div>
                      <ul className="list-disc list-inside text-foreground/90 space-y-0.5">
                        {matchingApp.ai_strengths.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  )}

                  {/* CONCERNS — crimson */}
                  {matchingApp.ai_concerns && matchingApp.ai_concerns.length > 0 && (
                    <div className="rounded-lg border-l-4 border-crimson bg-crimson/10 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-[10px] font-mono uppercase tracking-widest text-crimson">Concerns</div>
                        <ReadAloudButton text={`Concerns. ${matchingApp.ai_concerns.join('. ')}`} variant="ghost" />
                      </div>
                      <ul className="list-disc list-inside text-foreground/90 space-y-0.5">
                        {matchingApp.ai_concerns.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  )}

                  {/* CANDIDATE APP NOTES — indigo */}
                  {matchingApp.notes && (
                    <div className="rounded-lg border-l-4 border-indigo-500 bg-indigo-500/5 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-[10px] font-mono uppercase tracking-widest text-indigo-300">Candidate Application Notes</div>
                        <ReadAloudButton text={`Candidate application notes. ${matchingApp.notes}`} variant="ghost" />
                      </div>
                      <p className="text-foreground/90 whitespace-pre-wrap">{matchingApp.notes}</p>
                    </div>
                  )}

                  {/* ADMIN NOTES — slate */}
                  {matchingApp.admin_notes && (
                    <div className="rounded-lg border-l-4 border-slate-400 bg-slate-400/10 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-[10px] font-mono uppercase tracking-widest text-slate-300">Admin Notes</div>
                        <ReadAloudButton text={`Admin notes. ${matchingApp.admin_notes}`} variant="ghost" />
                      </div>
                      <p className="text-foreground/90 whitespace-pre-wrap">{matchingApp.admin_notes}</p>
                    </div>
                  )}

                  {matchingApp.resume_filename && (
                    <div className="text-xs text-muted-foreground">Resume: {matchingApp.resume_filename}</div>
                  )}
                </>
              ) : (
                <div className="border-t border-border/50 pt-3 text-xs text-muted-foreground italic">
                  No application submitted yet for this candidate.
                </div>
              )}

              {/* ===== Quick actions ===== */}
              <div className="border-t border-border/50 pt-4 space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="text-xs font-mono uppercase tracking-wide text-amber">Actions</div>
                  <Button
                    type="button" size="sm"
                    variant={detailAttempt && savedIds.has(detailAttempt.id) ? 'default' : 'outline'}
                    className={detailAttempt && savedIds.has(detailAttempt.id) ? 'bg-amber text-background hover:bg-amber/90' : ''}
                    onClick={() => detailAttempt && toggleSaved(detailAttempt.id)}
                  >
                    <Star className={`w-3.5 h-3.5 mr-1 ${detailAttempt && savedIds.has(detailAttempt.id) ? 'fill-background' : ''}`} />
                    {detailAttempt && savedIds.has(detailAttempt.id) ? 'Saved' : 'Save'}
                  </Button>
                </div>

                {/* Move to calendar */}
                <div className="rounded-lg border border-border/50 bg-secondary/20 p-3 space-y-2">
                  <div className="text-xs font-semibold flex items-center gap-1"><CalendarPlus className="w-3.5 h-3.5 text-amber" /> Move to Company Calendar</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input type="date" value={calDate} onChange={e => setCalDate(e.target.value)} className="h-8 w-auto" />
                    <Input type="time" value={calTime} onChange={e => setCalTime(e.target.value)} className="h-8 w-auto" />
                    <Button size="sm" onClick={moveToCalendar} disabled={calBusy} className="bg-amber text-background hover:bg-amber/90">
                      {calBusy ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <CalendarPlus className="w-3.5 h-3.5 mr-1" />}
                      Add interview
                    </Button>
                  </div>
                </div>

                {/* Share with notes */}
                <div className="rounded-lg border border-border/50 bg-secondary/20 p-3 space-y-2">
                  <div className="text-xs font-semibold flex items-center gap-1"><Share2 className="w-3.5 h-3.5 text-amber" /> Share with notes</div>
                  <Textarea
                    value={shareNote}
                    onChange={e => setShareNote(e.target.value)}
                    placeholder="Add context for whoever you're sharing this candidate with…"
                    className="min-h-[70px] text-sm bg-background/40"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={copyShare}>
                      <Copy className="w-3.5 h-3.5 mr-1" /> Copy summary + notes
                    </Button>
                    <Button size="sm" variant="outline" onClick={emailShare}>
                      <Send className="w-3.5 h-3.5 mr-1" /> Email…
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCareersPanel;
