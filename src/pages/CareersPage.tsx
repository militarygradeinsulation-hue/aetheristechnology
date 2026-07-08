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

            {/* GATE — TWO PATHS IN */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* PATH A — $40 test */}
              <Card className="bg-amber/10 border-amber/40 flex flex-col">
                <CardContent className="p-6 space-y-3 flex-1 flex flex-col">
                  <div className="flex items-center gap-2 font-mono uppercase text-[10px] tracking-[0.3em] text-amber">
                    <Lock className="w-3.5 h-3.5" /> Path A · $40
                  </div>
                  <h2 className="font-display text-2xl text-foreground leading-tight">
                    Certification test
                  </h2>
                  <p className="text-sm text-foreground/85 flex-1">
                    Pay $40, sit the 25-question forensic exam, upload your resume, get reviewed. If you pass and Joseph likes what he sees, you get placed with a rep code, a spot on a team, and the full playbook. This is the vetted path.
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>· 25 of 60 randomized questions · 50 min · 80% to pass</li>
                    <li>· 5 attempts per day · fee is non-refundable</li>
                    <li>· Resume + pitch reviewed by Joseph personally</li>
                  </ul>
                  <a href="/careers/test" onClick={() => trackCareersCta('gate_take_test')} className="block mt-auto">
                    <Button size="lg" className="w-full bg-amber text-background hover:bg-amber/90 font-semibold">
                      Buy the $40 test →
                    </Button>
                  </a>
                </CardContent>
              </Card>

              {/* PATH B — $100 instant license */}
              <Card className="bg-emerald-500/10 border-emerald-500/40 flex flex-col">
                <CardContent className="p-6 space-y-3 flex-1 flex flex-col">
                  <div className="flex items-center gap-2 font-mono uppercase text-[10px] tracking-[0.3em] text-emerald-400">
                    <Rocket className="w-3.5 h-3.5" /> Path B · $100 · Instant
                  </div>
                  <h2 className="font-display text-2xl text-foreground leading-tight">
                    Skip the test. Get licensed today.
                  </h2>
                  <p className="text-sm text-foreground/85 flex-1">
                    Pay $100, get your personal rep code the same minute, and start selling every Aetheris tool at standard commission. You are a <strong className="text-foreground">1099 independent</strong> — not an employee, no manager, no interview. If you already know how to sell, this is the shortcut.
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>· Personal rep code issued instantly on payment</li>
                    <li>· Sell every tool + flagship at the standard split</li>
                    <li>· Full rep portal access (playbooks, leads, coach)</li>
                  </ul>
                  <a href="/careers/license" onClick={() => trackCareersCta('gate_instant_license')} className="block mt-auto">
                    <Button size="lg" className="w-full bg-emerald-500 text-background hover:bg-emerald-500/90 font-semibold">
                      Get licensed — $100 →
                    </Button>
                  </a>
                </CardContent>
              </Card>
            </div>

            <div className="flex items-start gap-2 text-xs text-muted-foreground rounded-lg border border-amber/20 bg-background/30 p-3">
              <DollarSign className="w-4 h-4 text-amber shrink-0 mt-0.5" />
              <span><strong className="text-foreground">Neither price is the problem. You are.</strong> $40 tests you. $100 skips the test and hands you the license. Both are cheaper than one afternoon with a bad hire — and the companies you'll sit across from do $50M a year.</span>
            </div>

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
                  Two doors. Pick one.
                </h2>
                <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                  $40 to prove it with a test. $100 to skip it and get your rep code today. Everything else is noise.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <a href="/careers/test" onClick={() => trackCareersCta('final_take_test')} className="inline-block">
                    <Button size="lg" className="bg-amber text-background hover:bg-amber/90 font-semibold">
                      Start the $40 test →
                    </Button>
                  </a>
                  <a href="/careers/license" onClick={() => trackCareersCta('final_instant_license')} className="inline-block">
                    <Button size="lg" className="bg-emerald-500 text-background hover:bg-emerald-500/90 font-semibold">
                      Get licensed for $100 →
                    </Button>
                  </a>
                </div>
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
