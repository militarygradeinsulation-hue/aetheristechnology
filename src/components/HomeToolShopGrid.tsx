import { Link } from "react-router-dom";
import { ScrollText, ArrowRight } from "lucide-react";

/**
 * Homepage CTA for the free Golden Report — the primary way visitors check
 * their company on the main site.
 *
 * Atmospheric Forensic Noir: deep card, amber glow, corner brackets,
 * pulsing status dot, and a gradient headline word.
 */
export function HomeToolShopGrid() {
  return (
    <section className="mt-6 max-w-5xl mx-auto animate-fade-in">
      <div className="relative group">
        {/* Atmospheric amber glows */}
        <div className="absolute -inset-2 bg-gradient-to-tr from-amber/20 via-amber/5 to-transparent blur-2xl opacity-60 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-amber/10 blur-3xl pointer-events-none" />

        {/* Main card */}
        <div className="relative rounded-sm border border-amber/40 bg-card/90 backdrop-blur-sm overflow-hidden shadow-2xl">
          {/* Subtle forensic dot texture */}
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />

          {/* Top technical bar */}
          <div className="relative flex items-center justify-between px-5 pt-5 sm:px-8 sm:pt-6">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse shadow-[0_0_8px_hsl(var(--amber)/0.8)]" />
              <span className="font-case text-[10px] uppercase tracking-[0.2em] text-amber/80">
                Free · 14-chapter case file
              </span>
            </div>
            <span className="font-case text-[10px] uppercase tracking-widest text-muted-foreground/60">
              v4.0.2
            </span>
          </div>

          {/* Content */}
          <div className="relative px-5 pb-6 pt-6 sm:px-8 sm:pb-8 sm:pt-8 text-center">
            <ScrollText className="w-5 h-5 sm:w-6 sm:h-6 text-amber mx-auto mb-3 opacity-80" />

            <h2 className="font-forensic text-2xl sm:text-4xl font-extrabold leading-tight mb-3">
              Check your{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-b from-amber to-amber/60">
                company.
              </span>
            </h2>

            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto mb-6 sm:mb-8">
              Drop one URL. Aetheris runs the full forensic stack and delivers a 14-chapter case file
              with verdicts, dollar leaks, and evidence you can search or ask questions of.
            </p>

            {/* Action area */}
            <div className="relative">
              <Link
                to="/golden-report"
                className="group/btn inline-flex items-center justify-center gap-2 w-full sm:w-auto rounded-sm bg-amber hover:bg-amber/90 text-background px-6 sm:px-10 py-4 text-sm sm:text-base font-mono uppercase tracking-widest font-bold transition-all duration-300 shadow-[0_0_30px_-4px_hsl(var(--amber)/0.45)] hover:shadow-[0_0_40px_-2px_hsl(var(--amber)/0.6)] active:scale-[0.98]"
              >
                <span>Run the Golden Report</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
              </Link>

              {/* Bottom micro-data */}
              <div className="mt-5 sm:mt-6 flex items-center gap-3 sm:gap-4">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber/30 to-transparent" />
                <span className="font-case text-[9px] uppercase tracking-[0.2em] text-muted-foreground/60">
                  Secure Processing Enclave
                </span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber/30 to-transparent" />
              </div>
            </div>
          </div>

          {/* Frame accents */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t border-l border-amber/20 rounded-tl-sm pointer-events-none" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-amber/20 rounded-tr-sm pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b border-l border-amber/20 rounded-bl-sm pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b border-r border-amber/20 rounded-br-sm pointer-events-none" />
        </div>
      </div>
    </section>
  );
}
