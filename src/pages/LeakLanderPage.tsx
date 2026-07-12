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
          title="Revenue Leak Audit for $5M–$50M Businesses | Aetheris — Chaos Theory Forensics"
          description="Aetheris investigates where US $5M–$50M businesses lose money — vocabulary friction, brand contradictions, conversion drop-offs, follow-up failures, system disconnects, operational waste, growth ceilings. 30% average recovery on named leaks. Written guarantee. Indianapolis + nationwide."
          path="/"
          keywords="revenue leak audit, revenue forensics, chaos theory forensics, business forensics operator, forensic revenue diagnostic, vocabulary friction audit, brand contradiction analysis, conversion drop-off audit, sales follow-up audit, CRM data hygiene audit, operational waste diagnostic, growth ceiling diagnosis, specialty manufacturer revenue audit, 21-day revenue diagnostic, active case operator, leak audit methodology, revenue leak detection USA, nationwide revenue forensics, US business revenue audit, mid-market revenue diagnostic, $5M to $50M business audit, forensic diagnostic Indianapolis, forensic diagnostic Chicago, forensic diagnostic Dallas, forensic diagnostic Atlanta, forensic diagnostic Denver"
        />


        {/* LinkedIn premium offer banner — slim, above navbar */}
        <a
          href="https://www.linkedin.com/in/thejosephtoney"
          target="_blank"
          rel="noopener noreferrer"
          className="relative z-30 block w-full text-amber-50 border-b border-amber/30 transition-colors hover:brightness-110"
          style={{ backgroundColor: 'hsl(36 75% 14%)' }}
        >
          <div className="max-w-5xl mx-auto px-4 py-1 text-center text-[11px] sm:text-xs font-medium truncate">
            <span className="font-case uppercase tracking-widest text-amber mr-2">Limited</span>
            Connect on LinkedIn — get a <span className="text-amber font-semibold">free premium analysis</span>
            <span className="ml-2 underline underline-offset-2">Connect →</span>
          </div>
        </a>

        <Navbar onContactClick={() => {}} />

        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 opacity-[0.06] mix-blend-overlay z-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, hsl(var(--amber)) 0%, transparent 40%), radial-gradient(circle at 80% 70%, hsl(var(--crimson, 0 60% 45%)) 0%, transparent 45%)",
          }}
        />

        <main className="relative flex-1 flex items-center justify-center max-w-7xl w-full mx-auto px-4 sm:px-8 py-4">

        <div className="w-full">
          {/* Aetheris logo. top-left, triple-tap to /staff (admins + reps) */}
          <div className="max-w-4xl mx-auto flex justify-start mb-1">
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

          {/* Anti-AI positioning — first thing they read */}
          <section className="mt-4 max-w-4xl mx-auto text-center animate-fade-in">
            <div className="relative rounded-lg border border-amber/30 bg-card/60 backdrop-blur-sm px-5 py-6 sm:px-8 sm:py-8 shadow-[0_0_40px_-15px_hsl(var(--amber)/0.35)]">
              <div className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.2em] text-amber/80 mb-3">
                // Aetheris Field Note
              </div>
              <h2 className="font-forensic text-2xl sm:text-3xl md:text-5xl font-bold leading-tight">
                <span className="text-foreground">Sick of AI everywhere and just want something </span>
                <span className="text-amber italic">simple that actually works?</span>
              </h2>
              <p className="mt-4 text-lg sm:text-xl md:text-2xl text-crimson font-bold tracking-tight">
                This is us.
              </p>
              <p className="mt-3 text-sm sm:text-base md:text-lg text-foreground/90 font-medium">
                We make a system that <span className="text-amber font-semibold">YOUR</span> person can follow daily — customized to <span className="text-amber font-semibold">YOUR</span> company — for any department. From social to sales to leadership.
              </p>
              <p className="mt-3 text-sm sm:text-base md:text-lg text-muted-foreground">
                We're the most <span className="text-amber font-semibold">anti-AI, AI company</span> you'll ever meet.
              </p>
            </div>
          </section>


          {/* Signature calling card — gentle float + golden shimmer edge */}
          <section className="mt-5 max-w-4xl mx-auto animate-fade-in" aria-label="Joseph Toney, AI Architect — Aetheris Business Forensics">
            <div className="shimmer-gold-border">
              <img
                src={callingCard.url}
                alt="Joseph Toney, AI Architect — IBM AI Certified. I find the cause of chaos and remove it at the source. Aetheris Business Forensics."
                className="w-full h-auto animate-float rounded-sm"
                loading="eager"
                fetchPriority="high"
                decoding="async"
                width={1280}
                height={731}
              />
            </div>
          </section>

          {/* AUTHORITY + OUTCOMES STRIP — proof above the fold */}
          <section
            className="mt-4 max-w-4xl mx-auto animate-fade-in"
            style={{ animationDelay: "80ms", animationFillMode: "both" }}
            aria-label="Aetheris outcomes and credentials"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
              {[
                { stat: "30%", label: "AVG. RECOVERY ON NAMED LEAKS\n\n\nFREE FORENSIC SCAN\n\n\nMONEY BACK GUARANTEE IF WE CAN'T HELP", tone: "amber" },,
                { stat: "10–40×", label: "TYPICAL LEAK / FEE RATIO\nROI ON INVESTMENT INSTANTLY ", tone: "amber" },
                { stat: "20 yrs", label: "BUILDING REVENUE SYSTEMS\n-FORMER CONSTRUCTION CEO\n-OVER 200 PERSONAL CLIENTS\n\n", tone: "amber" },
                { stat: "USMC + MS + BA + IBM", label: "MARINE VET · DIGITAL FORENSICS", tone: "crimson" },
              ].map((it) => (
                <div
                  key={it.label}
                  className={`rounded-sm border ${it.tone === "crimson" ? "border-crimson/40" : "border-amber/30"} bg-card/60 backdrop-blur-sm p-2.5 sm:p-3 text-center`}
                >
                  <div className={`font-forensic text-base sm:text-xl font-bold leading-none ${it.tone === "crimson" ? "text-crimson" : "text-amber"}`}>
                    {it.stat}
                  </div>
                  <div className="mt-1 font-mono text-[9px] sm:text-[10px] uppercase tracking-wider text-foreground/70 leading-tight">
                    {it.label}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* GOLDEN REPORT — the one tool. No mind map, no distractions. */}
          <HomeToolShopGrid />




          {/* HERO — Chaos Theory Forensics */}

          <section
            className="mt-3 max-w-4xl mx-auto text-center animate-fade-in"
            style={{ animationDelay: "120ms", animationFillMode: "both" }}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="h-px w-8 bg-amber/50" />
              <span className="text-[9px] tracking-[0.35em] font-mono text-amber/80 uppercase">Chaos Theory Forensics · Indianapolis · US-Wide</span>
              <span className="h-px w-8 bg-amber/50" />
            </div>
            <h1 className="font-forensic text-3xl sm:text-5xl md:text-6xl font-bold leading-[1.05] tracking-tight">
              Business is <span className="text-amber italic">chaos</span>.<br />
              Chaos always has <span className="text-crimson italic">cause</span>.
            </h1>
            <p className="mt-4 text-base sm:text-lg text-foreground/85 max-w-2xl mx-auto">
              <br />
            </p>
            <p className="mt-4 text-base sm:text-lg text-foreground/85 max-w-2xl mx-auto">
              Aetheris practices <span className="text-amber font-semibold">Chaos Theory Forensics</span>. We investigate established businesses, trace every dollar of bleed back to its origin, and remove the cause at the source.
            </p>
            <p className="mt-4 text-base sm:text-lg text-foreground max-w-2xl mx-auto">
              Across sales, CRM, follow-up, and lead flow, document client outcome: <span className="text-crimson font-bold">30% average recovery</span> on the leaks we name and fix.
            </p>
            <p className="mt-3 font-forensic text-xl sm:text-2xl text-foreground/90 max-w-2xl mx-auto">
              If we can't name a leak worth more than our fee, <span className="text-crimson">you pay nothing</span>. Written guarantee.
            </p>
            <p className="mt-2 font-case text-[11px] uppercase tracking-[0.28em] text-amber/80">
              Named leaks. Dollar figures. No fluff.
            </p>
          </section>

          {/* CTAs */}
          <section
            className="mt-5 flex flex-col items-center gap-3 animate-fade-in"
            style={{ animationDelay: "180ms", animationFillMode: "both" }}
          >
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 w-full">
              <Button asChild variant="outline" size="default" className="h-11 px-6 text-sm border-white/20 bg-white/[0.06] hover:border-amber/50 hover:bg-amber/10 text-foreground font-mono uppercase tracking-wider">
                <Link to="/leak-audit">
                  <FileText className="w-4 h-4 mr-2 text-amber" />
                  Run the 60-second Leak Scan
                </Link>
              </Button>
              <Button
                size="default"
                onClick={() => setBookingOpen(true)}
                className="h-11 px-6 text-sm bg-amber text-background hover:bg-amber/90 font-bold font-mono uppercase tracking-wider"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Book the Forensic Call
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
            <Link
              to="/chaos-scan"
              className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-amber hover:underline underline-offset-4"
            >
              Or generate the free Chaos Scan report <ArrowRight className="w-3 h-3" />
            </Link>
          </section>

          {/* ENGAGEMENT LADDER — one-line teaser; full ladder + price explainers live on /diagnostic */}
          <section
            className="mt-6 max-w-4xl mx-auto animate-fade-in"
            style={{ animationDelay: "195ms", animationFillMode: "both" }}
            aria-label="Engagement ladder teaser"
          >
            <Link
              to="/diagnostic"
              className="group block rounded-sm border border-amber/30 bg-card/60 hover:bg-amber/[0.06] hover:border-amber/60 transition p-3 sm:p-4"
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="font-mono text-[10px] uppercase tracking-[0.35em] text-amber/90">Engagement Ladder · USD Flat</div>
                  <div className="mt-1 text-sm sm:text-base text-foreground/85">
                    <span className="text-amber font-semibold">$2,500</span> Leak Audit →{" "}
                    <span className="text-amber font-semibold">$18,500</span> 21-Day Diagnostic →{" "}
                    <span className="text-amber font-semibold">$15,000/mo</span> Active Case
                  </div>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-amber inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  See why each price <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
          </section>

          {/* AETHERIS VS OTHERS — visible competitive strip */}
          <section
            className="mt-6 max-w-4xl mx-auto animate-fade-in"
            style={{ animationDelay: "205ms", animationFillMode: "both" }}
            aria-label="Aetheris versus agencies, consultants, and software"
          >
            <div className="rounded-sm border border-crimson/30 bg-card/70 backdrop-blur-sm overflow-hidden">
              <div className="px-4 py-2 border-b border-crimson/20 bg-crimson/[0.04]">
                <div className="font-mono text-[10px] uppercase tracking-[0.35em] text-crimson">Anti-Positioning · Read before comparing bids</div>
                <div className="font-forensic text-base sm:text-lg font-bold leading-tight mt-0.5">
                  Not an agency. Not a consultant. Not a software pitch.
                </div>
              </div>
              <div className="grid sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/10 text-xs">
                {[
                  { h: "Agencies", body: "Sell effort — retainers, activity reports, deliverables that measure motion instead of results.", tone: "muted" },
                  { h: "Consultants", body: "Sell opinions — frameworks and slide decks that describe your problem back to you.", tone: "muted" },
                  { h: "Software", body: "Sell tools — one more login, one more subscription your team won't use.", tone: "muted" },
                  { h: "Aetheris", body: "Sells findings + removal. Named leaks. Dollar figures. Systems that eliminate the cause. Then the engagement ends.", tone: "amber" },
                ].map((c) => (
                  <div key={c.h} className={`p-3 ${c.tone === "amber" ? "bg-amber/[0.05]" : ""}`}>
                    <div className={`font-mono text-[10px] uppercase tracking-widest mb-1 ${c.tone === "amber" ? "text-amber" : "text-foreground/60"}`}>
                      {c.h}
                    </div>
                    <p className={`leading-snug ${c.tone === "amber" ? "text-foreground" : "text-foreground/75"}`}>{c.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>









          {/* THE FILTER — unmissable, collapsible */}
          <section
            className="mt-6 max-w-4xl mx-auto animate-fade-in"
            style={{ animationDelay: "200ms", animationFillMode: "both" }}
          >
            <details className="group relative rounded-sm border-2 border-crimson/50 bg-crimson/[0.04] p-4 sm:p-5">
              <summary className="cursor-pointer list-none flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-crimson">Fit check · read before booking</div>
                  <h2 className="font-forensic text-lg sm:text-xl font-bold leading-tight mt-0.5">
                    Is this the right engagement for you?
                  </h2>
                </div>
                <span className="font-mono text-xs text-crimson shrink-0 group-open:hidden">+</span>
                <span className="font-mono text-xs text-crimson shrink-0 hidden group-open:inline">−</span>
              </summary>
              <div className="mt-3 space-y-2.5 text-sm text-foreground/85 leading-relaxed">
                <p>
                  Our engagement ladder: <span className="text-amber font-semibold">Leak Audit $2,500</span> (named leaks + dollar exposure) → <span className="text-amber font-semibold">21-Day Revenue Diagnostic $18,500</span> (full forensic dig, credited 1:1 toward the Active Case) → <span className="text-amber font-semibold">Active Case $15,000/mo</span> (operator-led implementation, 3-month minimum).
                </p>
                <p>
                  A right-fit client operates a <span className="text-amber font-semibold">$5M–$25M business</span>, wants leaks named with dollar figures, and treats a $2,500 audit as a rounding error against a leak that usually costs 10–40× the fee every year unfixed. If the entry fee reads as the largest number on the page, this is the wrong engagement — and we'll say so on the call.
                </p>
              </div>
            </details>
          </section>

          {/* WHO WE WORK WITH — condensed side-by-side */}
          <section
            className="mt-4 max-w-4xl mx-auto grid md:grid-cols-2 gap-3 animate-fade-in"
            style={{ animationDelay: "220ms", animationFillMode: "both" }}
          >
            <details className="group rounded-sm border border-crimson/40 bg-card/60 p-4">
              <summary className="cursor-pointer list-none flex items-center justify-between">
                <span className="font-forensic text-sm font-bold">We don't work with you if…</span>
                <span className="font-mono text-xs text-crimson group-open:hidden">+</span>
                <span className="font-mono text-xs text-crimson hidden group-open:inline">−</span>
              </summary>
              <ul className="mt-3 space-y-1.5 text-xs text-foreground/80 leading-relaxed">
                <li>— You want a cheerleader. We're the coroner.</li>
                <li>— You shop consultants by price, not by findings.</li>
                <li>— You need a committee to fix your own business.</li>
                <li>— You'll argue with the evidence.</li>
              </ul>
            </details>
            <details className="group rounded-sm border border-amber/40 bg-card/60 p-4">
              <summary className="cursor-pointer list-none flex items-center justify-between">
                <span className="font-forensic text-sm font-bold">We do work with you if…</span>
                <span className="font-mono text-xs text-amber group-open:hidden">+</span>
                <span className="font-mono text-xs text-amber hidden group-open:inline">−</span>
              </summary>
              <ul className="mt-3 space-y-1.5 text-xs text-foreground/80 leading-relaxed">
                <li>— Real business, $5M–$50M, something's broken you can't name.</li>
                <li>— You'd rather hear ugly truth once than comfortable lies quarterly.</li>
                <li>— You measure us on one thing: recovered revenue.</li>
              </ul>
            </details>
          </section>


          {/* WHAT WE ACTUALLY DO */}
          <section
            className="mt-6 max-w-4xl mx-auto animate-fade-in"
            style={{ animationDelay: "240ms", animationFillMode: "both" }}
          >
            <details className="group rounded-sm border border-amber/30 bg-card/70 backdrop-blur-sm">
              <summary className="cursor-pointer list-none p-4 sm:p-5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber mb-1">What we actually do</div>
                  <div className="font-forensic text-base sm:text-lg font-bold leading-tight truncate">
                    Chaos Theory Forensics. <span className="text-foreground/60">Not marketing. Forensics.</span>
                  </div>
                </div>
                <span className="font-mono text-xs text-amber shrink-0 group-open:hidden">+ expand</span>
                <span className="font-mono text-xs text-amber shrink-0 hidden group-open:inline">− collapse</span>
              </summary>
              <div className="px-4 sm:px-5 pb-5 -mt-1">
                <p className="text-sm text-foreground/80 leading-relaxed">
                  Every business has leaks. Vocabulary on your site that kills deals before the first call. Brand promises your operation contradicts daily. Leads that die in follow-up purgatory. Systems that don't talk to each other. Waste that got promoted to "process."
                </p>
                <p className="mt-2 text-sm text-foreground/80 leading-relaxed">
                  You can't see them because you built them. We can, because we didn't.
                </p>
                <div className="mt-5">
                  <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber mb-3">The Leak Audit™ — 7-point forensic protocol</div>
                  <ol className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm text-foreground/85">
                    {[
                      "Vocabulary friction — the words costing you deals",
                      "Brand contradictions — what you promise vs. what you deliver",
                      "Conversion drop-offs — where buyers quietly exit",
                      "Follow-up failures — the leads you paid for and then ignored",
                      "System disconnects — tools that don't talk, data that dies",
                      "Operational waste — headcount solving software problems",
                      "Growth ceilings — the structural reason you're stuck at this number",
                    ].map((item, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="font-mono text-amber text-xs pt-0.5 shrink-0">0{i + 1}</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ol>
                  <p className="mt-4 text-xs text-foreground/60 italic">We don't guess. We document. Every finding comes with a dollar figure attached.</p>
                </div>
              </div>
            </details>
          </section>

          {/* WHAT WE ARE NOT */}
          <section
            className="mt-6 max-w-4xl mx-auto animate-fade-in"
            style={{ animationDelay: "250ms", animationFillMode: "both" }}
          >
            <details className="group rounded-sm border border-crimson/30 bg-card/60 backdrop-blur-sm">
              <summary className="cursor-pointer list-none p-4 sm:p-5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-crimson mb-1">What we are not</div>
                  <div className="font-forensic text-base sm:text-lg font-bold leading-tight truncate">
                    Not an agency. Not a consultant. Not a software pitch.
                  </div>
                </div>
                <span className="font-mono text-xs text-crimson shrink-0 group-open:hidden">+ expand</span>
                <span className="font-mono text-xs text-crimson shrink-0 hidden group-open:inline">− collapse</span>
              </summary>
              <div className="px-4 sm:px-5 pb-5 -mt-1">
                <div className="grid sm:grid-cols-3 gap-4 text-sm text-foreground/80 leading-relaxed">
                  <p><span className="text-amber font-semibold">Agencies</span> sell you effort — retainers, deliverables, activity reports that measure motion instead of results.</p>
                  <p><span className="text-amber font-semibold">Consultants</span> sell you opinions — frameworks and slide decks that describe your problem back to you and leave the fixing to someone else.</p>
                  <p><span className="text-amber font-semibold">Software companies</span> sell you tools — one more login, one more subscription, one more system your team will not use.</p>
                </div>
                <p className="mt-4 text-sm sm:text-base text-foreground/90 leading-relaxed">
                  Aetheris sells <span className="text-amber font-semibold">findings and removal</span>. We investigate, we identify the cause, we show you the evidence, and we build what eliminates it. Then the engagement ends, because the problem does.
                </p>
                <div className="mt-5 pt-4 border-t border-amber/15">
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    USMC veteran. MS + BA + IBM certified. We treat your business like a crime scene: <span className="text-amber">evidence first, feelings never, verdict in writing.</span>
                  </p>
                  <p className="mt-3 text-sm text-foreground/70 italic">"Business is simply chaos theory. However, I find what causes the 'random' chaos to happen and begin removing it where it begins." — Joseph Toney</p>
                </div>
              </div>
            </details>
          </section>


          {/* THE LEAK ECOSYSTEM — always unlocked, no email gate */}
          <HomeMindMapSection onBookAudit={() => setBookingOpen(true)} />

          {/* Golden Report CTA now lives above; no duplicate here. */}










          {/* CUSTOM BUILD — specific idea or tool */}
          <section
            className="mt-6 max-w-5xl mx-auto animate-fade-in"
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

                <h2 className="font-forensic text-2xl sm:text-3xl md:text-4xl font-bold leading-tight max-w-3xl mx-auto">
                  Have a specific idea or tool you want built?{" "}
                  <span className="text-amber italic">I can build it.</span>
                </h2>

                <p className="mt-3 font-forensic text-lg sm:text-xl italic text-crimson/90 max-w-2xl mx-auto">
                  The more crazy or impossible — the better.
                </p>

                <p className="mt-4 text-sm sm:text-base text-foreground/80 leading-relaxed max-w-2xl mx-auto">
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
            className="mt-5 max-w-4xl mx-auto animate-fade-in"
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

