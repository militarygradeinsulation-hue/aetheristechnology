import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Calendar, FileText, Phone, Mail, MapPin, ChevronDown, Play, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/SEOHead";
import { Background } from "@/components/Background";
import { BOOK_MEETING_URL } from "@/lib/links";

import callingCard from "@/assets/joseph-toney-calling-card.jpg.asset.json";
import { ForensicDeckCarousel } from "@/components/ForensicDeckCarousel";


import { Navbar } from "@/components/Navbar";
import { HomeMindMapSection } from "@/components/HomeMindMapSection";
import { HomeFreeTrialArsenal } from "@/components/HomeFreeTrialArsenal";
import { HomeToolShopGrid } from "@/components/HomeToolShopGrid";





import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const LeakLanderPage: React.FC = () => {
  const [deckOpen, setDeckOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const navigate = useNavigate();
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleLogoTap = () => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    if (tapCountRef.current >= 3) {
      tapCountRef.current = 0;
      navigate("/staff");
      return;
    }
    tapTimerRef.current = setTimeout(() => { tapCountRef.current = 0; }, 600);
  };

  const toggleVideo = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.muted = false;
      v.volume = 1;
      v.play()
        .then(() => setPlaying(true))
        .catch(() => {
          v.muted = true;
          v.play().then(() => setPlaying(true)).catch(() => {});
        });
    } else {
      v.pause();
      v.currentTime = 0;
      setPlaying(false);
    }
  };

  return (
    <div className="relative min-h-screen text-foreground overflow-x-hidden flex flex-col">
      <Background />
      <div className="relative z-10 flex flex-col flex-1">
        <SEOHead
          title="Revenue Leak Investigation for Commercial Trade Contractors | Aetheris"
          description="Aetheris investigates commercial mechanical, electrical, roofing, and specialty trade contractors between $5M and $50M to find where money leaks between the field and the office: bid follow-up, change orders, T&M slippage, service agreements, dispatch drag, and account decay. Free leak audit. Written guarantee. Noblesville, Indiana."
          path="/"
          breadcrumbs={[{ name: 'Home', path: '/' }]}
          speakable={['h1', 'h2']}
        />


        {/* Free tools banner — value-first, prominent */}
        <Link
          to="/ecosystem"
          className="relative z-30 block w-full border-b-2 border-amber/60 transition-all hover:brightness-125 group"
          style={{ background: 'linear-gradient(90deg, hsl(36 75% 14%) 0%, hsl(36 80% 22%) 50%, hsl(36 75% 14%) 100%)' }}
        >
          <div className="max-w-6xl mx-auto px-4 py-3 text-center">
            <div className="font-case uppercase tracking-[0.2em] text-[10px] sm:text-xs text-amber/90 mb-1">
              // Free · No pitch
            </div>
            <div className="font-forensic text-lg sm:text-2xl md:text-3xl font-bold text-amber leading-tight">
              Try My Free Contractor Tools
              <span className="ml-3 inline-block text-amber-50 group-hover:translate-x-1 transition-transform">→</span>
            </div>
            <div className="text-[11px] sm:text-sm text-amber-50/80 mt-1">
              I'd rather help you first than sell to you. Use the whole toolkit on the house.
            </div>
          </div>
        </Link>

        <Navbar onContactClick={() => {}} />

        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 opacity-[0.06] mix-blend-overlay z-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, hsl(var(--amber)) 0%, transparent 40%), radial-gradient(circle at 80% 70%, hsl(var(--crimson, 0 60% 45%)) 0%, transparent 45%)",
          }}
        />

        <main className="relative flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-4">

        <div className="w-full">

          {/* HERO — Contractor niche */}
          <section className="mt-2 max-w-6xl mx-auto text-center animate-fade-in">
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="h-px w-8 bg-amber/50" />
              <span className="text-[9px] tracking-[0.35em] font-mono text-amber/80 uppercase">
                Commercial Trade Contractors · $5M–$50M
              </span>
              <span className="h-px w-8 bg-amber/50" />
            </div>
            <h1 className="font-forensic text-4xl sm:text-6xl md:text-7xl font-bold leading-[1.05] tracking-tight">
              Your backlog is <span className="text-amber italic">full.</span><br />
              Your margin is <span className="text-crimson italic">not.</span>
            </h1>
            <p className="mt-5 text-base sm:text-lg md:text-xl text-foreground/90 max-w-4xl mx-auto leading-relaxed">
              Aetheris investigates <span className="font-semibold text-foreground">commercial trade contractors between $5M and $50M</span> and finds exactly where the money is leaking between the field and the office. Then we remove it at the source.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
              <Button asChild size="default" className="h-12 px-7 text-sm bg-amber text-background hover:bg-amber/90 font-bold font-mono uppercase tracking-wider shadow-[0_0_25px_rgba(217,169,58,0.35)]">
                <Link to="/leak-audit">
                  <FileText className="w-4 h-4 mr-2" />
                  Open Your Case File
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="default"
                onClick={() => setBookingOpen(true)}
                className="h-12 px-7 text-sm border-white/20 bg-white/[0.06] hover:border-amber/50 hover:bg-amber/10 text-foreground font-mono uppercase tracking-wider"
              >
                <Calendar className="w-4 h-4 mr-2 text-amber" />
                Book a Read-Out
              </Button>
            </div>
            <p className="mt-3 font-case text-[11px] uppercase tracking-[0.28em] text-amber/80">
              Free · Five minutes · You get a real number
            </p>

            <p className="mt-6 font-mono text-[10px] sm:text-xs uppercase tracking-[0.28em] text-foreground/60">
              Mechanical · Electrical · Roofing · Sheet Metal · Plumbing · Fire Protection · Controls
            </p>
          </section>

          {/* QUALIFIER STRIP */}
          <section className="mt-8 max-w-4xl mx-auto animate-fade-in">
            <div className="rounded-sm border border-crimson/30 bg-crimson/[0.04] px-5 py-4 text-center">
              <p className="text-sm sm:text-base text-foreground/90 leading-relaxed">
                We do not work with residential home services. We do not work with anyone under $5M.
                We work with <span className="text-amber font-semibold">commercial trade contractors</span>,
                because that is where we know exactly where the money goes.
              </p>
            </div>
          </section>

          {/* Aetheris logo. top-left, triple-tap to /staff (admins + reps) */}
          <div className="max-w-6xl mx-auto flex justify-start mt-6 mb-1">
            <button
              type="button"
              onClick={handleLogoTap}
              aria-label="Aetheris"
              className="rounded-full focus:outline-none focus:ring-2 focus:ring-amber/60 select-none"
            >
              <img
                src="/aetheris-logo.png"
                alt="Aetheris"
                className="h-16 sm:h-24 md:h-32 w-auto opacity-90 hover:opacity-100 transition-opacity pointer-events-none"
                draggable={false}
              />
            </button>
          </div>

          {/* THE PREMISE */}
          <section className="mt-4 max-w-6xl mx-auto animate-fade-in">
            <div className="forensic-tile rounded-sm px-6 py-10 sm:px-10 sm:py-14 md:px-14 md:py-18 text-center">
              <div className="font-mono text-xs sm:text-sm uppercase tracking-[0.25em] text-amber mb-4">
                // The Premise
              </div>
              <h2 className="font-forensic text-3xl sm:text-4xl md:text-5xl font-bold leading-tight text-foreground">
                Nothing about this is <span className="text-crimson italic">random.</span>
              </h2>
              <div className="mt-6 max-w-3xl mx-auto space-y-4 text-base sm:text-lg text-foreground/85 leading-relaxed">
                <p>
                  You are busy. Backlog is strong. Crews are out. And somehow the number at the bottom of the P&L does not match the work that went out the door.
                </p>
                <p>
                  Most owners call that bad luck, a bad quarter, or the market. It is none of those. Your business is a system, and it is producing exactly the result it was built to produce. The money is not vanishing. It is <span className="text-crimson font-semibold">leaking</span>, in the same places, on schedule, every month.
                </p>
                <p className="font-forensic text-xl sm:text-2xl text-foreground pt-2">
                  The chaos always has a <span className="text-amber">cause</span>. The cause always leaves <span className="text-amber">evidence</span>.
                </p>
                <p className="font-case text-[11px] uppercase tracking-[0.28em] text-amber/80 pt-1">
                  We find it.
                </p>
              </div>
            </div>
          </section>

          {/* THE SIX LEAKS — centerpiece */}
          <section className="mt-6 max-w-6xl mx-auto animate-fade-in">
            <div className="text-center mb-6">
              <div className="font-mono text-xs uppercase tracking-[0.25em] text-amber mb-3">
                // Case File · Six Leaks
              </div>
              <h2 className="font-forensic text-2xl sm:text-3xl md:text-4xl font-bold leading-tight max-w-4xl mx-auto">
                Six places commercial contractors lose money.<br />
                You are leaking in <span className="text-crimson italic">at least three.</span>
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                {
                  no: '01',
                  title: 'The bid follow-up void',
                  body: 'The estimate goes out. Nobody calls. The GC awards it to whoever stayed in front of them. Your win-rate problem is usually a follow-up problem wearing a pricing costume.',
                },
                {
                  no: '02',
                  title: 'Change order leakage',
                  body: 'The field performs the work before the paperwork exists. Your crew delivered the margin. Your invoice never asked for it.',
                },
                {
                  no: '03',
                  title: 'T&M slippage',
                  body: 'Tickets written on paper in a truck, reaching billing late, incomplete, or never. Hours worked. Materials installed. Revenue unclaimed.',
                },
                {
                  no: '04',
                  title: 'The service-to-agreement gap',
                  body: 'Your techs are standing inside buildings that need maintenance agreements, and they drive away without offering one. The warmest lead in your business leaves in a van every day.',
                },
                {
                  no: '05',
                  title: 'Dispatch and response drag',
                  body: 'A call comes in at 6pm Friday. The contractor who answers first wins it. Yours went to voicemail.',
                },
                {
                  no: '06',
                  title: 'Silent account decay',
                  body: 'The account that ordered every month now orders every quarter. Nobody was alerted, because nobody is watching. Contractors do not get fired. They get faded.',
                },
              ].map((leak) => (
                <div
                  key={leak.no}
                  className="rounded-sm border border-amber/25 bg-card/70 backdrop-blur-sm p-5 hover:border-amber/60 transition-colors"
                >
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="font-forensic text-3xl font-bold text-amber leading-none">{leak.no}</span>
                    <span className="font-case text-[9px] uppercase tracking-widest text-crimson/80 border border-crimson/40 px-1.5 py-0.5 rounded-sm">Active</span>
                  </div>
                  <h3 className="font-forensic text-lg font-bold text-foreground leading-tight mb-2">
                    {leak.title}
                  </h3>
                  <p className="text-sm text-foreground/80 leading-relaxed">{leak.body}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 text-center">
              <p className="font-forensic text-lg sm:text-xl text-foreground/90 mb-4">
                If three of those made you uncomfortable, <span className="text-crimson">your case is worth opening.</span>
              </p>
              <Button asChild size="default" className="h-12 px-7 bg-amber text-background hover:bg-amber/90 font-bold font-mono uppercase tracking-wider shadow-[0_0_25px_rgba(217,169,58,0.35)]">
                <Link to="/leak-audit">
                  <FileText className="w-4 h-4 mr-2" />
                  Open Your Case File
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </div>
          </section>

          {/* HOW IT WORKS — four steps */}
          <section className="mt-8 max-w-6xl mx-auto animate-fade-in">
            <div className="text-center mb-6">
              <div className="font-mono text-xs uppercase tracking-[0.25em] text-amber mb-3">
                // How It Works
              </div>
              <h2 className="font-forensic text-2xl sm:text-3xl md:text-4xl font-bold leading-tight">
                We work your business like a <span className="text-amber italic">case.</span> Four steps.
              </h2>
            </div>

            <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { n: 1, title: 'The scan',        body: 'Twelve questions. Five minutes. You answer from memory, no data pull required.' },
                { n: 2, title: 'The case file',   body: 'We open a real file, run the analysis, and send you Preliminary Findings: named leaks, with what each one is costing you per year, in dollars.' },
                { n: 3, title: 'The read-out',    body: 'Fifteen minutes on the phone. We walk you through your own evidence. No pitch, no deck. If your case is not worth investigating, we say so.' },
                { n: 4, title: 'The investigation', body: 'If you want the full picture, we come to your shop. We ride with a tech, sit with the estimator, and watch a ticket travel from the field to billing. Then we tell you the truth and remove the cause.' },
              ].map((s) => (
                <li key={s.n} className="rounded-sm border border-amber/25 bg-card/70 backdrop-blur-sm p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-amber text-background font-bold font-forensic text-lg">
                      {s.n}
                    </span>
                    <h3 className="font-forensic text-lg font-bold text-foreground leading-tight">{s.title}</h3>
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed">{s.body}</p>
                </li>
              ))}
            </ol>

            <p className="mt-5 text-center font-forensic italic text-base text-foreground/70">
              Consultants send you a survey. <span className="text-amber not-italic font-semibold">We show up at your shop.</span>
            </p>
          </section>

          {/* FINDINGS, NOT ACTIVITY */}
          <section className="mt-8 max-w-4xl mx-auto animate-fade-in">
            <div className="rounded-sm border border-amber/30 bg-card/60 backdrop-blur-sm px-6 py-8 text-center">
              <div className="font-mono text-xs uppercase tracking-[0.25em] text-amber mb-3">
                // What You Actually Get
              </div>
              <h2 className="font-forensic text-2xl sm:text-3xl font-bold leading-tight mb-4">
                Findings, <span className="text-crimson italic">not activity.</span>
              </h2>
              <p className="text-base text-foreground/85 leading-relaxed max-w-2xl mx-auto">
                We are not an agency. We do not sell retainers, hours, ad spend, or logo refreshes. We do not send you a slide deck describing your own problem back to you.
              </p>
              <p className="mt-3 text-base text-foreground/85 leading-relaxed max-w-2xl mx-auto">
                We find what is broken, tell you what it costs, and build the systems that make it stop. Then the engagement ends, because the problem does.
              </p>
            </div>
          </section>

          {/* Signature calling card — gentle float + golden shimmer edge */}
          <section className="mt-8 max-w-6xl mx-auto animate-fade-in" aria-label="Joseph Toney — Aetheris">
            <div className="shimmer-gold-border">
              <img
                src={callingCard.url}
                alt="Joseph Toney — Aetheris. One operator works your case."
                className="w-full h-auto animate-float rounded-sm"
                loading="eager"
                fetchPriority="high"
                decoding="async"
                width={1280}
                height={731}
              />
            </div>
          </section>

          {/* THE ARCHITECT */}
          <section
            className="mt-6 max-w-4xl mx-auto animate-fade-in"
            style={{ animationDelay: "80ms", animationFillMode: "both" }}
          >
            <div className="rounded-sm border border-amber/30 bg-card/70 backdrop-blur-sm px-6 py-8 sm:px-10 sm:py-10">
              <div className="font-mono text-xs uppercase tracking-[0.25em] text-amber mb-3 text-center">
                // The Architect
              </div>
              <h2 className="font-forensic text-2xl sm:text-3xl md:text-4xl font-bold leading-tight text-center mb-4">
                One operator. <span className="text-amber italic">Yours.</span>
              </h2>
              <p className="text-base text-foreground/90 leading-relaxed">
                <span className="font-semibold text-foreground">Joseph Toney.</span> Marine Corps veteran. Director-level strategy in aerospace. Builder of 30+ production AI and automation systems across specialty manufacturing, commercial construction, and aerospace. MS in Marketing, Liberty University, 4.0. Doctoral candidate. Certified by IBM, Harvard, Google, and HubSpot.
              </p>
              <p className="mt-4 text-base text-foreground/85 leading-relaxed">
                One operator works your case. Not a rotating team, not a junior analyst, not an account manager. Me.
              </p>
              <blockquote className="mt-5 border-l-2 border-amber/60 pl-4 font-forensic italic text-base sm:text-lg text-foreground/90">
                "Business is simply chaos theory. However, I find what causes the 'random' chaos to happen and begin removing it where it begins."
              </blockquote>
            </div>
          </section>

          {/* GOLDEN REPORT — the one tool. */}
          <div className="mt-8">
            <HomeToolShopGrid />
          </div>


          {/* FINAL PITCH */}
          <section
            className="mt-8 max-w-4xl mx-auto text-center animate-fade-in"
            style={{ animationDelay: "120ms", animationFillMode: "both" }}
          >
            <h2 className="font-forensic text-3xl sm:text-4xl md:text-5xl font-bold leading-tight">
              The chaos has a cause.<br />
              <span className="text-amber italic">Let's find it.</span>
            </h2>
            <p className="mt-4 text-base sm:text-lg text-foreground/85 max-w-2xl mx-auto">
              Five minutes. A real number. No cost, and no obligation to ever speak to me.
            </p>
          </section>

          {/* CTAs */}
          <section
            className="mt-5 flex flex-col items-center gap-3 animate-fade-in"
            style={{ animationDelay: "180ms", animationFillMode: "both" }}
          >
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 w-full">
              <Button asChild size="default" className="h-12 px-7 text-sm bg-amber text-background hover:bg-amber/90 font-bold font-mono uppercase tracking-wider shadow-[0_0_25px_rgba(217,169,58,0.35)]">
                <Link to="/leak-audit">
                  <FileText className="w-4 h-4 mr-2" />
                  Open Your Case File
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="default"
                onClick={() => setBookingOpen(true)}
                className="h-12 px-7 text-sm border-white/20 bg-white/[0.06] hover:border-amber/50 hover:bg-amber/10 text-foreground font-mono uppercase tracking-wider"
              >
                <Calendar className="w-4 h-4 mr-2 text-amber" />
                Book the Read-Out
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
            <p className="font-case text-[10px] uppercase tracking-[0.28em] text-foreground/60">
              Aetheris · Chaos Theory Forensics · Real Findings. No Sugar.
            </p>
          </section>
















          {/* THE LEAK ECOSYSTEM — always unlocked, no email gate */}
          <HomeMindMapSection onBookAudit={() => setBookingOpen(true)} />

          {/* Golden Report CTA now lives above; no duplicate here. */}










          {/* CUSTOM BUILD — specific idea or tool */}
          <section
            className="mt-6 max-w-6xl mx-auto animate-fade-in"
            style={{ animationDelay: "280ms", animationFillMode: "both" }}
          >
            <style>{`
              @keyframes customBuildMarquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
              @keyframes customBuildPulse { 0%,100% { opacity: 0.35; } 50% { opacity: 0.85; } }
              @keyframes customBuildOrbit { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
              .cb-marquee-track { animation: customBuildMarquee 42s linear infinite; }
              .cb-marquee:hover .cb-marquee-track { animation-play-state: paused; }
              .cb-dot { animation: customBuildPulse 2.6s ease-in-out infinite; }
              .cb-orbit { animation: customBuildOrbit 22s linear infinite; }
            `}</style>

            <div className="relative rounded-sm border border-amber/40 bg-gradient-to-br from-card/90 via-background/60 to-card/80 backdrop-blur-md p-6 sm:p-9 overflow-hidden shadow-[0_0_60px_-20px_hsl(var(--amber)/0.45)]">
              {/* Ambient chaos glow */}
              <div aria-hidden className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full opacity-30 blur-3xl" style={{ background: "radial-gradient(circle, hsl(var(--amber)/0.5), transparent 70%)" }} />
              <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-24 w-72 h-72 rounded-full opacity-25 blur-3xl" style={{ background: "radial-gradient(circle, hsl(var(--crimson,0 60% 45%)/0.5), transparent 70%)" }} />

              {/* Orbiting corner sigil */}
              <div aria-hidden className="pointer-events-none absolute top-3 right-3 w-14 h-14 opacity-70">
                <div className="absolute inset-0 rounded-full border border-amber/40" />
                <div className="absolute inset-2 rounded-full border border-dashed border-amber/30 cb-orbit" />
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-amber cb-dot" />
              </div>

              {/* Corner brackets */}
              {["top-2 left-2 border-l border-t","top-2 right-2 border-r border-t","bottom-2 left-2 border-l border-b","bottom-2 right-2 border-r border-b"].map(c => (
                <span key={c} aria-hidden className={`absolute ${c} w-3 h-3 border-amber/70`} />
              ))}

              <div className="relative text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <span className="h-px w-8 bg-amber/50" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-amber">Custom Build · Case File 0-Day</span>
                  <span className="h-px w-8 bg-amber/50" />
                </div>

                <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full border border-amber/40 bg-background/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber cb-dot" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber/90">200+ apps shipped · Receipts below</span>
                </div>

                <h2 className="font-forensic text-2xl sm:text-3xl md:text-4xl font-bold leading-tight max-w-5xl mx-auto">
                  Have a specific idea or tool you want built?{" "}
                  <span className="text-amber italic">I can build it.</span>
                </h2>

                <p className="mt-3 font-forensic text-lg sm:text-xl italic text-crimson/90 max-w-4xl mx-auto">
                  The more crazy or impossible — the better.
                </p>

                <p className="mt-4 text-sm sm:text-base text-foreground/80 leading-relaxed max-w-4xl mx-auto">
                  One-off automations. Internal AI tools. Forensic diagnostics.
                  Scraping pipelines. Private dashboards. Custom operator systems.
                  If it doesn't exist yet, I'll build it from scratch and hand it to you working.
                </p>

                <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => setBookingOpen(true)}
                    className="group relative inline-flex items-center justify-center h-14 px-8 font-mono uppercase tracking-[0.2em] text-sm font-bold text-background overflow-hidden rounded-sm"
                  >
                    {/* animated gradient background */}
                    <span aria-hidden className="absolute inset-0 bg-gradient-to-r from-amber via-amber/80 to-amber bg-[length:200%_100%]" style={{ animation: "shimmer-gold-drift 3s linear infinite" }} />
                    {/* pulsing outer glow */}
                    <span aria-hidden className="absolute -inset-0.5 bg-amber/60 blur-lg opacity-70 group-hover:opacity-100 transition-opacity" />
                    {/* corner brackets */}
                    <span aria-hidden className="absolute top-1 left-1 w-2.5 h-2.5 border-l border-t border-background/70" />
                    <span aria-hidden className="absolute top-1 right-1 w-2.5 h-2.5 border-r border-t border-background/70" />
                    <span aria-hidden className="absolute bottom-1 left-1 w-2.5 h-2.5 border-l border-b border-background/70" />
                    <span aria-hidden className="absolute bottom-1 right-1 w-2.5 h-2.5 border-r border-b border-background/70" />
                    <span className="relative flex items-center">
                      <Calendar className="w-4 h-4 mr-2.5" />
                      Tell me what you want built
                      <ArrowRight className="ml-2.5 w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </button>
                </div>

                <p className="mt-3 text-xs text-foreground/60 italic">
                  Scoped, priced, delivered — no ongoing retainers unless you want them.
                </p>

                <div className="mt-6 flex flex-col items-center gap-3">
                  <p className="text-center text-xs sm:text-sm text-foreground/70 max-w-md">
                    Want to see what's underneath?{" "}
                    <button
                      onClick={() => setBookingOpen(true)}
                      className="text-amber underline underline-offset-4 hover:text-amber/80 transition-colors"
                    >
                      Get in touch
                    </button>{" "}
                    and I'll walk you through what I've built.
                  </p>
                </div>


              </div>


              {/* Receipts marquee — real apps shipped */}
              <div className="relative mt-7 pt-5 border-t border-dashed border-amber/25">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="font-mono text-[9px] uppercase tracking-[0.32em] text-amber/80">Selected receipts · live builds</span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.32em] text-foreground/50 hidden sm:inline">Hover to pause</span>
                </div>
                <div
                  className="cb-marquee relative overflow-hidden"
                  style={{ maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)", WebkitMaskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)" }}
                >
                  <div className="cb-marquee-track flex gap-3 whitespace-nowrap w-max">
                    {(() => {
                      const apps = [
                        "Lumina Studio", "Genesis Control", "Kelly Oracle Machine",
                        "Firecrawl AI", "Auto-Influence Nexus", "Token Risk Analyzer",
                        "Muscle Memory Forge", "Sales-Fit Assessment Engine", "RenderRight AI",
                        "AI Command Center", "Resume-Fit Compass", "Clear CRM Flow",
                        "Founder Finder Pro", "Playground Insights Bot", "Script Spark",
                        "Tax Treasure Chest", "MCP Interface", "Business Post Analyst",
                        "Gemini Powerhouse", "Photo-to-Scene", "Friction Finder",
                        "Aetheris AI Studio", "CTOguy Lead Gen", "AI Tile Haven",
                        "Perfect System Builder", "Swift Code Composer", "Echo Influence Scribe",
                        "Quantum Vision", "Build It Better", "Playful Blueprints Studio",
                      ];
                      const loop = [...apps, ...apps];
                      return loop.map((name, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border border-amber/25 bg-background/50 font-mono text-[11px] uppercase tracking-widest text-foreground/85 hover:border-amber/70 hover:text-amber transition-colors"
                        >
                          <span className="w-1 h-1 rounded-full bg-amber/70" />
                          {name}
                        </span>
                      ));
                    })()}
                  </div>
                </div>
                <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.28em] text-foreground/55">
                  …and ~170 more in the vault. Bring me your impossible one.
                </p>
              </div>
            </div>
          </section>










          {/* Scan + free tools now live inside HomeMindMapSection above */}



          {/* Downloads + Deck — combined case-file card */}
          <section
            className="mt-5 max-w-6xl mx-auto animate-fade-in"
            style={{ animationDelay: "320ms", animationFillMode: "both" }}
          >
            <div className="rounded-lg border border-amber/30 bg-card/80 backdrop-blur-sm shadow-[0_10px_30px_-15px_rgba(0,0,0,0.5)] overflow-hidden">
              {/* Row 1: One-tap PDF */}
              <a
                href="/downloads/How-Aetheris-Can-Help-You.pdf"
                download="How-Aetheris-Can-Help-You.pdf"
                target="_blank"
                rel="noopener"
                onClick={async (e) => {
                  try {
                    e.preventDefault();
                    const res = await fetch("/downloads/How-Aetheris-Can-Help-You.pdf", { cache: "no-store" });
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    const blob = await res.blob();
                    const blobUrl = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = blobUrl;
                    a.download = "How-Aetheris-Can-Help-You.pdf";
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
                  } catch {
                    window.open("/downloads/How-Aetheris-Can-Help-You.pdf", "_blank", "noopener");
                  }
                }}
                className="group flex items-center gap-3 px-3 py-2.5 hover:bg-amber/[0.04] transition-colors"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber/15 ring-1 ring-amber/40">
                  <Download className="w-4 h-4 text-amber" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-amber">Free Download · PDF</div>
                  <div className="font-forensic text-sm sm:text-base font-bold text-foreground leading-tight">
                    How Aetheris Can Help You
                  </div>
                  <div className="text-[11px] text-muted-foreground">No email required. Tap to download.</div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-amber shrink-0 group-hover:translate-x-1 transition-transform" />
              </a>

              {/* Divider */}
              <div className="h-px bg-amber/20" />

              {/* Row 2: Deck toggle */}
              <button
                type="button"
                onClick={() => setDeckOpen((v) => !v)}
                className="group w-full flex items-center gap-3 px-3 py-2.5 hover:bg-amber/[0.04] transition-colors text-left"
                aria-expanded={deckOpen}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber/10 ring-1 ring-amber/30">
                  <ChevronDown className={`w-4 h-4 text-amber transition-transform ${deckOpen ? "rotate-180" : ""}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-amber">Case File · Deck</div>
                  <div className="font-forensic text-sm sm:text-base font-bold text-foreground leading-tight">
                    Forensic Revenue Recovery
                  </div>
                  <div className="text-[11px] text-muted-foreground">{deckOpen ? "Tap to collapse." : "Tap to open the deck."}</div>
                </div>
              </button>

              {deckOpen && (
                <div className="border-t border-amber/20 animate-fade-in">
                  <div className="px-3 py-2 flex flex-wrap items-center justify-center gap-2 border-b border-amber/20">
                    <a
                      href="/downloads/Forensic-Revenue-Recovery.pdf"
                      download
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-amber/40 bg-amber/10 hover:bg-amber/20 text-amber font-mono text-[10px] uppercase tracking-wider transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" /> Download PDF
                    </a>
                    <a
                      href="/downloads/Forensic-Revenue-Recovery.pptx"
                      download
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-white/15 bg-white/[0.04] hover:bg-white/[0.10] text-foreground font-mono text-[10px] uppercase tracking-wider transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" /> Download PPTX
                    </a>
                  </div>
                  <div className="p-2">
                    <ForensicDeckCarousel />
                  </div>
                </div>
              )}
            </div>
          </section>




          {/* Contact info. compact glass row */}
          <section
            className="relative mt-6 animate-fade-in"
            style={{ animationDelay: "340ms", animationFillMode: "both" }}
          >
            <div className="rounded-lg border border-amber/25 bg-card/80 backdrop-blur-sm px-3 py-3 sm:px-4 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.5)]">
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-sm">
                <a href="tel:+13173762110" className="group inline-flex items-center gap-1.5 hover:text-amber transition-colors">
                  <Phone className="w-3.5 h-3.5 text-amber" />
                  <span className="font-semibold">(317) 376-2110</span>
                </a>
                <span className="h-3.5 w-px bg-white/15 hidden sm:block" />
                <a href="mailto:Aetheris.technology@outlook.com" className="group inline-flex items-center gap-1.5 hover:text-amber transition-colors">
                  <Mail className="w-3.5 h-3.5 text-amber" />
                  <span className="font-semibold break-all">Aetheris.technology@outlook.com</span>
                </a>
                <span className="h-3.5 w-px bg-white/15 hidden sm:block" />
                <span className="inline-flex items-center gap-1.5 text-foreground">
                  <MapPin className="w-3.5 h-3.5 text-amber" />
                  <span className="font-semibold">Noblesville, Indiana</span>
                </span>
              </div>
            </div>
            <p className="mt-2 text-center text-[10px] font-mono tracking-[0.25em] text-muted-foreground uppercase">
              Aetheris · Chaos Theory Forensics · aetheris.technology
            </p>
          </section>
        </div>
      </main>

      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <DialogContent className="max-w-3xl w-[95vw] p-0 border border-amber/30 bg-card/95 backdrop-blur-xl overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Book the Diagnostic</DialogTitle>
            <DialogDescription>Pick a time to talk through your business leaks.</DialogDescription>
          </DialogHeader>
          <div className="p-2 md:p-4">
            <iframe
              src={`${BOOK_MEETING_URL}?embed=true`}
              title="Book the Diagnostic"
              className="w-full h-[70vh] min-h-[500px] rounded-sm border-0"
              loading="lazy"
            />
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
};

export default LeakLanderPage;

