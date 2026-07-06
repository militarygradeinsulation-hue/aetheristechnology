import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

/**
 * Chaos-theory mind map — "Layered Neural Stack".
 * Central hub → 5 tool nodes across 3 layers, connected by animated
 * amber/crimson neural filaments. Cursor-driven 3D parallax on the
 * filament layer and per-node tilt. Mobile-friendly by default.
 */

type Tool = {
  to: string;
  label: string;
  tagline: string;
  tags: { text: string; hue: "amber" | "crimson" | "muted" }[];
  badge?: { text: string; hue: "amber" | "muted" };
  focal?: boolean; // Layer-2 focal point
  emailBadge?: boolean;
  rotate: string; // subtle tape-on-corkboard tilt
};

const HUB_LABEL = "Neural Core";

// Layered layout: [top-left, top-right] · [focal] · [bottom-left, bottom-right]
const TOP: [Tool, Tool] = [
  {
    to: "/chaos-scan",
    label: "Chaos Scan",
    tagline: "Feed a URL. Watch the leaks connect.",
    tags: [
      { text: "URL", hue: "muted" },
      { text: "AI", hue: "muted" },
    ],
    badge: { text: "Free", hue: "amber" },
    rotate: "-rotate-1",
  },
  {
    to: "/aetheris-iq",
    label: "Aetheris IQ",
    tagline: "The forensic AI operator. Ask it anything.",
    tags: [
      { text: "AI", hue: "muted" },
      { text: "LEAK", hue: "crimson" },
    ],
    rotate: "rotate-2",
  },
];

const FOCAL: Tool = {
  to: "/head-to-head",
  label: "Head-to-Head",
  tagline: "Your site vs. theirs. Every difference exposed.",
  tags: [],
  focal: true,
  emailBadge: true,
  rotate: "rotate-0",
};

const BOTTOM: [Tool, Tool] = [
  {
    to: "/reciprocation",
    label: "Reciprocation Engine",
    tagline: "The gifts that make prospects owe you a reply.",
    tags: [{ text: "GIFT", hue: "muted" }],
    rotate: "rotate-1",
  },
  {
    to: "/golden-report",
    label: "Golden Report",
    tagline: "The full forensic scan. 14 chapters. No filter.",
    tags: [{ text: "PDF", hue: "muted" }],
    badge: { text: "Flagship", hue: "muted" },
    rotate: "-rotate-3",
  },
];

const tagClass = (hue: Tool["tags"][number]["hue"]) => {
  switch (hue) {
    case "crimson":
      return "text-crimson border-crimson/30";
    case "amber":
      return "text-amber border-amber/30";
    default:
      return "text-foreground/50 border-border/40";
  }
};

const NodeCard: React.FC<{ tool: Tool; parallax: React.CSSProperties }> = ({ tool, parallax }) => {
  if (tool.focal) {
    return (
      <div className="relative flex flex-col items-center" style={parallax}>
        <div className="absolute -top-4 font-mono text-[9px] tracking-widest text-crimson/80 animate-pulse">
          DATA_LEAK_SIGNAL
        </div>
        <Link
          to={tool.to}
          className="group relative w-[220px] sm:w-[260px] bg-background/85 backdrop-blur-md border-y border-amber/30 hover:border-amber/70 p-4 rounded-md text-center shadow-[0_0_40px_-8px_hsl(var(--amber)/0.35)] hover:shadow-[0_0_50px_-4px_hsl(var(--amber)/0.6)] transition-all"
        >
          <h3 className="font-forensic text-lg italic text-amber leading-tight mb-1">
            {tool.label}
          </h3>
          <div className="text-[11px] text-foreground/75 mb-2 leading-snug">
            {tool.tagline}
          </div>
          {tool.emailBadge && (
            <div className="inline-flex items-center px-2 py-0.5 border border-crimson/40 bg-crimson/5 text-crimson text-[9px] font-mono tracking-widest">
              EMAIL REQUIRED FOR PDF
            </div>
          )}
        </Link>
        <div className="mt-2 font-mono text-[9px] text-foreground/40 flex gap-4 uppercase tracking-widest">
          <span>PDF</span>
          <span>Compare</span>
        </div>
      </div>
    );
  }

  return (
    <Link
      to={tool.to}
      className={`group relative w-[44%] sm:w-[46%] bg-background/85 backdrop-blur-sm border border-border/40 hover:border-amber/50 p-3 rounded-md transform ${tool.rotate} hover:rotate-0 transition-all duration-500 hover:-translate-y-0.5`}
      style={parallax}
    >
      {tool.badge && (
        <div
          className={`absolute -top-2 -left-2 px-1.5 py-0.5 text-[8px] font-bold uppercase rounded-[2px] ${
            tool.badge.hue === "amber"
              ? "bg-amber text-background"
              : "bg-foreground/10 text-foreground/80 border border-border/40"
          }`}
        >
          {tool.badge.text}
        </div>
      )}
      <h3 className="font-forensic text-amber text-sm sm:text-base italic leading-tight mb-1">
        {tool.label}
      </h3>
      {tool.tags.length > 0 && (
        <div className="flex gap-1 mb-2 flex-wrap">
          {tool.tags.map((t) => (
            <span
              key={t.text}
              className={`text-[8px] font-mono border px-1 py-[1px] tracking-wide ${tagClass(t.hue)}`}
            >
              {t.text}
            </span>
          ))}
        </div>
      )}
      <div className="text-[10px] sm:text-[11px] text-foreground/65 leading-snug font-light">
        {tool.tagline}
      </div>
      {/* branch node dot */}
      <span
        aria-hidden
        className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber shadow-[0_0_6px_hsl(var(--amber))]"
      />
    </Link>
  );
};

export const HomeFreeTrialArsenal: React.FC = () => {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [p, setP] = useState({ x: 0, y: 0 }); // -1..1

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

  const layer = (depth: number, mult = 18): React.CSSProperties => ({
    transform: `translate3d(${-p.x * depth * mult}px, ${-p.y * depth * mult}px, 0)`,
    transition: "transform 220ms ease-out",
  });

  return (
    <section
      id="free-trial-arsenal"
      className="mt-8 max-w-3xl mx-auto animate-fade-in scroll-mt-24 px-2"
      style={{ animationDelay: "160ms", animationFillMode: "both" }}
      aria-label="Free tools — chaos mind map"
    >
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

      {/* Stage — parallax pointer surface */}
      <div
        ref={stageRef}
        className="relative w-full flex flex-col items-center pt-4 pb-6 rounded-md border border-border/40 bg-gradient-to-b from-background/40 via-background/20 to-background/50 overflow-hidden"
        style={{ perspective: "1200px" }}
      >
        {/* Filament layer (SVG neural web) */}
        <svg
          aria-hidden
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 390 720"
          preserveAspectRatio="none"
          style={layer(0.5, 28)}
        >
          <defs>
            <linearGradient id="filamentAmber" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="hsl(var(--amber))" stopOpacity="0.5" />
              <stop offset="100%" stopColor="hsl(var(--amber))" stopOpacity="0.15" />
            </linearGradient>
          </defs>
          {/* hub → top-left */}
          <path d="M195 80 C 195 130, 90 150, 80 210" stroke="url(#filamentAmber)" strokeWidth="1.2" fill="none" />
          {/* hub → top-right */}
          <path d="M195 80 C 195 130, 300 150, 310 210" stroke="url(#filamentAmber)" strokeWidth="1.2" fill="none" />
          {/* hub → focal */}
          <path d="M195 80 C 195 180, 195 240, 195 340" stroke="hsl(var(--amber))" strokeOpacity="0.4" strokeWidth="1" fill="none" />
          {/* focal → bottom-left */}
          <path d="M195 400 C 195 460, 90 500, 80 560" stroke="hsl(var(--crimson,0 60% 45%))" strokeOpacity="0.55" strokeWidth="0.9" strokeDasharray="4 3" fill="none" />
          {/* focal → bottom-right */}
          <path d="M195 400 C 195 460, 300 500, 310 560" stroke="url(#filamentAmber)" strokeWidth="1.1" fill="none" />
          {/* cross-branch chaos strands */}
          <path d="M80 210 C 140 260, 250 260, 310 210" stroke="hsl(var(--amber))" strokeOpacity="0.15" strokeWidth="0.6" strokeDasharray="2 4" fill="none" />
          <path d="M80 560 C 140 610, 250 610, 310 560" stroke="hsl(var(--crimson,0 60% 45%))" strokeOpacity="0.2" strokeWidth="0.6" strokeDasharray="2 4" fill="none" />
          {/* Junction glow points */}
          <circle cx="195" cy="80"  r="3" fill="hsl(var(--amber))" />
          <circle cx="80"  cy="210" r="2" fill="hsl(var(--amber))" />
          <circle cx="310" cy="210" r="2" fill="hsl(var(--amber))" />
          <circle cx="195" cy="340" r="2.5" fill="hsl(var(--crimson,0 60% 45%))">
            <animate attributeName="opacity" values="0.4;1;0.4" dur="2.2s" repeatCount="indefinite" />
          </circle>
          <circle cx="80"  cy="560" r="2" fill="hsl(var(--crimson,0 60% 45%))" />
          <circle cx="310" cy="560" r="2" fill="hsl(var(--amber))" />
        </svg>

        {/* Ambient particles — furthest depth */}
        <div className="absolute inset-0 pointer-events-none opacity-40" style={layer(0.15, 40)}>
          {Array.from({ length: 22 }).map((_, i) => {
            const x = (i * 97) % 100;
            const y = (i * 53) % 100;
            const isC = i % 4 === 0;
            return (
              <span
                key={i}
                className="absolute rounded-full"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  width: 2,
                  height: 2,
                  background: isC
                    ? "hsl(var(--crimson,0 60% 45%))"
                    : "hsl(var(--amber))",
                  boxShadow: isC
                    ? "0 0 6px hsl(var(--crimson,0 60% 45%))"
                    : "0 0 6px hsl(var(--amber))",
                }}
              />
            );
          })}
        </div>

        {/* Central Hub — mid depth */}
        <div className="relative z-10 mb-10" style={layer(0.7, 14)}>
          <div className="w-20 h-20 rounded-full bg-background/90 border border-amber/40 flex items-center justify-center shadow-[0_0_30px_hsl(var(--amber)/0.2)]">
            <div className="font-forensic text-3xl font-black italic text-amber">C</div>
          </div>
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] tracking-widest uppercase text-amber/70">
            {HUB_LABEL}
          </div>
        </div>

        {/* Node stack — closest depth */}
        <div className="w-full max-w-[390px] space-y-10 relative z-20" style={layer(1, 10)}>
          <div className="flex justify-between w-full px-2 gap-2">
            <NodeCard tool={TOP[0]} parallax={layer(1.1, 12)} />
            <NodeCard tool={TOP[1]} parallax={layer(1.1, 12)} />
          </div>

          <div className="flex justify-center w-full">
            <NodeCard tool={FOCAL} parallax={layer(1.3, 14)} />
          </div>

          <div className="flex justify-between w-full px-2 gap-2">
            <NodeCard tool={BOTTOM[0]} parallax={layer(1.1, 12)} />
            <NodeCard tool={BOTTOM[1]} parallax={layer(1.1, 12)} />
          </div>
        </div>

        {/* Footer legend */}
        <div className="mt-10 pb-2 flex flex-col items-center gap-2 opacity-50 relative z-10">
          <div className="h-px w-12 bg-amber/40" />
          <p className="font-mono text-[9px] uppercase tracking-tighter text-foreground/70">
            Arsenal Framework v2.04 — Entropy Managed
          </p>
        </div>
      </div>

      <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.28em] text-foreground/60">
        Use every tool free · Email required only to download the report PDF
      </p>
    </section>
  );
};

export default HomeFreeTrialArsenal;
