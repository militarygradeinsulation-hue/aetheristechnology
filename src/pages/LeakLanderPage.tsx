import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Calendar, FileText, Phone, Mail, MapPin, ExternalLink, HelpCircle, ChevronDown, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/SEOHead";
import { Background } from "@/components/Background";
import { BOOK_MEETING_URL } from "@/lib/links";
import heroBanner from "@/assets/hero-leaking-building.jpg";
import heroLeakVideo from "@/assets/hero-leak.mp4";
import aetherisLogo from "@/assets/aetheris-new-logo.png";

const LeakLanderPage: React.FC = () => {
  const [whatOpen, setWhatOpen] = useState(false);
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
    <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden flex flex-col">
      <Background />
      <SEOHead
        title="Your Business Is Leaking — Aetheris Business Forensics"
        description="78% of leaks we find, the owner already felt — they just couldn't name them. Book a Forensic Diagnostic with Aetheris in Indianapolis."
        path="/lander"
      />

      {/* LinkedIn premium offer banner */}
      <a
        href="https://www.linkedin.com/in/thejosephtoney"
        target="_blank"
        rel="noopener noreferrer"
        className="relative z-20 block w-full bg-amber-900/90 hover:bg-amber-900 text-amber-50 border-b border-amber/40 transition-colors"
        style={{ backgroundColor: 'hsl(36 75% 18%)' }}
      >
        <div className="max-w-5xl mx-auto px-4 py-2.5 text-center text-xs sm:text-sm font-medium">
          <span className="font-case uppercase tracking-widest text-amber mr-2">Limited Offer</span>
          Follow &amp; connect with me on LinkedIn — I'll run a one-time <span className="text-amber font-semibold">premium analysis free</span>. See why I'm different than everyone else. <span className="underline underline-offset-2">Connect →</span>
        </div>
      </a>


      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, hsl(var(--amber)) 0%, transparent 40%), radial-gradient(circle at 80% 70%, hsl(var(--crimson, 0 60% 45%)) 0%, transparent 45%)",
        }}
      />

      <main className="relative flex-1 flex items-center justify-center max-w-5xl w-full mx-auto px-4 sm:px-6 py-6">
        <div className="w-full">
          {/* Aetheris logo — top-left, triple-tap to /staff (admins + reps) */}
          <div className="max-w-2xl mx-auto flex justify-start mb-2">
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

          {/* Hero banner with playable video overlay — glossy glass tile */}
          <div className="animate-fade-in max-w-2xl mx-auto">
            <button
              type="button"
              onClick={toggleVideo}
              aria-label={playing ? "Pause video" : "Play video"}
              className="group relative w-full block rounded-2xl overflow-hidden border border-white/15 bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-transparent backdrop-blur-xl ring-1 ring-inset ring-white/10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.15)] cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-amber transition-all hover:border-amber/40 hover:shadow-[0_30px_80px_-15px_rgba(0,0,0,0.8),0_0_40px_-10px_hsl(var(--amber)/0.35),inset_0_1px_0_0_rgba(255,255,255,0.2)]"
            >
              <img
                src={heroBanner}
                alt="Your business is leaking. You just can't see it from inside the building."
                className={`w-full h-auto block max-h-[70vh] object-contain transition-opacity duration-300 ${playing ? "opacity-0" : "opacity-100"}`}
                loading="eager"
                draggable={false}
              />
              <video
                ref={videoRef}
                src={heroLeakVideo}
                playsInline
                onEnded={() => { setPlaying(false); if (videoRef.current) videoRef.current.currentTime = 0; }}
                onPause={() => setPlaying(false)}
                className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-300 ${playing ? "opacity-100" : "opacity-0"}`}
              />
              {/* Glossy top sheen */}
              <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/15 via-white/5 to-transparent" />
              {/* Subtle inner edge highlight */}
              <span aria-hidden className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" />
              {!playing && (
                <span className="absolute inset-0 flex items-center justify-center bg-background/0 group-hover:bg-background/20 transition-colors">
                  <span className="relative rounded-full bg-gradient-to-br from-amber via-amber to-amber/70 text-background p-4 shadow-[0_15px_40px_-5px_hsl(var(--amber)/0.6),inset_0_1px_0_0_rgba(255,255,255,0.4)] ring-1 ring-white/30 group-hover:scale-110 transition-transform">
                    <span aria-hidden className="absolute inset-0 rounded-full bg-gradient-to-b from-white/40 via-transparent to-transparent opacity-60" />
                    <Play className="relative w-7 h-7 fill-current" />
                  </span>
                </span>
              )}
            </button>
          </div>


          {/* Catch phrase */}
          <section
            className="mt-5 text-center animate-fade-in"
            style={{ animationDelay: "120ms", animationFillMode: "both" }}
          >
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="h-px w-8 bg-amber/50" />
              <span className="text-[9px] tracking-[0.35em] font-mono text-amber/80 uppercase">Indianapolis · US-Wide</span>
              <span className="h-px w-8 bg-amber/50" />
            </div>
            <h1 className="font-forensic text-2xl sm:text-4xl font-bold leading-[1.05] tracking-tight">
              Stop guessing what's broken.{" "}
              <span className="bg-gradient-to-r from-amber via-amber/90 to-amber/60 bg-clip-text text-transparent italic">Find the leak.</span>
            </h1>
          </section>

          {/* Buttons */}
          <section
            className="mt-6 flex flex-wrap items-center justify-center gap-3 animate-fade-in"
            style={{ animationDelay: "220ms", animationFillMode: "both" }}
          >
            <Button asChild variant="outline" size="sm" className="relative overflow-hidden border-white/20 bg-gradient-to-br from-white/[0.10] via-white/[0.04] to-transparent backdrop-blur-xl ring-1 ring-inset ring-white/10 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.18)] hover:border-amber/50 hover:bg-amber/10 text-foreground font-mono uppercase tracking-wider text-xs transition-all before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-gradient-to-b before:from-white/15 before:to-transparent before:pointer-events-none">
              <Link to="/home">
                <ExternalLink className="w-3.5 h-3.5 mr-2 text-amber relative" />
                <span className="relative">Main Site</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="relative overflow-hidden border-white/20 bg-gradient-to-br from-white/[0.10] via-white/[0.04] to-transparent backdrop-blur-xl ring-1 ring-inset ring-white/10 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.18)] hover:border-amber/50 hover:bg-amber/10 text-foreground font-mono uppercase tracking-wider text-xs transition-all before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-gradient-to-b before:from-white/15 before:to-transparent before:pointer-events-none">
              <Link to="/contact">
                <FileText className="w-3.5 h-3.5 mr-2 text-amber relative" />
                <span className="relative">Intake Form</span>
              </Link>
            </Button>
            <Button asChild size="sm" className="relative overflow-hidden bg-gradient-to-br from-amber via-amber to-amber/75 text-background hover:from-amber hover:to-amber/85 font-bold font-mono uppercase tracking-wider text-xs ring-1 ring-inset ring-white/30 shadow-[0_15px_40px_-10px_hsl(var(--amber)/0.7),inset_0_1px_0_0_rgba(255,255,255,0.45)] transition-all before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-gradient-to-b before:from-white/35 before:to-transparent before:pointer-events-none">
              <a href={BOOK_MEETING_URL} target="_blank" rel="noopener noreferrer">
                <Calendar className="w-3.5 h-3.5 mr-2 relative" />
                <span className="relative">Book the Diagnostic</span>
                <ArrowRight className="ml-2 w-3.5 h-3.5 relative" />
              </a>
            </Button>
          </section>

          {/* What the hell do we do — instant answer */}
          <section
            className="mt-4 max-w-2xl mx-auto animate-fade-in"
            style={{ animationDelay: "300ms", animationFillMode: "both" }}
          >
            <button
              type="button"
              onClick={() => setWhatOpen((v) => !v)}
              className="relative overflow-hidden w-full group inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-crimson/40 bg-gradient-to-br from-crimson/[0.18] via-crimson/[0.08] to-transparent backdrop-blur-xl ring-1 ring-inset ring-white/10 hover:border-crimson/70 transition-all text-foreground font-mono uppercase tracking-wider text-xs shadow-[0_15px_40px_-15px_hsl(var(--crimson)/0.7),inset_0_1px_0_0_rgba(255,255,255,0.18)] before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-gradient-to-b before:from-white/15 before:to-transparent before:pointer-events-none"
              aria-expanded={whatOpen}
            >
              <HelpCircle className="w-4 h-4 text-crimson relative" />
              <span className="relative font-bold drop-shadow-[0_0_10px_hsl(var(--crimson)/0.45)]">What The Hell Do We Do?</span>
              <ChevronDown className={`relative w-4 h-4 text-crimson transition-transform ${whatOpen ? "rotate-180" : ""}`} />
            </button>
            {whatOpen && (
              <div className="mt-3 rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.05] via-white/[0.02] to-transparent backdrop-blur-xl p-5 animate-fade-in">
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber mb-2">Plain English</div>
                <p className="font-forensic text-lg leading-snug text-foreground">
                  We're <span className="text-amber italic">business forensics operators.</span> We pull your books, your CRM, your ops, and your sales motion apart and show you exactly where the money is{" "}
                  <span className="text-crimson italic font-bold">leaking out</span> — usually $50K–$500K a year you can't see from the inside.
                </p>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  No fluff decks. No "strategy sessions." A real diagnostic with a written report, exact dollar figures, and a fix list ranked by ROI. Then we help you plug them — or hand it off clean.
                </p>
              </div>
            )}
          </section>

          {/* Contact info — compact glass row */}
          <section
            className="relative mt-6 animate-fade-in"
            style={{ animationDelay: "340ms", animationFillMode: "both" }}
          >
            <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.05] via-white/[0.02] to-transparent backdrop-blur-xl px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm">
                <a href="tel:+13173762110" className="group inline-flex items-center gap-2 hover:text-amber transition-colors">
                  <Phone className="w-4 h-4 text-amber" />
                  <span className="font-semibold">(317) 376-2110</span>
                </a>
                <span className="h-4 w-px bg-white/10 hidden sm:block" />
                <a href="mailto:Aetheris.technology@outlook.com" className="group inline-flex items-center gap-2 hover:text-amber transition-colors">
                  <Mail className="w-4 h-4 text-amber" />
                  <span className="font-semibold break-all">Aetheris.technology@outlook.com</span>
                </a>
                <span className="h-4 w-px bg-white/10 hidden sm:block" />
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4 text-amber" />
                  <span className="font-semibold text-foreground">Indianapolis, IN</span>
                </span>
              </div>
            </div>
            <p className="mt-3 text-center text-[10px] font-mono tracking-[0.25em] text-muted-foreground uppercase">
              Aetheris · Business Forensics
            </p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default LeakLanderPage;
