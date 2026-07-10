import { Link } from "react-router-dom";
import { ArrowRight, Cpu } from "lucide-react";

/**
 * Homepage CTA for the free Golden Report — rendered as an integrated-circuit
 * package on an Aetheris Chip substrate: floating die outlines, amber trace
 * field, fine solder nodes, and a silicon die you press to run the scan.
 */
export function HomeToolShopGrid() {
  // 10 pins per side — enough to read as a real DIP without getting noisy
  const pins = Array.from({ length: 10 });

  return (
    <section className="mt-6 max-w-5xl mx-auto animate-fade-in">
      <div className="relative group">
        {/* Ambient board glow */}
        <div className="absolute -inset-4 bg-gradient-to-tr from-amber/15 via-amber/[0.04] to-transparent blur-3xl opacity-70 pointer-events-none" />

        {/* Substrate — deep black chip field */}
        <div
          className="relative rounded-lg overflow-hidden border border-amber/40 shadow-[0_20px_80px_-30px_hsl(var(--amber)/0.45)]"
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, hsl(220 15% 10%) 0%, hsl(220 15% 5%) 55%, hsl(0 0% 0%) 100%)",
          }}
        >
          {/* Floating die outlines (circuit field) */}
          <svg
            aria-hidden
            className="absolute inset-0 w-full h-full opacity-60 pointer-events-none"
            viewBox="0 0 400 200"
            preserveAspectRatio="none"
          >
            <defs>
              <filter id="chip-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="1.2" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <style>{`
                @keyframes chip-drift {
                  0%, 100% { transform: translate(0, 0); }
                  50% { transform: translate(var(--dx, 4px), var(--dy, -3px)); }
                }
                @keyframes chip-pulse {
                  0%, 100% { stroke-opacity: 0.18; }
                  50% { stroke-opacity: 0.42; }
                }
                @keyframes chip-flow {
                  from { stroke-dashoffset: 80; }
                  to { stroke-dashoffset: 0; }
                }
                .die-frame {
                  fill: none;
                  stroke: hsl(var(--amber));
                  stroke-width: 0.5;
                  stroke-opacity: 0.22;
                  filter: url(#chip-glow);
                  animation: chip-drift 18s ease-in-out infinite;
                }
                .die-flow {
                  fill: none;
                  stroke: hsl(var(--amber-glow));
                  stroke-width: 0.4;
                  stroke-dasharray: 3 40;
                  stroke-linecap: round;
                  filter: url(#chip-glow);
                  animation: chip-flow 10s linear infinite;
                }
                .die-node {
                  fill: hsl(var(--amber-glow));
                  animation: chip-pulse 4s ease-in-out infinite;
                }
                @media (prefers-reduced-motion: reduce) {
                  .die-frame, .die-flow, .die-node { animation: none !important; }
                }
              `}</style>
            </defs>

            {/* Floating rectangular die outlines */}
            <rect className="die-frame" x="6" y="10" width="70" height="45" rx="1" style={{ ["--dx" as string]: "3px", ["--dy" as string]: "-2px", animationDelay: "-2s" }} />
            <rect className="die-frame" x="324" y="12" width="70" height="40" rx="1" style={{ ["--dx" as string]: "-3px", ["--dy" as string]: "2px", animationDelay: "-7s" }} />
            <rect className="die-frame" x="18" y="125" width="55" height="60" rx="1" style={{ ["--dx" as string]: "2px", ["--dy" as string]: "3px", animationDelay: "-12s" }} />
            <rect className="die-frame" x="335" y="130" width="55" height="55" rx="1" style={{ ["--dx" as string]: "-2px", ["--dy" as string]: "-3px", animationDelay: "-5s" }} />
            <rect className="die-frame" x="90" y="160" width="80" height="30" rx="1" style={{ ["--dx" as string]: "4px", ["--dy" as string]: "-1px", animationDelay: "-9s" }} />
            <rect className="die-frame" x="230" y="160" width="80" height="30" rx="1" style={{ ["--dx" as string]: "-4px", ["--dy" as string]: "1px", animationDelay: "-15s" }} />

            {/* Inter-die traces */}
            <path className="die-flow" d="M76 32 L110 32 L130 50 L200 50" style={{ animationDelay: "-1s" }} />
            <path className="die-flow" d="M324 32 L290 32 L270 50 L200 50" style={{ animationDelay: "-3s" }} />
            <path className="die-flow" d="M73 155 L120 155 L140 140 L200 140" style={{ animationDelay: "-5s" }} />
            <path className="die-flow" d="M327 155 L280 155 L260 140 L200 140" style={{ animationDelay: "-7s" }} />

            {/* Small nodes */}
            <circle className="die-node" cx="110" cy="32" r="1" style={{ animationDelay: "0s" }} />
            <circle className="die-node" cx="290" cy="32" r="1" style={{ animationDelay: "0.8s" }} />
            <circle className="die-node" cx="120" cy="155" r="1" style={{ animationDelay: "1.6s" }} />
            <circle className="die-node" cx="280" cy="155" r="1" style={{ animationDelay: "2.4s" }} />
          </svg>

          {/* Fine trace grid (etched substrate) */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.08] pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(hsl(var(--amber)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--amber)) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
              maskImage:
                "radial-gradient(ellipse at center, black 30%, transparent 80%)",
              WebkitMaskImage:
                "radial-gradient(ellipse at center, black 30%, transparent 80%)",
            }}
          />

          {/* Silkscreen part-number etch (top rail) */}
          <div className="relative flex items-center justify-between px-5 sm:px-8 pt-4 z-10">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse shadow-[0_0_10px_hsl(var(--amber))]" />
              <span className="font-case text-[9px] uppercase tracking-[0.28em] text-amber/80">
                AETH-GR / IC-14
              </span>
            </div>
            <span className="font-case text-[9px] uppercase tracking-[0.28em] text-muted-foreground/60">
              LOT · v4.0.2 · USA
            </span>
          </div>

          {/* Chip body — DIP with pins */}
          <div className="relative px-5 sm:px-14 py-6 sm:py-10 z-10">
            {/* Left pin rail */}
            <div className="absolute left-2 sm:left-4 top-[18%] bottom-[18%] w-3 sm:w-6 hidden sm:flex flex-col justify-between">
              {pins.map((_, i) => (
                <div
                  key={`l-${i}`}
                  className="w-full h-1.5 rounded-r-sm bg-gradient-to-r from-amber/90 to-amber/40 shadow-[0_0_6px_hsl(var(--amber)/0.5)]"
                />
              ))}
            </div>
            {/* Right pin rail */}
            <div className="absolute right-2 sm:right-4 top-[18%] bottom-[18%] w-3 sm:w-6 hidden sm:flex flex-col justify-between">
              {pins.map((_, i) => (
                <div
                  key={`r-${i}`}
                  className="w-full h-1.5 rounded-l-sm bg-gradient-to-l from-amber/90 to-amber/40 shadow-[0_0_6px_hsl(var(--amber)/0.5)]"
                />
              ))}
            </div>

            {/* IC package (silicon die) */}
            <div
              className="relative mx-auto max-w-2xl rounded-md border border-amber/50 overflow-hidden"
              style={{
                background:
                  "radial-gradient(ellipse at 50% 0%, hsl(220 15% 12%) 0%, hsl(220 15% 5%) 70%)",
                boxShadow:
                  "inset 0 1px 0 hsl(var(--amber)/0.25), inset 0 -20px 40px -20px hsl(var(--amber)/0.15), 0 0 40px -10px hsl(var(--amber)/0.3)",
              }}
            >
              {/* Notch (pin-1 indicator) */}
              <div className="absolute left-1/2 -translate-x-1/2 -top-px w-8 h-3 rounded-b-full bg-background border-x border-b border-amber/50" />
              {/* Pin-1 dot */}
              <div className="absolute top-2.5 left-3 w-1.5 h-1.5 rounded-full bg-amber shadow-[0_0_6px_hsl(var(--amber))]" />

              <div className="relative px-6 py-8 sm:px-10 sm:py-10 text-center">
                {/* Etched part label */}
                <div className="font-case text-[9px] uppercase tracking-[0.4em] text-amber/70 mb-2">
                  AETHERIS · GOLDEN REPORT
                </div>

                <div className="flex items-center justify-center gap-2 mb-3">
                  <Cpu className="w-4 h-4 text-amber/80" />
                  <span className="font-case text-[10px] uppercase tracking-[0.3em] text-amber">
                    Free · 14-chapter case file
                  </span>
                </div>

                <h2 className="font-forensic text-2xl sm:text-4xl font-extrabold leading-tight mb-3">
                  Check your{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-b from-amber to-amber/50">
                    company.
                  </span>
                </h2>

                <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto mb-6">
                  Drop one URL. Aetheris runs the full forensic stack and delivers a 14-chapter
                  case file with verdicts, dollar leaks, and evidence you can query.
                </p>

                {/* CTA — the "activation" contact */}
                <Link
                  to="/golden-report"
                  className="group/btn relative inline-flex items-center justify-center gap-2 rounded-sm bg-amber text-background px-8 sm:px-12 py-4 text-sm sm:text-base font-mono uppercase tracking-widest font-bold transition-all duration-300 shadow-[0_0_30px_-4px_hsl(var(--amber)/0.6),inset_0_1px_0_hsl(0_0%_100%/0.4),inset_0_-2px_0_hsl(0_0%_0%/0.25)] hover:shadow-[0_0_50px_-2px_hsl(var(--amber)/0.8),inset_0_1px_0_hsl(0_0%_100%/0.5)] active:translate-y-px active:scale-[0.99]"
                >
                  {/* corner solder points */}
                  <span className="absolute -top-1 -left-1 w-1.5 h-1.5 rounded-full bg-amber/80" />
                  <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-amber/80" />
                  <span className="absolute -bottom-1 -left-1 w-1.5 h-1.5 rounded-full bg-amber/80" />
                  <span className="absolute -bottom-1 -right-1 w-1.5 h-1.5 rounded-full bg-amber/80" />
                  <span>Run the Golden Report</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
                </Link>

                {/* Data bus line */}
                <div className="mt-6 flex items-center gap-3">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber/40 to-transparent" />
                  <span className="font-case text-[9px] uppercase tracking-[0.28em] text-muted-foreground/60">
                    Secure Processing Enclave
                  </span>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber/40 to-transparent" />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom silkscreen */}
          <div className="relative flex items-center justify-between px-5 sm:px-8 pb-3 z-10">
            <span className="font-case text-[9px] uppercase tracking-[0.28em] text-muted-foreground/50">
              ▸ CLK · 14ch · 128b
            </span>
            <span className="font-case text-[9px] uppercase tracking-[0.28em] text-muted-foreground/50">
              PWR · GND · IO
            </span>
          </div>

          {/* Corner mounting-hole pads */}
          <div className="absolute top-2 left-2 w-2 h-2 rounded-full border border-amber/50 bg-background pointer-events-none" />
          <div className="absolute top-2 right-2 w-2 h-2 rounded-full border border-amber/50 bg-background pointer-events-none" />
          <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full border border-amber/50 bg-background pointer-events-none" />
          <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full border border-amber/50 bg-background pointer-events-none" />
        </div>
      </div>
    </section>
  );
}
