import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Calendar, FileText, Phone, Mail, MapPin, HelpCircle, ChevronDown, Play, Download, Users } from "lucide-react";
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

import { Navbar } from "@/components/Navbar";
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

          {/* Editorial hero banner. merged from /home */}
          <section
            className="mt-1 max-w-5xl mx-auto animate-fade-in"
            style={{ animationDelay: "80ms", animationFillMode: "both" }}
          >
            <img
              src={homeHeroBanner.url}
              alt="Your business is leaking. You just can't see it from inside the building. Aetheris Business Forensics finds hidden revenue leaks, turns real data into insight, and keeps your business confidential."
              className="w-full h-auto rounded-sm border border-amber/20 shadow-xl"
              loading="eager"
              fetchPriority="high"
            />
          </section>


          {/* Punch headline */}
          <section
            className="mt-3 max-w-4xl mx-auto text-center animate-fade-in"
            style={{ animationDelay: "120ms", animationFillMode: "both" }}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="h-px w-8 bg-amber/50" />
              <span className="text-[9px] tracking-[0.35em] font-mono text-amber/80 uppercase">Indianapolis · US-Wide</span>
              <span className="h-px w-8 bg-amber/50" />
            </div>
            <h1 className="font-forensic text-2xl sm:text-4xl md:text-5xl font-bold leading-[1.05] tracking-tight">
              Your business is{" "}
              <span className="text-crimson italic">leaking</span>.
              <br className="hidden sm:block" />
              <span className="text-foreground/85"> One button finds it. We fix it.</span>
            </h1>
            <p className="mt-3 text-sm sm:text-base text-foreground/85 max-w-2xl mx-auto leading-relaxed">
              Press the button. Real operators — not a chatbot — find where you're bleeding leads,
              time, and revenue. Then we seal it.
            </p>
          </section>

          {/* Buttons. primary CTAs, larger */}
          <section
            className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 animate-fade-in"
            style={{ animationDelay: "180ms", animationFillMode: "both" }}
          >
            <Button asChild variant="outline" size="default" className="relative overflow-hidden h-11 px-6 text-sm border-white/20 bg-gradient-to-br from-white/[0.10] via-white/[0.04] to-transparent backdrop-blur-xl ring-1 ring-inset ring-white/10 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.18)] hover:border-amber/50 hover:bg-amber/10 text-foreground font-mono uppercase tracking-wider transition-all">
              <Link to="/contact">
                <FileText className="w-4 h-4 mr-2 text-amber relative" />
                <span className="relative">Intake Form</span>
              </Link>
            </Button>
            <Button
              size="default"
              onClick={() => setBookingOpen(true)}
              className="relative overflow-hidden h-11 px-6 text-sm bg-gradient-to-br from-amber via-amber to-amber/75 text-background hover:from-amber hover:to-amber/85 font-bold font-mono uppercase tracking-wider ring-1 ring-inset ring-white/30 shadow-[0_15px_40px_-10px_hsl(var(--amber)/0.7),inset_0_1px_0_0_rgba(255,255,255,0.45)] transition-all"
            >
              <Calendar className="w-4 h-4 mr-2 relative" />
              <span className="relative">Book the Diagnostic</span>
              <ArrowRight className="ml-2 w-4 h-4 relative" />
            </Button>
          </section>

          {/* One-button leak finder infographic — the focal point */}
          <section
            className="mt-6 max-w-5xl mx-auto animate-fade-in"
            style={{ animationDelay: "220ms", animationFillMode: "both" }}
          >
            <div className="text-center mb-3">
              <div className="font-case text-[9px] uppercase tracking-widest text-amber mb-1">
                Built by hand, not by hype
              </div>
              <h2 className="font-forensic text-xl md:text-2xl font-bold text-foreground inline-flex items-center justify-center gap-2 flex-wrap">
                <Users className="w-4 h-4 text-amber" />
                Made by Real People, for real Humans.
              </h2>
            </div>
            <div className="rounded-xl border border-amber/30 bg-card/80 backdrop-blur-sm p-1.5 sm:p-2 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.5)]">
              <img
                src={landingOneButtonInfographic.url}
                alt="Aetheris Business Forensics: One button finds where your leads are leaking and instantly begins getting them back."
                className="w-full h-auto rounded-lg"
                loading="lazy"
              />
            </div>
          </section>

          {/* Meet the operator — short, merged from /operator */}
          <section
            className="mt-6 max-w-4xl mx-auto animate-fade-in"
            style={{ animationDelay: "260ms", animationFillMode: "both" }}
          >
            <div className="rounded-lg border border-amber/30 bg-card/80 backdrop-blur-sm p-3 sm:p-4 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.5)]">
              <div className="font-case text-[9px] uppercase tracking-[0.3em] text-amber mb-1.5">
                The operator behind the button
              </div>
              <h2 className="font-forensic text-lg md:text-xl font-bold text-foreground leading-tight mb-2">
                An operator — <span className="text-amber italic">not an agency</span>, not a chatbot.
              </h2>
              <p className="text-foreground/90 text-sm leading-relaxed italic border-l-2 border-amber/60 pl-3">
                "I sit in the chair next to yours, open your CRM, and tell you in plain English where the money is bleeding out. Then I fix it myself — with AI, automation, and systems built for closing leaks. You don't run anything. You get the leak sealed."
              </p>
              <p className="mt-2 text-[10px] font-mono uppercase tracking-widest text-amber/80">
                Marine veteran · MS Marketing (4.0) · Doctorate, Digital Forensics · Noblesville, IN
              </p>
            </div>
          </section>

          {/* Public website leak scan + free tools suite — combined */}
          <div className="mt-6">
            <PublicLeakScan />
          </div>


          {/* Downloads + Deck — combined case-file card */}
          <section
            className="mt-6 max-w-4xl mx-auto animate-fade-in"
            style={{ animationDelay: "320ms", animationFillMode: "both" }}
          >
            <div className="rounded-xl border-2 border-amber/50 bg-card/95 backdrop-blur-sm shadow-[0_15px_40px_-15px_rgba(0,0,0,0.7)] overflow-hidden">
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
                className="group flex items-center gap-3 px-4 py-3 hover:bg-amber/[0.04] transition-colors"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber/20 ring-1 ring-amber/50">
                  <Download className="w-5 h-5 text-amber" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-amber">Free Download · PDF</div>
                  <div className="font-forensic text-base sm:text-lg font-bold text-foreground leading-tight">
                    How Aetheris Can Help You
                  </div>
                  <div className="text-xs text-muted-foreground">No email required. Tap to download.</div>
                </div>
                <ArrowRight className="w-4 h-4 text-amber shrink-0 group-hover:translate-x-1 transition-transform" />
              </a>

              {/* Divider */}
              <div className="h-px bg-amber/20" />

              {/* Row 2: Deck toggle */}
              <button
                type="button"
                onClick={() => setDeckOpen((v) => !v)}
                className="group w-full flex items-center gap-3 px-4 py-3 hover:bg-amber/[0.04] transition-colors text-left"
                aria-expanded={deckOpen}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber/10 ring-1 ring-amber/40">
                  <ChevronDown className={`w-5 h-5 text-amber transition-transform ${deckOpen ? "rotate-180" : ""}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-amber">Case File · Deck</div>
                  <div className="font-forensic text-base sm:text-lg font-bold text-foreground leading-tight">
                    Forensic Revenue Recovery
                  </div>
                  <div className="text-xs text-muted-foreground">{deckOpen ? "Tap to collapse." : "Tap to open the deck."}</div>
                </div>
              </button>

              {deckOpen && (
                <div className="border-t border-amber/20 animate-fade-in">
                  <div className="px-4 py-3 flex flex-wrap items-center justify-center gap-3 border-b border-amber/20">
                    <a
                      href="/downloads/Forensic-Revenue-Recovery.pdf"
                      download
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-amber/50 bg-amber/15 hover:bg-amber/25 text-amber font-mono text-xs uppercase tracking-wider transition-colors"
                    >
                      <Download className="w-4 h-4" /> Download PDF
                    </a>
                    <a
                      href="/downloads/Forensic-Revenue-Recovery.pptx"
                      download
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-white/20 bg-white/[0.06] hover:bg-white/[0.12] text-foreground font-mono text-xs uppercase tracking-wider transition-colors"
                    >
                      <Download className="w-4 h-4" /> Download PPTX
                    </a>
                  </div>
                  <div className="p-3">
                    <ForensicDeckCarousel />
                  </div>
                </div>
              )}
            </div>
          </section>




          {/* Contact info. compact glass row */}
          <section
            className="relative mt-8 animate-fade-in"
            style={{ animationDelay: "340ms", animationFillMode: "both" }}
          >
            <div className="rounded-xl border-2 border-amber/30 bg-card/95 backdrop-blur-sm px-4 py-4 sm:px-5 shadow-[0_15px_40px_-15px_rgba(0,0,0,0.7)]">
              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
                <a href="tel:+13173762110" className="group inline-flex items-center gap-2 hover:text-amber transition-colors">
                  <Phone className="w-4 h-4 text-amber" />
                  <span className="font-semibold">(317) 376-2110</span>
                </a>
                <span className="h-4 w-px bg-white/15 hidden sm:block" />
                <a href="mailto:Aetheris.technology@outlook.com" className="group inline-flex items-center gap-2 hover:text-amber transition-colors">
                  <Mail className="w-4 h-4 text-amber" />
                  <span className="font-semibold break-all">Aetheris.technology@outlook.com</span>
                </a>
                <span className="h-4 w-px bg-white/15 hidden sm:block" />
                <span className="inline-flex items-center gap-2 text-foreground">
                  <MapPin className="w-4 h-4 text-amber" />
                  <span className="font-semibold">Noblesville, Indiana</span>
                </span>
              </div>
            </div>
            <p className="mt-3 text-center text-[11px] font-mono tracking-[0.25em] text-muted-foreground uppercase">
              Aetheris · Business Forensics · aetheris.technology
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
  );
};

export default LeakLanderPage;
