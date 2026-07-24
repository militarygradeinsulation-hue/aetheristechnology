import React, { useMemo, useState } from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';
import { CaseFileCard } from '@/components/CaseFileCard';
import { ClickToPlayVideo } from '@/components/ClickToPlayVideo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, Download, Mail, AlertTriangle, ChevronLeft, ChevronRight, CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { generateLeakAuditPdf, type LeakAuditCategoryResult } from '@/lib/generateLeakAuditPdf';
import architectLogo from '@/assets/architect-logo.jpg';
import leakAuditIntro from '@/assets/leak-audit-intro.mp4';
import { StripeEmbeddedCheckout } from '@/components/StripeEmbeddedCheckout';

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

const CAT_DIAGNOSIS: Record<string, { strong: string; weak: string; leaks: string[] }> = {
  capture: {
    strong: 'Lead capture is operationally tight. Sources are tagged, channels are unified, and nothing is dying in someone\'s personal inbox.',
    weak: 'Lead capture is leaking. Inbound is fragmented across inboxes, channels, and humans — meaning leads are being lost before anyone even knows they arrived.',
    leaks: [
      'Single Inbox Leak — leads landing in one human\'s Gmail with no routing or backup',
      'Untagged Source Leak — you can\'t prove which channel actually drives revenue, so spend allocation is guesswork',
      'Channel Blindspot — at least one inbound channel (DM, phone, walk-in, form) is not in your CRM',
    ],
  },
  response: {
    strong: 'Response cadence is disciplined. Speed-to-lead and second-touch coverage are systematized, not memory-based.',
    weak: 'Response is bleeding. Speed-to-lead and follow-up are memory-driven — which means most leads die in the first 72 hours and stalled deals never get reactivated.',
    leaks: [
      'Speed-to-Lead Leak — first response averaging hours instead of minutes (industry norm: 5x close rate at <5min)',
      'Stale Lead Leak — proposals over 14 days old with zero activity, no automated reactivation',
      'Quote Follow-Up Gap — priced opportunities never touched after Day 3 (typically 60-80% of proposals)',
    ],
  },
  drag: {
    strong: 'Operations run on systems, not heroics. The owner is not a single point of failure on weekly tasks.',
    weak: 'Operational drag is dragging the entire P&L. Repeated work is being retyped, key people are bottlenecks, and "the way we do it here" lives in someone\'s head.',
    leaks: [
      'Owner Bottleneck Leak — at least one critical workflow (quotes, invoicing, scheduling) waits on a single person',
      'Re-Type Tax — the same data is keyed into 2+ systems weekly with no integration',
      'Document Hunt Leak — staff hours/week burned hunting for past quotes, contracts, or files',
    ],
  },
  trust: {
    strong: 'Trust signals are intentional. Visitors get clarity in seconds and proof at every claim.',
    weak: 'The site is sending mixed signals. Visitors can\'t answer "what do you do, for who, what happens next" in 5 seconds — which kills conversion before any sales touch.',
    leaks: [
      '5-Second Clarity Gap — value proposition not legible above the fold',
      'Hidden Process Leak — pricing/process buried behind a contact form, killing self-qualifying buyers',
      'Unbacked Claim Leak — major claims with no visible proof, eroding credibility silently',
    ],
  },
};

type LeakAuditTier = {
  name: string;
  price: string;
  cadence: string;
  blurb: string;
  includes: string[];
  cta: string;
  highlight: boolean;
  free?: boolean;
  badge?: string;
  flagship?: boolean;
  priceId?: string;
};

const LEAK_AUDIT_TIERS: LeakAuditTier[] = [
  {
    name: 'Free Self-Scan',
    price: '$0',
    cadence: '~6 min · self-serve',
    blurb: 'The 14-question audit. Directional PDF, no operator time.',
    includes: ['14-question forensic quiz', 'Estimated annual leak $', 'Case-file PDF download'],
    cta: 'Start Free Audit',
    highlight: false,
    free: true,
  },
  {
    name: 'Signal Pack',
    price: '$2,500',
    cadence: 'one-time · ~6 hrs operator',
    blurb: 'Operator-led confirmation of what the self-scan flagged.',
    includes: ['Website Report', 'Brand Contradiction Finder', 'Friction Vocabulary Audit', 'Leak Findings memo', '30-min walkthrough'],
    cta: 'Buy Signal Pack',
    highlight: false,
    priceId: 'leak_signal_pack_onetime',
  },
  {
    name: 'Revenue Pack',
    price: '$5,000',
    cadence: 'one-time · ~14 hrs',
    blurb: 'Most operators pick this. Fix-it-yourself system in a box.',
    includes: ['Everything in Signal Pack', 'Sales Script Pack', 'Follow-Up Plan', 'Strategic Question Engine', '30-Day Content Calendar', 'Two 45-min sessions'],
    cta: 'Buy Revenue Pack',
    highlight: true,
    badge: 'Most Picked',
    priceId: 'leak_revenue_pack_onetime',
  },
  {
    name: 'Operator Suite',
    price: '$10,000',
    cadence: 'one-time · ~30 hrs / 3 wks',
    blurb: 'Full playbook + tech suite. Credits 1:1 toward the Retainer.',
    includes: ['Everything in Revenue Pack', 'Strategy Blueprint', 'Social Content Pack', 'Digital Snapshot', 'Lead-Nurture Automation', 'Tech Suite access'],
    cta: 'Buy Operator Suite',
    highlight: false,
    priceId: 'leak_operator_suite_onetime',
  },
  {
    name: '21-Day Diagnostic',
    price: '$18,500',
    cadence: 'flagship · 21 days',
    blurb: 'Operator inside your business for 21 days. Full quantified leak ledger.',
    includes: ['Everything above', 'Quantified leak ledger ($ per leak)', 'Implementation plan handoff', 'Required before Active Case ($15K/mo)', 'Fit call required'],
    cta: 'Buy 21-Day Diagnostic',
    highlight: false,
    badge: 'Flagship',
    flagship: true,
    priceId: 'leak_21_day_diagnostic_onetime',
  },
];

type Step = 'intake' | 'questions' | 'gate' | 'result';

const LeakAuditPage = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [step, setStep] = useState<Step>('intake');
  const [revenueBand, setRevenueBand] = useState<string>('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [qIndex, setQIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutTier, setCheckoutTier] = useState<{ name: string; priceId: string } | null>(null);

  const currentQ = QUESTIONS[qIndex];
  const totalQs = QUESTIONS.length;
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === totalQs;

  const result = useMemo(() => {
    if (!allAnswered) return null;
    const totalScore = Object.values(answers).reduce((a, b) => a + b, 0);
    const maxScore = QUESTIONS.length * 4;
    const pct = (totalScore / maxScore) * 100;

    // Inverted: lower score = bigger leak
    const leakRatio = 1 - pct / 100;
    const band = REVENUE_BANDS.find((b) => b.value === revenueBand) || REVENUE_BANDS[2];
    // Multiplier: businesses lose 8–22% of revenue to leaks. Map score → that range.
    const leakPctOfRevenue = 0.08 + leakRatio * 0.14;
    const estimatedAnnualLeak = Math.round((band.midpoint * leakPctOfRevenue) / 1000) * 1000;

    const severity: 'CRITICAL' | 'ACTIVE' | 'MINOR' =
      pct < 50 ? 'CRITICAL' : pct < 75 ? 'ACTIVE' : 'MINOR';

    const categories: LeakAuditCategoryResult[] = (Object.keys(CATS) as Array<keyof typeof CATS>).map((key) => {
      const qs = QUESTIONS.filter((q) => q.cat === key);
      const score = qs.reduce((a, q) => a + (answers[q.id] || 0), 0);
      const max = CATS[key].max;
      const cPct = Math.round((score / max) * 100);
      const isWeak = cPct < 65;
      return {
        key,
        label: CATS[key].label,
        score,
        max,
        pct: cPct,
        diagnosis: isWeak ? CAT_DIAGNOSIS[key].weak : CAT_DIAGNOSIS[key].strong,
        topLeaks: CAT_DIAGNOSIS[key].leaks,
      };
    });

    return { totalScore, maxScore, pct, severity, estimatedAnnualLeak, categories };
  }, [allAnswered, answers, revenueBand]);

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
    setStep('questions');
  };

  const scrollToAuditStart = () => {
    document.getElementById('leak-audit-start')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openTierCheckout = (tier: { name: string; priceId?: string }) => {
    if (!tier.priceId) return;
    setCheckoutTier({ name: tier.name, priceId: tier.priceId });
    setTimeout(() => document.getElementById('leak-audit-checkout')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const pricingLadder = (context: 'intro' | 'result') => (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <div className="font-case text-[10px] uppercase tracking-widest text-muted-foreground">
          Actual Leak Audit Offers
        </div>
        <h2 className="font-forensic text-2xl md:text-4xl font-bold text-foreground">
          Pick the depth. Buy the package. Run the recovery.
        </h2>
        <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
          Every paid tier applies 1:1 toward the next. Start free, or buy the operator-led package now.
        </p>
      </div>

      {checkoutTier && (
        <div id="leak-audit-checkout" className="glass rounded-lg border border-amber/40 p-5 md:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="font-case text-[10px] uppercase tracking-widest text-amber">Secure Checkout</div>
              <h3 className="font-forensic text-2xl font-bold text-foreground">{checkoutTier.name}</h3>
            </div>
            <Button variant="outline" size="sm" onClick={() => setCheckoutTier(null)}>
              Close
            </Button>
          </div>
          <StripeEmbeddedCheckout
            priceId={checkoutTier.priceId}
            customerEmail={email || undefined}
            returnUrl={`${window.location.origin}/leak-audit?status=paid&session_id={CHECKOUT_SESSION_ID}`}
            metadata={{ source: 'leak_audit', package: checkoutTier.name, company: company || '' }}
          />
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-3">
        {LEAK_AUDIT_TIERS.map((tier) => (
          <div
            key={tier.name}
            className={`glass rounded-lg p-4 flex flex-col relative border ${
              tier.highlight
                ? 'border-amber shadow-[0_0_24px_-8px_hsl(var(--amber)/0.6)]'
                : tier.flagship
                  ? 'border-crimson/50'
                  : 'border-border/60'
            }`}
          >
            {tier.badge && (
              <div className={`absolute -top-2 left-1/2 -translate-x-1/2 font-case text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-sm ${tier.flagship ? 'bg-crimson text-primary-foreground' : 'bg-amber text-primary-foreground'}`}>
                {tier.badge}
              </div>
            )}
            <div className="font-case text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
              {tier.name}
            </div>
            <div className={`font-forensic text-3xl font-bold mb-1 ${tier.highlight ? 'text-amber' : tier.flagship ? 'text-crimson' : 'text-foreground'}`}>
              {tier.price}
            </div>
            <div className="font-case text-[10px] uppercase tracking-wider text-muted-foreground mb-3">
              {tier.cadence}
            </div>
            <p className="text-xs text-muted-foreground mb-3">{tier.blurb}</p>
            <ul className="space-y-1.5 mb-4 flex-1">
              {tier.includes.map((item) => (
                <li key={item} className="text-xs text-foreground/80 flex gap-1.5">
                  <span className="text-amber shrink-0">›</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            {tier.free ? (
              <Button variant="outline" size="sm" onClick={scrollToAuditStart}>
                {context === 'result' ? 'Run Again' : tier.cta}
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => openTierCheckout(tier)}
                className={tier.highlight ? 'bg-amber text-primary-foreground hover:bg-amber/90' : ''}
                variant={tier.highlight ? 'default' : 'outline'}
              >
                <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                {tier.cta}
              </Button>
            )}
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground italic pt-2">
        Paid packages are operator-led. The 21-Day Diagnostic is the gate to the $15K/mo Active Case.
      </p>
    </div>
  );

  const handleSubmitGate = async () => {
    if (!email || !email.includes('@')) {
      toast.error('Drop a real email — that\'s where the report goes.');
      return;
    }
    if (!result) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('assessment_leads').insert({
        email,
        name: name || null,
        company: company || null,
        score: result.totalScore,
        answers: {
          source: 'leak_audit',
          revenueBand,
          estimatedAnnualLeak: result.estimatedAnnualLeak,
          severity: result.severity,
          answers,
        } as any,
      });
      if (error) throw error;

      generateLeakAuditPdf({
        name,
        company,
        email,
        revenueBand: REVENUE_BANDS.find((b) => b.value === revenueBand)?.label || '',
        estimatedAnnualLeak: result.estimatedAnnualLeak,
        severity: result.severity,
        totalScore: result.totalScore,
        maxScore: result.maxScore,
        categories: result.categories,
      });

      setStep('result');
      toast.success('Leak Audit downloaded. Check your downloads folder.');
    } catch (err: any) {
      console.error(err);
      toast.error('Could not save your audit. Try again or call (317) 376-2110.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="The Leak Audit™ — Free Business Forensics Self-Scan | Aetheris"
        description="Run the free 14-point Leak Audit. Find where your business is bleeding revenue across lead capture, follow-up, operations, and trust. Estimated annual leak in $."
        path="/leak-audit"
        keywords="business leak audit, revenue leak assessment, business forensics audit, sales leak finder, operational diagnostic, AI consulting Indianapolis"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'The Leak Audit', path: '/leak-audit' },
        ]}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />

        <main className="pt-28 pb-16 px-4">
          <div className="max-w-3xl mx-auto">
            {/* INTAKE */}
            {step === 'intake' && (
              <div className="space-y-8">
                <div className="text-center">
                  <div className="flex justify-center mb-6">
                    <ClickToPlayVideo
                      videoSrc={leakAuditIntro}
                      posterSrc={architectLogo}
                      alt="The Architect — watch the Leak Audit intro"
                      circle
                      className="w-64 h-64 md:w-80 md:h-80"
                    />
                  </div>
                  <div className="inline-flex items-center gap-2 font-case text-[10px] uppercase tracking-widest text-amber mb-3 px-3 py-1 border border-amber/30 rounded-sm">
                    Free Self-Audit · ~6 minutes
                  </div>
                  <h1 className="font-forensic text-4xl md:text-6xl font-bold text-foreground leading-[1.05] mb-5">
                    The Leak Audit<sup className="text-2xl text-amber">™</sup>
                  </h1>
                  <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                    14 questions. We name where your business is leaking and put a real annual dollar figure on it.
                    PDF case file, downloadable when you're done.
                  </p>
                </div>

                {pricingLadder('intro')}

                <div id="leak-audit-start" className="glass rounded-lg border border-border/60 p-6 md:p-8 space-y-5 scroll-mt-28">
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
                      Used to scale the leak estimate. Stays private.
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

                <div className="grid sm:grid-cols-2 gap-3">
                  <CaseFileCard
                    caseNumber={47}
                    businessType="$4M services firm"
                    leakFound="Inbound dying in one Gmail inbox."
                    amountBled="$380K / yr"
                  />
                  <CaseFileCard
                    caseNumber={62}
                    businessType="Regional B2B SaaS"
                    leakFound="73% of quotes never followed up after Day 3."
                    amountBled="$610K / yr"
                  />
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
            {step === 'gate' && result && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 font-case text-[10px] uppercase tracking-widest text-crimson mb-3 px-3 py-1 border border-crimson/40 rounded-sm">
                    <AlertTriangle className="w-3 h-3" />
                    Findings Ready
                  </div>
                  <h2 className="font-forensic text-3xl md:text-5xl font-bold text-foreground mb-3">
                    The audit found leaks.
                  </h2>
                  <p className="text-muted-foreground text-lg">
                    Drop your email — your case file PDF downloads now and a copy hits your inbox.
                  </p>
                </div>

                <div className="glass rounded-lg border border-crimson/40 p-6 text-center">
                  <div className="font-case text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                    Estimated Annual Leak
                  </div>
                  <div className="font-forensic text-5xl md:text-6xl font-bold text-crimson mb-2">
                    ${result.estimatedAnnualLeak.toLocaleString()}
                  </div>
                  <div className="font-case text-xs uppercase tracking-widest text-muted-foreground">
                    Severity: <span className="text-crimson">{result.severity}</span> · Score: {result.totalScore}/{result.maxScore}
                  </div>
                </div>

                <div className="glass rounded-lg border border-border/60 p-6 md:p-8 space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name" className="font-case text-[10px] uppercase tracking-widest text-muted-foreground">
                        Name
                      </Label>
                      <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="company" className="font-case text-[10px] uppercase tracking-widest text-muted-foreground">
                        Company
                      </Label>
                      <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company" className="mt-1" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="email" className="font-case text-[10px] uppercase tracking-widest text-muted-foreground">
                      Email <span className="text-crimson">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="mt-1"
                      required
                    />
                  </div>
                  <Button
                    onClick={handleSubmitGate}
                    disabled={submitting}
                    size="lg"
                    className="w-full bg-amber text-primary-foreground hover:bg-amber/90"
                  >
                    {submitting ? 'Generating case file…' : (
                      <>
                        <Download className="mr-2 w-4 h-4" />
                        Download My Leak Audit
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground italic">
                    No spam. We send the report once. Unsubscribe anytime.
                  </p>
                </div>
              </div>
            )}

            {/* RESULT */}
            {step === 'result' && result && (
              <div className="space-y-8">
                <div className="text-center">
                  <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-3">
                    Case File Sealed
                  </div>
                  <h2 className="font-forensic text-3xl md:text-5xl font-bold text-foreground mb-3">
                    Your audit is downloaded.
                  </h2>
                  <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                    The PDF is in your downloads. Here's the headline finding — and the next step.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {result.categories.map((c) => (
                    <CaseFileCard
                      key={c.key}
                      caseNumber={c.key.toUpperCase()}
                      businessType={c.label}
                      leakFound={c.diagnosis}
                      amountBled={`${c.pct}% sealed`}
                      status={c.pct >= 75 ? 'SEALED' : 'ACTIVE'}
                    />
                  ))}
                </div>

                <div className="glass rounded-lg border border-amber/40 p-8 text-center space-y-4">
                  <div className="font-case text-[10px] uppercase tracking-widest text-amber">
                    Next Step
                  </div>
                  <h3 className="font-forensic text-3xl md:text-4xl font-bold text-foreground">
                    The Forensic Diagnostic — $2,500
                  </h3>
                  <p className="text-muted-foreground max-w-xl mx-auto">
                    The Leak Audit was self-reported. The Forensic Diagnostic is the operator-led
                    investigation: 14 days inside your operation, every leak named, every dollar quantified.
                    <strong className="text-foreground"> Applied toward engagement if you proceed.</strong>
                  </p>
                  {!checkoutTier ? (
                    <>
                      <Button
                        size="lg"
                        onClick={() => openTierCheckout({ name: 'Signal Pack', priceId: 'leak_signal_pack_onetime' })}
                        className="bg-amber text-primary-foreground hover:bg-amber/90"
                      >
                        Pay $2,500 & Book the Signal Pack
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                      <div className="pt-2">
                        <a
                          href="/book"
                          className="text-sm text-muted-foreground hover:text-amber transition-colors inline-flex items-center gap-1"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          Or book a 15-min walkthrough first
                        </a>
                      </div>
                    </>
                  ) : (
                    <div className="pt-4 text-left">
                      <StripeEmbeddedCheckout
                        priceId={checkoutTier.priceId}
                        customerEmail={email || undefined}
                        returnUrl={`${window.location.origin}/leak-audit?status=paid&session_id={CHECKOUT_SESSION_ID}`}
                        metadata={{ source: 'leak_audit', package: checkoutTier.name, company: company || '' }}
                      />
                      <div className="text-center pt-3">
                        <button
                          onClick={() => setCheckoutTier(null)}
                          className="text-xs text-muted-foreground hover:text-amber underline"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Full pricing ladder — Ways to run the audit */}
                {pricingLadder('result')}

              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default LeakAuditPage;
