import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ChevronRight, Download, Mail, Loader2, CheckCircle, RotateCcw, Sparkles, Target, TrendingDown, Settings, Rocket } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Consolidated to 4 high-signal categories — keeps the "no fluff" promise
const ISSUE_CATEGORIES = [
  {
    id: 'brand-digital',
    label: 'Brand & Digital Presence',
    sublabel: 'Website, messaging, conversion',
    icon: Target,
    issues: [
      'Website looks outdated or unprofessional',
      'Customers do not understand what we do',
      'Visitors land but never convert',
      'Brand sounds like everyone else',
      'Messaging does not match the quality of our work',
    ],
  },
  {
    id: 'marketing-sales',
    label: 'Marketing & Sales Pipeline',
    sublabel: 'Leads, follow-up, close rate',
    icon: TrendingDown,
    issues: [
      'Spending on ads with no measurable ROI',
      'No idea where leads actually come from',
      'Leads go cold — follow-up is too slow or inconsistent',
      'No repeatable sales process',
      'Losing deals to cheaper competitors',
    ],
  },
  {
    id: 'operations-crm',
    label: 'Operations & CRM Systems',
    sublabel: 'Workflow, automation, data',
    icon: Settings,
    issues: [
      'CRM is a mess or does not exist',
      'Team is doing busywork instead of revenue work',
      'Everything is manual — no automation',
      'Data lives in spreadsheets and sticky notes',
      'Cannot track what is actually working',
    ],
  },
  {
    id: 'growth-strategy',
    label: 'Growth & Strategic Direction',
    sublabel: 'Scale, leadership, focus',
    icon: Rocket,
    issues: [
      'Revenue is stuck and we cannot break through',
      'Leadership is the bottleneck',
      'Tried everything — nothing moves the needle',
      'Do not know which problem to solve first',
      'Need a real strategy, not more tactics',
    ],
  },
];

interface Recommendation {
  diagnosis: string;
  urgentFix: string;
  recommendedPackage: {
    name: string;
    price: string;
    description: string;
    whyThisFits: string;
  };
  additionalServices: { name: string; price: string; reason: string }[];
  estimatedRevenueLeak: string;
  nextStep: string;
}

export const WhatsWrongDiagnostic: React.FC = () => {
  const { toast } = useToast();
  const [step, setStep] = useState<'pick' | 'notes' | 'loading' | 'results'>('pick');
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const toggleIssue = (issue: string) => {
    setSelectedIssues(prev =>
      prev.includes(issue) ? prev.filter(i => i !== issue) : [...prev, issue]
    );
  };

  const handleAnalyze = async () => {
    if (selectedIssues.length === 0) {
      toast({ title: 'Pick at least one issue', variant: 'destructive' });
      return;
    }
    setStep('loading');
    try {
      const { data, error } = await supabase.functions.invoke('diagnose-whats-wrong', {
        body: { issues: selectedIssues, notes: notes.trim() },
      });
      if (error) throw error;
      setRecommendation(data);
      setStep('results');
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch {
      toast({ title: 'Analysis failed', description: 'Please try again.', variant: 'destructive' });
      setStep('notes');
    }
  };

  const handleDownload = () => {
    if (!recommendation) return;
    const text = buildPlainText(recommendation, selectedIssues);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aetheris-recommendation.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleEmail = async () => {
    if (!emailInput.trim() || !recommendation) return;
    setEmailSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'contact-notification',
          recipientEmail: emailInput.trim(),
          idempotencyKey: `whats-wrong-${Date.now()}`,
          templateData: {
            name: 'Aetheris Recommendation',
            email: emailInput.trim(),
            message: buildPlainText(recommendation, selectedIssues),
            service_interest: recommendation.recommendedPackage.name,
          },
        },
      });
      if (error) throw error;
      toast({ title: 'Sent!', description: 'Check your inbox.' });
      setEmailInput('');
    } catch {
      toast({ title: 'Failed to send', variant: 'destructive' });
    } finally {
      setEmailSending(false);
    }
  };

  const reset = () => {
    setStep('pick');
    setSelectedIssues([]);
    setNotes('');
    setRecommendation(null);
  };

  return (
    <section className="py-20 px-4 relative" id="whats-wrong">
      {/* Subtle top divider */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-px bg-gradient-to-r from-transparent via-amber/40 to-transparent" />

      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 font-case text-[10px] uppercase tracking-[0.2em] text-amber mb-4 px-3 py-1 border border-amber/30 rounded-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse" />
            Forensic Triage
          </div>
          <h2 className="font-forensic text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
            Where is your business <span className="text-amber italic">leaking</span>?
          </h2>
          <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto leading-relaxed">
            Pick the symptom. We&apos;ll name the leak, quantify the bleed, and prescribe the exact fix — in under 60 seconds.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {step === 'pick' && (
            <motion.div key="pick" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="space-y-3">
                {ISSUE_CATEGORIES.map((cat, idx) => {
                  const Icon = cat.icon;
                  const isOpen = expandedCategory === cat.id;
                  const selectedCount = selectedIssues.filter(i => cat.issues.includes(i)).length;
                  return (
                    <div
                      key={cat.id}
                      className={`glass glass-shine rounded-lg overflow-hidden border transition-all duration-300 ${
                        isOpen
                          ? 'border-amber/50 shadow-[0_0_30px_-10px_hsl(var(--amber)/0.3)] shimmer-border'
                          : selectedCount > 0
                          ? 'border-amber/30'
                          : 'border-border/60 hover:border-amber/30'
                      }`}
                    >
                      <button
                        onClick={() => setExpandedCategory(isOpen ? null : cat.id)}
                        className="w-full flex items-center justify-between px-5 py-5 text-left group"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className={`flex-shrink-0 w-11 h-11 rounded-md border flex items-center justify-center transition-colors ${
                            isOpen || selectedCount > 0
                              ? 'bg-amber/15 border-amber/40 text-amber'
                              : 'bg-muted/20 border-border/60 text-muted-foreground group-hover:text-amber group-hover:border-amber/30'
                          }`}>
                            <Icon className="w-5 h-5" strokeWidth={1.75} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-baseline gap-2">
                              <span className="font-case text-[10px] uppercase tracking-widest text-muted-foreground/60">
                                CAT {String(idx + 1).padStart(2, '0')}
                              </span>
                            </div>
                            <div className="font-semibold text-foreground text-base md:text-lg leading-tight">{cat.label}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{cat.sublabel}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {selectedCount > 0 && (
                            <span className="font-case text-[10px] uppercase tracking-wider bg-amber/15 text-amber px-2 py-1 rounded-sm border border-amber/30">
                              {selectedCount} flagged
                            </span>
                          )}
                          <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-90 text-amber' : ''}`} />
                        </div>
                      </button>
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-5 pb-5 pt-1 space-y-2 border-t border-border/40">
                              {cat.issues.map(issue => (
                                <label
                                  key={issue}
                                  className={`flex items-start gap-3 p-3 rounded-md cursor-pointer transition-all border ${
                                    selectedIssues.includes(issue)
                                      ? 'border-amber/50 bg-amber/10'
                                      : 'border-transparent hover:bg-muted/20 hover:border-border/40'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedIssues.includes(issue)}
                                    onChange={() => toggleIssue(issue)}
                                    className="mt-0.5 accent-[hsl(var(--amber))]"
                                  />
                                  <span className="text-sm text-foreground/90">{issue}</span>
                                </label>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              {selectedIssues.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-8 text-center">
                  <p className="font-case text-[10px] uppercase tracking-widest text-muted-foreground mb-4">
                    {selectedIssues.length} symptom{selectedIssues.length > 1 ? 's' : ''} flagged · ready for diagnosis
                  </p>
                  <Button
                    onClick={() => setStep('notes')}
                    size="lg"
                    className="bg-amber hover:bg-amber/90 text-primary-foreground font-semibold px-8 shadow-[0_8px_30px_-8px_hsl(var(--amber)/0.5)]"
                  >
                    Run Diagnosis
                    <ChevronRight className="ml-2 w-5 h-5" />
                  </Button>
                  <p className="text-xs text-muted-foreground mt-3">Free · No email required to start</p>
                </motion.div>
              )}
            </motion.div>
          )}

          {step === 'notes' && (
            <motion.div key="notes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="glass p-6 md:p-8 rounded-2xl space-y-5">
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-2">Anything else we should know?</h3>
                  <p className="text-sm text-muted-foreground">Optional &mdash; but the more detail you give, the sharper our recommendation.</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedIssues.map(issue => (
                    <span key={issue} className="text-xs bg-amber/15 text-amber px-3 py-1 rounded-full border border-amber/20">
                      {issue}
                    </span>
                  ))}
                </div>

                <Textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="E.g. We are a 12-person HVAC company doing $2M/year. Marketing budget is $3K/month but I have no idea if it is working..."
                  rows={4}
                  maxLength={1500}
                  className="bg-background/50"
                />

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep('pick')} className="flex-1">
                    Back
                  </Button>
                  <Button
                    onClick={handleAnalyze}
                    size="lg"
                    className="flex-[2] bg-primary hover:bg-primary/90"
                  >
                    <Sparkles className="mr-2 w-5 h-5" />
                    Analyze &amp; Recommend
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'loading' && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-16">
              <Loader2 className="w-12 h-12 text-amber mx-auto animate-spin mb-4" />
              <p className="text-lg font-semibold text-foreground">Analyzing your situation...</p>
              <p className="text-sm text-muted-foreground mt-1">Building a personalized recommendation</p>
            </motion.div>
          )}

          {step === 'results' && recommendation && (
            <motion.div key="results" ref={resultsRef} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="space-y-6">
                <div className="glass glass-shine hover-lift p-6 rounded-2xl border border-border/50 animate-shimmer-in">
                  <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber" />
                    Your Diagnosis
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">{recommendation.diagnosis}</p>
                </div>

                <div className="glass glass-shine hover-lift p-6 rounded-2xl border border-destructive/30 bg-destructive/5 animate-shimmer-in">
                  <h3 className="text-lg font-bold text-destructive mb-2">Fix This First</h3>
                  <p className="text-foreground/90">{recommendation.urgentFix}</p>
                </div>

                <div className="glass p-4 rounded-xl border border-amber/30 bg-amber/5 text-center">
                  <p className="text-sm text-muted-foreground">Estimated revenue you&apos;re leaving on the table:</p>
                  <p className="text-3xl font-bold text-amber mt-1">{recommendation.estimatedRevenueLeak}</p>
                </div>

                <div className="glass glass-shine hover-lift p-6 rounded-2xl border-2 border-primary/50 animate-shimmer-in">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-bold text-foreground">Recommended For You</h3>
                  </div>
                  <div className="flex items-baseline gap-3 mb-2">
                    <span className="text-2xl font-bold text-foreground">{recommendation.recommendedPackage.name}</span>
                    <span className="text-xl font-semibold text-amber">{recommendation.recommendedPackage.price}</span>
                  </div>
                  <p className="text-muted-foreground text-sm mb-3">{recommendation.recommendedPackage.description}</p>
                  <div className="bg-primary/10 rounded-lg p-3">
                    <p className="text-sm text-primary font-medium">Why this fits: {recommendation.recommendedPackage.whyThisFits}</p>
                  </div>
                </div>

                {recommendation.additionalServices.length > 0 && (
                  <div className="glass p-6 rounded-2xl border border-border/50">
                    <h3 className="text-lg font-bold text-foreground mb-4">Also Consider</h3>
                    <div className="space-y-3">
                      {recommendation.additionalServices.map((svc, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/10">
                          <span className="text-amber font-bold text-sm whitespace-nowrap">{svc.price}</span>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{svc.name}</p>
                            <p className="text-xs text-muted-foreground">{svc.reason}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="glass p-5 rounded-xl border border-border/50 text-center">
                  <p className="text-foreground font-medium">{recommendation.nextStep}</p>
                </div>

                <div className="glass p-6 rounded-2xl space-y-4">
                  <h3 className="text-lg font-bold text-foreground text-center">Save Your Recommendation</h3>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 flex gap-2">
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        value={emailInput}
                        onChange={e => setEmailInput(e.target.value)}
                        maxLength={255}
                        className="flex-1"
                      />
                      <Button onClick={handleEmail} disabled={emailSending || !emailInput.trim()} variant="outline">
                        {emailSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                      </Button>
                    </div>
                    <Button onClick={handleDownload} variant="outline" className="border-amber/30 text-amber hover:bg-amber/10">
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>

                <div className="text-center">
                  <Button variant="ghost" onClick={reset} className="text-muted-foreground">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Start Over
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

function buildPlainText(rec: Recommendation, issues: string[]): string {
  const lines = [
    'AETHERIS AI - PERSONALIZED RECOMMENDATION',
    '==========================================',
    '',
    'YOUR ISSUES:',
    ...issues.map(i => `  - ${i}`),
    '',
    'DIAGNOSIS:',
    rec.diagnosis,
    '',
    'FIX THIS FIRST:',
    rec.urgentFix,
    '',
    `ESTIMATED REVENUE LEAK: ${rec.estimatedRevenueLeak}`,
    '',
    'RECOMMENDED PACKAGE:',
    `${rec.recommendedPackage.name} - ${rec.recommendedPackage.price}`,
    rec.recommendedPackage.description,
    `Why this fits: ${rec.recommendedPackage.whyThisFits}`,
    '',
  ];

  if (rec.additionalServices.length > 0) {
    lines.push('ALSO CONSIDER:');
    rec.additionalServices.forEach(s => {
      lines.push(`  - ${s.name} (${s.price}) - ${s.reason}`);
    });
    lines.push('');
  }

  lines.push(`NEXT STEP: ${rec.nextStep}`);
  lines.push('');
  lines.push('---');
  lines.push('Aetheris AI | aetheris.technology | (317) 376-2110');

  return lines.join('\n');
}
