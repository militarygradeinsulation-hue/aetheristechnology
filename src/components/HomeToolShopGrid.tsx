import { Link } from "react-router-dom";
import { ArrowRight, Cpu } from "lucide-react";

/**
 * Homepage CTA for the free Golden Report — rendered as an integrated-circuit
 * package: gold contact pads down each side, PCB trace lines, silicon die
 * label, part-number etch, and a status LED. The primary CTA is the die
 * itself — pressing it "runs" the chip.
 */
export function HomeToolShopGrid() {
  // 10 pins per side — enough to read as a real DIP without getting noisy
  const pins = Array.from({ length: 10 });

  return (
    <section className="mt-6 max-w-5xl mx-auto animate-fade-in">
      <div className="relative group">
        {/* Ambient board glow */}
        <div className="absolute -inset-4 bg-gradient-to-tr from-amber/15 via-amber/[0.04] to-transparent blur-3xl opacity-70 pointer-events-none" />

        {/* PCB substrate */}
        <div
          className="relative rounded-lg overflow-hidden border border-amber/40 shadow-[0_20px_80px_-30px_hsl(var(--amber)/0.45)]"
          style={{
            background:
              "linear-gradient(135deg, hsl(150 40% 6%) 0%, hsl(150 30% 4%) 55%, hsl(150 40% 5%) 100%)",
          }}
        >
          {/* Copper trace grid (etched-board look) */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.18] pointer-events-none"
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

          {/* Diagonal PCB traces + slowly flowing amber current */}
          <svg
            aria-hidden
            className="absolute inset-0 w-full h-full opacity-[0.55] pointer-events-none"
            viewBox="0 0 400 200"
            preserveAspectRatio="none"
          >
            <defs>
              <style>{`
                @keyframes chip-flow { from { stroke-dashoffset: 60; } to { stroke-dashoffset: 0; } }
                @keyframes chip-flow-rev { from { stroke-dashoffset: 0; } to { stroke-dashoffset: 60; } }
                @keyframes chip-pad-pulse {
                  0%,100% { opacity: 0.45; r: 1.4; }
                  50% { opacity: 1; r: 2; }
                }
                .chip-static { stroke: hsl(var(--amber)); stroke-width: 0.4; fill: none; opacity: 0.5; }
                .chip-wire {
                  stroke: hsl(var(--amber));
                  stroke-width: 0.9;
                  fill: none;
                  stroke-dasharray: 6 12;
                  filter: drop-shadow(0 0 2px hsl(var(--amber)));
                }
                .chip-wire.a { animation: chip-flow 6s linear infinite; }
                .chip-wire.b { animation: chip-flow-rev 7.5s linear infinite; }
                .chip-wire.c { animation: chip-flow 9s linear infinite; }
                .chip-wire.d { animation: chip-flow-rev 6.8s linear infinite; }
                .chip-wire.e { animation: chip-flow 8s linear infinite; }
                .chip-wire.f { animation: chip-flow-rev 10s linear infinite; }
                .chip-pad { fill: hsl(var(--amber)); animation: chip-pad-pulse 2.6s ease-in-out infinite; }
                @media (prefers-reduced-motion: reduce) {
                  .chip-wire, .chip-pad { animation: none !important; }
                }
              `}</style>
            </defs>

            {/* faint substrate traces */}
            <g className="chip-static">
              <path d="M0 20 L90 20 L110 40 L200 40" />
              <path d="M400 25 L310 25 L290 45 L200 45" />
              <path d="M0 100 L60 100 L80 80 L180 80 L200 100 L400 100" />
              <path d="M0 180 L90 180 L110 160 L200 160" />
              <path d="M400 185 L310 185 L290 165 L200 165" />
              <path d="M50 0 L50 30 L70 50" />
              <path d="M350 0 L350 30 L330 50" />
              <path d="M120 200 L120 170 L140 150" />
              <path d="M280 200 L280 170 L260 150" />
            </g>

            {/* current-carrying wires — slow amber flow */}
            <path className="chip-wire a" d="M0 40 L70 40 L90 60 L160 60 L180 80 L400 80" />
            <path className="chip-wire b" d="M400 55 L330 55 L310 75 L240 75 L220 95 L0 95" />
            <path className="chip-wire c" d="M0 130 L80 130 L100 110 L200 110 L220 130 L400 130" />
            <path className="chip-wire d" d="M400 150 L320 150 L300 170 L200 170 L180 150 L0 150" />
            <path className="chip-wire e" d="M20 0 L20 40 L40 60 L40 200" />
            <path className="chip-wire f" d="M380 0 L380 40 L360 60 L360 200" />

            {/* solder/via pads pulsing with the current */}
            <g>
              <circle className="chip-pad" cx="70" cy="40" style={{ animationDelay: '0s' }} />
              <circle className="chip-pad" cx="330" cy="55" style={{ animationDelay: '0.5s' }} />
              <circle className="chip-pad" cx="80" cy="130" style={{ animationDelay: '1s' }} />
              <circle className="chip-pad" cx="320" cy="150" style={{ animationDelay: '1.5s' }} />
              <circle className="chip-pad" cx="40" cy="60" style={{ animationDelay: '0.7s' }} />
              <circle className="chip-pad" cx="360" cy="60" style={{ animationDelay: '1.2s' }} />
            </g>
          </svg>

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
                  "radial-gradient(ellipse at 50% 0%, hsl(0 0% 10%) 0%, hsl(0 0% 4%) 70%)",
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
