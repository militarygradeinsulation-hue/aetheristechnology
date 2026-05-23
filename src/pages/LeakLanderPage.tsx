import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar, FileText, Phone, Mail, MapPin, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/SEOHead";
import { BOOK_MEETING_URL } from "@/lib/links";
import heroBanner from "@/assets/leak-banner-hero.png";

const LeakLanderPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <SEOHead
        title="Your Business Is Leaking — Aetheris Business Forensics"
        description="78% of leaks we find, the owner already felt — they just couldn't name them. Book a Forensic Diagnostic with Aetheris in Indianapolis."
        path="/lander"
      />

      {/* Subtle animated grain backdrop */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, hsl(var(--amber)) 0%, transparent 40%), radial-gradient(circle at 80% 70%, hsl(var(--crimson, 0 60% 45%)) 0%, transparent 45%)",
        }}
      />

      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        {/* Hero banner image — animated entrance */}
        <div className="animate-fade-in">
          <div className="rounded-2xl overflow-hidden border border-amber/20 shadow-2xl shadow-black/60 hover-scale">
            <img
              src={heroBanner}
              alt="Your business is leaking. You just can't see it from inside the building."
              className="w-full h-auto block"
              loading="eager"
            />
          </div>
        </div>

        {/* Pulse accent line */}
        <div className="mt-8 flex items-center gap-3 animate-fade-in" style={{ animationDelay: "120ms", animationFillMode: "both" }}>
          <span className="h-px flex-1 bg-gradient-to-r from-transparent via-amber/60 to-transparent" />
          <span className="text-[10px] tracking-[0.35em] font-mono text-amber/80 uppercase">Case File · Indianapolis · US-Wide</span>
          <span className="h-px flex-1 bg-gradient-to-r from-transparent via-amber/60 to-transparent" />
        </div>

        {/* Headline + sub */}
        <section
          className="mt-10 text-center max-w-3xl mx-auto animate-fade-in"
          style={{ animationDelay: "200ms", animationFillMode: "both" }}
        >
          <h1 className="font-forensic text-4xl sm:text-6xl font-bold leading-[1.05] tracking-tight">
            Stop guessing what's broken.{" "}
            <span className="bg-gradient-to-r from-amber via-amber/90 to-amber/60 bg-clip-text text-transparent italic">Find the leak.</span>
          </h1>
          <p className="mt-6 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Forensic diagnostics on real businesses. Real numbers. No sugar. Pick a path — we'll show you exactly where the money is bleeding out.
          </p>
        </section>

        {/* Three CTAs — premium glass */}
        <section
          className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-5 animate-fade-in"
          style={{ animationDelay: "320ms", animationFillMode: "both" }}
        >
          {/* Main site */}
          <Link to="/home" className="group relative">
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-amber/40 via-amber/0 to-amber/20 opacity-60 group-hover:opacity-100 blur-sm transition-opacity duration-500" aria-hidden />
            <div className="relative h-full rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] via-white/[0.02] to-transparent backdrop-blur-xl p-7 overflow-hidden transition-all duration-500 group-hover:-translate-y-1 group-hover:border-amber/40 group-hover:shadow-[0_20px_60px_-15px_hsl(var(--amber)/0.35)]">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber/60 to-transparent" aria-hidden />
              <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-amber/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" aria-hidden />
              <div className="relative flex items-center justify-between mb-5">
                <span className="w-11 h-11 rounded-xl border border-amber/30 bg-amber/10 grid place-items-center backdrop-blur">
                  <ExternalLink className="w-5 h-5 text-amber" />
                </span>
                <span className="text-[10px] tracking-[0.3em] font-mono text-muted-foreground uppercase">01 / Tour</span>
              </div>
              <h3 className="relative text-xl font-bold font-forensic tracking-tight">Enter the Main Site</h3>
              <p className="relative mt-2 text-sm text-muted-foreground leading-relaxed">
                The full Aetheris methodology, case files, and forensic operator tools.
              </p>
              <div className="relative mt-6 inline-flex items-center gap-2 text-amber text-sm font-semibold font-mono tracking-wide uppercase">
                Enter <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>

          {/* Form fill */}
          <Link to="/contact" className="group relative">
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-amber/40 via-amber/0 to-amber/20 opacity-60 group-hover:opacity-100 blur-sm transition-opacity duration-500" aria-hidden />
            <div className="relative h-full rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] via-white/[0.02] to-transparent backdrop-blur-xl p-7 overflow-hidden transition-all duration-500 group-hover:-translate-y-1 group-hover:border-amber/40 group-hover:shadow-[0_20px_60px_-15px_hsl(var(--amber)/0.35)]">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber/60 to-transparent" aria-hidden />
              <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-amber/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" aria-hidden />
              <div className="relative flex items-center justify-between mb-5">
                <span className="w-11 h-11 rounded-xl border border-amber/30 bg-amber/10 grid place-items-center backdrop-blur">
                  <FileText className="w-5 h-5 text-amber" />
                </span>
                <span className="text-[10px] tracking-[0.3em] font-mono text-muted-foreground uppercase">02 / Intake</span>
              </div>
              <h3 className="relative text-xl font-bold font-forensic tracking-tight">File the Intake</h3>
              <p className="relative mt-2 text-sm text-muted-foreground leading-relaxed">
                Tell us what's bleeding. We respond inside 24 hours with a plain-English read.
              </p>
              <div className="relative mt-6 inline-flex items-center gap-2 text-amber text-sm font-semibold font-mono tracking-wide uppercase">
                Open form <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>

          {/* Book appointment — primary */}
          <a href={BOOK_MEETING_URL} target="_blank" rel="noopener noreferrer" className="group relative">
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-amber via-amber/40 to-amber/80 opacity-90 group-hover:opacity-100 blur-sm transition-opacity duration-500" aria-hidden />
            <div className="relative h-full rounded-2xl border border-amber/50 bg-gradient-to-br from-amber/20 via-amber/10 to-amber/[0.04] backdrop-blur-xl p-7 overflow-hidden transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-[0_25px_70px_-15px_hsl(var(--amber)/0.6)]">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber to-transparent" aria-hidden />
              <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-amber/20 blur-3xl" aria-hidden />
              <div className="relative flex items-center justify-between mb-5">
                <span className="w-11 h-11 rounded-xl border border-amber/60 bg-amber/20 grid place-items-center backdrop-blur">
                  <Calendar className="w-5 h-5 text-amber" />
                </span>
                <span className="text-[10px] tracking-[0.3em] font-mono text-amber/90 uppercase">03 / Live</span>
              </div>
              <h3 className="relative text-xl font-bold font-forensic tracking-tight text-foreground">
                Book the Forensic Call
              </h3>
              <p className="relative mt-2 text-sm text-foreground/80 leading-relaxed">
                30 minutes with Joseph. Bring the number that's been keeping you up.
              </p>
              <div className="relative mt-6 inline-flex items-center gap-2 text-amber text-sm font-semibold font-mono tracking-wide uppercase">
                Pick a time <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </a>
        </section>

        {/* Contact info — glass panel */}
        <section
          className="relative mt-16 animate-fade-in"
          style={{ animationDelay: "440ms", animationFillMode: "both" }}
        >
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-amber/30 via-transparent to-amber/10 opacity-60 blur-sm" aria-hidden />
          <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] via-white/[0.02] to-transparent backdrop-blur-2xl p-6 sm:p-10 overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber/50 to-transparent" aria-hidden />
            <div className="absolute -bottom-32 -left-32 w-72 h-72 rounded-full bg-amber/5 blur-3xl" aria-hidden />

            <div className="relative flex items-center gap-3 mb-8">
              <span className="text-[10px] tracking-[0.35em] font-mono text-amber uppercase">Direct Line · Operator Channel</span>
              <span className="h-px flex-1 bg-gradient-to-r from-amber/30 to-transparent" />
            </div>
            <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-6">
              <a href="tel:+13173762110" className="group flex items-start gap-4 transition-transform hover:-translate-y-0.5">
                <span className="shrink-0 w-12 h-12 rounded-xl border border-amber/40 grid place-items-center bg-gradient-to-br from-amber/15 to-transparent backdrop-blur group-hover:from-amber/30 group-hover:border-amber transition-all">
                  <Phone className="w-5 h-5 text-amber" />
                </span>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-mono">Phone</p>
                  <p className="text-lg font-bold text-foreground tracking-tight">(317) 376-2110</p>
                </div>
              </a>
              <a href="mailto:Aetheris.technology@outlook.com" className="group flex items-start gap-4 transition-transform hover:-translate-y-0.5">
                <span className="shrink-0 w-12 h-12 rounded-xl border border-amber/40 grid place-items-center bg-gradient-to-br from-amber/15 to-transparent backdrop-blur group-hover:from-amber/30 group-hover:border-amber transition-all">
                  <Mail className="w-5 h-5 text-amber" />
                </span>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-mono">Email</p>
                  <p className="text-base font-bold text-foreground break-all tracking-tight">Aetheris.technology@outlook.com</p>
                </div>
              </a>
              <div className="flex items-start gap-4">
                <span className="shrink-0 w-12 h-12 rounded-xl border border-amber/40 grid place-items-center bg-gradient-to-br from-amber/15 to-transparent backdrop-blur">
                  <MapPin className="w-5 h-5 text-amber" />
                </span>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-mono">Based</p>
                  <p className="text-lg font-bold text-foreground tracking-tight">Indianapolis, IN</p>
                  <p className="text-xs text-muted-foreground">Operators · US-wide</p>
                </div>
              </div>
            </div>

            <div className="relative mt-10 flex flex-wrap gap-3">
              <Button asChild variant="outline" className="border-amber/40 text-amber hover:bg-amber hover:text-background backdrop-blur bg-white/[0.02] font-mono uppercase tracking-wider text-xs">
                <a href="tel:+13173762110">Call now</a>
              </Button>
              <Button asChild className="bg-gradient-to-r from-amber to-amber/80 text-background hover:from-amber/90 hover:to-amber/70 font-bold shadow-[0_10px_30px_-10px_hsl(var(--amber)/0.6)] font-mono uppercase tracking-wider text-xs">
                <a href={BOOK_MEETING_URL} target="_blank" rel="noopener noreferrer">
                  Book the Diagnostic <ArrowRight className="ml-2 w-4 h-4" />
                </a>
              </Button>
            </div>
          </div>
        </section>


        <footer className="mt-12 text-center text-xs text-muted-foreground font-mono tracking-[0.2em] uppercase animate-fade-in" style={{ animationDelay: "600ms", animationFillMode: "both" }}>
          Aetheris · Business Forensics · Real Findings · No Sugar
        </footer>
      </main>
    </div>
  );
};

export default LeakLanderPage;
