import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Sparkles, ArrowRight, Building2, Target, MessageSquare } from 'lucide-react';

const TONE_OPTIONS = ['Aggressive', 'Professional', 'Casual', 'Friendly', 'Authoritative', 'Playful'];

export default function SubscriberOnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const subscriptionId = searchParams.get('subscription_id') || '';

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    business_name: '',
    industry: '',
    website_url: '',
    target_audience: '',
    tone_preference: 'Professional',
    goals: ['', '', ''],
    notes: '',
  });

  const update = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!user) {
      toast({ title: 'Please log in', description: 'You need to be signed in to complete onboarding.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('subscriber_profiles').insert({
        subscription_id: subscriptionId,
        user_id: user.id,
        business_name: form.business_name || null,
        industry: form.industry || null,
        website_url: form.website_url || null,
        target_audience: form.target_audience || null,
        tone_preference: form.tone_preference,
        goals: form.goals.filter(g => g.trim()),
        notes: form.notes || null,
      } as any);

      if (error) throw error;

      toast({ title: 'Profile saved!', description: 'Your AI consultant is learning about your business. Your first delivery is being generated.' });
      navigate('/my-subscription');
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Error', description: err.message || 'Failed to save profile.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    {
      icon: Building2,
      title: 'Tell us about your business',
      content: (
        <div className="space-y-4">
          <div>
            <Label htmlFor="business_name" className="text-foreground">Business Name</Label>
            <Input id="business_name" value={form.business_name} onChange={e => update('business_name', e.target.value)} placeholder="Acme Corp" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="industry" className="text-foreground">Industry</Label>
            <Input id="industry" value={form.industry} onChange={e => update('industry', e.target.value)} placeholder="SaaS, E-commerce, Healthcare..." className="mt-1" />
          </div>
          <div>
            <Label htmlFor="website_url" className="text-foreground">Website URL</Label>
            <Input id="website_url" value={form.website_url} onChange={e => update('website_url', e.target.value)} placeholder="https://example.com" className="mt-1" />
          </div>
        </div>
      ),
    },
    {
      icon: Target,
      title: 'Who are you trying to reach?',
      content: (
        <div className="space-y-4">
          <div>
            <Label htmlFor="target_audience" className="text-foreground">Target Audience</Label>
            <Textarea id="target_audience" value={form.target_audience} onChange={e => update('target_audience', e.target.value)} placeholder="Small business owners in the Midwest, ages 35-55, who need help with digital marketing..." className="mt-1" rows={3} />
          </div>
          <div>
            <Label className="text-foreground">Top 3 Goals</Label>
            {form.goals.map((goal, i) => (
              <Input key={i} value={goal} onChange={e => {
                const newGoals = [...form.goals];
                newGoals[i] = e.target.value;
                update('goals', newGoals);
              }} placeholder={`Goal ${i + 1}`} className="mt-2" />
            ))}
          </div>
        </div>
      ),
    },
    {
      icon: MessageSquare,
      title: 'How should we sound?',
      content: (
        <div className="space-y-4">
          <div>
            <Label className="text-foreground">Tone Preference</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {TONE_OPTIONS.map(tone => (
                <button key={tone} onClick={() => update('tone_preference', tone)}
                  className={`px-4 py-2 rounded-lg border text-sm transition-all ${form.tone_preference === tone ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}>
                  {tone}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="notes" className="text-foreground">Special Instructions (optional)</Label>
            <Textarea id="notes" value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="Anything specific you want your AI consultant to know..." className="mt-1" rows={3} />
          </div>
        </div>
      ),
    },
  ];

  return (
    <>
      <SEOHead title="Subscriber Onboarding | Aetheris" description="Set up your AI consultant profile for personalized monthly deliveries." path="/subscriber-onboarding" />
      <Navbar onContactClick={() => {}} />
      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="max-w-lg mx-auto px-4">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">AI Consultant Setup</span>
            </div>
            <h1 className="text-3xl font-bold text-foreground">Let's personalize your experience</h1>
            <p className="text-muted-foreground mt-2">The more we know, the better your monthly deliveries.</p>
          </div>

          {/* Progress */}
          <div className="flex gap-2 mb-8">
            {steps.map((_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= step ? 'bg-primary' : 'bg-border'}`} />
            ))}
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              {React.createElement(steps[step].icon, { className: 'w-5 h-5 text-primary' })}
              <h2 className="text-lg font-semibold text-foreground">{steps[step].title}</h2>
            </div>

            {steps[step].content}

            <div className="flex justify-between mt-8">
              {step > 0 ? (
                <Button variant="outline" onClick={() => setStep(s => s - 1)}>Back</Button>
              ) : <div />}
              {step < steps.length - 1 ? (
                <Button onClick={() => setStep(s => s + 1)}>
                  Next <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={saving}>
                  {saving ? 'Saving...' : 'Launch My AI Consultant'} <Sparkles className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-4">
            You can update these preferences anytime from your subscription portal.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
