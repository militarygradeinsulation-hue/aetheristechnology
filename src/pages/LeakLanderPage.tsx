import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Calendar, FileText, Phone, Mail, MapPin, ExternalLink, HelpCircle, ChevronDown, Play, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/SEOHead";
import { Background } from "@/components/Background";
import { BOOK_MEETING_URL } from "@/lib/links";
import heroBanner from "@/assets/hero-leaking-building.jpg";
import heroLeakVideo from "@/assets/hero-leak.mp4";
import aetherisLogo from "@/assets/aetheris-new-logo.png";
import landingOneButtonInfographic from "@/assets/landing-one-button-infographic.jpg.asset.json";
import homeHeroBanner from "@/assets/home-hero-banner.jpg.asset.json";
import { ForensicDeckCarousel } from "@/components/ForensicDeckCarousel";
import { PublicLeakScan } from "@/components/PublicLeakScan";
import { HomeFreeTools } from "@/components/HomeFreeTools";
import { Navbar } from "@/components/Navbar";

const LeakLanderPage: React.FC = () => {
  const [deckOpen, setDeckOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const navigate = useNavigate();
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const existing = document.querySelector('script[src*="MeetingsEmbedCode.js"]');
    if (existing) return;
    const script = document.createElement('script');
    script.src = 'https://static.hsappstatic.net/MeetingsEmbed/ex/MeetingsEmbedCode.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);


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
      <SEOHead
        title="Your Business Is Leaking. Aetheris Business Forensics"
        description="78% of leaks we find, the owner already felt. they just couldn't name them. Book a Forensic Diagnostic with Aetheris in Indianapolis."
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
        className="pointer-events-none fixed inset-0 opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, hsl(var(--amber)) 0%, transparent 40%), radial-gradient(circle at 80% 70%, hsl(var(--crimson, 0 60% 45%)) 0%, transparent 45%)",
        }}
      />

      <main className="relative flex-1 flex items-center justify-center max-w-7xl w-full mx-auto px-4 sm:px-8 py-6">
        <div className="w-full">
          {/* Aetheris logo. top-left, triple-tap to /staff (admins + reps) */}
          <div className="max-w-4xl mx-auto flex justify-start mb-2">
            <button
              type="button"
              onClick={handleLogoTap}
              aria-label="Aetheris"
              className="rounded-full focus:outline-none focus:ring-2 focus:ring-amber/60 select-none"
            >
              <img
                src={aetherisLogo}
                alt="Aetheris"
                className="h-24 sm:h-32 md:h-40 w-auto opacity-90 hover:opacity-100 transition-opacity pointer-events-none"
                draggable={false}
              />
            </button>
          </div>

          {/* Editorial hero banner. merged from /home */}
          <section
            className="mt-2 max-w-5xl mx-auto animate-fade-in"
            style={{ animationDelay: "80ms", animationFillMode: "both" }}
          >
            <img
              src={homeHeroBanner.url}
              alt="Your business is leaking. You just can't see it from inside the building. Aetheris Business Forensics finds hidden revenue leaks, turns real data into insight, and keeps your business confidential."
              className="w-full h-auto rounded-sm border border-amber/20 shadow-2xl"
              loading="eager"
              fetchPriority="high"
            />
          </section>


          {/* Position statement */}
          <section
            className="mt-5 max-w-5xl mx-auto text-center animate-fade-in"
            style={{ animationDelay: "120ms", animationFillMode: "both" }}
          >
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="h-px w-8 bg-amber/50" />
              <span className="text-[9px] tracking-[0.35em] font-mono text-amber/80 uppercase">Indianapolis · US-Wide</span>
              <span className="h-px w-8 bg-amber/50" />
            </div>
            <h1 className="font-forensic text-2xl sm:text-4xl md:text-5xl font-bold leading-[1.05] tracking-tight">
              Most growth-stage businesses are bleeding{" "}
              <span className="text-crimson italic">time</span>,{" "}
              <span className="text-crimson italic">leads</span>, and{" "}
              <span className="text-crimson italic">revenue</span>{" "}
              — without knowing where.
            </h1>
            <p className="mt-5 text-base sm:text-lg md:text-xl text-foreground/85 max-w-3xl mx-auto leading-relaxed">
              I help established businesses uncover what is actually broken beneath the surface.
              Not just your marketing.{" "}
              <span className="text-amber font-semibold">Your entire business.</span>
            </p>
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-4xl mx-auto text-left">
              {[
                "Lead flow",
                "Website performance",
                "Trust signals",
                "Sales process",
                "Follow-up",
                "Internal systems",
                "Customer experience",
                "Operational gaps",
              ].map((item) => (
                <div key={item} className="rounded-sm border border-amber/20 bg-background/40 px-3 py-2">
                  <span className="text-[12px] sm:text-sm text-foreground/90 font-case uppercase tracking-wider">{item}</span>
                </div>
              ))}
            </div>
            <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Where are you <span className="text-crimson italic">leaking</span>. What is it costing you. Why is growth stalling.
              Then I build custom solutions using AI, automation, strategy, and digital systems that fix those gaps.
            </p>
            <p className="mt-4 text-base sm:text-lg text-foreground/90 max-w-3xl mx-auto leading-relaxed">
              The goal is simple: help you operate smarter, convert better, respond faster, and scale with less waste.
            </p>
            <div className="mt-6 inline-block rounded-sm border-l-2 border-amber/60 bg-amber/5 px-5 py-4 text-left max-w-3xl">
              <p className="text-foreground/90 text-[15px] leading-relaxed italic">
                “I run True Cost Forensics on your business. I show you exactly what is broken and what it is costing you.
                Then we build the systems to fix it. I am not an agency pitching you activity. I am an operator who finds
                the leak and closes it. No hidden timelines. No retainers. No cliché solutions. Just honest work.”
              </p>
            </div>
            <p className="mt-5 text-sm text-muted-foreground max-w-2xl mx-auto">
              I work with growth-minded businesses running $5M to $50M that know they should be further along.
              If something is wrong, I find it. If it needs fixing, I build it.
            </p>
            <p className="mt-4 text-xs font-mono uppercase tracking-widest text-amber/80">
              Marine Corps veteran · MS Marketing, Liberty University, 4.0 GPA · Doctorate in Digital Forensics · Based in Noblesville, Indiana
            </p>
          </section>
          
          {/* Buttons. primary CTAs, larger */}
          <section
            className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 animate-fade-in"
            style={{ animationDelay: "220ms", animationFillMode: "both" }}
          >
            <Button asChild variant="outline" size="lg" className="relative overflow-hidden h-14 px-8 text-base border-white/20 bg-gradient-to-br from-white/[0.10] via-white/[0.04] to-transparent backdrop-blur-xl ring-1 ring-inset ring-white/10 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.18)] hover:border-amber/50 hover:bg-amber/10 text-foreground font-mono uppercase tracking-wider transition-all before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-gradient-to-b before:from-white/15 before:to-transparent before:pointer-events-none">
              <Link to="/contact">
                <FileText className="w-5 h-5 mr-2 text-amber relative" />
                <span className="relative">Intake Form</span>
              </Link>
            </Button>
            <Button asChild size="lg" className="relative overflow-hidden h-14 px-8 text-base bg-gradient-to-br from-amber via-amber to-amber/75 text-background hover:from-amber hover:to-amber/85 font-bold font-mono uppercase tracking-wider ring-1 ring-inset ring-white/30 shadow-[0_15px_40px_-10px_hsl(var(--amber)/0.7),inset_0_1px_0_0_rgba(255,255,255,0.45)] transition-all before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-gradient-to-b before:from-white/35 before:to-transparent before:pointer-events-none">
              <a href={BOOK_MEETING_URL} target="_blank" rel="noopener noreferrer">
                <Calendar className="w-5 h-5 mr-2 relative" />
                <span className="relative">Book the Diagnostic</span>
                <ArrowRight className="ml-2 w-5 h-5 relative" />
              </a>
            </Button>
          </section>

          {/* Public website leak scan — email + URL only */}
          <PublicLeakScan />

          {/* Free tools suite — email + phone unlocks everything */}
          <HomeFreeTools />

          {/* One-button leak finder infographic */}
          <section
            className="mt-12 max-w-5xl mx-auto animate-fade-in"
            style={{ animationDelay: "280ms", animationFillMode: "both" }}
          >
            <div className="rounded-2xl border-2 border-amber/50 bg-card/95 backdrop-blur-sm p-3 sm:p-4 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)]">
              <img
                src={landingOneButtonInfographic.url}
                alt="Aetheris Business Forensics: One button finds where your leads are leaking and instantly begins getting them back. 4 steps: press, find leaks, recover leads, see the return."
                className="w-full h-auto rounded-xl"
                loading="lazy"
              />
            </div>
          </section>

          <section
            className="mt-10 max-w-4xl mx-auto animate-fade-in"
            style={{ animationDelay: "320ms", animationFillMode: "both" }}
          >
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
                  // fall back to native navigation (opens PDF inline)
                  window.open("/downloads/How-Aetheris-Can-Help-You.pdf", "_blank", "noopener");
                }
              }}
              className="relative overflow-hidden group flex items-center gap-3 px-5 py-4 rounded-xl border-2 border-amber/50 bg-card/95 backdrop-blur-sm hover:border-amber transition-all shadow-[0_15px_40px_-15px_rgba(0,0,0,0.7)]"
            >
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-amber/20 ring-1 ring-amber/50">
                <Download className="w-6 h-6 text-amber" />
              </div>
              <div className="relative flex-1 text-left">
                <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-amber">Free Download · PDF</div>
                <div className="font-forensic text-lg sm:text-xl font-bold text-foreground leading-tight">
                  How Aetheris Can Help You
                </div>
                <div className="text-sm text-muted-foreground">No email required. Tap to download.</div>
              </div>
              <ArrowRight className="relative w-5 h-5 text-amber shrink-0 group-hover:translate-x-1 transition-transform" />
            </a>
          </section>




          {/* Forensic Revenue Recovery deck. standalone toggle */}
          <section
            className="mt-12 max-w-6xl mx-auto animate-fade-in"
            style={{ animationDelay: "320ms", animationFillMode: "both" }}
          >
            <button
              type="button"
              onClick={() => setDeckOpen((v) => !v)}
              className="group w-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-amber/40 bg-card/95 backdrop-blur-sm px-5 py-5 hover:border-amber/70 transition-colors shadow-[0_15px_40px_-15px_rgba(0,0,0,0.7)] text-center"
              aria-expanded={deckOpen}
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber">
                Case File · Deck
              </div>
              <h2 className="font-forensic text-lg md:text-xl font-bold text-foreground inline-flex items-center gap-2">
                Forensic Revenue Recovery
                <ChevronDown className={`w-4 h-4 text-amber transition-transform ${deckOpen ? "rotate-180" : ""}`} />
              </h2>
            </button>

            {deckOpen && (
              <div className="mt-6 rounded-xl border-2 border-amber/40 bg-card/95 backdrop-blur-sm shadow-[0_15px_40px_-15px_rgba(0,0,0,0.7)] animate-fade-in">
                <div className="px-5 py-4 flex flex-wrap items-center justify-center gap-3 border-b border-amber/20">
                  <a
                    href="/downloads/Forensic-Revenue-Recovery.pdf"
                    download
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-amber/50 bg-amber/15 hover:bg-amber/25 text-amber font-mono text-xs uppercase tracking-wider transition-colors"
                  >
                    <Download className="w-4 h-4" /> Download PDF
                  </a>
                  <a
                    href="/downloads/Forensic-Revenue-Recovery.pptx"
                    download
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-white/20 bg-white/[0.06] hover:bg-white/[0.12] text-foreground font-mono text-xs uppercase tracking-wider transition-colors"
                  >
                    <Download className="w-4 h-4" /> Download PPTX
                  </a>
                </div>
                <div className="p-4">
                  <ForensicDeckCarousel />
                </div>
              </div>
            )}
          </section>



          {/* Booking embed. merged from /home */}
          <section
            id="book"
            className="mt-12 max-w-3xl mx-auto scroll-mt-24 animate-fade-in"
            style={{ animationDelay: "340ms", animationFillMode: "both" }}
          >
            <p className="font-mono text-[10px] uppercase tracking-widest text-amber mb-3 text-center">
              Or skip the scan — talk to the operator
            </p>
            <div className="mb-4 rounded-sm border border-amber/40 bg-background/60 px-4 py-3 text-sm leading-relaxed text-foreground/90">
              <p className="font-semibold text-amber mb-1">Only schedule a meeting if I can help you.</p>
              <p>I don't sell, and I don't entertain sales offers from people.</p>
              <p className="mt-2 text-foreground/75">
                Applicants must go through the <Link to="/careers" className="text-amber underline underline-offset-2 hover:text-amber/80">careers page</Link> only — not here.
              </p>
            </div>
            <div className="forensic-tile rounded-sm border border-amber/30 p-2 md:p-4">
              <div
                className="meetings-iframe-container"
                data-src="https://meetings-na2.hubspot.com/jtoney/joseph-toney-business-signal-analyst?embed=true"
              />
            </div>
          </section>

          {/* Contact info. compact glass row */}
          <section
            className="relative mt-12 animate-fade-in"
            style={{ animationDelay: "340ms", animationFillMode: "both" }}
          >
            <div className="rounded-xl border-2 border-amber/30 bg-card/95 backdrop-blur-sm px-5 py-5 sm:px-6 shadow-[0_15px_40px_-15px_rgba(0,0,0,0.7)]">
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-base">
                <a href="tel:+13173762110" className="group inline-flex items-center gap-2 hover:text-amber transition-colors">
                  <Phone className="w-5 h-5 text-amber" />
                  <span className="font-semibold">(317) 376-2110</span>
                </a>
                <span className="h-4 w-px bg-white/15 hidden sm:block" />
                <a href="mailto:Aetheris.technology@outlook.com" className="group inline-flex items-center gap-2 hover:text-amber transition-colors">
                  <Mail className="w-5 h-5 text-amber" />
                  <span className="font-semibold break-all">Aetheris.technology@outlook.com</span>
                </a>
                <span className="h-4 w-px bg-white/15 hidden sm:block" />
                <span className="inline-flex items-center gap-2 text-foreground">
                  <MapPin className="w-5 h-5 text-amber" />
                  <span className="font-semibold">Noblesville, Indiana</span>
                </span>
              </div>
            </div>
            <p className="mt-4 text-center text-xs font-mono tracking-[0.25em] text-muted-foreground uppercase">
              Aetheris · Business Forensics · aetheris.technology
            </p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default LeakLanderPage;
