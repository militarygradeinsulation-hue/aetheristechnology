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
import { SampleCaseFiles } from '@/components/SampleCaseFiles';
import { supabase } from '@/integrations/supabase/client';
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
      try {
        await supabase.from('tool_leads').insert({
          email: trimmed,
          tool_slug: 'ecosystem',
          tool_title: 'Aetheris Ecosystem',
          source: 'home_ecosystem_gate',
          user_agent: navigator.userAgent,
        });
      } catch (_) { /* non-fatal */ }
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
        description="Most growth-stage businesses are bleeding time, leads, and revenue without knowing where. I help established businesses uncover what is actually broken beneath the surface and build the systems to fix it."
        path="/home"
        keywords="business forensics, revenue leak audit, True Cost Forensics, Indianapolis, operator"
        breadcrumbs={[{ name: 'Home', path: '/' }]}
        speakable={['h1']}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />
        <main>
          <h1 className="sr-only px-4 pt-28 md:pt-36 pb-6 max-w-6xl mx-auto">
            Most growth-stage businesses are bleeding time, leads, and revenue without knowing where.
            Aetheris Chaos Theory Forensics finds the leak, quantifies the cost, and builds the systems to fix it.
          </h1>

          <section className="px-4 py-8 max-w-3xl mx-auto text-center">
            <h2 className="font-forensic text-3xl md:text-5xl font-bold text-foreground leading-tight">
              We are in the business of{" "}
              <span className="text-crimson italic">Chaos Theory Forensic</span>.
            </h2>
            <p className="mt-4 text-base md:text-lg text-muted-foreground">
              Find what causes the random chaos. Remove it where it begins.
            </p>
          </section>

          {/* One offer · The Leak Audit */}
          <section id="the-leak-audit" className="px-4 pb-10 scroll-mt-24">
            <div className="max-w-4xl mx-auto forensic-tile rounded-sm border border-amber/40 p-6 md:p-8 relative overflow-hidden">
              <div className="absolute top-3 right-3 font-case text-[9px] uppercase tracking-widest text-crimson border border-crimson/40 px-2 py-0.5 rounded-sm bg-crimson/5">
                Active case · limited slots this month
              </div>
              <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">
                The offer
              </div>
              <h2 className="font-forensic text-3xl md:text-4xl font-bold leading-tight mb-3">
                The Leak Audit — <span className="text-crimson">$2,500 flat.</span>
              </h2>
              <p className="text-sm md:text-base text-foreground/80 mb-6 max-w-2xl">
                Most growth-stage businesses are bleeding <span className="text-crimson font-bold">$40k–$180k/yr</span> in silent leaks. We find every one in 14 days — written report, ROI on every fix, applied 100% toward implementation. <span className="text-amber font-semibold">If the leaks we find don't exceed $2,500, you don't pay.</span>
              </p>

              <ChaosMindMap />

              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/leak-audit" className="w-full sm:w-auto">
                  <Button className="bg-amber text-background hover:bg-amber/90 font-bold w-full shadow-[0_0_25px_rgba(217,169,58,0.35)]">
                    Book my Leak Audit — $2,500 <ArrowRight className="w-4 h-4 ml-1" />
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
                Guaranteed ROI · Applied to implementation · Payment plan available
              </p>
            </div>
          </section>

          {/* Public sandbox — try every ecosystem tool, nothing saved */}
          <section id="chaos-ecosystem-try" className="px-4 pb-14 scroll-mt-24">
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
                One email unlocks the whole vault — scanners, diagnostics, report generators, closer kits, the same weapons we bill $2,500/session with. <span className="text-amber font-semibold">No card. No password. No spam.</span> You'll be inside in 3 seconds.
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
                  data-src="https://meetings-na2.hubspot.com/jtoney/joseph-toney-business-signal-analyst?embed=true"
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
