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
  /** Position on the chaos map (percent) */
  x: number;
  y: number;
  /** Parallax depth: 0 = far, 1 = close */
  depth: number;
};

const TOOLS: Tool[] = [
  { to: "/chaos-scan",   label: "Chaos Scan",           tagline: "Feed a URL. Watch the leaks connect.",     chip: "Node 01", icon: Radar,      hue: "crimson", x: 18, y: 22, depth: 0.9 },
  { to: "/head-to-head", label: "Head-to-Head",         tagline: "Your site vs. theirs. Every difference exposed.", chip: "Node 02", icon: Swords,     hue: "amber",   x: 78, y: 16, depth: 0.55 },
  { to: "/reciprocation",label: "Reciprocation Engine", tagline: "The gifts that make prospects owe you a reply.",  chip: "Node 03", icon: Gift,       hue: "crimson", x: 82, y: 68, depth: 0.75 },
  { to: "/golden-report",label: "Golden Report",        tagline: "The full forensic scan. 14 chapters. No filter.", chip: "Node 04", icon: FileSearch, hue: "amber",   x: 22, y: 74, depth: 0.4 },
  { to: "/aetheris-iq",  label: "Aetheris IQ",          tagline: "The forensic AI operator. Ask it anything.",       chip: "Node 05", icon: Brain,      hue: "crimson", x: 50, y: 45, depth: 1.0 },
];

/**
 * Chaos-theory mind map with 3D parallax.
 * Desktop: 5 nodes positioned as a constellation, connected by chaos filaments,
 * with mouse-driven parallax + card tilt. Mobile: falls back to a compact grid.
 */
export const HomeFreeTrialArsenal: React.FC = () => {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [p, setP] = useState({ x: 0, y: 0 }); // -1..1
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    let raf = 0;
    const handle = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
      const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setP({ x: nx, y: ny }));
    };
    const leave = () => setP({ x: 0, y: 0 });
    el.addEventListener("pointermove", handle);
    el.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", handle);
      el.removeEventListener("pointerleave", leave);
    };
  }, []);

  const parallax = (depth: number, mult = 22) => ({
    transform: `translate3d(${-p.x * depth * mult}px, ${-p.y * depth * mult}px, 0)`,
  });

  return (
    <section
      id="free-trial-arsenal"
      className="mt-8 max-w-6xl mx-auto animate-fade-in scroll-mt-24"
      style={{ animationDelay: "160ms", animationFillMode: "both" }}
      aria-label="Free tools — chaos mind map"
    >
      <style>{`
        @keyframes chaosPulse {
          0%,100% { opacity: 0.35; }
          50%     { opacity: 0.9; }
        }
        @keyframes chaosDrift {
          0%   { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -60; }
        }
        @keyframes chaosOrbit {
          0%   { transform: rotate(0deg) translateX(2px) rotate(0deg); }
          100% { transform: rotate(360deg) translateX(2px) rotate(-360deg); }
        }
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

      {/* ============ DESKTOP: 3D chaos constellation ============ */}
      <div
        ref={stageRef}
        className="chaos-map-stage relative hidden md:block w-full rounded-sm border border-border/50 bg-gradient-to-br from-background/60 via-background/40 to-background/70 overflow-hidden"
        style={{ height: "620px" }}
      >
        {/* Deep starfield / grid — furthest layer */}
        <div
          className="absolute inset-0 opacity-[0.18] pointer-events-none"
          style={{
            ...parallax(0.15, 30),
            backgroundImage:
              "radial-gradient(circle at 20% 30%, hsl(var(--amber)/0.35) 0, transparent 40%), radial-gradient(circle at 80% 70%, hsl(var(--crimson,0 60% 45%)/0.3) 0, transparent 45%), linear-gradient(hsl(var(--border)/0.4) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)/0.4) 1px, transparent 1px)",
            backgroundSize: "auto, auto, 60px 60px, 60px 60px",
          }}
        />

        {/* Floating particles */}
        <div className="absolute inset-0 pointer-events-none" style={parallax(0.35, 40)}>
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
                  boxShadow: isC
                    ? "0 0 8px hsl(var(--crimson,0 60% 45%)/0.9)"
                    : "0 0 8px hsl(var(--amber)/0.9)",
                }}
              />
            );
          })}
        </div>

        {/* Chaos filaments connecting every node to every other node */}
        <svg
          aria-hidden
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={parallax(0.5, 22)}
        >
          <defs>
            <linearGradient id="filamentGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="hsl(var(--crimson,0 60% 45%))" stopOpacity="0.7" />
              <stop offset="100%" stopColor="hsl(var(--amber))" stopOpacity="0.7" />
            </linearGradient>
          </defs>
          {TOOLS.flatMap((a, i) =>
            TOOLS.slice(i + 1).map((b, j) => {
              const mx = (a.x + b.x) / 2 + (((i + j) % 2 ? 1 : -1) * 6);
              const my = (a.y + b.y) / 2 + (((i + j) % 2 ? -1 : 1) * 5);
              return (
                <path
                  key={`${i}-${j}`}
                  d={`M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`}
                  fill="none"
                  stroke="url(#filamentGrad)"
                  strokeWidth="0.25"
                  strokeOpacity={hoverIdx === i || hoverIdx === TOOLS.indexOf(b) ? 0.9 : 0.45}
                  vectorEffect="non-scaling-stroke"
                  className="chaos-filament transition-[stroke-opacity] duration-300"
                />
              );
            })
          )}
        </svg>

        {/* Nodes */}
        {TOOLS.map((t, i) => {
          const Icon = t.icon;
          const isCrimson = t.hue === "crimson";
          const stroke = isCrimson ? "hsl(var(--crimson,0 60% 45%))" : "hsl(var(--amber))";
          const border = isCrimson ? "border-crimson/60" : "border-amber/60";
          const chipColor = isCrimson ? "text-crimson" : "text-amber";
          const glow = isCrimson
            ? "shadow-[0_0_40px_-6px_hsl(var(--crimson,0_60%_45%)/0.55)]"
            : "shadow-[0_0_40px_-6px_hsl(var(--amber)/0.55)]";
          const hovered = hoverIdx === i;
          const tiltX = -p.y * 8;
          const tiltY = p.x * 8;
          return (
            <Link
              key={t.to}
              to={t.to}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
              className={`chaos-node-card absolute block w-[260px] -translate-x-1/2 -translate-y-1/2 rounded-sm border ${border} bg-background/85 backdrop-blur-md p-4 ${glow} transition-shadow duration-300`}
              style={{
                left: `${t.x}%`,
                top: `${t.y}%`,
                zIndex: hovered ? 40 : 20 + Math.round(t.depth * 10),
                transform: `translate3d(calc(-50% + ${-p.x * t.depth * 34}px), calc(-50% + ${-p.y * t.depth * 34}px), ${t.depth * 60}px) rotateX(${tiltX * t.depth}deg) rotateY(${tiltY * t.depth}deg) scale(${hovered ? 1.06 : 1})`,
                transition: "transform 180ms ease-out, box-shadow 300ms ease",
              }}
            >
              {/* corner brackets */}
              {["top-1 left-1 border-l border-t", "top-1 right-1 border-r border-t", "bottom-1 left-1 border-l border-b", "bottom-1 right-1 border-r border-b"].map((c) => (
                <span key={c} aria-hidden className={`absolute ${c} w-2 h-2 ${isCrimson ? "border-crimson/80" : "border-amber/80"}`} />
              ))}

              {/* orbit indicator */}
              <span
                aria-hidden
                className="absolute -top-1 -right-1 w-3 h-3 rounded-full chaos-node-glow"
                style={{ background: stroke, boxShadow: `0 0 14px ${stroke}` }}
              />

              <div className="flex items-center justify-between gap-2 mb-2">
                <span className={`font-mono text-[9px] uppercase tracking-[0.28em] ${chipColor}`}>
                  {t.chip}
                </span>
                <span className="font-mono text-[9px] uppercase tracking-widest text-foreground/50">
                  Free · No signup
                </span>
              </div>

              <div className="flex items-start gap-3">
                <div className={`shrink-0 w-11 h-11 rounded-sm border ${border} bg-background/70 flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${isCrimson ? "text-crimson" : "text-amber"}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-forensic text-lg font-bold leading-tight">{t.label}</div>
                  <p className="mt-0.5 text-xs text-foreground/80 leading-snug">{t.tagline}</p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-dashed border-border/60">
                <span className="font-mono text-[10px] uppercase tracking-widest text-foreground/70">
                  Open instrument
                </span>
                <ArrowRight className={`w-4 h-4 ${isCrimson ? "text-crimson" : "text-amber"} transition-transform duration-300 ${hovered ? "translate-x-1" : ""}`} />
              </div>
            </Link>
          );
        })}

        {/* corner labels */}
        <span className="absolute top-2 left-3 font-mono text-[9px] uppercase tracking-[0.3em] text-foreground/50 pointer-events-none">
          Chaos map · v1
        </span>
        <span className="absolute bottom-2 right-3 font-mono text-[9px] uppercase tracking-[0.3em] text-foreground/50 pointer-events-none">
          Move cursor · parallax active
        </span>
      </div>

      {/* ============ MOBILE fallback: compact stacked grid ============ */}
      <div className="md:hidden grid gap-2 grid-cols-1">
        {TOOLS.map((t) => {
          const Icon = t.icon;
          const isCrimson = t.hue === "crimson";
          const border = isCrimson ? "border-crimson/45" : "border-amber/45";
          const chipColor = isCrimson ? "text-crimson" : "text-amber";
          return (
            <Link
              key={t.to}
              to={t.to}
              className={`relative block rounded-sm border ${border} bg-background/70 backdrop-blur-sm p-4`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className={`font-mono text-[9px] uppercase tracking-[0.28em] ${chipColor}`}>
                  {t.chip}
                </span>
                <span className="font-mono text-[9px] uppercase tracking-widest text-foreground/50">
                  Free · No signup
                </span>
              </div>
              <div className="flex items-start gap-3">
                <div className={`shrink-0 w-10 h-10 rounded-sm border ${border} bg-background/60 flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${isCrimson ? "text-crimson" : "text-amber"}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-forensic text-base font-bold leading-tight">{t.label}</div>
                  <p className="mt-0.5 text-xs text-foreground/80 leading-snug">{t.tagline}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-dashed border-border/60">
                <span className="font-mono text-[10px] uppercase tracking-widest text-foreground/70">
                  Open instrument
                </span>
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
