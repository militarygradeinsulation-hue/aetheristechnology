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
          <span className="text-[10px] tracking-[0.3em] font-mono text-amber/80 uppercase">Case File · Indianapolis · US-Wide</span>
          <span className="h-px flex-1 bg-gradient-to-r from-transparent via-amber/60 to-transparent" />
        </div>

        {/* Headline + sub */}
        <section
          className="mt-10 text-center max-w-3xl mx-auto animate-fade-in"
          style={{ animationDelay: "200ms", animationFillMode: "both" }}
        >
          <h1 className="font-display text-3xl sm:text-5xl font-bold leading-tight tracking-tight">
            Stop guessing what's broken.{" "}
            <span className="text-amber italic">Find the leak.</span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-muted-foreground leading-relaxed">
            We run forensic diagnostics on real businesses. Real numbers. No sugar.
            Pick a path below and we'll show you exactly where the money is bleeding out.
          </p>
        </section>

        {/* Three CTAs */}
        <section
          className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in"
          style={{ animationDelay: "320ms", animationFillMode: "both" }}
        >
          {/* Main site */}
          <Link to="/home" className="group">
            <div className="h-full rounded-xl border border-border bg-card/60 backdrop-blur p-6 transition-all duration-300 hover:border-amber/60 hover:bg-card hover:-translate-y-1 hover:shadow-[0_10px_40px_-10px_hsl(var(--amber)/0.4)]">
              <div className="flex items-center justify-between mb-4">
                <ExternalLink className="w-6 h-6 text-amber" />
                <span className="text-[10px] tracking-[0.25em] font-mono text-muted-foreground uppercase">01</span>
              </div>
              <h3 className="text-xl font-bold font-display">Main Site</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Tour the full Aetheris methodology, case files, and operator tools.
              </p>
              <div className="mt-5 inline-flex items-center gap-2 text-amber text-sm font-semibold">
                Enter <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>

          {/* Form fill */}
          <Link to="/contact" className="group">
            <div className="h-full rounded-xl border border-border bg-card/60 backdrop-blur p-6 transition-all duration-300 hover:border-amber/60 hover:bg-card hover:-translate-y-1 hover:shadow-[0_10px_40px_-10px_hsl(var(--amber)/0.4)]">
              <div className="flex items-center justify-between mb-4">
                <FileText className="w-6 h-6 text-amber" />
                <span className="text-[10px] tracking-[0.25em] font-mono text-muted-foreground uppercase">02</span>
              </div>
              <h3 className="text-xl font-bold font-display">Tell Us What's Wrong</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Drop the quick intake form. We'll respond within 24 hours with a plain-English read.
              </p>
              <div className="mt-5 inline-flex items-center gap-2 text-amber text-sm font-semibold">
                Open the form <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>

          {/* Book appointment */}
          <a href={BOOK_MEETING_URL} target="_blank" rel="noopener noreferrer" className="group">
            <div className="h-full rounded-xl border-2 border-amber bg-amber/10 backdrop-blur p-6 transition-all duration-300 hover:bg-amber hover:text-background hover:-translate-y-1 hover:shadow-[0_10px_40px_-10px_hsl(var(--amber)/0.6)]">
              <div className="flex items-center justify-between mb-4">
                <Calendar className="w-6 h-6 text-amber group-hover:text-background transition-colors" />
                <span className="text-[10px] tracking-[0.25em] font-mono text-amber/80 group-hover:text-background/80 uppercase">03</span>
              </div>
              <h3 className="text-xl font-bold font-display">Book an Appointment</h3>
              <p className="mt-2 text-sm text-foreground/80 group-hover:text-background/90">
                30-minute forensic call with Joseph. Bring a number that's been bugging you.
              </p>
              <div className="mt-5 inline-flex items-center gap-2 text-amber group-hover:text-background text-sm font-semibold">
                Pick a time <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </a>
        </section>

        {/* Contact info */}
        <section
          className="mt-16 rounded-2xl border border-border bg-card/40 backdrop-blur p-6 sm:p-10 animate-fade-in"
          style={{ animationDelay: "440ms", animationFillMode: "both" }}
        >
          <div className="flex items-center gap-3 mb-6">
            <span className="text-[10px] tracking-[0.3em] font-mono text-amber uppercase">Direct Line</span>
            <span className="h-px flex-1 bg-amber/20" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <a href="tel:+13173762110" className="group flex items-start gap-4 hover-scale">
              <span className="shrink-0 w-11 h-11 rounded-full border border-amber/40 grid place-items-center bg-amber/5 group-hover:bg-amber/20 transition-colors">
                <Phone className="w-5 h-5 text-amber" />
              </span>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono">Phone</p>
                <p className="text-lg font-bold text-foreground">(317) 376-2110</p>
              </div>
            </a>
            <a href="mailto:Aetheris.technology@outlook.com" className="group flex items-start gap-4 hover-scale">
              <span className="shrink-0 w-11 h-11 rounded-full border border-amber/40 grid place-items-center bg-amber/5 group-hover:bg-amber/20 transition-colors">
                <Mail className="w-5 h-5 text-amber" />
              </span>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono">Email</p>
                <p className="text-lg font-bold text-foreground break-all">joseph@aetheris.technology</p>
              </div>
            </a>
            <div className="flex items-start gap-4">
              <span className="shrink-0 w-11 h-11 rounded-full border border-amber/40 grid place-items-center bg-amber/5">
                <MapPin className="w-5 h-5 text-amber" />
              </span>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono">Based</p>
                <p className="text-lg font-bold text-foreground">Indianapolis, IN</p>
                <p className="text-xs text-muted-foreground">Serving operators US-wide</p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="outline" className="border-amber/40 text-amber hover:bg-amber hover:text-background">
              <a href="tel:+13173762110">Call now</a>
            </Button>
            <Button asChild className="bg-amber text-background hover:bg-amber/90 font-bold">
              <a href={BOOK_MEETING_URL} target="_blank" rel="noopener noreferrer">
                Book the Diagnostic <ArrowRight className="ml-2 w-4 h-4" />
              </a>
            </Button>
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
