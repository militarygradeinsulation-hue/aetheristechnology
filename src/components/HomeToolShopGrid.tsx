import { Link } from "react-router-dom";
import { ArrowRight, Cpu } from "lucide-react";
import goldenReportHomeAsset from "@/assets/golden-report-home.png.asset.json";


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
                @keyframes fire-a {
                  0%, 100% { stroke-opacity: 0.04; }
                  22% { stroke-opacity: 0.38; }
                  28% { stroke-opacity: 0.10; }
                  61% { stroke-opacity: 0.28; }
                  67% { stroke-opacity: 0.06; }
                }
                @keyframes fire-b {
                  0%, 100% { stroke-opacity: 0.06; }
                  14% { stroke-opacity: 0.22; }
                  34% { stroke-opacity: 0.09; }
                  72% { stroke-opacity: 0.34; }
                  81% { stroke-opacity: 0.05; }
                }
                @keyframes fire-c {
                  0%, 100% { stroke-opacity: 0.05; }
                  9% { stroke-opacity: 0.30; }
                  41% { stroke-opacity: 0.14; }
                  55% { stroke-opacity: 0.06; }
                  88% { stroke-opacity: 0.26; }
                }
                @keyframes jitter-a {
                  0%, 100% { transform: translate(0, 0); }
                  20% { transform: translate(0.4px, -0.6px); }
                  55% { transform: translate(-0.7px, 0.3px); }
                  78% { transform: translate(0.3px, 0.5px); }
                }
                @keyframes jitter-b {
                  0%, 100% { transform: translate(0, 0); }
                  30% { transform: translate(-0.5px, 0.4px); }
                  62% { transform: translate(0.6px, -0.4px); }
                  85% { transform: translate(-0.3px, -0.5px); }
                }
                @keyframes flow-fast { from { stroke-dashoffset: 300; } to { stroke-dashoffset: 0; } }
                @keyframes flow-slow { from { stroke-dashoffset: 200; } to { stroke-dashoffset: 0; } }
                @keyframes synapse-pulse {
                  0%, 100% { opacity: 0.14; transform: scale(0.85); }
                  50% { opacity: 0.6; transform: scale(1.15); }
                }
                @keyframes spark-travel {
                  0% { offset-distance: 0%; opacity: 0; }
                  6% { opacity: 0.95; }
                  50% { opacity: 0.4; }
                  94% { opacity: 0.9; }
                  100% { offset-distance: 100%; opacity: 0; }
                }
                @keyframes branch-burst {
                  0%, 100% { opacity: 0; }
                  6% { opacity: 0.6; }
                  14% { opacity: 0; }
                  42% { opacity: 0.5; }
                  48% { opacity: 0; }
                  71% { opacity: 0.7; }
                  78% { opacity: 0; }
                }
                .axon {
                  fill: none;
                  stroke: hsl(48 90% 62%);
                  stroke-width: 0.22;
                  stroke-linecap: round;
                  stroke-opacity: 0.1;
                  transform-box: fill-box;
                  transform-origin: center;
                }
                .axon.a { animation: fire-a var(--fdur, 5.5s) ease-in-out infinite, jitter-a var(--jdur, 3.7s) ease-in-out infinite; }
                .axon.b { animation: fire-b var(--fdur, 7s) ease-in-out infinite, jitter-b var(--jdur, 4.9s) ease-in-out infinite; }
                .axon.c { animation: fire-c var(--fdur, 8.4s) ease-in-out infinite, jitter-a var(--jdur, 5.3s) ease-in-out infinite; }
                .dendrite {
                  fill: none;
                  stroke: hsl(45 85% 58%);
                  stroke-width: 0.18;
                  stroke-dasharray: 1 6;
                  stroke-linecap: round;
                  opacity: 0.3;
                  animation: flow-fast var(--ddur, 9s) linear infinite;
                }
                .dendrite.slow { animation: flow-slow var(--ddur, 14s) linear infinite; }
                .branch {
                  fill: none;
                  stroke: hsl(50 100% 70%);
                  stroke-width: 0.28;
                  stroke-linecap: round;
                  opacity: 0;
                  filter: url(#chip-glow);
                  animation: branch-burst var(--bdur, 6s) ease-in-out infinite;
                }
                .filament {
                  fill: none;
                  stroke: hsl(46 90% 60%);
                  stroke-width: 0.14;
                  stroke-linecap: round;
                  opacity: 0.2;
                }
                .soma {
                  fill: url(#synapse-node);
                  transform-box: fill-box;
                  transform-origin: center;
                  animation: synapse-pulse var(--sdur, 3.4s) ease-in-out infinite;
                }
                .spark {
                  fill: hsl(50 100% 78%);
                  filter: url(#chip-glow);
                  opacity: 0.8;
                }
                @media (prefers-reduced-motion: reduce) {
                  .axon, .dendrite, .branch, .soma, .spark { animation: none !important; }
                }
              `}</style>
            </defs>

            {/* Chaotic axons — varied speeds, jitter, opacity waves */}
            <path className="axon a" d="M0 38 Q 22 44, 38 36 T 74 42 T 118 32 Q 138 46, 162 40 T 208 52 T 254 44 Q 278 58, 302 46 T 348 54 T 400 44" style={{ ["--fdur" as string]: "4.7s", ["--jdur" as string]: "3.1s", animationDelay: "-0.2s, -1.1s" }} />
            <path className="axon b" d="M0 128 Q 26 118, 48 132 T 92 122 T 138 138 Q 162 126, 186 140 T 232 128 T 280 144 Q 306 132, 332 146 T 400 132" style={{ ["--fdur" as string]: "8.3s", ["--jdur" as string]: "5.7s", animationDelay: "-1.4s, -0.8s" }} />
            <path className="axon c" d="M0 88 Q 18 78, 44 92 T 88 76 T 132 90 Q 158 74, 184 88 T 230 72 T 276 86 Q 302 70, 330 84 T 400 74" style={{ ["--fdur" as string]: "6.1s", ["--jdur" as string]: "4.3s", animationDelay: "-2.6s, -2.2s" }} />
            <path className="axon a" d="M0 168 Q 24 156, 52 172 T 96 158 T 148 174 Q 174 160, 200 176 T 250 162 T 302 178 Q 328 164, 356 180 T 400 168" style={{ ["--fdur" as string]: "9.7s", ["--jdur" as string]: "6.1s", animationDelay: "-0.9s, -3.4s" }} />
            <path className="axon b" d="M0 62 Q 30 72, 56 58 T 104 68 T 154 54 Q 182 68, 208 56 T 262 66 T 316 52 Q 344 66, 400 56" style={{ ["--fdur" as string]: "5.4s", ["--jdur" as string]: "7.2s", animationDelay: "-3.7s, -1.9s" }} />
            <path className="axon c" d="M0 108 Q 34 96, 62 112 T 110 100 T 162 116 Q 190 100, 220 118 T 274 102 T 328 118 Q 360 104, 400 116" style={{ ["--fdur" as string]: "7.6s", ["--jdur" as string]: "4.8s", animationDelay: "-4.4s, -0.5s" }} />

            {/* Chaotic branching dendrites — varied flow directions */}
            <path className="dendrite" d="M62 88 Q 78 70, 96 58 T 128 42" style={{ ["--ddur" as string]: "6s", animationDelay: "-0.5s" }} />
            <path className="dendrite slow" d="M74 108 Q 90 122, 108 132 T 148 148" style={{ ["--ddur" as string]: "12s", animationDelay: "-1.2s" }} />
            <path className="dendrite" d="M196 54 Q 210 72, 232 82 T 270 96" style={{ ["--ddur" as string]: "8.4s", animationDelay: "-2.1s" }} />
            <path className="dendrite slow" d="M204 142 Q 224 132, 244 122 T 272 108" style={{ ["--ddur" as string]: "15s", animationDelay: "-3s" }} />
            <path className="dendrite" d="M292 46 Q 306 62, 322 74 T 348 92" style={{ ["--ddur" as string]: "5.2s", animationDelay: "-1.7s" }} />
            <path className="dendrite" d="M318 168 Q 300 154, 282 142 T 254 132" style={{ ["--ddur" as string]: "9.6s", animationDelay: "-2.8s" }} />
            <path className="dendrite slow" d="M132 68 Q 148 52, 168 44 T 198 58" style={{ ["--ddur" as string]: "13s", animationDelay: "-3.4s" }} />
            <path className="dendrite" d="M162 130 Q 178 146, 194 154 T 226 152" style={{ ["--ddur" as string]: "7s", animationDelay: "-0.7s" }} />
            <path className="dendrite" d="M46 148 Q 60 158, 78 162 T 108 160" style={{ ["--ddur" as string]: "10s", animationDelay: "-4.1s" }} />
            <path className="dendrite slow" d="M348 118 Q 362 126, 376 132 T 396 138" style={{ ["--ddur" as string]: "11s", animationDelay: "-2.4s" }} />
            <path className="dendrite" d="M228 172 Q 240 158, 254 148 T 280 138" style={{ ["--ddur" as string]: "8s", animationDelay: "-5s" }} />
            <path className="dendrite" d="M112 30 Q 128 20, 146 18 T 178 24" style={{ ["--ddur" as string]: "6.5s", animationDelay: "-3.9s" }} />

            {/* Bursting branch strikes — appear/disappear at random intervals */}
            <path className="branch" d="M118 32 L 128 20 L 140 12" style={{ ["--bdur" as string]: "7s", animationDelay: "-0.3s" }} />
            <path className="branch" d="M162 40 L 172 26 L 186 20 L 200 12" style={{ ["--bdur" as string]: "9s", animationDelay: "-2.6s" }} />
            <path className="branch" d="M254 44 L 268 34 L 282 40 L 292 30" style={{ ["--bdur" as string]: "6.4s", animationDelay: "-1.5s" }} />
            <path className="branch" d="M138 138 L 128 150 L 116 162" style={{ ["--bdur" as string]: "8.2s", animationDelay: "-4.1s" }} />
            <path className="branch" d="M232 128 L 244 116 L 258 122 L 268 112" style={{ ["--bdur" as string]: "7.7s", animationDelay: "-3s" }} />
            <path className="branch" d="M88 76 L 76 66 L 68 74 L 58 62" style={{ ["--bdur" as string]: "10s", animationDelay: "-1.8s" }} />
            <path className="branch" d="M276 86 L 288 96 L 302 92 L 314 102" style={{ ["--bdur" as string]: "8.6s", animationDelay: "-5.2s" }} />
            <path className="branch" d="M96 158 L 88 168 L 78 176" style={{ ["--bdur" as string]: "6.9s", animationDelay: "-2.3s" }} />
            <path className="branch" d="M302 178 L 314 168 L 326 174" style={{ ["--bdur" as string]: "9.4s", animationDelay: "-0.9s" }} />

            {/* Fine capillary filaments — static texture */}
            <path className="filament" d="M22 22 Q 40 30, 58 24 T 92 30" />
            <path className="filament" d="M280 22 Q 296 30, 314 24 T 348 30" />
            <path className="filament" d="M18 182 Q 36 174, 54 180 T 90 174" />
            <path className="filament" d="M296 186 Q 314 178, 330 184 T 368 178" />
            <path className="filament" d="M164 22 Q 180 30, 196 24 T 228 30" />
            <path className="filament" d="M154 184 Q 170 176, 188 182 T 220 176" />

            {/* Sparse synapse nodes — varied pulse tempos */}
            <circle className="soma" cx="80" cy="100" r="1.4" style={{ ["--sdur" as string]: "2.6s", animationDelay: "0s" }} />
            <circle className="soma" cx="140" cy="70" r="1.1" style={{ ["--sdur" as string]: "4.1s", animationDelay: "0.4s" }} />
            <circle className="soma" cx="200" cy="60" r="1" style={{ ["--sdur" as string]: "3.2s", animationDelay: "0.9s" }} />
            <circle className="soma" cx="260" cy="100" r="1.5" style={{ ["--sdur" as string]: "5s", animationDelay: "1.5s" }} />
            <circle className="soma" cx="320" cy="150" r="1.2" style={{ ["--sdur" as string]: "3.7s", animationDelay: "2.1s" }} />
            <circle className="soma" cx="340" cy="90" r="1.1" style={{ ["--sdur" as string]: "4.6s", animationDelay: "0.6s" }} />
            <circle className="soma" cx="110" cy="140" r="0.9" style={{ ["--sdur" as string]: "2.9s", animationDelay: "1.8s" }} />
            <circle className="soma" cx="230" cy="140" r="1" style={{ ["--sdur" as string]: "5.4s", animationDelay: "2.6s" }} />

            {/* Chaotic sparks — different durations per axon */}
            <circle className="spark" r="0.9" style={{ offsetPath: "path('M0 38 Q 22 44, 38 36 T 74 42 T 118 32 Q 138 46, 162 40 T 208 52 T 254 44 Q 278 58, 302 46 T 348 54 T 400 44')", animation: "spark-travel 4.2s linear infinite", animationDelay: "0s" } as React.CSSProperties} />
            <circle className="spark" r="0.7" style={{ offsetPath: "path('M0 38 Q 22 44, 38 36 T 74 42 T 118 32 Q 138 46, 162 40 T 208 52 T 254 44 Q 278 58, 302 46 T 348 54 T 400 44')", animation: "spark-travel 6.8s linear infinite", animationDelay: "-1.9s" } as React.CSSProperties} />
            <circle className="spark" r="0.8" style={{ offsetPath: "path('M0 128 Q 26 118, 48 132 T 92 122 T 138 138 Q 162 126, 186 140 T 232 128 T 280 144 Q 306 132, 332 146 T 400 132')", animation: "spark-travel 8.4s linear infinite", animationDelay: "-2.3s" } as React.CSSProperties} />
            <circle className="spark" r="1" style={{ offsetPath: "path('M0 88 Q 18 78, 44 92 T 88 76 T 132 90 Q 158 74, 184 88 T 230 72 T 276 86 Q 302 70, 330 84 T 400 74')", animation: "spark-travel 5.6s linear infinite", animationDelay: "-4.1s" } as React.CSSProperties} />
            <circle className="spark" r="0.7" style={{ offsetPath: "path('M0 168 Q 24 156, 52 172 T 96 158 T 148 174 Q 174 160, 200 176 T 250 162 T 302 178 Q 328 164, 356 180 T 400 168')", animation: "spark-travel 9.2s linear infinite", animationDelay: "-1.2s" } as React.CSSProperties} />
            <circle className="spark" r="0.8" style={{ offsetPath: "path('M0 62 Q 30 72, 56 58 T 104 68 T 154 54 Q 182 68, 208 56 T 262 66 T 316 52 Q 344 66, 400 56')", animation: "spark-travel 3.8s linear infinite", animationDelay: "-2.7s" } as React.CSSProperties} />
            <circle className="spark" r="0.9" style={{ offsetPath: "path('M0 108 Q 34 96, 62 112 T 110 100 T 162 116 Q 190 100, 220 118 T 274 102 T 328 118 Q 360 104, 400 116')", animation: "spark-travel 7.3s linear infinite", animationDelay: "-0.6s" } as React.CSSProperties} />
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
                    FREE · 14-CHAPTER CASE FILE
                  </span>
                </div>

                <h2 className="font-forensic text-2xl sm:text-4xl font-extrabold leading-tight mb-5">
                  Check your{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-b from-amber to-amber/50">
                    company FREE
                  </span>
                </h2>

                {/* Golden Report preview image */}
                <Link to="/golden-report" aria-label="Open the free Golden Report">
                  <img
                    src={goldenReportHomeAsset.url}
                    alt="The Golden Report forensic preview card: leak score, priority fixes, and annual loss estimate"
                    className="mx-auto mb-6 rounded-md border border-amber/30 shadow-[0_0_40px_-10px_hsl(var(--amber)/0.35)] transition-transform duration-300 hover:scale-[1.02] max-h-[320px] sm:max-h-[380px] w-auto object-contain"
                    loading="lazy"
                  />
                </Link>


                <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto mb-6">
                  Drop one URL. Aetheris runs the full forensic stack <span className="text-amber">and</span> builds a fully branded content kit — 14-chapter case file, positioning message, hero imagery, per-platform social posts, and a 30-day schedule.
                </p>

                {/* CTA — case-file evidence tag with perforation + scan sweep */}
                <Link
                  to="/golden-report"
                  aria-label="Open the free Golden Report"
                  className="group/tag relative block mx-auto max-w-md text-left overflow-hidden rounded-[2px] text-[hsl(0_0%_0%)] transition-transform duration-300 hover:-translate-y-0.5"
                  style={{
                    background:
                      "linear-gradient(135deg, hsl(45 25% 92%) 0%, hsl(42 30% 85%) 55%, hsl(38 30% 78%) 100%)",
                    boxShadow:
                      "0 24px 60px -20px hsl(0 0% 0% / 0.7), 0 2px 0 hsl(0 0% 0% / 0.4), inset 0 1px 0 hsl(0 0% 100% / 0.7)",
                    clipPath:
                      "polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))",
                    color: "hsl(0 0% 0%)",
                  }}
                >
                  {/* Left perforation column */}
                  <div className="absolute inset-y-0 left-0 w-6 flex flex-col items-center justify-around py-3 border-r border-dashed border-[hsl(0_0%_12%)]/40 bg-[hsl(0_0%_12%)]/[0.05]">
                    {[0,1,2,3,4,5].map((i) => (
                      <span key={i} className="w-2 h-2 rounded-full bg-background shadow-[inset_0_1px_2px_hsl(0_0%_0%/0.4)]" />
                    ))}
                  </div>

                  {/* Grommet hole top-right */}
                  <span className="absolute top-2 right-3 w-3 h-3 rounded-full bg-background border border-[hsl(0_0%_12%)]/40 shadow-[inset_0_1px_2px_hsl(0_0%_0%/0.5)]" />

                  {/* Diagonal EVIDENCE stripes strip */}
                  <div
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-2 opacity-60"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(-45deg, hsl(var(--amber)) 0 6px, hsl(0 0% 0%) 6px 12px)",
                    }}
                  />

                  {/* Scan sweep line — moves on hover */}
                  <div
                    aria-hidden
                    className="absolute inset-0 pointer-events-none opacity-0 group-hover/tag:opacity-100 transition-opacity"
                    style={{
                      background:
                        "linear-gradient(90deg, transparent 0%, hsl(48 100% 60% / 0.35) 45%, hsl(48 100% 70% / 0.55) 50%, hsl(48 100% 60% / 0.35) 55%, transparent 100%)",
                      animation: "spark-travel 1.6s linear infinite",
                    }}
                  />

                  <div className="relative pl-10 pr-6 py-5">
                    {/* Case-file header line */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-case text-[9px] uppercase tracking-[0.35em] text-[hsl(0_0%_0%)]">
                        Exhibit · A
                      </span>
                      <span className="font-case text-[9px] uppercase tracking-[0.3em] text-[hsl(0_0%_0%)]">
                        No. GR-014
                      </span>
                    </div>

                    {/* Big handwritten-forensic label */}
                    <div className="font-forensic text-lg sm:text-xl font-black leading-none text-[hsl(0_0%_0%)]">
                      Golden Report
                    </div>
                    <div className="font-case text-[10px] uppercase tracking-[0.28em] text-[hsl(0_0%_0%)] mt-1">
                      14-Chapter Forensic Case File
                    </div>

                    {/* Divider with barcode */}
                    <div className="mt-3 flex items-center gap-3">
                      <div
                        aria-hidden
                        className="flex-1 h-5"
                        style={{
                          backgroundImage:
                            "repeating-linear-gradient(90deg, hsl(0 0% 8%) 0 1px, transparent 1px 3px, hsl(0 0% 8%) 3px 5px, transparent 5px 4px, hsl(0 0% 8%) 4px 7px, transparent 7px 10px)",
                        }}
                      />
                      <div className="font-case text-sm sm:text-base md:text-lg uppercase tracking-[0.18em] font-black text-[hsl(0_0%_0%)]">
                        FREE
                      </div>
                    </div>

                    {/* Action row — stamped */}
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {/* Red-ink stamp */}
                        <span
                          className="inline-block px-2 py-1 border-2 rounded-sm font-case text-[10px] font-black uppercase tracking-[0.3em] transition-transform group-hover/tag:scale-105"
                          style={{
                            borderColor: "hsl(0 0% 0%)",
                            color: "hsl(0 0% 0%)",
                            transform: "rotate(-4deg)",
                            fontFamily: "var(--font-case, ui-monospace)",
                            textShadow: "none",
                          }}
                        >
                          Open File
                        </span>
                        <span className="font-case text-[9px] uppercase tracking-widest text-[hsl(0_0%_0%)]">
                          → aetheris.technology/golden
                        </span>
                      </div>
                      <ArrowRight className="w-5 h-5 text-[hsl(0_0%_0%)] transition-transform duration-300 group-hover/tag:translate-x-1" />
                    </div>
                  </div>
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
