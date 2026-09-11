import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Search, Grid3x3, Loader2 } from 'lucide-react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';
import { PublicChaosScan } from '@/components/PublicChaosScan';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChaosMindMap } from '@/components/ChaosMindMap';
import { HomeToolShopGrid } from '@/components/HomeToolShopGrid';

import { supabase } from '@/integrations/supabase/client';
import { captureToolLead } from '@/lib/toolLeadCapture';
import { toast } from 'sonner';


const Home = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const navigate = useNavigate();

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    if (!isEmail) {
      toast.error('Enter a valid email');
      return;
    }
    setUnlocking(true);
    try {
      await captureToolLead({
        email: trimmed,
        tool_slug: 'ecosystem',
        tool_title: 'Aetheris Ecosystem',
        source: 'home_ecosystem_gate',
      });
      sessionStorage.setItem('ecosystem_auth_v1', '1');
      sessionStorage.setItem('ecosystem_code_v1', `EMAIL ${trimmed}`);
      toast.success('Access granted. Loading the toolset…');
      navigate('/ecosystem');
    } finally {
      setUnlocking(false);
    }
  };


  useEffect(() => {
    const existing = document.querySelector('script[src*="MeetingsEmbedCode.js"]');
    if (existing) return;
    const script = document.createElement('script');
    script.src = 'https://static.hsappstatic.net/MeetingsEmbed/ex/MeetingsEmbedCode.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Chaos Theory Forensics Operator | Aetheris"
        description="We scan your company for its biggest weaknesses using tools that don't exist anywhere, then fix them so you don't have to. Tell us your biggest issue and let's see if we can fix it."
        path="/"
        keywords="business forensics, revenue leak audit, True Cost Forensics, Indianapolis, operator"
        breadcrumbs={[{ name: 'Home', path: '/' }]}
        speakable={['h1']}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />
        <main>
          <h1 className="sr-only px-4 pt-28 md:pt-36 pb-6 max-w-6xl mx-auto">
            Stop Guessing. Start Understanding. We break down exactly how businesses waste money on AI,
            marketing, and disconnected systems, with real numbers, real costs, and real solutions.
          </h1>

          {/* Anti-AI banner lives on LeakLanderPage (route "/"). This page is unrouted. */}


          <section className="px-4 pt-10 pb-6 max-w-5xl mx-auto text-center">
            <h2 className="font-forensic text-4xl md:text-6xl lg:text-7xl font-bold text-foreground leading-[1.05] tracking-tight">
              Stop Guessing. <span className="text-amber italic">Start Understanding.</span>
            </h2>
            <div className="mt-6 max-w-3xl mx-auto space-y-4 text-base md:text-lg text-muted-foreground">
              <p className="text-foreground/90">
                We break down exactly how businesses waste money on AI, marketing, and disconnected systems — with real numbers, real costs, and real solutions.
              </p>
            </div>
          </section>

          {/* One offer · The Leak Check */}
          <section id="the-leak-audit" className="px-4 pb-10 scroll-mt-24">
            <div className="max-w-4xl mx-auto forensic-tile rounded-sm border border-amber/40 p-6 md:p-8 relative overflow-hidden">
              <div className="absolute top-3 right-3 font-case text-[9px] uppercase tracking-widest text-crimson border border-crimson/40 px-2 py-0.5 rounded-sm bg-crimson/5">
                Active case · limited slots this month
              </div>
              <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">
                Step 1 · Free
              </div>
              <h2 className="font-forensic text-3xl md:text-4xl font-bold leading-tight mb-3">
                The Leak Check — <span className="text-crimson">free.</span>
              </h2>
              <p className="text-sm md:text-base text-foreground/80 mb-6 max-w-2xl">
                Most growth-stage businesses are bleeding <span className="text-crimson font-bold">$40k–$180k/yr</span> in silent leaks. Five minutes, no card, no gate on the scan — we open a case file and hand you a written report with real dollar estimates on every leak we find.
              </p>

              <ChaosMindMap />

              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/leak-audit" className="w-full sm:w-auto">
                  <Button className="bg-amber text-background hover:bg-amber/90 font-bold w-full shadow-[0_0_25px_rgba(217,169,58,0.35)]">
                    Get Your Free Leak Check <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
                <button
                  type="button"
                  onClick={() => document.getElementById('public-leak-scan')?.scrollIntoView({ behavior: 'smooth' })}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-amber/40 px-4 py-2 text-sm text-amber hover:bg-amber/10 font-semibold"
                >
                  <Search className="w-4 h-4" /> Free 60-second pre-scan first
                </button>
              </div>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Free · Written report · No card, no pitch
              </p>
            </div>
          </section>

          {/* Public sandbox — try every ecosystem tool, nothing saved */}
          <section id="chaos-ecosystem-try" className="px-4 pb-6 scroll-mt-24">
            <div className="max-w-4xl mx-auto text-center mb-6">
              <p className="text-base md:text-lg text-muted-foreground">
                You don't need every tool. You just need the right one that makes the difference.
              </p>
            </div>
            <HomeToolShopGrid />
          </section>




          {/* Email gate → full ecosystem of tools */}
          <section id="ecosystem-gate" className="px-4 pb-14 scroll-mt-24">
            <div className="max-w-4xl mx-auto forensic-tile rounded-sm border border-amber/40 p-6 md:p-8 relative overflow-hidden">
              <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2 flex items-center gap-1.5">
                <Grid3x3 className="w-3 h-3" /> The full toolset
              </div>
              <h3 className="font-forensic text-2xl md:text-3xl font-bold leading-tight mb-2">
                Want every forensic tool we use? <span className="text-amber">Free.</span>
              </h3>
              <p className="text-sm md:text-base text-foreground/80 mb-5">
                One email unlocks the whole vault — scanners, diagnostics, report generators, closer kits, the same weapons we bill fixed-fee/session with. <span className="text-amber font-semibold">No card. No password. No spam.</span> You'll be inside in 3 seconds.
              </p>
              <form onSubmit={handleUnlock} className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="email"
                  required
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-background/70 border-amber/30 font-mono text-sm flex-1"
                />
                <Button
                  type="submit"
                  disabled={unlocking || !email}
                  className="bg-amber text-background hover:bg-amber/90 font-bold whitespace-nowrap shadow-[0_0_20px_rgba(217,169,58,0.35)]"
                >
                  {unlocking ? (
                    <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Unlocking</>
                  ) : (
                    <>Give me the whole vault <ArrowRight className="w-4 h-4 ml-1" /></>
                  )}
                </Button>
              </form>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-foreground/50">
                Instant access · Every tool · Unsubscribe anytime
              </p>
            </div>
          </section>

          <PublicChaosScan />

          {/* Careers */}
          <section id="careers" className="px-4 pb-14 scroll-mt-24">
            <div className="max-w-4xl mx-auto forensic-tile rounded-sm border border-amber/40 p-6 md:p-8">
              <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">
                Careers · Now hiring
              </div>
              <h2 className="font-forensic text-2xl md:text-3xl font-bold leading-tight mb-2">
                Think you can sell this? <span className="text-amber">Prove it.</span>
              </h2>
              <p className="text-sm md:text-base text-foreground/80 mb-5 max-w-2xl">
                Commission-first sales roles for operators who can read a room and close. Study the site, pass the knowledge test, send your resume. No fee, no gatekeepers.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/careers" className="w-full sm:w-auto">
                  <Button className="bg-amber text-background hover:bg-amber/90 font-bold w-full">
                    See the role <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
                <Link to="/careers/test" className="w-full sm:w-auto">
                  <span className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-amber/40 px-4 py-2 text-sm text-amber hover:bg-amber/10 font-semibold">
                    Take the qualifying test
                  </span>
                </Link>
              </div>
            </div>
          </section>



          <section id="book" className="relative px-4 pt-4 pb-16 scroll-mt-24">
            <div className="max-w-3xl mx-auto text-center">
              <p className="font-mono text-[10px] uppercase tracking-widest text-amber mb-3">
                Or talk to the operator
              </p>
              <button
                onClick={() => {
                  const el = document.getElementById('booking-embed');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-sm text-muted-foreground hover:text-amber underline underline-offset-4"
              >
                Book a 30-minute call →
              </button>
              <div id="booking-embed" className="forensic-tile rounded-sm border border-amber/30 p-2 md:p-4 mt-6">
                <div
                  className="meetings-iframe-container"
                  data-src="https://meetings-na2.hubspot.com/jtoney?embed=true"
                />
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default Home;
