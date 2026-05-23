import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar, FileText, Phone, Mail, MapPin, ExternalLink, HelpCircle, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/SEOHead";
import { BOOK_MEETING_URL } from "@/lib/links";
import heroBanner from "@/assets/leak-banner-hero.png";

const LeakLanderPage: React.FC = () => {
  const [whatOpen, setWhatOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden flex flex-col">
      <SEOHead
        title="Your Business Is Leaking — Aetheris Business Forensics"
        description="78% of leaks we find, the owner already felt — they just couldn't name them. Book a Forensic Diagnostic with Aetheris in Indianapolis."
        path="/lander"
      />

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
          {/* Hero banner — compact */}
          <div className="animate-fade-in max-w-2xl mx-auto">
            <div className="rounded-2xl overflow-hidden border border-amber/20 shadow-2xl shadow-black/60">
              <img
                src={heroBanner}
                alt="Your business is leaking. You just can't see it from inside the building."
                className="w-full h-auto block max-h-[32vh] object-cover"
                loading="eager"
              />
            </div>
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
            <Button asChild variant="outline" size="sm" className="border-white/15 bg-white/[0.04] backdrop-blur hover:border-amber/50 hover:bg-amber/10 text-foreground font-mono uppercase tracking-wider text-xs">
              <Link to="/home">
                <ExternalLink className="w-3.5 h-3.5 mr-2 text-amber" />
                Main Site
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="border-white/15 bg-white/[0.04] backdrop-blur hover:border-amber/50 hover:bg-amber/10 text-foreground font-mono uppercase tracking-wider text-xs">
              <Link to="/contact">
                <FileText className="w-3.5 h-3.5 mr-2 text-amber" />
                Intake Form
              </Link>
            </Button>
            <Button asChild size="sm" className="bg-gradient-to-r from-amber to-amber/80 text-background hover:from-amber/90 hover:to-amber/70 font-bold font-mono uppercase tracking-wider text-xs shadow-[0_10px_30px_-10px_hsl(var(--amber)/0.6)]">
              <a href={BOOK_MEETING_URL} target="_blank" rel="noopener noreferrer">
                <Calendar className="w-3.5 h-3.5 mr-2" />
                Book the Diagnostic
                <ArrowRight className="ml-2 w-3.5 h-3.5" />
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
              className="w-full group relative inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-crimson/40 bg-crimson/[0.08] backdrop-blur hover:bg-crimson/15 hover:border-crimson/70 transition-all text-foreground font-mono uppercase tracking-wider text-xs shadow-[0_10px_30px_-15px_hsl(var(--crimson)/0.6)]"
              aria-expanded={whatOpen}
            >
              <HelpCircle className="w-4 h-4 text-crimson" />
              <span className="font-bold drop-shadow-[0_0_10px_hsl(var(--crimson)/0.45)]">What The Hell Do We Do?</span>
              <ChevronDown className={`w-4 h-4 text-crimson transition-transform ${whatOpen ? "rotate-180" : ""}`} />
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
              Aetheris · Business Forensics · No Sugar
            </p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default LeakLanderPage;
