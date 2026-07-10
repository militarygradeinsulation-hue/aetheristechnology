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
          {/* Neural circuit field — yellow synaptic connectors */}
          <svg
            aria-hidden
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 400 200"
            preserveAspectRatio="none"
          >
            <defs>
              <filter id="chip-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="1.4" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <radialGradient id="synapse-node" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="hsl(48 100% 70%)" stopOpacity="1" />
                <stop offset="60%" stopColor="hsl(45 100% 55%)" stopOpacity="0.7" />
                <stop offset="100%" stopColor="hsl(45 100% 50%)" stopOpacity="0" />
              </radialGradient>
              <style>{`
                @keyframes neuron-fire {
                  0%, 100% { stroke-opacity: 0.12; stroke-width: 0.4; }
                  40% { stroke-opacity: 0.85; stroke-width: 0.7; }
                  60% { stroke-opacity: 0.4; stroke-width: 0.5; }
                }
                @keyframes neuron-flow {
                  from { stroke-dashoffset: 120; }
                  to { stroke-dashoffset: 0; }
                }
                @keyframes synapse-pulse {
                  0%, 100% { opacity: 0.35; }
                  50% { opacity: 1; }
                }
                @keyframes spark-travel {
                  0% { offset-distance: 0%; opacity: 0; }
                  10% { opacity: 1; }
                  90% { opacity: 1; }
                  100% { offset-distance: 100%; opacity: 0; }
                }
                .axon {
                  fill: none;
                  stroke: hsl(48 100% 60%);
                  stroke-width: 0.5;
                  stroke-linecap: round;
                  filter: url(#chip-glow);
                  animation: neuron-fire 3.2s ease-in-out infinite;
                }
                .dendrite {
                  fill: none;
                  stroke: hsl(45 100% 55%);
                  stroke-width: 0.35;
                  stroke-dasharray: 2 8;
                  stroke-linecap: round;
                  opacity: 0.55;
                  filter: url(#chip-glow);
                  animation: neuron-flow 6s linear infinite;
                }
                .soma {
                  fill: url(#synapse-node);
                  animation: synapse-pulse 2.4s ease-in-out infinite;
                }
                .spark {
                  fill: hsl(50 100% 78%);
                  filter: url(#chip-glow);
                  animation: spark-travel 4s linear infinite;
                }
                @media (prefers-reduced-motion: reduce) {
                  .axon, .dendrite, .soma, .spark { animation: none !important; }
                }
              `}</style>
            </defs>

            {/* Long myelinated axons — trunk lines pulsing like neurons firing */}
            <path className="axon" d="M0 40 C 60 40, 90 70, 140 70 S 220 100, 260 100 S 340 70, 400 70" style={{ animationDelay: "-0.2s" }} />
            <path className="axon" d="M0 130 C 70 130, 100 100, 160 100 S 240 130, 300 130 S 360 100, 400 100" style={{ animationDelay: "-1.4s" }} />
            <path className="axon" d="M0 90 C 50 90, 80 60, 130 60 S 210 40, 260 40 S 340 60, 400 60" style={{ animationDelay: "-2.6s" }} />
            <path className="axon" d="M0 165 C 60 165, 110 150, 170 150 S 260 170, 320 170 S 370 155, 400 155" style={{ animationDelay: "-0.9s" }} />

            {/* Branching dendrites */}
            <path className="dendrite" d="M80 100 C 100 90, 110 70, 140 70" style={{ animationDelay: "-0.5s" }} />
            <path className="dendrite" d="M80 100 C 100 110, 110 130, 160 130" style={{ animationDelay: "-1.2s" }} />
            <path className="dendrite" d="M200 60 C 210 80, 230 90, 260 100" style={{ animationDelay: "-2.1s" }} />
            <path className="dendrite" d="M200 140 C 220 130, 240 115, 260 100" style={{ animationDelay: "-3s" }} />
            <path className="dendrite" d="M300 40 C 310 60, 330 75, 340 90" style={{ animationDelay: "-1.7s" }} />
            <path className="dendrite" d="M320 170 C 310 155, 290 140, 260 135" style={{ animationDelay: "-2.8s" }} />
            <path className="dendrite" d="M140 70 C 150 55, 170 45, 200 60" style={{ animationDelay: "-3.4s" }} />
            <path className="dendrite" d="M160 130 C 175 145, 190 155, 220 150" style={{ animationDelay: "-0.7s" }} />

            {/* Synapse nodes */}
            <circle className="soma" cx="80" cy="100" r="2.2" style={{ animationDelay: "0s" }} />
            <circle className="soma" cx="140" cy="70" r="1.8" style={{ animationDelay: "0.3s" }} />
            <circle className="soma" cx="160" cy="130" r="2" style={{ animationDelay: "0.6s" }} />
            <circle className="soma" cx="200" cy="60" r="1.6" style={{ animationDelay: "0.9s" }} />
            <circle className="soma" cx="200" cy="140" r="1.6" style={{ animationDelay: "1.2s" }} />
            <circle className="soma" cx="260" cy="100" r="2.4" style={{ animationDelay: "1.5s" }} />
            <circle className="soma" cx="300" cy="40" r="1.8" style={{ animationDelay: "1.8s" }} />
            <circle className="soma" cx="320" cy="170" r="1.8" style={{ animationDelay: "2.1s" }} />
            <circle className="soma" cx="340" cy="90" r="2" style={{ animationDelay: "0.4s" }} />

            {/* Traveling electrical sparks along axons */}
            <circle className="spark" r="1.4" style={{ offsetPath: "path('M0 40 C 60 40, 90 70, 140 70 S 220 100, 260 100 S 340 70, 400 70')", animationDelay: "0s" } as React.CSSProperties} />
            <circle className="spark" r="1.2" style={{ offsetPath: "path('M0 130 C 70 130, 100 100, 160 100 S 240 130, 300 130 S 360 100, 400 100')", animationDelay: "-1.6s", animationDuration: "5s" } as React.CSSProperties} />
            <circle className="spark" r="1.3" style={{ offsetPath: "path('M0 90 C 50 90, 80 60, 130 60 S 210 40, 260 40 S 340 60, 400 60')", animationDelay: "-2.8s", animationDuration: "4.5s" } as React.CSSProperties} />
            <circle className="spark" r="1.1" style={{ offsetPath: "path('M0 165 C 60 165, 110 150, 170 150 S 260 170, 320 170 S 370 155, 400 155')", animationDelay: "-0.7s", animationDuration: "5.5s" } as React.CSSProperties} />
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
