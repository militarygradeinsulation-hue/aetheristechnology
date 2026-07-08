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
import operatorCertification from '@/assets/operator-certification.jpg.asset.json';
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
  { icon: Target, title: 'Every business leaks', desc: "Owners feel it. They just can't name it. You learn the Leak Audit, then sell the diagnosis. Simple." },
  { icon: Brain, title: 'Operator-led delivery', desc: 'You sell. Joseph and the team build, fix, and ship. No implementation, no babysitting, no micromanagement.' },
  { icon: Rocket, title: 'The stack is built', desc: 'Forecast Center, Lead Pool, scripts, follow-ups, portal, training. You plug in and sell.' },
  { icon: Users, title: 'Partner track is real', desc: 'Recruit reps under your code, earn overrides, and earn a seat at the table. Numbers first.' },
  { icon: Headphones, title: 'Direct line', desc: "Text Joseph. Call him. No middle managers. That's the whole org chart." },
  { icon: Shield, title: 'No cold-call quotas', desc: 'Sell however you sell. LinkedIn, referrals, in-person, email. Results only. Remote-first, Indy-loved.' },
];

const CareersPage = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Independent Rep | Aetheris Chaos Theory Forensics"
        description="2,500+ applications. Most turned down. One spot left. If you can't take a test, ask questions, or pay a $40 access fee, don't apply."
        path="/careers"
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />

        <div className="pt-24 pb-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-12">

            {/* RAW HERO */}
            <div className="text-center space-y-4">
              <div className="font-mono uppercase text-[10px] tracking-[0.35em] text-amber">Careers · Certified Aetheris Operator</div>
              <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground leading-tight">
                2,500 applied. <span className="text-crimson">Most got a hard no.</span>
              </h1>
              <p className="text-base sm:text-lg text-foreground/85 max-w-2xl mx-auto leading-relaxed">
                You aren't buying a job. You're buying the test to become a Certified Aetheris Operator — the same way you pay for a driver's license, a college course, or a professional certification. We don't hand credentials to people who won't prove they can sit across from a $50 million company and talk like an operator.
              </p>
              <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                If you can't take the test, ask questions, or see the vision — leave. If you can, one spot is left.
              </p>
            </div>

            {/* CERTIFICATION IMAGE */}
            <div>
              <div className="max-w-4xl mx-auto rounded-2xl overflow-hidden border border-amber/30 bg-black shadow-2xl">
                <img
                  src={operatorCertification.url}
                  alt="Official Aetheris Operator Certification — the credential applicants earn after passing the certification examination"
                  className="w-full h-auto block"
                  loading="eager"
                />
              </div>
              <p className="text-center font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground mt-3">
                This is what you're working toward. Pass the test, earn the credential.
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
                  Buy the test. Earn the certification. Then we talk.
                </h2>
                <p className="text-sm text-foreground/85">
                  We don't read resumes from people who skip the test. We don't interview people who won't spend 10 minutes learning what we do. The $40 certification fee is the cheapest filter we have — and the only way to prove you can operate at the level this role demands. If that offends you, this isn't the place.
                </p>
                <div className="grid sm:grid-cols-3 gap-3 text-sm">
                  <div className="rounded-lg border border-amber/30 bg-background/40 p-3">
                    <p className="font-mono uppercase text-[10px] tracking-[0.25em] text-amber mb-1">Step 1</p>
                    <p className="font-semibold text-foreground">Buy the test</p>
                    <p className="text-muted-foreground text-xs mt-1">$40. No exceptions. No "I'll pay later." No comp codes.</p>
                  </div>
                  <div className="rounded-lg border border-amber/30 bg-background/40 p-3">
                    <p className="font-mono uppercase text-[10px] tracking-[0.25em] text-amber mb-1">Step 2</p>
                    <p className="font-semibold text-foreground">Pass the test</p>
                    <p className="text-muted-foreground text-xs mt-1">25 of 60 randomized questions · 50 min · 80% to pass · 5 attempts/day.</p>
                  </div>
                  <div className="rounded-lg border border-amber/30 bg-background/40 p-3">
                    <p className="font-mono uppercase text-[10px] tracking-[0.25em] text-amber mb-1">Step 3</p>
                    <p className="font-semibold text-foreground">Earn the credential</p>
                    <p className="text-muted-foreground text-xs mt-1">Resume + short pitch. Joseph reviews every passing app. Most don't pass.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-xs text-muted-foreground rounded-lg border border-amber/20 bg-background/30 p-3">
                  <DollarSign className="w-4 h-4 text-amber shrink-0 mt-0.5" />
                  <span><strong className="text-foreground">The fee isn't the problem. You are.</strong> You pay for a driver's license, college, and certifications. This is no different — except the companies you'll sit across from do $50 million a year. If $40 is too much, you aren't ready.</span>
                </div>
                <a href="/careers/test" onClick={() => trackCareersCta('gate_take_test')} className="block">
                  <Button size="lg" className="w-full bg-amber text-background hover:bg-amber/90 font-semibold">
                    Buy the $40 certification test →
                  </Button>
                </a>
              </CardContent>
            </Card>

            {/* WHY + PERKS (merged) */}
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber text-center">What this actually is</p>
              <h2 className="text-3xl md:text-4xl font-bold font-display text-center text-foreground mt-2 mb-8">
                We're not hiring. We're <span className="text-amber">selecting</span>.
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
                    <CheckCircle className="text-emerald-500 w-5 h-5" /> You belong here if
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {[
                      "You want to change your life, not just collect a check.",
                      "You have common sense and you know how to use it.",
                      "You can talk to a business owner like a human, not a script.",
                      "You see what we're building and want in before everyone else does.",
                      "You can handle rejection without falling apart.",
                    ].map((t) => <li key={t} className="flex gap-2"><span className="text-emerald-500">✓</span>{t}</li>)}
                  </ul>
                </CardContent>
              </Card>
              <Card className="bg-card/60 backdrop-blur border-crimson/20">
                <CardHeader>
                  <CardTitle className="font-display text-foreground flex items-center gap-2">
                    <XCircle className="text-crimson w-5 h-5" /> Don't waste your time if
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {[
                      "You need quick cash or a paycheck next week.",
                      "You think $40 is too expensive to prove you're serious.",
                      "You won't take a test or ask questions about our business.",
                      "You're just looking to skate by and coast on others.",
                      "You expect to be managed, pushed, or babysat.",
                    ].map((t) => <li key={t} className="flex gap-2"><span className="text-crimson">✗</span>{t}</li>)}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* REALITY CHECK */}
            <div className="forensic-tile rounded-2xl border border-crimson/40 p-6 md:p-8">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-crimson mb-2">Reality check</div>
              <h2 className="text-2xl md:text-3xl font-bold font-display text-crimson leading-tight mb-3">
                2,500 applied. Most were a hard no. One spot is left.
              </h2>
              <p className="text-sm md:text-base text-foreground/90 leading-relaxed">
                This company is pure innovation happening in front of you. If you can't take the test, ask questions, or see the vision, leave. We don't need more bodies. We need intelligent people with common sense who want to build something real.
              </p>
            </div>

            {/* FINAL CTA */}
            <Card className="bg-card/60 backdrop-blur border-amber/40">
              <CardContent className="p-6 sm:p-8 text-center space-y-4">
                <div className="flex items-center justify-center gap-2 font-mono uppercase text-[10px] tracking-[0.3em] text-amber">
                  <Clock className="w-3.5 h-3.5" /> 10 minutes to prove it
                </div>
                <h2 className="font-display text-2xl sm:text-3xl text-foreground">
                  Buy the test. Pass it. Earn the certification.
                </h2>
                <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                  That's the only way in. No contact form. No shortcuts. No exceptions.
                </p>
                <a href="/careers/test" onClick={() => trackCareersCta('final_take_test')} className="inline-block">
                  <Button size="lg" className="bg-amber text-background hover:bg-amber/90 font-semibold">
                    Start the $40 certification test →
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
