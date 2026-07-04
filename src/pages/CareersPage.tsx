import React, { useState } from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import {
  Target, CheckCircle, XCircle, Shield, Rocket, Users, Clock, Brain, Headphones, DollarSign, Lock,
} from 'lucide-react';
import careersHero from '@/assets/careers-hero.jpg';
import careersIntroVideo from '@/assets/careers-intro.mp4';
import { ApplicantPressure } from '@/components/careers/ApplicantPressure';

const trackCareersCta = (cta: string) => {
  try {
    const sid = localStorage.getItem('aetheris_session_id') || crypto.randomUUID();
    localStorage.setItem('aetheris_session_id', sid);
    supabase.from('site_events').insert([{
      event_type: 'careers_cta_click',
      event_data: { cta, path: '/careers' } as any,
      session_id: sid,
      user_agent: navigator.userAgent,
    }]);
  } catch {}
};

const WHY = [
  { icon: Target, title: 'Universal pain, easy pitch', desc: 'Every business leaks revenue. The free Leak Audit is the wedge, the operator-led Forensic Diagnostic is the close.' },
  { icon: Brain, title: 'Operator-led delivery', desc: 'You sell the diagnosis. Joseph and the engineering team do the surgery. No implementation, no babysitting.' },
  { icon: Rocket, title: 'Full operator stack', desc: 'Forecast Center, Lead Pool, scripts, follow-up playbooks, training, and a private portal — all included.' },
  { icon: Users, title: 'Partner track', desc: 'Hit numbers → recruit reps under your code, earn an override on every sale they close, get a seat at the table.' },
  { icon: Headphones, title: 'Direct line to the operator', desc: 'You text Joseph. You call him. No managers, no HR. That\'s the whole org chart.' },
  { icon: Shield, title: 'No cold-call quotas', desc: 'Sell how you sell — LinkedIn, email, in-person, referrals. Results matter, not the calendar. Remote-first, Indy-loved.' },
];

const CareersPage = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Independent Rep | Aetheris Business Forensics"
        description="2,500+ applications. Most turned down. One spot left. If you can't take a test, ask questions, or pay a $40 access fee, don't apply."
        path="/careers"
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />

        <div className="pt-24 pb-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-12">

            {/* INTRO VIDEO */}
            <div>
              <div className="max-w-4xl mx-auto rounded-2xl overflow-hidden border border-amber/30 bg-black shadow-2xl">
                <video
                  src={careersIntroVideo}
                  poster={careersHero}
                  controls
                  muted
                  playsInline
                  preload="metadata"
                  onEnded={(e) => {
                    const v = e.currentTarget;
                    v.pause(); v.currentTime = 0; v.load();
                  }}
                  className="w-full h-auto block"
                />
              </div>
              <p className="text-center font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground mt-3">
                Watch this. Or don't — and move on.
              </p>
            </div>

            {/* LIVE PRESSURE — applicant count + pass/fail ticker + spots */}
            <ApplicantPressure />

            {/* GATE — PAID TEST */}
            <Card className="bg-amber/10 border-amber/40">
              <CardContent className="p-6 sm:p-7 space-y-4">
                <div className="flex items-center gap-2 font-mono uppercase text-[10px] tracking-[0.3em] text-amber">
                  <Lock className="w-3.5 h-3.5" /> One door in
                </div>
                <h2 className="font-display text-2xl sm:text-3xl text-foreground leading-tight">
                  $40. A test. Then we talk.
                </h2>
                <p className="text-sm text-foreground/85">
                  We don't read resumes from people who skip the test. We don't interview people who won't spend 10 minutes learning what we do. The $40 access fee is the cheapest filter we have — and the state wants it for a 1099 role. If that offends you, this isn't the place.
                </p>
                <div className="grid sm:grid-cols-3 gap-3 text-sm">
                  <div className="rounded-lg border border-amber/30 bg-background/40 p-3">
                    <p className="font-mono uppercase text-[10px] tracking-[0.25em] text-amber mb-1">Step 1</p>
                    <p className="font-semibold text-foreground">Pay $40</p>
                    <p className="text-muted-foreground text-xs mt-1">No exceptions. No "I'll pay later." No comp codes.</p>
                  </div>
                  <div className="rounded-lg border border-amber/30 bg-background/40 p-3">
                    <p className="font-mono uppercase text-[10px] tracking-[0.25em] text-amber mb-1">Step 2</p>
                    <p className="font-semibold text-foreground">Take the test</p>
                    <p className="text-muted-foreground text-xs mt-1">25 of 60 randomized questions · 50 min · 80% to pass · 5 attempts/day.</p>
                  </div>
                  <div className="rounded-lg border border-amber/30 bg-background/40 p-3">
                    <p className="font-mono uppercase text-[10px] tracking-[0.25em] text-amber mb-1">Step 3</p>
                    <p className="font-semibold text-foreground">Show us you care</p>
                    <p className="text-muted-foreground text-xs mt-1">Resume + short pitch. Joseph reviews every passing app. Most don't pass.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-xs text-muted-foreground rounded-lg border border-amber/20 bg-background/30 p-3">
                  <DollarSign className="w-4 h-4 text-amber shrink-0 mt-0.5" />
                  <span><strong className="text-foreground">The fee isn't the problem. You are.</strong> $40 is less than one decent meal. If you can't commit that, you won't commit to building anything real.</span>
                </div>
                <a href="/careers/test" onClick={() => trackCareersCta('gate_take_test')} className="block">
                  <Button size="lg" className="w-full bg-amber text-background hover:bg-amber/90 font-semibold">
                    Pay $40 & take the test →
                  </Button>
                </a>
              </CardContent>
            </Card>

            {/* WHY + PERKS (merged) */}
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber text-center">Why Operators Choose Aetheris</p>
              <h2 className="text-3xl md:text-4xl font-bold font-display text-center text-foreground mt-2 mb-8">
                We don't sell software. We sell <span className="text-amber">forensic clarity</span>.
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {WHY.map(({ icon: Icon, title, desc }, i) => (
                  <div key={title} className="forensic-tile rounded-xl p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber/15 border border-amber/40 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-amber" />
                      </div>
                      <div>
                        <p className="font-mono text-[9px] tracking-[0.28em] text-amber/70 uppercase mb-1">// pt_{String(i+1).padStart(2,'0')}</p>
                        <h3 className="font-semibold text-foreground font-display">{title}</h3>
                        <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* FIT — THRIVE vs DON'T APPLY */}
            <div className="grid md:grid-cols-2 gap-5">
              <Card className="bg-card/60 backdrop-blur border-emerald-500/20">
                <CardHeader>
                  <CardTitle className="font-display text-foreground flex items-center gap-2">
                    <CheckCircle className="text-emerald-500 w-5 h-5" /> You'll thrive here if
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {[
                      'You\'re self-driven and don\'t need a manager checking on you.',
                      'You can hold a real conversation with a business owner without sounding like a script.',
                      'You believe most businesses are leaking money (because they are).',
                      'You want commission upside, not a salary safety net.',
                      'You can take rejection like a forensic — clinical, not personal.',
                    ].map((t) => <li key={t} className="flex gap-2"><span className="text-emerald-500">✓</span>{t}</li>)}
                  </ul>
                </CardContent>
              </Card>
              <Card className="bg-card/60 backdrop-blur border-crimson/20">
                <CardHeader>
                  <CardTitle className="font-display text-foreground flex items-center gap-2">
                    <XCircle className="text-crimson w-5 h-5" /> Don't apply if
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {[
                      'You need a base salary to feel safe.',
                      'You won\'t pick up the phone or message a stranger on LinkedIn.',
                      'You won\'t send a real follow-up after the first "not right now."',
                      'You want to coast. There\'s no coasting in commission.',
                      'You can\'t — or won\'t — pay $40 to prove you\'re serious.',
                    ].map((t) => <li key={t} className="flex gap-2"><span className="text-crimson">✗</span>{t}</li>)}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* REALITY CHECK */}
            <div className="forensic-tile rounded-2xl border border-crimson/40 p-6 md:p-8">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-crimson mb-2">Reality check</div>
              <h2 className="text-2xl md:text-3xl font-bold font-display text-crimson leading-tight mb-3">
                If you need a paycheck next week, this isn't for you.
              </h2>
              <p className="text-sm md:text-base text-foreground/90 leading-relaxed">
                We're looking for people who can absorb the vision and build with us. A lot of people talk the talk and don't last two weeks. If you're here to fake it, you'll be gone before onboarding finishes.
              </p>
            </div>

            {/* FINAL CTA */}
            <Card className="bg-card/60 backdrop-blur border-amber/40">
              <CardContent className="p-6 sm:p-8 text-center space-y-4">
                <div className="flex items-center justify-center gap-2 font-mono uppercase text-[10px] tracking-[0.3em] text-amber">
                  <Clock className="w-3.5 h-3.5" /> 10 minutes to apply
                </div>
                <h2 className="font-display text-2xl sm:text-3xl text-foreground">
                  Pay the $40. Pass the test. Send the resume.
                </h2>
                <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                  That's the only path in. There is no contact form on this page on purpose.
                </p>
                <a href="/careers/test" onClick={() => trackCareersCta('final_take_test')} className="inline-block">
                  <Button size="lg" className="bg-amber text-background hover:bg-amber/90 font-semibold">
                    Start the $40 access test →
                  </Button>
                </a>
              </CardContent>
            </Card>

          </div>
        </div>
        <Footer />
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default CareersPage;
