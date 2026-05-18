import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useTrackEvent } from '@/hooks/useTrackEvent';
import { generateDiagnosticPdf } from '@/lib/generateDiagnosticPdf';
import { ArrowRight, ArrowLeft, CheckCircle, AlertTriangle, XCircle, TrendingUp, Megaphone, ShoppingCart, Palette, Settings, Rocket, Download } from 'lucide-react';

// --- DATA ---

interface QuestionOption {
  label: string;
  score: number;
}

interface Question {
  id: number;
  text: string;
  options: QuestionOption[];
}

interface Section {
  title: string;
  icon: string;
  questions: Question[];
  scored: boolean;
}

const sections: Section[] = [
  {
    title: 'Business Profile',
    icon: '🧩',
    scored: false,
    questions: [
      { id: 1, text: 'What industry are you in?', options: [
        { label: 'Construction / Trades', score: -1 }, { label: 'Manufacturing', score: -1 },
        { label: 'Professional Services', score: -1 }, { label: 'Real Estate', score: -1 },
        { label: 'Healthcare', score: -1 }, { label: 'E-commerce', score: -1 },
        { label: 'Local Business', score: -1 }, { label: 'Other', score: -1 },
      ]},
      { id: 2, text: 'Company size', options: [
        { label: 'Just me', score: -1 }, { label: '2–10 employees', score: -1 },
        { label: '11–50 employees', score: -1 }, { label: '51–200 employees', score: -1 },
        { label: '200+', score: -1 },
      ]},
      { id: 3, text: 'Years in business', options: [
        { label: '0–1', score: -1 }, { label: '1–3', score: -1 },
        { label: '3–7', score: -1 }, { label: '7–15', score: -1 },
        { label: '15+', score: -1 },
      ]},
      { id: 4, text: 'Monthly revenue range', options: [
        { label: 'Under $10k', score: -1 }, { label: '$10k–$50k', score: -1 },
        { label: '$50k–$250k', score: -1 }, { label: '$250k–$1M', score: -1 },
        { label: '$1M+', score: -1 },
      ]},
    ],
  },
  {
    title: 'Marketing & Visibility',
    icon: '🧠',
    scored: true,
    questions: [
      { id: 5, text: 'How do you currently generate leads?', options: [
        { label: 'Website/SEO', score: 5 }, { label: 'Paid ads', score: 3 },
        { label: 'Social media', score: 3 }, { label: 'Mostly referrals', score: 1 },
        { label: 'Not consistent', score: 0 },
      ]},
      { id: 6, text: 'How often do you post content?', options: [
        { label: 'Daily', score: 5 }, { label: 'Weekly', score: 3 },
        { label: 'Occasionally', score: 1 }, { label: 'Rarely', score: 0 },
        { label: 'Never', score: 0 },
      ]},
      { id: 7, text: 'Do your posts generate leads consistently?', options: [
        { label: 'Yes, regularly', score: 5 }, { label: 'Sometimes', score: 3 },
        { label: 'Rarely', score: 1 }, { label: 'No', score: 0 },
      ]},
      { id: 8, text: 'Do you know which marketing efforts actually bring in revenue?', options: [
        { label: 'Yes, clearly', score: 5 }, { label: 'Somewhat', score: 3 },
        { label: 'Not really', score: 1 }, { label: 'No idea', score: 0 },
      ]},
    ],
  },
  {
    title: 'Conversion & Sales',
    icon: '💰',
    scored: true,
    questions: [
      { id: 9, text: 'When someone visits your website, is it clear what they should do next?', options: [
        { label: 'Very clear', score: 5 }, { label: 'Somewhat', score: 3 },
        { label: 'Not really', score: 1 }, { label: 'No', score: 0 },
      ]},
      { id: 10, text: 'How quickly do you respond to inquiries or leads?', options: [
        { label: 'Immediately', score: 5 }, { label: 'Within a few hours', score: 3 },
        { label: 'Same day', score: 1 }, { label: 'Next day or later', score: 0 },
      ]},
      { id: 11, text: 'Do you have a structured follow-up system?', options: [
        { label: 'Fully automated', score: 5 }, { label: 'Some process', score: 3 },
        { label: 'Inconsistent', score: 1 }, { label: 'No system', score: 0 },
      ]},
      { id: 12, text: 'Do you feel like you\'re losing potential customers before they convert?', options: [
        { label: 'No', score: 5 }, { label: 'Maybe', score: 3 },
        { label: 'Yes', score: 1 }, { label: 'Definitely', score: 0 },
      ]},
    ],
  },
  {
    title: 'Brand & Messaging',
    icon: '🧲',
    scored: true,
    questions: [
      { id: 13, text: 'Can someone instantly understand what you do and why you\'re different?', options: [
        { label: 'Yes', score: 5 }, { label: 'Mostly', score: 3 },
        { label: 'Not really', score: 1 }, { label: 'No', score: 0 },
      ]},
      { id: 14, text: 'Do your visuals (images/videos) show real-world use or just generic content?', options: [
        { label: 'Strong and clear', score: 5 }, { label: 'Somewhat', score: 3 },
        { label: 'Weak', score: 1 }, { label: 'Very weak', score: 0 },
      ]},
      { id: 15, text: 'Do you feel your brand stands out from competitors?', options: [
        { label: 'Yes', score: 5 }, { label: 'Somewhat', score: 3 },
        { label: 'Not really', score: 1 }, { label: 'No', score: 0 },
      ]},
    ],
  },
  {
    title: 'Systems & Operations',
    icon: '⚙️',
    scored: true,
    questions: [
      { id: 16, text: 'Do you use a CRM or system to track leads and customers?', options: [
        { label: 'Yes, fully', score: 5 }, { label: 'Partially', score: 3 },
        { label: 'Barely', score: 1 }, { label: 'No', score: 0 },
      ]},
      { id: 17, text: 'Do leads ever get lost, forgotten, or not followed up with?', options: [
        { label: 'Never', score: 5 }, { label: 'Rarely', score: 3 },
        { label: 'Sometimes', score: 1 }, { label: 'Often', score: 0 },
      ]},
      { id: 18, text: 'Do you have visibility into your pipeline (what\'s coming in)?', options: [
        { label: 'Fully', score: 5 }, { label: 'Somewhat', score: 3 },
        { label: 'Limited', score: 1 }, { label: 'None', score: 0 },
      ]},
    ],
  },
  {
    title: 'Growth & Strategy',
    icon: '📉',
    scored: true,
    questions: [
      { id: 19, text: 'Do you feel your business is growing at the rate it should be?', options: [
        { label: 'Yes', score: 5 }, { label: 'Somewhat', score: 3 },
        { label: 'No', score: 1 }, { label: 'Definitely not', score: 0 },
      ]},
      { id: 20, text: 'Do you know exactly what is holding your growth back?', options: [
        { label: 'Yes', score: 5 }, { label: 'Some idea', score: 3 },
        { label: 'Not really', score: 1 }, { label: 'No idea', score: 0 },
      ]},
    ],
  },
];

const categoryMap: Record<string, { label: string; icon: React.ReactNode; questionIds: number[]; maxScore: number }> = {
  marketing: { label: 'Marketing Gaps', icon: <Megaphone className="w-5 h-5" />, questionIds: [5, 6, 7, 8], maxScore: 20 },
  conversion: { label: 'Conversion Breakdowns', icon: <ShoppingCart className="w-5 h-5" />, questionIds: [9, 10, 11, 12], maxScore: 20 },
  brand: { label: 'Messaging Issues', icon: <Palette className="w-5 h-5" />, questionIds: [13, 14, 15], maxScore: 15 },
  systems: { label: 'System Failures', icon: <Settings className="w-5 h-5" />, questionIds: [16, 17, 18], maxScore: 15 },
  growth: { label: 'Growth Blockers', icon: <Rocket className="w-5 h-5" />, questionIds: [19, 20], maxScore: 10 },
};

const categoryNarratives: Record<string, string[]> = {
  marketing: [
    "Your lead generation is inconsistent, you're relying on methods that don't scale.",
    "Content posting is sporadic, which means you're invisible to potential customers most of the time.",
    "You lack visibility into which marketing efforts actually drive revenue.",
  ],
  conversion: [
    "Your website doesn't make it clear what visitors should do next, they're bouncing.",
    "Slow response times to inquiries mean warm leads are going cold before you reach them.",
    "Without a structured follow-up system, potential customers are slipping through the cracks.",
  ],
  brand: [
    "Your brand messaging doesn't clearly differentiate you from competitors.",
    "Generic visuals are undermining trust, prospects can't see real proof of your work.",
    "People can't instantly understand what you do, which kills first impressions.",
  ],
  systems: [
    "Without a CRM, leads are getting lost and follow-ups are inconsistent.",
    "You have no visibility into your sales pipeline, growth is a guessing game.",
    "Manual processes are creating bottlenecks that cost you time and revenue.",
  ],
  growth: [
    "You feel the business should be growing faster but can't pinpoint what's holding it back.",
    "Without a clear growth strategy, effort is being wasted on low-impact activities.",
  ],
};

// --- COMPONENT ---

export const BusinessDiagnostic: React.FC = () => {
  const [currentSection, setCurrentSection] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [scores, setScores] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pdfDownloaded, setPdfDownloaded] = useState(false);
  const { trackEvent } = useTrackEvent();

  const totalSections = sections.length;
  const progress = showResults ? 100 : ((currentSection) / totalSections) * 100;

  const currentSectionData = sections[currentSection];

  const isSectionComplete = () => {
    return currentSectionData.questions.every(q => answers[q.id] !== undefined);
  };

  const handleSelect = (questionId: number, optionLabel: string, optionScore: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionLabel }));
    if (optionScore >= 0) {
      setScores(prev => ({ ...prev, [questionId]: optionScore }));
    }
  };

  const handleNext = () => {
    if (currentSection < totalSections - 1) {
      setCurrentSection(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setShowResults(true);
      trackEvent('diagnostic_completed_questions');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    if (currentSection > 0) {
      setCurrentSection(prev => prev - 1);
    }
  };

  const computeResults = () => {
    const totalScore = Object.values(scores).reduce((sum, s) => sum + s, 0);
    const catScores: Record<string, { score: number; max: number; pct: number }> = {};
    for (const [key, cat] of Object.entries(categoryMap)) {
      const score = cat.questionIds.reduce((sum, id) => sum + (scores[id] || 0), 0);
      catScores[key] = { score, max: cat.maxScore, pct: Math.round((score / cat.maxScore) * 100) };
    }
    return { totalScore, maxScore: 80, catScores };
  };

  const getWeakestCategories = (catScores: Record<string, { score: number; max: number; pct: number }>) => {
    return Object.entries(catScores)
      .sort(([, a], [, b]) => a.pct - b.pct)
      .slice(0, 3)
      .map(([key]) => key);
  };

  const handleDownloadPdf = async () => {
    if (!email) return;
    setSubmitting(true);
    const { totalScore, catScores } = computeResults();
    const weakest = getWeakestCategories(catScores);

    try {
      await supabase.from('diagnostic_leads').insert({
        email,
        name: name || null,
        company: company || null,
        industry: answers[1] || null,
        company_size: answers[2] || null,
        answers: answers as any,
        scores: scores as any,
        total_score: totalScore,
        category_scores: catScores as any,
      });
      trackEvent('diagnostic_lead_captured', { score: totalScore });
    } catch (e) {
      console.error('Failed to save diagnostic lead', e);
    }

    generateDiagnosticPdf({
      name: name || undefined,
      company: company || undefined,
      totalScore,
      maxScore: 80,
      catScores,
      weakestCategories: weakest,
    });

    setPdfDownloaded(true);
    setSubmitting(false);
  };

  const { totalScore, maxScore, catScores } = computeResults();
  const scorePct = Math.round((totalScore / maxScore) * 100);

  const getTier = () => {
    if (scorePct >= 80) return { color: 'text-green-400', bg: 'bg-green-500/20 border-green-500/30', label: 'Strong but Leaking', icon: <CheckCircle className="w-8 h-8 text-green-400" />, desc: 'You have a solid foundation, but there are hidden gaps costing you growth.', rec: 'Refine conversion and optimize what already exists.' };
    if (scorePct >= 50) return { color: 'text-yellow-400', bg: 'bg-yellow-500/20 border-yellow-500/30', label: 'Unstable Growth', icon: <AlertTriangle className="w-8 h-8 text-yellow-400" />, desc: 'You\'re doing some things right, but inconsistency is costing you real revenue.', rec: 'Fix systems, messaging, and follow-up immediately.' };
    return { color: 'text-red-400', bg: 'bg-red-500/20 border-red-500/30', label: 'Revenue Leakage Mode', icon: <XCircle className="w-8 h-8 text-red-400" />, desc: 'You\'re losing a significant amount of business without realizing it.', rec: 'Full diagnostic needed across marketing, conversion, and systems.' };
  };

  // --- RESULTS VIEW ---
  if (showResults) {
    const tier = getTier();
    const weakest = getWeakestCategories(catScores);

    return (
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold font-display text-foreground">Here's What We Found</h2>
          <p className="text-muted-foreground">Your personalized business diagnostic results</p>
        </div>

        {/* Score Card */}
        <div className={`rounded-2xl border p-8 text-center space-y-4 ${tier.bg}`}>
          {tier.icon}
          <div className="text-5xl font-bold font-display text-foreground">{totalScore}<span className="text-2xl text-muted-foreground">/{maxScore}</span></div>
          <div className={`text-xl font-semibold ${tier.color}`}>{tier.label}</div>
          <p className="text-muted-foreground max-w-md mx-auto">{tier.desc}</p>
        </div>

        {/* Category Breakdown */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-foreground">Category Breakdown</h3>
          {Object.entries(categoryMap).map(([key, cat]) => {
            const cs = catScores[key];
            const barColor = cs.pct >= 80 ? 'bg-green-500' : cs.pct >= 50 ? 'bg-yellow-500' : 'bg-red-500';
            return (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-foreground">
                    {cat.icon}
                    <span>{cat.label}</span>
                  </div>
                  <span className="text-muted-foreground">{cs.score}/{cs.max}</span>
                </div>
                <div className="h-3 w-full rounded-full bg-secondary overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${cs.pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Narrative */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" /> Key Findings
          </h3>
          <p className="text-muted-foreground">
            You're generating attention, but not converting it efficiently. The biggest gaps are:
          </p>
          <ul className="space-y-3">
            {weakest.map(key => {
              const narratives = categoryNarratives[key];
              const pick = narratives[Math.min(Math.floor((1 - (catScores[key]?.pct || 0) / 100) * narratives.length), narratives.length - 1)];
              return (
                <li key={key} className="flex items-start gap-3 text-muted-foreground">
                  <span className="text-red-400 mt-0.5">✗</span>
                  <span>{pick}</span>
                </li>
              );
            })}
          </ul>
          <p className="text-sm text-muted-foreground italic">
            This typically results in 20%–40% of potential leads being lost.
          </p>
        </div>

        {/* PDF Download CTA */}
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 space-y-5">
          {pdfDownloaded ? (
            <div className="text-center space-y-3">
              <CheckCircle className="w-10 h-10 text-green-400 mx-auto" />
              <h3 className="text-xl font-semibold text-foreground">Your Action Plan Has Been Downloaded!</h3>
              <p className="text-muted-foreground text-sm">
                Check your downloads folder for your personalized PDF. Want expert help implementing it?
              </p>
              <a href="/contact">
                <Button size="lg" className="bg-primary hover:bg-primary/90 mt-2">
                  Book a Free Strategy Call <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </a>
            </div>
          ) : (
            <>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold text-foreground">
                  📋 Get Your Free Personalized Action Plan
                </h3>
                <p className="text-muted-foreground text-sm">
                  We'll generate a custom PDF with step-by-step instructions to fix your weakest areas. Enter your info below to download it instantly.
                </p>
              </div>
              <div className="space-y-3 max-w-md mx-auto">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Email *</label>
                  <Input type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Name</label>
                  <Input placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Company</label>
                  <Input placeholder="Your company" value={company} onChange={e => setCompany(e.target.value)} />
                </div>
                <Button
                  onClick={handleDownloadPdf}
                  disabled={!email || submitting}
                  className="w-full bg-primary hover:bg-primary/90"
                  size="lg"
                >
                  {submitting ? 'Generating...' : (
                    <>
                      <Download className="w-4 h-4 mr-2" /> Download Your Free Action Plan
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Recommendation */}
        {!pdfDownloaded && (
          <div className="rounded-2xl border border-border bg-card p-6 text-center space-y-4">
            <h3 className="text-xl font-semibold text-foreground">👉 Recommendation: {tier.rec}</h3>
            <p className="text-muted-foreground text-sm">
              Our 14-Day Operational Systems Diagnostic pinpoints exactly where revenue is leaking and builds a roadmap to fix it.
            </p>
            <a href="/contact">
              <Button size="lg" variant="outline">
                Learn More <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </a>
          </div>
        )}
      </div>
    );
  }

  // --- QUIZ SECTIONS ---
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Progress value={progress} className="h-2" />

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Section {currentSection + 1} of {totalSections}</span>
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold font-display text-foreground">
          {currentSectionData.icon} {currentSectionData.title}
        </h2>
      </div>

      <div className="space-y-8">
        {currentSectionData.questions.map((q) => (
          <div key={q.id} className="space-y-3">
            <p className="font-medium text-foreground">
              {q.id}. {q.text}
            </p>
            <div className="grid gap-2">
              {q.options.map(opt => {
                const selected = answers[q.id] === opt.label;
                return (
                  <button
                    key={opt.label}
                    onClick={() => handleSelect(q.id, opt.label, opt.score)}
                    className={`text-left px-4 py-3 rounded-lg border transition-all text-sm ${
                      selected
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border bg-card hover:border-primary/50 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 pt-4">
        {currentSection > 0 && (
          <Button variant="outline" onClick={handleBack} className="flex-1">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        )}
        <Button
          onClick={handleNext}
          disabled={!isSectionComplete()}
          className={`bg-primary hover:bg-primary/90 ${currentSection === 0 ? 'w-full' : 'flex-1'}`}
        >
          {currentSection === totalSections - 1 ? 'See Results' : 'Next Section'} <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};
