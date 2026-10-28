import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, ShieldCheck, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AuditCustomQuote } from '@/components/AuditCustomQuote';
import {
  AUDIT_OPTIONS,
  evaluateCompanyAudit,
  modelCompanyAuditExposure,
  normalizePublicCompanyUrl,
  type AuditExposureEstimate,
  type AuditOption,
  type AuditRecommendation,
} from '../../../supabase/functions/_shared/company-audit-offers';
import architectLogo from '@/assets/architect-logo.jpg';
import leakAuditIntro from '@/assets/leak-audit-intro.mp4';
import { ClickToPlayVideo } from '@/components/ClickToPlayVideo';
import { generateFreeLeakCheckPdf } from '@/lib/generateFreeLeakCheckPdf';

// 14 questions across 4 categories. Each scored 0–4 (Never → Always systemized).
interface Q {
  id: string;
  cat: 'capture' | 'response' | 'drag' | 'trust';
  text: string;
}

const QUESTIONS: Q[] = [
  // Lead Capture (4)
  { id: 'q1', cat: 'capture', text: 'Every inbound channel (form, phone, email, DM, walk-in) lands in a single tracked system.' },
  { id: 'q2', cat: 'capture', text: 'You can name your top 3 lead sources by revenue this quarter — not just by volume.' },
  { id: 'q3', cat: 'capture', text: 'Every lead is tagged with source on capture, automatically.' },
  { id: 'q4', cat: 'capture', text: 'Zero leads are routed to a single human inbox (Gmail/Outlook) with no backup.' },
  // Response & Follow-Up (4)
  { id: 'q5', cat: 'response', text: 'New inbound leads receive a real human or auto-response in under 5 minutes during business hours.' },
  { id: 'q6', cat: 'response', text: 'Every quoted/proposed deal has a scheduled second touch within 72 hours — without anyone remembering to do it.' },
  { id: 'q7', cat: 'response', text: 'You have a defined cadence for follow-ups beyond the second touch (Day 7, 14, 30…).' },
  { id: 'q8', cat: 'response', text: 'You can pull a list right now of every "stalled" deal older than 14 days with no activity.' },
  // Operational Drag (3)
  { id: 'q9', cat: 'drag', text: 'No single person is the bottleneck for invoicing, scheduling, or client onboarding.' },
  { id: 'q10', cat: 'drag', text: 'Repeated tasks (reports, status updates, intake forms) are automated, not retyped weekly.' },
  { id: 'q11', cat: 'drag', text: 'Your team can find any client document or past quote in under 60 seconds.' },
  // Trust & Conversion (3)
  { id: 'q12', cat: 'trust', text: 'Your website tells a visitor exactly what you do, who it\'s for, and what to do next within 5 seconds.' },
  { id: 'q13', cat: 'trust', text: 'Pricing, process, or "what happens next" is visible — not hidden behind a contact form.' },
  { id: 'q14', cat: 'trust', text: 'Visible proof (case studies, names, numbers, real results) backs every major claim on the site.' },
];

const CATS = {
  capture: { label: 'Lead Capture', max: 16 },
  response: { label: 'Response & Follow-Up', max: 16 },
  drag: { label: 'Operational Drag', max: 12 },
  trust: { label: 'Trust & Conversion', max: 12 },
} as const;

const REVENUE_BANDS: { value: string; label: string; midpoint: number }[] = [
  { value: 'sub_500k', label: 'Under $500K', midpoint: 250_000 },
  { value: '500k_1m', label: '$500K – $1M', midpoint: 750_000 },
  { value: '1m_3m', label: '$1M – $3M', midpoint: 2_000_000 },
  { value: '3m_10m', label: '$3M – $10M', midpoint: 6_000_000 },
  { value: '10m_plus', label: '$10M+', midpoint: 15_000_000 },
];

const SCALE = [
  { v: 0, label: 'Never' },
  { v: 1, label: 'Rarely' },
  { v: 2, label: 'Sometimes' },
  { v: 3, label: 'Mostly' },
  { v: 4, label: 'Always' },
];

type Step = 'intake' | 'questions' | 'gate' | 'result';
type PersonalizedAudit = {
  company: string;
  domain: string;
  repeated: boolean;
  recommendations: AuditRecommendation[];
  options: AuditOption[];
  exposure: AuditExposureEstimate;
  // A local preview is never described as a saved company baseline or queued scan.
  localOnly?: boolean;
};

export const LeakAuditFlow: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const [step, setStep] = useState<Step>('intake');
  const [revenueBand, setRevenueBand] = useState<string>('');
  const [website, setWebsite] = useState('');
  const [personalized, setPersonalized] = useState<PersonalizedAudit | null>(null);
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [qIndex, setQIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const currentQ = QUESTIONS[qIndex];
  const totalQs = QUESTIONS.length;
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === totalQs;

  const handleAnswer = (v: number) => {
    setAnswers((a) => ({ ...a, [currentQ.id]: v }));
    if (qIndex < totalQs - 1) {
      setTimeout(() => setQIndex((i) => i + 1), 120);
    }
  };

  const handleStartQuestions = () => {
    if (!revenueBand) {
      toast.error('Pick a revenue band first.');
      return;
    }
    try { normalizePublicCompanyUrl(website); }
    catch { toast.error('Enter a valid public business website.'); return; }
    setStep('questions');
  };

  const handleSubmitGate = async () => {
    if (!email || !email.includes('@')) {
      toast.error("Enter a valid email address.");
      return;
    }
    if (!allAnswered) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('company-leak-audit', {
        body: { website, company, name, email, revenueBand, answers },
      });
      if (error || !Array.isArray(data?.recommendations) || !Array.isArray(data?.options)) {
        throw new Error((data as { error?: string } | null)?.error || error?.message || 'Unable to save assessment.');
      }
      const serverExposure = data?.exposure && typeof data.exposure.healthScore === 'number'
        ? data.exposure as AuditExposureEstimate
        : modelCompanyAuditExposure(answers, revenueBand);
      setPersonalized({
        company: data.company,
        domain: data.domain,
        repeated: data.repeated === true,
        recommendations: data.recommendations,
        options: data.options,
        exposure: serverExposure,
        localOnly: false,
      });
      setStep('result');
      toast.success('Your company recommendations and individual prices are ready.');
    } catch (err) {
      // The newer server endpoint and database migration may not yet be deployed.
      // Preserve a useful, deterministic no-cost result without making a scan,
      // saving personal data, or claiming this is the canonical company baseline.
      console.error('Company Leak Check backend unavailable', err);
      try {
        const target = normalizePublicCompanyUrl(website);
        setPersonalized({
          company: company.trim() || target.domain,
          domain: target.domain,
          repeated: false,
          recommendations: evaluateCompanyAudit(answers),
          options: AUDIT_OPTIONS,
          exposure: modelCompanyAuditExposure(answers, revenueBand),
          localOnly: true,
        });
        setStep('result');
        toast.warning('The assessment service is unavailable. Showing a local preview; your details were not confirmed saved.');
      } catch (fallbackError) {
        console.error('Company Leak Check fallback failed', fallbackError);
        toast.error('Could not prepare your results. Try again or contact Aetheris.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const downloadResults = () => {
    if (!personalized) return;
    const revenueBandLabel = REVENUE_BANDS.find((band) => band.value === revenueBand)?.label || revenueBand;
    generateFreeLeakCheckPdf({
      company: personalized.company,
      domain: personalized.domain,
      email,
      revenueBandLabel,
      exposure: personalized.exposure,
      recommendations: personalized.recommendations,
    });
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* INTAKE */}
      {step === 'intake' && (
        <div className="space-y-8">
          <div className="text-center">
            {!embedded && (
              <div className="flex justify-center mb-6">
                <ClickToPlayVideo
                  videoSrc={leakAuditIntro}
                  posterSrc={architectLogo}
                  alt="The Architect — watch the Leak Audit intro"
                  className="w-full max-w-2xl aspect-video rounded-xl overflow-hidden border border-amber/30 shadow-[0_0_40px_-12px_hsl(var(--amber)/0.5)]"
                />
              </div>
            )}
            <div className="inline-flex items-center gap-2 font-case text-[10px] uppercase tracking-widest text-amber mb-3 px-3 py-1 border border-amber/30 rounded-sm">
              Free Self-Audit · ~6 minutes
            </div>
            {embedded ? (
              <h2 className="font-forensic text-3xl md:text-4xl font-bold text-foreground leading-[1.05] mb-5">
                The Leak Audit<sup className="text-xl text-amber">™</sup>
              </h2>
            ) : (
              <h1 className="font-forensic text-4xl md:text-6xl font-bold text-foreground leading-[1.05] mb-5">
                The Leak Audit<sup className="text-2xl text-amber">™</sup>
              </h1>
            )}
            <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              Enter your company website and answer 14 operational questions. See the
              gaps your answers suggest, practical solutions, and individual prices.
              A full Golden Report is processed separately for internal review, subject to scan capacity.
            </p>
          </div>

          <div id="leak-audit-start" className="glass rounded-lg border border-border/60 p-6 md:p-8 space-y-5 scroll-mt-28">
            <div>
              <Label htmlFor="audit-website" className="font-case text-[10px] uppercase tracking-widest text-muted-foreground">
                Company website <span className="text-amber">*</span>
              </Label>
              <Input
                id="audit-website"
                type="url"
                inputMode="url"
                autoComplete="url"
                placeholder="https://yourcompany.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="mt-2"
                required
              />
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Your domain identifies a single company baseline. Repeat submissions for the same
                company use the original recommendation set. The full forensic report remains
                in our private internal library and is not included with the free results.
              </p>
            </div>
            <div>
              <Label className="font-case text-[10px] uppercase tracking-widest text-muted-foreground">
                Annual Revenue Band
              </Label>
              <div className="grid sm:grid-cols-3 gap-2 mt-2">
                {REVENUE_BANDS.map((b) => (
                  <button
                    key={b.value}
                    onClick={() => setRevenueBand(b.value)}
                    className={`px-3 py-3 rounded-md border text-sm font-medium transition-all ${
                      revenueBand === b.value
                        ? 'border-amber bg-amber/10 text-amber'
                        : 'border-border/60 text-muted-foreground hover:border-amber/40 hover:text-foreground'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2 italic">
                Context for our internal analysis. We do not invent a verified dollar loss from these answers.
              </p>
            </div>

            <Button
              onClick={handleStartQuestions}
              size="lg"
              className="w-full bg-amber text-primary-foreground hover:bg-amber/90"
            >
              Begin the Audit
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* QUESTIONS */}
      {step === 'questions' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="font-case text-xs uppercase tracking-widest text-muted-foreground">
              Question {qIndex + 1} / {totalQs}
            </div>
            <div className="font-case text-xs uppercase tracking-widest text-amber">
              {CATS[currentQ.cat].label}
            </div>
          </div>

          <div className="h-1 bg-border/40 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber transition-all"
              style={{ width: `${((qIndex + 1) / totalQs) * 100}%` }}
            />
          </div>

          <div className="glass rounded-lg border border-border/60 p-6 md:p-8 min-h-[280px] flex flex-col justify-between">
            <p className="font-forensic text-2xl md:text-3xl text-foreground leading-snug mb-6">
              {currentQ.text}
            </p>
            <div className="grid grid-cols-5 gap-2">
              {SCALE.map((s) => {
                const selected = answers[currentQ.id] === s.v;
                return (
                  <button
                    key={s.v}
                    onClick={() => handleAnswer(s.v)}
                    className={`px-2 py-3 rounded-md border text-xs font-medium transition-all ${
                      selected
                        ? 'border-amber bg-amber/15 text-amber'
                        : 'border-border/60 text-muted-foreground hover:border-amber/40 hover:text-foreground'
                    }`}
                  >
                    <div className="font-case text-[10px] mb-1">{s.v}</div>
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQIndex((i) => Math.max(0, i - 1))}
              disabled={qIndex === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            {qIndex < totalQs - 1 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQIndex((i) => Math.min(totalQs - 1, i + 1))}
                disabled={answers[currentQ.id] === undefined}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => setStep('gate')}
                disabled={!allAnswered}
                className="bg-amber text-primary-foreground hover:bg-amber/90"
              >
                See My Leaks
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* EMAIL GATE */}
      {step === 'gate' && allAnswered && (
        <div className="space-y-6">
          <div className="text-center">
            <div className="inline-flex justify-center gap-2 rounded-full border border-amber/40 px-3 py-1 font-case text-xs uppercase tracking-widest text-amber">
              <ShieldCheck className="h-4 w-4" /> Your company assessment
            </div>
            <h2 className="mt-4 font-forensic text-3xl font-bold md:text-5xl">
              View your fixes and individual prices.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              This is based on your self-reported answers, not a verified ROI claim.
              Your Free Leak Check includes a downloadable findings PDF and a modeled annual exposure range.
              Any separate Golden Report created internally by Aetheris remains private.
            </p>
          </div>
          <div className="glass space-y-4 rounded-lg border border-amber/35 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="name">Your name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Your name" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="company">Company name</Label>
                <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)}
                  placeholder="Company name" className="mt-1" />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email <span className="text-amber">*</span></Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com" className="mt-1" required />
            </div>
            <Button size="lg" onClick={handleSubmitGate} disabled={submitting}
              className="w-full bg-amber text-background">
              {submitting ? "Saving your company baseline..." : "See My Findings + PDF"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <p className="text-xs leading-relaxed text-muted-foreground">
              We attempt to securely save your answers and contact details for follow-up.
              If our assessment service is unavailable, you'll still see an unsaved local preview.
              No automatic purchase or payment occurs.
            </p>
          </div>
        </div>
      )}

      {/* RESULT */}
      {step === 'result' && personalized && (
        <div className="space-y-8">
          {personalized.localOnly && (
            <div role="status" className="rounded-lg border border-amber/60 bg-amber/10 p-5 text-sm leading-relaxed">
              <p className="font-semibold text-foreground">Preview only — not saved to Aetheris</p>
              <p className="mt-2 text-muted-foreground">
                Our assessment service couldn't confirm your submission. These suggestions were calculated
                locally from your answers. No private Golden Report was queued, and this is not an archived
                company baseline. You can still select services below and request a tailored review.
              </p>
              <a
                href={"mailto:aetheris.technology@outlook.com?subject=" + encodeURIComponent("Leak Check review for " + personalized.domain)}
                className="mt-3 inline-block font-semibold text-amber underline underline-offset-4"
              >
                Request an operator review by email
              </a>
            </div>
          )}
          <div className="text-center">
            <p className="font-case text-[10px] uppercase tracking-[0.25em] text-amber">
              {personalized.localOnly ? "Local preview" : "Company assessment"} · {personalized.domain}
            </p>
            <h2 className="mt-4 font-forensic text-3xl font-bold md:text-5xl">
              What needs attention. What fixes it.
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              {personalized.localOnly
                ? "This is a local preview from your answers. Recommendations and prices haven't been saved to a company record."
                : personalized.repeated
                  ? "This company has already been assessed. The original baseline has been reused instead of changing your recommendations with each submission."
                  : "These are directional gaps suggested by the company's answers. They are not proof of a verified website issue or actual lost revenue."}
            </p>
          </div>
          <div className="glass rounded-xl border border-amber/35 p-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <p className="font-case text-[10px] uppercase tracking-widest text-amber">Self-reported business health</p>
                <p className="mt-2 font-forensic text-4xl font-bold">{personalized.exposure.healthScore}<span className="text-lg text-muted-foreground">/100</span></p>
              </div>
              <div>
                <p className="font-case text-[10px] uppercase tracking-widest text-amber">Modeled annual exposure</p>
                <p className="mt-2 font-forensic text-2xl font-bold">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(personalized.exposure.annualLow)}
                  {' – '}
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(personalized.exposure.annualHigh)}
                </p>
              </div>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{personalized.exposure.basis}</p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" onClick={downloadResults} className="border-amber/40 text-amber hover:bg-amber/10">
                <Download className="mr-2 h-4 w-4" /> Download My Findings PDF
              </Button>
              <span className="text-[11px] text-muted-foreground">Directional model only. Not verified lost revenue.</span>
            </div>
          </div>
          <div className="space-y-3">
            {personalized.recommendations.length ? personalized.recommendations.map((finding, i) => (
              <div key={finding.id} className="glass rounded-lg border border-border/60 p-5">
                <p className="font-mono text-[10px] uppercase tracking-widest text-amber">
                  Priority {String(i + 1).padStart(2, '0')} · Self-reported gap
                </p>
                <h3 className="mt-2 font-forensic text-xl font-bold">{finding.problem}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  <strong className="text-foreground">Recommended fix:</strong> {finding.fix}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">{finding.reason}</p>
              </div>
            )) : (
              <div className="rounded-lg border border-border/60 p-6 text-sm text-muted-foreground">
                Your responses didn't indicate a major gap under our screening thresholds.
                You can still choose specific services below or request a deeper review.
              </div>
            )}
          </div>
          <AuditCustomQuote key={personalized.domain}
            options={personalized.options}
            recommendations={personalized.recommendations}
            company={personalized.company}
            repeated={personalized.repeated}
            localOnly={personalized.localOnly}
            savings={{ low: personalized.exposure.annualLow, high: personalized.exposure.annualHigh }}
          />
          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            {personalized.localOnly
              ? "No private scan was requested from this local preview. An operator can discuss a full Golden Report separately."
              : "A separate internal Golden Report may be queued, subject to capacity and system availability. It isn't delivered through this page."}
          </p>
        </div>
      )}
    </div>
  );
};

export default LeakAuditFlow;
