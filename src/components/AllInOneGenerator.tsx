import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  XCircle,
  Megaphone,
  Phone,
  Calendar,
  Mail,
  Brain,
  AlertTriangle,
  ScanText,
  Library as LibraryIcon,
  Globe,
  Stethoscope,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { saveToAdminLibrary } from '@/lib/adminLibrary';
import { hasValidAdminToken } from '@/lib/adminAuth';

type RunStatus = 'idle' | 'running' | 'success' | 'error' | 'skipped';

interface ToolJob {
  key: string;
  label: string;
  toolType: string;
  icon: React.ElementType;
  fn: string;
  body: () => Record<string, unknown>;
  titleFor: (data: any) => string;
  /** Soft-skip if required input is missing, with friendly note. */
  skipReason?: () => string | null;
}

interface RunState {
  status: RunStatus;
  message?: string;
  durationMs?: number;
}

export const AllInOneGenerator: React.FC = () => {
  const [form, setForm] = useState({
    url: '',
    businessName: '',
    industry: '',
    product: '',
    targetCustomer: '',
    goals: '',
  });
  const [running, setRunning] = useState(false);
  const [inferring, setInferring] = useState(false);
  const [progress, setProgress] = useState(0);
  const [states, setStates] = useState<Record<string, RunState>>({});

  const inferFromUrl = async (urlOverride?: string): Promise<typeof form | null> => {
    const targetUrl = (urlOverride ?? form.url).trim();
    if (!targetUrl) {
      toast({ title: 'Website URL required', description: 'Paste a URL first.', variant: 'destructive' });
      return null;
    }
    setInferring(true);
    try {
      const { data, error } = await supabase.functions.invoke('infer-business-context', { body: { url: targetUrl } });
      if (error || !data || data.error) throw new Error(error?.message || data?.error || 'Inference failed');
      const next = {
        url: data.url || targetUrl,
        businessName: data.businessName || '',
        industry: data.industry || '',
        product: data.product || '',
        targetCustomer: data.targetCustomer || '',
        goals: data.goals || '',
      };
      setForm(next);
      toast({ title: 'Auto-filled from website', description: `${next.businessName || 'Business'} · ${next.industry || 'industry detected'}` });
      return next;
    } catch (err: any) {
      console.error('[infer] failed:', err);
      toast({ title: 'Could not auto-fill', description: err.message || 'You can still fill the fields manually.', variant: 'destructive' });
      return null;
    } finally {
      setInferring(false);
    }
  };

  const jobs = (f: typeof form = form): ToolJob[] => [
    {
      key: 'scan',
      label: 'Website Scan (gaps & revenue leaks)',
      toolType: 'website_scan',
      icon: Globe,
      fn: 'scan-website',
      body: () => ({ url: f.url.trim() }),
      titleFor: () => `${f.businessName || f.url} — Website Scan`,
    },
    {
      key: 'diagnose',
      label: 'What\'s Wrong Diagnostic',
      toolType: 'whats_wrong',
      icon: Stethoscope,
      fn: 'diagnose-whats-wrong',
      body: () => ({
        issues: [
          'Not enough leads',
          'Low conversion rate',
          'Inconsistent sales pipeline',
          'Weak brand positioning',
        ],
        notes: [
          f.businessName && `Business: ${f.businessName}`,
          f.industry && `Industry: ${f.industry}`,
          f.product && `Offer: ${f.product}`,
          f.targetCustomer && `Customer: ${f.targetCustomer}`,
          f.goals && `Goals: ${f.goals}`,
        ].filter(Boolean).join('\n'),
      }),
      titleFor: () => `${f.businessName || f.url} — What's Wrong Diagnostic`,
    },
    {
      key: 'social',
      label: 'Social Content (LinkedIn, FB, Ads)',
      toolType: 'social_content',
      icon: Megaphone,
      fn: 'generate-social-content',
      body: () => ({ url: f.url.trim() }),
      titleFor: (d) => `${d?.businessName || f.businessName || f.url} — Social Pack`,
    },
    {
      key: 'calendar',
      label: '30-Day Content Calendar',
      toolType: 'content_calendar',
      icon: Calendar,
      fn: 'generate-content-calendar',
      body: () => ({
        industry: f.industry || f.businessName || 'general business',
        goals: f.goals || 'grow brand awareness and inbound leads',
        platforms: 'LinkedIn, Facebook, Instagram',
      }),
      titleFor: () => `${f.industry || f.businessName || f.url} — 30-Day Calendar`,
    },
    {
      key: 'sales',
      label: 'Sales Scripts',
      toolType: 'sales_scripts',
      icon: Phone,
      fn: 'generate-sales-scripts',
      body: () => ({
        industry: f.industry || f.businessName || 'general business',
        product: f.product || f.businessName || 'core offer',
        targetCustomer: f.targetCustomer || 'mid-market decision makers',
        objections: '',
      }),
      skipReason: () => (!f.industry && !f.product && !f.businessName ? 'Add an industry or product to generate sales scripts.' : null),
      titleFor: () => `${f.industry || f.businessName} — Sales Scripts`,
    },
    {
      key: 'followup',
      label: 'Follow-Up Plan',
      toolType: 'follow_up_plan',
      icon: Mail,
      fn: 'generate-follow-up-plan',
      body: () => ({
        businessType: f.industry || f.businessName || 'general business',
        salesCycleLength: '14-30 days',
        currentTools: 'Email + phone + LinkedIn',
      }),
      titleFor: () => `${f.industry || f.businessName} — Follow-Up Plan`,
    },
    {
      key: 'brand',
      label: 'Brand Contradictions',
      toolType: 'brand_contradictions',
      icon: AlertTriangle,
      fn: 'generate-brand-contradictions',
      body: () => ({
        url: f.url.trim(),
        socialLinks: '',
        idealCustomer: f.targetCustomer || 'mid-market decision makers',
        desiredPerception: ['Premium', 'Trusted', 'Expert'],
      }),
      titleFor: () => `${f.businessName || f.url} — Brand Contradictions`,
    },
    {
      key: 'friction',
      label: 'Friction Vocabulary Audit',
      toolType: 'friction_audit',
      icon: ScanText,
      fn: 'generate-friction-audit',
      body: () => ({
        url: f.url.trim(),
        desiredTone: ['Confident', 'Direct', 'Premium'],
        industry: f.industry || f.businessName || 'general business',
        targetCustomer: f.targetCustomer || 'mid-market decision makers',
      }),
      titleFor: () => `${f.businessName || f.url} — Friction Audit`,
    },
    {
      key: 'questions',
      label: 'Strategic Questions',
      toolType: 'strategic_questions',
      icon: Brain,
      fn: 'generate-strategic-questions',
      body: () => ({
        industry: f.industry || f.businessName || 'general business',
        companySize: '11-50',
        yearsInBusiness: '3-10',
        mainProduct: f.product || f.businessName || 'core offer',
        growthStage: 'Growth',
        biggestFrustration: 'Inconsistent lead flow and low conversion',
        pressureAreas: ['Sales', 'Marketing'],
        revenueRange: '$1M-$10M',
        goal: f.goals || 'Predictable inbound pipeline',
      }),
      skipReason: () => (!f.industry && !f.businessName ? 'Add an industry or business name to generate strategic questions.' : null),
      titleFor: () => `${f.industry || f.businessName} — Strategic Questions`,
    },
  ];

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const invokeWithRetry = async (fn: string, body: Record<string, unknown>, maxAttempts = 3) => {
    let lastErr: any = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const { data, error } = await supabase.functions.invoke(fn, { body });
        if (error) {
          // Try to read response body for a real error message
          const ctx: any = (error as any).context;
          let detail = error.message || '';
          if (ctx && typeof ctx.json === 'function') {
            try { const j = await ctx.json(); detail = j?.error || detail; } catch { /* ignore */ }
          }
          // Retry transient errors (429 rate-limit, 5xx)
          const isTransient = /rate.?limit|429|timeout|503|502|504|non-2xx/i.test(detail) || ctx?.status === 429 || (ctx?.status >= 500 && ctx?.status < 600);
          if (isTransient && attempt < maxAttempts) {
            await sleep(1500 * attempt + Math.random() * 1000);
            continue;
          }
          throw new Error(detail || 'Edge function error');
        }
        if (!data) throw new Error('No data returned');
        return data;
      } catch (e: any) {
        lastErr = e;
        const msg = String(e?.message || '');
        if (attempt < maxAttempts && /rate.?limit|429|timeout|fetch|network|non-2xx/i.test(msg)) {
          await sleep(1500 * attempt + Math.random() * 1000);
          continue;
        }
        throw e;
      }
    }
    throw lastErr || new Error('Failed after retries');
  };

  const runOne = async (job: ToolJob): Promise<RunState> => {
    const skip = job.skipReason?.();
    if (skip) return { status: 'skipped', message: skip };
    const started = Date.now();
    try {
      const data = await invokeWithRetry(job.fn, job.body());
      // Save to library — only when an admin token is present (reps don't have admin library access)
      if (hasValidAdminToken()) {
        await saveToAdminLibrary({
          tool_type: job.toolType,
          title: `${job.titleFor(data)} — ${new Date().toLocaleDateString()}`,
          input_data: { source: 'all-in-one', ...form, ...job.body() },
          output_data: data,
        }).catch((e) => console.error(`Library save failed for ${job.key}:`, e));
      }
      return { status: 'success', durationMs: Date.now() - started };
    } catch (err: any) {
      console.error(`[all-in-one] ${job.key} failed:`, err);
      return { status: 'error', message: err.message || 'Unknown error', durationMs: Date.now() - started };
    }
  };

  const handleRun = async () => {
    if (!form.url.trim()) {
      toast({ title: 'Website URL required', description: 'Enter the website to analyze.', variant: 'destructive' });
      return;
    }

    // Auto-infer business profile if user hasn't filled details
    let workingForm = form;
    const needsInference = !form.businessName && !form.industry && !form.product && !form.targetCustomer;
    if (needsInference) {
      const inferred = await inferFromUrl(form.url);
      if (inferred) workingForm = inferred;
      // continue even if inference fails — tools will fall back to URL-only
    }

    setRunning(true);
    setProgress(0);
    const allJobs = jobs(workingForm);
    const initial: Record<string, RunState> = {};
    allJobs.forEach((j) => (initial[j.key] = { status: 'running' }));
    setStates(initial);

    let completed = 0;
    let succeeded = 0;
    let failed = 0;
    let skipped = 0;
    const total = allJobs.length;

    // Run all tools fully in parallel — retry logic handles transient 429s.
    // Tiny stagger (50ms each) avoids a thundering-herd against the AI gateway.
    await Promise.all(
      allJobs.map(async (job, idx) => {
        await sleep(idx * 50);
        const result = await runOne(job);
        completed++;
        if (result.status === 'success') succeeded++;
        else if (result.status === 'error') failed++;
        else if (result.status === 'skipped') skipped++;
        setProgress(Math.round((completed / total) * 100));
        setStates((prev) => ({ ...prev, [job.key]: result }));
      }),
    );

    setRunning(false);
    setProgress(100);
    toast({
      title: 'All-in-one run complete',
      description: `${succeeded} saved · ${failed} failed · ${skipped} skipped (of ${total} tools). Check My Library.`,
    });
  };

  const reset = () => {
    setStates({});
    setProgress(0);
  };

  const successCount = Object.values(states).filter((s) => s.status === 'success').length;
  const errorCount = Object.values(states).filter((s) => s.status === 'error').length;
  const skippedCount = Object.values(states).filter((s) => s.status === 'skipped').length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="glass rounded-xl p-6 sm:p-8 border border-border">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-6 h-6 text-amber" />
          <h2 className="text-2xl font-bold text-foreground font-display">All-In-One: Run Every Tool</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Enter a website URL and a few quick details. We'll run every tool in your toolkit at once and save each result
          to <span className="text-amber">My Library</span>.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label>Website URL *</Label>
            <Input
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://example.com"
              disabled={running}
            />
          </div>
          <div>
            <Label>Business Name</Label>
            <Input
              value={form.businessName}
              onChange={(e) => setForm({ ...form, businessName: e.target.value })}
              placeholder="Acme Co."
              disabled={running}
            />
          </div>
          <div>
            <Label>Industry</Label>
            <Input
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
              placeholder="e.g. SaaS, Healthcare, Construction"
              disabled={running}
            />
          </div>
          <div>
            <Label>Main Product / Service</Label>
            <Input
              value={form.product}
              onChange={(e) => setForm({ ...form, product: e.target.value })}
              placeholder="What do they sell?"
              disabled={running}
            />
          </div>
          <div>
            <Label>Target Customer</Label>
            <Input
              value={form.targetCustomer}
              onChange={(e) => setForm({ ...form, targetCustomer: e.target.value })}
              placeholder="Mid-market ops leaders"
              disabled={running}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Primary Goal</Label>
            <Textarea
              value={form.goals}
              onChange={(e) => setForm({ ...form, goals: e.target.value })}
              placeholder="e.g. Predictable inbound pipeline, expand into enterprise, increase trial-to-paid conversion"
              rows={2}
              disabled={running}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-6">
          <Button
            onClick={handleRun}
            disabled={running || inferring || !form.url.trim()}
            className="bg-amber hover:bg-amber/90 text-background font-bold px-6"
          >
            {running ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Running all tools...
              </>
            ) : inferring ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Reading website...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" /> Run Every Tool
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => inferFromUrl()}
            disabled={running || inferring || !form.url.trim()}
          >
            {inferring ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Auto-filling...</>
            ) : (
              <>Auto-fill from website</>
            )}
          </Button>
          {!running && Object.keys(states).length > 0 && (
            <Button variant="outline" onClick={reset}>Clear results</Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground mt-3">
          Just paste your URL and hit <span className="text-amber font-semibold">Run Every Tool</span> — we'll read your
          site, infer your business profile, then run all 9 tools fully in parallel (~30–60 seconds). If a tool gets
          rate-limited it auto-retries up to 3 times. Each result saves to your library independently.
        </p>
      </div>

      {(running || Object.keys(states).length > 0) && (
        <div className="glass rounded-xl p-6 border border-border">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="text-lg font-bold text-foreground font-display">Progress</h3>
            <div className="flex items-center gap-3 text-xs">
              {successCount > 0 && (
                <span className="text-green-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {successCount} done
                </span>
              )}
              {errorCount > 0 && (
                <span className="text-red-400 flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" /> {errorCount} failed
                </span>
              )}
              {skippedCount > 0 && (
                <span className="text-muted-foreground">{skippedCount} skipped</span>
              )}
            </div>
          </div>
          <Progress value={progress} className="h-2 mb-4" />
          <div className="space-y-2">
            {jobs().map((job) => {
              const state = states[job.key] || { status: 'idle' as RunStatus };
              const Icon = job.icon;
              return (
                <div
                  key={job.key}
                  className="flex flex-col gap-1 p-3 rounded-lg border border-border bg-card/40"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-amber flex-shrink-0" />
                    <span className="flex-1 text-sm font-medium text-foreground">{job.label}</span>
                    <div className="flex items-center gap-2 text-xs">
                      {state.status === 'running' && (
                        <span className="flex items-center gap-1 text-amber">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Running
                        </span>
                      )}
                      {state.status === 'success' && (
                        <span className="flex items-center gap-1 text-green-400">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Saved to Library
                          {state.durationMs ? <span className="text-muted-foreground">· {(state.durationMs / 1000).toFixed(1)}s</span> : null}
                        </span>
                      )}
                      {state.status === 'error' && (
                        <span className="flex items-center gap-1 text-red-400">
                          <XCircle className="w-3.5 h-3.5" /> Failed
                        </span>
                      )}
                      {state.status === 'skipped' && (
                        <span className="text-muted-foreground">Skipped</span>
                      )}
                      {state.status === 'idle' && <span className="text-muted-foreground">Queued</span>}
                    </div>
                  </div>
                  {(state.status === 'error' || state.status === 'skipped') && state.message && (
                    <p className="text-[11px] text-muted-foreground pl-7 leading-snug">{state.message}</p>
                  )}
                </div>
              );
            })}
          </div>

          {!running && successCount > 0 && (
            <div className="mt-5 p-4 rounded-lg bg-amber/5 border border-amber/30 flex items-start gap-3">
              <LibraryIcon className="w-5 h-5 text-amber flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">All results are in your Library</p>
                <p className="text-xs text-muted-foreground">
                  Switch to the <span className="text-amber font-semibold">My Library</span> tab to view, download as
                  PDF, or copy any result.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
