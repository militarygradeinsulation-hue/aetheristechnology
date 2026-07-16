import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Progress } from './ui/progress';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTrackEvent } from '@/hooks/useTrackEvent';
import { ArrowRight, ArrowLeft, CheckCircle, BarChart3, Zap, TrendingUp, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

const QUESTIONS = [
  {
    id: 'crm',
    question: 'How do you currently manage customer relationships?',
    options: [
      { label: 'Spreadsheets or paper', value: 'none', score: 0 },
      { label: 'Basic CRM (HubSpot free, etc.)', value: 'basic', score: 1 },
      { label: 'Configured CRM with pipelines', value: 'configured', score: 2 },
      { label: 'Fully automated CRM with integrations', value: 'advanced', score: 3 },
    ],
  },
  {
    id: 'automation',
    question: 'How much of your workflow is automated?',
    options: [
      { label: 'Almost nothing, mostly manual', value: 'none', score: 0 },
      { label: 'A few email automations', value: 'minimal', score: 1 },
      { label: 'Key processes are automated', value: 'partial', score: 2 },
      { label: 'End-to-end automation across departments', value: 'full', score: 3 },
    ],
  },
  {
    id: 'data',
    question: 'How do you track business performance?',
    options: [
      { label: 'Gut feeling / no formal tracking', value: 'none', score: 0 },
      { label: 'Monthly spreadsheet reviews', value: 'basic', score: 1 },
      { label: 'Dashboards with key metrics', value: 'dashboards', score: 2 },
      { label: 'Real-time analytics with predictive insights', value: 'advanced', score: 3 },
    ],
  },
  {
    id: 'ai_usage',
    question: 'How is AI currently used in your operations?',
    options: [
      { label: "We don't use AI at all", value: 'none', score: 0 },
      { label: 'ChatGPT for ad-hoc tasks', value: 'basic', score: 1 },
      { label: 'AI tools integrated into some workflows', value: 'integrated', score: 2 },
      { label: 'AI drives core business decisions', value: 'core', score: 3 },
    ],
  },
  {
    id: 'revenue_leaks',
    question: 'How confident are you that no revenue is leaking from your operations?',
    options: [
      { label: "I know we're losing money somewhere", value: 'certain', score: 0 },
      { label: "Probably leaking but can't pinpoint it", value: 'likely', score: 1 },
      { label: "We've identified some gaps", value: 'aware', score: 2 },
      { label: 'Systems are tight, minimal leakage', value: 'confident', score: 3 },
    ],
  },
];

const MAX_SCORE = QUESTIONS.length * 3;

const getScoreBreakdown = (score: number) => {
  const pct = (score / MAX_SCORE) * 100;
  if (pct <= 25) return {
    level: 'Critical',
    color: 'text-red-400',
    bgColor: 'bg-red-400/10 border-red-400/20',
    icon: AlertTriangle,
    headline: 'Your Business Is Running Blind',
    description: 'You have significant operational gaps that are almost certainly costing you revenue. A diagnostic would likely uncover 30-50% efficiency gains.',
    cta: 'You need a full Operational Diagnostic, this is exactly what we fix.',
  };
  if (pct <= 50) return {
    level: 'Needs Work',
    color: 'text-amber',
    bgColor: 'bg-amber/10 border-amber/20',
    icon: TrendingUp,
    headline: 'Foundation Exists, But Revenue Is Leaking',
    description: "You have some systems in place but they're not connected or optimized. There are clear automation opportunities being missed.",
    cta: 'A Foundation Build engagement would connect your systems and plug the leaks.',
  };
  if (pct <= 75) return {
    level: 'Good Base',
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10 border-blue-400/20',
    icon: BarChart3,
    headline: 'Solid Foundation, Time to Scale',
    description: "Your operations are functional but there's significant room for AI-powered optimization. You're leaving growth on the table.",
    cta: 'A Growth Engine engagement would take your systems from good to exceptional.',
  };
  return {
    level: 'Advanced',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-400/10 border-emerald-400/20',
    icon: Zap,
    headline: 'You\'re Ahead of 90% of Businesses',
    description: 'Your AI readiness is strong. The question is: are you extracting maximum ROI from your existing systems?',
    cta: 'Let\'s talk about Co-CEO level optimization to push past your current ceiling.',
  };
};

export const AIReadinessAssessment: React.FC = () => {
  const { toast } = useToast();
  const { trackEvent } = useTrackEvent();
  const [step, setStep] = useState(0); // 0-4 = questions, 5 = email capture, 6 = results
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [scores, setScores] = useState<Record<string, number>>({});
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [loading, setLoading] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const totalSteps = QUESTIONS.length + 1; // questions + email capture
  const progress = Math.min(((step + 1) / (totalSteps + 1)) * 100, 100);

  const handleAnswer = (questionId: string, value: string, score: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    setScores(prev => ({ ...prev, [questionId]: score }));
  };

  const handleNext = () => {
    if (step < QUESTIONS.length) {
      const q = QUESTIONS[step];
      if (!answers[q.id]) {
        toast({ title: 'Please select an answer', variant: 'destructive' });
        return;
      }
    }
    setStep(prev => prev + 1);
  };

  const handleSubmit = async () => {
    if (!email.trim()) {
      toast({ title: 'Email is required', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const total = Object.values(scores).reduce((sum, s) => sum + s, 0);
    setFinalScore(total);

    try {
      await supabase.from('assessment_leads' as any).insert({
        email: email.trim(),
        name: name.trim() || null,
        company: company.trim() || null,
        answers,
        score: total,
      });
      trackEvent('assessment_completed', { score: total, email: email.trim() });
    } catch {
      // Non-blocking, still show results
    }
    setSubmitted(true);
    setStep(QUESTIONS.length + 1);
    setLoading(false);
  };

  // Results view
  if (submitted) {
    const breakdown = getScoreBreakdown(finalScore);
    const ScoreIcon = breakdown.icon;
    const pct = Math.round((finalScore / MAX_SCORE) * 100);

    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${breakdown.bgColor} mb-4`}>
            <ScoreIcon className={`w-5 h-5 ${breakdown.color}`} />
            <span className={`font-semibold ${breakdown.color}`}>{breakdown.level}</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground font-display mb-2">
            Your AI Readiness Score: <span className={breakdown.color}>{pct}%</span>
          </h2>
          <p className="text-lg text-muted-foreground">{finalScore} out of {MAX_SCORE} points</p>
        </div>

        <div className="glass rounded-2xl p-8 mb-8">
          <h3 className="text-xl font-bold text-foreground mb-3">{breakdown.headline}</h3>
          <p className="text-muted-foreground mb-6">{breakdown.description}</p>

          <div className="space-y-3 mb-6">
            {QUESTIONS.map((q) => {
              const s = scores[q.id] || 0;
              const option = q.options.find(o => o.value === answers[q.id]);
              return (
                <div key={q.id} className="flex items-center justify-between gap-4 py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">{q.question.split('?')[0]}?</span>
                  <span className={`text-sm font-medium ${s >= 2 ? 'text-emerald-400' : s >= 1 ? 'text-amber' : 'text-red-400'}`}>
                    {option?.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="glass rounded-xl p-6 border border-primary/20">
            <p className="text-foreground font-semibold mb-3">💡 Our Recommendation</p>
            <p className="text-muted-foreground mb-4">{breakdown.cta}</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/contact">
                <Button className="bg-primary hover:bg-primary/90 w-full sm:w-auto">
                  Book a Free Consultation <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <a href="tel:+13173762110">
                <Button variant="outline" className="w-full sm:w-auto">
                  Call (317) 376-2110
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Email capture step
  if (step === QUESTIONS.length) {
    return (
      <div className="max-w-xl mx-auto">
        <Progress value={progress} className="mb-8 h-2" />
        <div className="glass rounded-2xl p-8">
          <h3 className="text-2xl font-bold text-foreground font-display mb-2">Almost there!</h3>
          <p className="text-muted-foreground mb-6">Enter your email to see your personalized AI Readiness Score and recommendations.</p>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-foreground mb-1 block">Email *</Label>
              <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" type="email" required maxLength={255} />
            </div>
            <div>
              <Label className="text-sm font-medium text-foreground mb-1 block">Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" maxLength={100} />
            </div>
            <div>
              <Label className="text-sm font-medium text-foreground mb-1 block">Company</Label>
              <Input value={company} onChange={e => setCompany(e.target.value)} placeholder="Your company" maxLength={100} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setStep(prev => prev - 1)}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={handleSubmit} disabled={loading}>
                {loading ? 'Calculating...' : 'See My Score'} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Question steps
  const currentQuestion = QUESTIONS[step];

  return (
    <div className="max-w-xl mx-auto">
      <Progress value={progress} className="mb-8 h-2" />
      <div className="text-sm text-muted-foreground mb-4">Question {step + 1} of {QUESTIONS.length}</div>
      <div className="glass rounded-2xl p-8">
        <h3 className="text-xl font-bold text-foreground mb-6">{currentQuestion.question}</h3>
        <RadioGroup
          value={answers[currentQuestion.id] || ''}
          onValueChange={(value) => {
            const option = currentQuestion.options.find(o => o.value === value);
            if (option) handleAnswer(currentQuestion.id, value, option.score);
          }}
          className="space-y-3"
        >
          {currentQuestion.options.map((option) => (
            <div
              key={option.value}
              className={`flex items-center space-x-3 rounded-xl border p-4 cursor-pointer transition-all ${
                answers[currentQuestion.id] === option.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/30'
              }`}
              onClick={() => handleAnswer(currentQuestion.id, option.value, option.score)}
            >
              <RadioGroupItem value={option.value} id={`${currentQuestion.id}-${option.value}`} />
              <Label htmlFor={`${currentQuestion.id}-${option.value}`} className="cursor-pointer flex-1 text-foreground">
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
        <div className="flex gap-3 mt-6">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep(prev => prev - 1)}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          )}
          <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={handleNext}>
            {step === QUESTIONS.length - 1 ? 'Get My Score' : 'Next'} <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};
