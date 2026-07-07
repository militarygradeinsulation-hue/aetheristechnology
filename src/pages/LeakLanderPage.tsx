import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Calendar, FileText, Phone, Mail, MapPin, ChevronDown, Play, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/SEOHead";
import { Background } from "@/components/Background";
import { BOOK_MEETING_URL } from "@/lib/links";
import aetherisLogo from "@/assets/aetheris-new-logo.png";
import signatureBanner from "@/assets/joseph-toney-signature-banner.png.asset.json";
import buildThumb1 from "@/assets/build-thumb-1.jpg";
import buildThumb2 from "@/assets/build-thumb-2.jpg";
import buildThumb3 from "@/assets/build-thumb-3.jpg";
import buildThumb4 from "@/assets/build-thumb-4.jpg";
import buildThumb5 from "@/assets/build-thumb-5.jpg";
import buildThumb6 from "@/assets/build-thumb-6.jpg";
import { ForensicDeckCarousel } from "@/components/ForensicDeckCarousel";


import { Navbar } from "@/components/Navbar";
import { HomeMindMapSection } from "@/components/HomeMindMapSection";
import { HomeFreeTrialArsenal } from "@/components/HomeFreeTrialArsenal";


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
          title="Chaos Theory Forensics — find the cause. Remove it. | Aetheris"
          description="Aetheris practices Chaos Theory Forensics. We investigate established businesses, trace the damage to its origin, and remove it at the source. Real findings. No sugar."
          path="/"
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
                src={aetherisLogo}
                alt="Aetheris"
                className="h-16 sm:h-24 md:h-32 w-auto opacity-90 hover:opacity-100 transition-opacity pointer-events-none"
                draggable={false}
              />
            </button>
          </div>
          {/* Signature banner — gentle float + golden shimmer edge */}
          <section className="mt-5 max-w-4xl mx-auto animate-fade-in" aria-label="Joseph Toney, AI Architect — Aetheris Technology">
            <div className="shimmer-gold-border">
              <img
                src={signatureBanner.url}
                alt="Joseph Toney, AI Architect — Aetheris Technology. Business is simply chaos theory. However, I find what causes the 'random' chaos to happen and begin removing it where it begins."
                className="w-full h-auto animate-float rounded-sm"
                loading="eager"
                fetchPriority="high"
                decoding="async"
                width={1920}
                height={640}
              />
            </div>
          </section>

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
              One small talk with us could have massive changes in your business.
            </p>
            <p className="mt-4 text-base sm:text-lg text-foreground/85 max-w-2xl mx-auto">
              Aetheris practices <span className="text-amber font-semibold">Chaos Theory Forensics</span>. We investigate established businesses, trace the damage back to where it begins, and remove it at the source.
            </p>
            <p className="mt-2 font-case text-[11px] uppercase tracking-[0.28em] text-amber/80">
              Real Findings. No Sugar.
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
                  Free 60-sec Pre-Scan
                </Link>
              </Button>
              <Button
                size="default"
                onClick={() => setBookingOpen(true)}
                className="h-11 px-6 text-sm bg-amber text-background hover:bg-amber/90 font-bold font-mono uppercase tracking-wider"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Request an Investigation
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
            <Link
              to="/chaos-scan"
              className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-amber hover:underline underline-offset-4"
            >
              Or run the free Chaos Scan <ArrowRight className="w-3 h-3" />
            </Link>
          </section>

          {/* FREE-TRIAL ARSENAL — 5 flagship instruments, no gate */}
          <HomeFreeTrialArsenal />





          {/* THE FILTER — unmissable */}
          <section
            className="mt-6 max-w-4xl mx-auto animate-fade-in"
            style={{ animationDelay: "200ms", animationFillMode: "both" }}
          >
            <div className="relative rounded-sm border-2 border-crimson/50 bg-crimson/[0.04] p-5 sm:p-6 shadow-[0_20px_60px_-30px_hsl(var(--crimson,0_60%_45%)/0.6)]">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-crimson mb-2">Read this before you contact us</div>
              <h2 className="font-forensic text-xl sm:text-2xl font-bold leading-tight">
                The Filter.
              </h2>
              <p className="mt-3 text-sm sm:text-base text-foreground/85 leading-relaxed">
                If <span className="text-crimson font-semibold">$2,500</span> to find out exactly where your company is bleeding revenue sounds "expensive," you are not our client. Close this tab.
              </p>
              <p className="mt-3 text-sm text-foreground/70 leading-relaxed">
                Our clients don't ask what it costs. They ask what the leak costs. Usually the answer is <span className="text-amber font-semibold">10 to 40 times our fee</span> — every year it stays unfixed.
              </p>

            </div>
          </section>

          {/* WHO WE DON'T / DO WORK WITH */}
          <section
            className="mt-6 max-w-4xl mx-auto grid md:grid-cols-2 gap-4 animate-fade-in"
            style={{ animationDelay: "220ms", animationFillMode: "both" }}
          >
            <div className="rounded-sm border border-crimson/40 bg-card/60 backdrop-blur-sm p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-crimson mb-2">We turn down more than we take</div>
              <h3 className="font-forensic text-lg font-bold mb-3">We don't work with you if:</h3>
              <ul className="space-y-2 text-sm text-foreground/85 leading-relaxed">
                <li>— You want to be told your marketing is fine and the problem is "the economy."</li>
                <li>— You shop consultants by price instead of by findings.</li>
                <li>— You need six stakeholders and a committee to approve fixing your own business.</li>
                <li>— You want a cheerleader. We're the coroner.</li>
                <li>— You'll argue with the evidence. The data doesn't care how long you've done it your way.</li>
              </ul>
            </div>
            <div className="rounded-sm border border-amber/40 bg-card/60 backdrop-blur-sm p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber mb-2">Deliberately</div>
              <h3 className="font-forensic text-lg font-bold mb-3">We work with you if:</h3>
              <ul className="space-y-2 text-sm text-foreground/85 leading-relaxed">
                <li>— You run a real business — $5M to $50M — and you know something's broken but can't name it.</li>
                <li>— You'd rather hear the ugly truth once than a comfortable lie every quarter.</li>
                <li>— You can make a decision without a permission slip.</li>
                <li>— You measure us on one thing: recovered revenue.</li>
              </ul>
            </div>
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
                    Marine Corps veteran. Doctorate work in Digital Forensics. We treat your business like a crime scene: <span className="text-amber">evidence first, feelings never, verdict in writing.</span>
                  </p>
                  <p className="mt-3 text-sm text-foreground/70 italic">"Business is simply chaos theory. However, I find what causes the 'random' chaos to happen and begin removing it where it begins." — Joseph Toney</p>
                </div>
              </div>
            </details>
          </section>


          {/* THE LEAK ECOSYSTEM — interactive mind map */}
          <HomeMindMapSection onBookAudit={() => setBookingOpen(true)} />









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

                {/* Redacted build thumbnails — visible but not identifiable or clickable */}
                <div className="mt-6 flex flex-col items-center gap-3">
                  <span className="font-mono text-[9px] uppercase tracking-[0.35em] text-foreground/45">
                    ⌁ Built before · under seal ⌁
                  </span>
                  <div className="rounded-md border border-amber/20 bg-background/60 p-3 sm:p-4 shadow-[0_0_40px_-20px_rgba(251,191,36,0.12)]">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 max-w-2xl mx-auto">
                      {[buildThumb1, buildThumb2, buildThumb3, buildThumb4, buildThumb5, buildThumb6].map((src, i) => (
                        <div
                          key={i}
                          className="group relative aspect-[4/3] w-full max-w-[220px] sm:max-w-[240px] overflow-hidden rounded-sm border border-amber/30 bg-black/50"
                        >
                          <img
                            src={src}
                            alt=""
                            loading="lazy"
                            width={400}
                            height={300}
                            className="absolute inset-0 h-full w-full object-cover opacity-95 transition-all duration-500 group-hover:opacity-100 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-crimson border border-crimson/50 bg-background/85 px-2.5 py-1 rotate-[-2deg] shadow-sm">
                              Redacted
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="mt-1 text-center text-xs sm:text-sm text-foreground/70 max-w-md">
                    Want to see what’s underneath?{" "}
                    <button
                      onClick={() => setBookingOpen(true)}
                      className="text-amber underline underline-offset-4 hover:text-amber/80 transition-colors"
                    >
                      Get in touch
                    </button>{" "}
                    and I’ll walk you through what I’ve built — or what I could build for you.
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

