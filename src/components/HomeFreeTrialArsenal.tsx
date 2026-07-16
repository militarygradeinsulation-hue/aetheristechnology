import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Radar,
  Swords,
  Gift,
  FileSearch,
  Brain,
  ArrowRight,
} from "lucide-react";

type Tool = {
  to: string;
  label: string;
  tagline: string;
  chip: string;
  icon: React.ComponentType<{ className?: string }>;
  hue: "crimson" | "amber";
  /** Anchor position on the chaos map (percent) */
  x: number;
  y: number;
  /** Drift amplitudes (percent of stage) */
  ax: number;
  ay: number;
  /** Drift periods (seconds) */
  px: number;
  py: number;
  /** Phase offset (radians) */
  phase: number;
};

const TOOLS: Tool[] = [
  { to: "/chaos-scan",    label: "Chaos Scan",           tagline: "Feed a URL. Watch the leaks connect.",              chip: "Node 01", icon: Radar,      hue: "crimson", x: 20, y: 24, ax: 3.5, ay: 2.2, px: 11, py: 7,  phase: 0.0 },
  { to: "/head-to-head",  label: "Head-to-Head",         tagline: "Your site vs. theirs. Every difference exposed.",   chip: "Node 02", icon: Swords,     hue: "amber",   x: 76, y: 18, ax: 2.6, ay: 3.1, px: 9,  py: 13, phase: 1.1 },
  { to: "/reciprocation", label: "Reciprocation Engine", tagline: "The gifts that make prospects owe you a reply.",    chip: "Node 03", icon: Gift,       hue: "crimson", x: 80, y: 70, ax: 3.2, ay: 2.4, px: 12, py: 8,  phase: 2.3 },
  { to: "/golden-report", label: "Golden Report",        tagline: "The full forensic scan. 14 chapters. No filter.",   chip: "Node 04", icon: FileSearch, hue: "amber",   x: 22, y: 74, ax: 2.4, ay: 3.4, px: 10, py: 15, phase: 3.4 },
  { to: "/aetheris-iq",   label: "Aetheris IQ",          tagline: "The forensic AI operator. Ask it anything.",        chip: "Node 05", icon: Brain,      hue: "crimson", x: 50, y: 46, ax: 3.0, ay: 2.6, px: 14, py: 10, phase: 4.6 },
];

/** Distance-based coupling: closer nodes react more to a hovered node */
function couplingStrength(a: Tool, b: Tool) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  // normalize: ~110 is diagonal on a 100x100 map
  return Math.max(0, 1 - d / 90);
}

/**
 * Chaos-theory mind map.
 * Each node drifts on its own sine orbit (autonomous motion).
 * Hovering a node pushes it forward strongly; connected nodes ripple —
 * closer ones react more (chaos coupling). No global cursor parallax.
 */
export const HomeFreeTrialArsenal: React.FC = () => {
  const [t, setT] = useState(0);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [ripple, setRipple] = useState(0); // 0..1, decays after hover changes
  const rippleStart = useRef<number>(0);

  // Master animation clock
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      setT((now - start) / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Ripple envelope: pulse up on hover change, decay over ~1.2s
  useEffect(() => {
    rippleStart.current = performance.now();
    let raf = 0;
    const tick = () => {
      const dt = (performance.now() - rippleStart.current) / 1000;
      // fast attack, slow decay
      const env = Math.max(0, Math.min(1, dt < 0.15 ? dt / 0.15 : Math.exp(-(dt - 0.15) * 1.6)));
      setRipple(env);
      if (env > 0.01) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [hoverIdx]);

  // Compute live position (percent) + z-lift for each node
  const positions = TOOLS.map((tool, i) => {
    // autonomous drift
    let dx = Math.sin((t * (Math.PI * 2)) / tool.px + tool.phase) * tool.ax;
    let dy = Math.cos((t * (Math.PI * 2)) / tool.py + tool.phase * 0.7) * tool.ay;
    let lift = 0;
    let scale = 1;

    if (hoverIdx !== null) {
      const hovered = TOOLS[hoverIdx];
      if (hoverIdx === i) {
        // hovered node: freeze less, lift forward
        lift = 40;
        scale = 1.07;
      } else {
        // ripple coupling — nudge toward the hovered node then back
        const coupling = couplingStrength(hovered, tool);
        const pull = ripple * coupling;
        const vx = hovered.x - tool.x;
        const vy = hovered.y - tool.y;
        // small oscillating pull (chaos wave)
        const wave = Math.sin(t * 6 - i) * 0.4 + 0.6;
        dx += (vx * 0.05) * pull * wave;
        dy += (vy * 0.05) * pull * wave;
        lift = 10 * coupling * ripple;
      }
    }

    return { x: tool.x + dx, y: tool.y + dy, lift, scale, isHover: hoverIdx === i };
  });

  return (
    <section
      id="free-trial-arsenal"
      className="mt-8 max-w-6xl mx-auto animate-fade-in scroll-mt-24"
      style={{ animationDelay: "160ms", animationFillMode: "both" }}
      aria-label="Free tools — chaos mind map"
    >
      <style>{`
        @keyframes chaosPulse { 0%,100% { opacity: 0.35; } 50% { opacity: 0.9; } }
        @keyframes chaosDrift { 0% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: -60; } }
        .chaos-filament { stroke-dasharray: 4 6; animation: chaosDrift 6s linear infinite; }
        .chaos-node-glow { animation: chaosPulse 3.2s ease-in-out infinite; }
        .chaos-map-stage { perspective: 1400px; }
        .chaos-node-card { transform-style: preserve-3d; will-change: transform; }
      `}</style>

      {/* Header */}
      <div className="flex items-end justify-between gap-3 mb-4 px-1">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-amber/85">
            The free-trial arsenal · Chaos mind map
          </div>
          <h2 className="font-forensic text-2xl sm:text-3xl font-bold leading-tight mt-1">
            Five instruments. <span className="text-crimson italic">Zero paywall.</span>
          </h2>
        </div>
        <span className="hidden sm:inline-flex font-mono text-[10px] uppercase tracking-widest text-foreground/60 border border-border/60 rounded-sm px-2 py-1">
          Downloads require email
        </span>
      </div>

      {/* ============ DESKTOP: chaos constellation ============ */}
      <div
        className="chaos-map-stage relative hidden md:block w-full rounded-sm border border-border/50 bg-gradient-to-br from-background/60 via-background/40 to-background/70 overflow-hidden"
        style={{ height: "620px" }}
      >
        {/* Static starfield / grid */}
        <div
          className="absolute inset-0 opacity-[0.18] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, hsl(var(--amber)/0.35) 0, transparent 40%), radial-gradient(circle at 80% 70%, hsl(var(--crimson,0 60% 45%)/0.3) 0, transparent 45%), linear-gradient(hsl(var(--border)/0.4) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)/0.4) 1px, transparent 1px)",
            backgroundSize: "auto, auto, 60px 60px, 60px 60px",
          }}
        />

        {/* Floating particles */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 28 }).map((_, i) => {
            const seedX = (i * 97) % 100;
            const seedY = (i * 53) % 100;
            const size = ((i * 7) % 3) + 1;
            const isC = i % 3 === 0;
            return (
              <span
                key={i}
                className="absolute rounded-full chaos-node-glow"
                style={{
                  left: `${seedX}%`,
                  top: `${seedY}%`,
                  width: size,
                  height: size,
                  background: isC ? "hsl(var(--crimson,0 60% 45%))" : "hsl(var(--amber))",
                  animationDelay: `${(i % 7) * 0.4}s`,
                  boxShadow: isC ? "0 0 8px hsl(var(--crimson,0 60% 45%)/0.9)" : "0 0 8px hsl(var(--amber)/0.9)",
                }}
              />
            );
          })}
        </div>

        {/* Chaos filaments — live positions so lines follow drifting nodes */}
        <svg
          aria-hidden
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="filamentGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="hsl(var(--crimson,0 60% 45%))" stopOpacity="0.7" />
              <stop offset="100%" stopColor="hsl(var(--amber))" stopOpacity="0.7" />
            </linearGradient>
          </defs>
          {TOOLS.flatMap((a, i) =>
            TOOLS.slice(i + 1).map((b, j) => {
              const bi = TOOLS.indexOf(b);
              const pa = positions[i];
              const pb = positions[bi];
              const mx = (pa.x + pb.x) / 2 + (((i + j) % 2 ? 1 : -1) * 6);
              const my = (pa.y + pb.y) / 2 + (((i + j) % 2 ? -1 : 1) * 5);
              const active = hoverIdx === i || hoverIdx === bi;
              return (
                <path
                  key={`${i}-${bi}`}
                  d={`M ${pa.x} ${pa.y} Q ${mx} ${my} ${pb.x} ${pb.y}`}
                  fill="none"
                  stroke="url(#filamentGrad)"
                  strokeWidth={active ? 0.4 : 0.22}
                  strokeOpacity={active ? 0.95 : 0.4}
                  vectorEffect="non-scaling-stroke"
                  className="chaos-filament transition-[stroke-opacity,stroke-width] duration-300"
                />
              );
            })
          )}
        </svg>

        {/* Nodes */}
        {TOOLS.map((tool, i) => {
          const Icon = tool.icon;
          const isCrimson = tool.hue === "crimson";
          const stroke = isCrimson ? "hsl(var(--crimson,0 60% 45%))" : "hsl(var(--amber))";
          const border = isCrimson ? "border-crimson/60" : "border-amber/60";
          const chipColor = isCrimson ? "text-crimson" : "text-amber";
          const glow = isCrimson
            ? "shadow-[0_0_40px_-6px_hsl(var(--crimson,0_60%_45%)/0.55)]"
            : "shadow-[0_0_40px_-6px_hsl(var(--amber)/0.55)]";
          const pos = positions[i];
          return (
            <Link
              key={tool.to}
              to={tool.to}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
              className={`chaos-node-card absolute block w-[260px] rounded-sm border ${border} bg-background/85 backdrop-blur-md p-4 ${glow}`}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                zIndex: pos.isHover ? 60 : 20 + Math.round(pos.lift),
                transform: `translate3d(-50%, -50%, ${pos.lift}px) scale(${pos.scale})`,
                transition: "transform 260ms cubic-bezier(0.22,1,0.36,1), box-shadow 300ms ease",
              }}
            >
              {["top-1 left-1 border-l border-t", "top-1 right-1 border-r border-t", "bottom-1 left-1 border-l border-b", "bottom-1 right-1 border-r border-b"].map((c) => (
                <span key={c} aria-hidden className={`absolute ${c} w-2 h-2 ${isCrimson ? "border-crimson/80" : "border-amber/80"}`} />
              ))}

              <span
                aria-hidden
                className="absolute -top-1 -right-1 w-3 h-3 rounded-full chaos-node-glow"
                style={{ background: stroke, boxShadow: `0 0 14px ${stroke}` }}
              />

              <div className="flex items-center justify-between gap-2 mb-2">
                <span className={`font-mono text-[9px] uppercase tracking-[0.28em] ${chipColor}`}>
                  {tool.chip}
                </span>
                <span className="font-mono text-[9px] uppercase tracking-widest text-foreground/50">
                  Free
                </span>
              </div>

              <div className="flex items-start gap-3">
                <div className={`shrink-0 w-11 h-11 rounded-sm border ${border} bg-background/70 flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${isCrimson ? "text-crimson" : "text-amber"}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-forensic text-lg font-bold leading-tight">{tool.label}</div>
                  <p className="mt-0.5 text-xs text-foreground/80 leading-snug">{tool.tagline}</p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-dashed border-border/60">
                <span className="font-mono text-[10px] uppercase tracking-widest text-foreground/70">
                  Open instrument
                </span>
                <ArrowRight className={`w-4 h-4 ${isCrimson ? "text-crimson" : "text-amber"} transition-transform duration-300 ${pos.isHover ? "translate-x-1" : ""}`} />
              </div>
            </Link>
          );
        })}

        <span className="absolute top-2 left-3 font-mono text-[9px] uppercase tracking-[0.3em] text-foreground/50 pointer-events-none">
          Chaos map · v2
        </span>
        <span className="absolute bottom-2 right-3 font-mono text-[9px] uppercase tracking-[0.3em] text-foreground/50 pointer-events-none">
          Hover one · ripples propagate
        </span>
      </div>

      {/* ============ MOBILE fallback: compact stacked grid ============ */}
      <div className="md:hidden grid gap-2 grid-cols-1">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isCrimson = tool.hue === "crimson";
          const border = isCrimson ? "border-crimson/45" : "border-amber/45";
          const chipColor = isCrimson ? "text-crimson" : "text-amber";
          return (
            <Link
              key={tool.to}
              to={tool.to}
              className={`relative block rounded-sm border ${border} bg-background/70 backdrop-blur-sm p-4`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className={`font-mono text-[9px] uppercase tracking-[0.28em] ${chipColor}`}>{tool.chip}</span>
                <span className="font-mono text-[9px] uppercase tracking-widest text-foreground/50">Free</span>
              </div>
              <div className="flex items-start gap-3">
                <div className={`shrink-0 w-10 h-10 rounded-sm border ${border} bg-background/60 flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${isCrimson ? "text-crimson" : "text-amber"}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-forensic text-base font-bold leading-tight">{tool.label}</div>
                  <p className="mt-0.5 text-xs text-foreground/80 leading-snug">{tool.tagline}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-dashed border-border/60">
                <span className="font-mono text-[10px] uppercase tracking-widest text-foreground/70">Open instrument</span>
                <ArrowRight className={`w-4 h-4 ${isCrimson ? "text-crimson" : "text-amber"}`} />
              </div>
            </Link>
          );
        })}
      </div>

      <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.28em] text-foreground/60">
        Use every tool free · Email required only to download the report PDF
      </p>
    </section>
  );
};

export default HomeFreeTrialArsenal;
