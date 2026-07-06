import React from "react";
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
  external?: boolean;
};

const TOOLS: Tool[] = [
  {
    to: "/chaos-scan",
    label: "Chaos Scan",
    tagline: "Feed a URL. Watch the leaks connect.",
    chip: "Instrument 01",
    icon: Radar,
    hue: "crimson",
  },
  {
    to: "/head-to-head",
    label: "Head-to-Head",
    tagline: "Your site vs. theirs. Every difference exposed.",
    chip: "Instrument 02",
    icon: Swords,
    hue: "amber",
  },
  {
    to: "/reciprocation",
    label: "Reciprocation Engine",
    tagline: "The gifts that make prospects owe you a reply.",
    chip: "Instrument 03",
    icon: Gift,
    hue: "crimson",
  },
  {
    to: "/golden-report",
    label: "Golden Report",
    tagline: "The full forensic scan. 14 chapters. No filter.",
    chip: "Instrument 04",
    icon: FileSearch,
    hue: "amber",
  },
  {
    to: "/aetheris-iq",
    label: "Aetheris IQ",
    tagline: "The forensic AI operator. Ask it anything.",
    chip: "Instrument 05",
    icon: Brain,
    hue: "crimson",
  },
];

/**
 * Chaos-styled free-trial arsenal.
 * Five flagship tools, no unlock gate. Each tile has a jittery hover,
 * dashed tangle lines, and a hue that alternates between crimson (leak)
 * and amber (source-sealed) — visually echoing the chaos → source system.
 */
export const HomeFreeTrialArsenal: React.FC = () => {
  return (
    <section
      id="free-trial-arsenal"
      className="mt-6 max-w-5xl mx-auto animate-fade-in scroll-mt-24"
      style={{ animationDelay: "160ms", animationFillMode: "both" }}
      aria-label="Free tools — open trial"
    >
      <style>{`
        @keyframes chaosJitter {
          0%   { transform: translate(0px, 0px) rotate(0deg); }
          20%  { transform: translate(0.6px, -0.4px) rotate(-0.15deg); }
          40%  { transform: translate(-0.5px, 0.5px) rotate(0.15deg); }
          60%  { transform: translate(0.4px, 0.4px) rotate(-0.1deg); }
          80%  { transform: translate(-0.4px, -0.3px) rotate(0.1deg); }
          100% { transform: translate(0px, 0px) rotate(0deg); }
        }
        .chaos-tile:hover .chaos-jitter { animation: chaosJitter 0.9s ease-in-out infinite; }
        .chaos-tangle path { stroke-dasharray: 3 5; }
      `}</style>

      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-amber/85">
            The free-trial arsenal · Open access
          </div>
          <h2 className="font-forensic text-xl sm:text-2xl font-bold leading-tight mt-1">
            Five instruments. <span className="text-crimson italic">Zero paywall.</span>
          </h2>
        </div>
        <span className="hidden sm:inline-flex font-mono text-[10px] uppercase tracking-widest text-foreground/60 border border-border/60 rounded-sm px-2 py-1">
          Downloads require email
        </span>
      </div>

      <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((t) => {
          const Icon = t.icon;
          const isCrimson = t.hue === "crimson";
          const border = isCrimson ? "border-crimson/45" : "border-amber/45";
          const glow = isCrimson
            ? "shadow-[0_0_28px_-8px_hsl(var(--crimson,0_60%_45%)/0.5)] hover:shadow-[0_0_38px_-4px_hsl(var(--crimson,0_60%_45%)/0.75)]"
            : "shadow-[0_0_28px_-8px_hsl(var(--amber)/0.5)] hover:shadow-[0_0_38px_-4px_hsl(var(--amber)/0.75)]";
          const chipColor = isCrimson ? "text-crimson" : "text-amber";
          const iconColor = isCrimson ? "text-crimson" : "text-amber";
          const stroke = isCrimson ? "hsl(var(--crimson,0 60% 45%))" : "hsl(var(--amber))";

          return (
            <Link
              key={t.to}
              to={t.to}
              className={`chaos-tile group relative block rounded-sm border ${border} bg-background/70 backdrop-blur-sm p-4 overflow-hidden transition-all duration-200 ${glow} hover:-translate-y-0.5`}
            >
              {/* Tangle overlay */}
              <svg
                aria-hidden
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="chaos-tangle pointer-events-none absolute inset-0 w-full h-full opacity-40 group-hover:opacity-70 transition-opacity"
              >
                <path d="M 5 10 C 30 40, 70 -10, 95 30" fill="none" stroke={stroke} strokeOpacity="0.5" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
                <path d="M 0 70 C 25 55, 60 95, 100 60" fill="none" stroke={stroke} strokeOpacity="0.35" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
                <path d="M 10 100 C 40 60, 60 80, 90 5" fill="none" stroke={stroke} strokeOpacity="0.25" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
              </svg>

              {/* Corner brackets — forensic tag */}
              <span aria-hidden className={`absolute top-1 left-1 w-2 h-2 border-l border-t ${isCrimson ? "border-crimson/70" : "border-amber/70"}`} />
              <span aria-hidden className={`absolute top-1 right-1 w-2 h-2 border-r border-t ${isCrimson ? "border-crimson/70" : "border-amber/70"}`} />
              <span aria-hidden className={`absolute bottom-1 left-1 w-2 h-2 border-l border-b ${isCrimson ? "border-crimson/70" : "border-amber/70"}`} />
              <span aria-hidden className={`absolute bottom-1 right-1 w-2 h-2 border-r border-b ${isCrimson ? "border-crimson/70" : "border-amber/70"}`} />

              <div className="relative chaos-jitter">
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
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-forensic text-base sm:text-lg font-bold leading-tight">
                      {t.label}
                    </div>
                    <p className="mt-0.5 text-xs text-foreground/80 leading-snug">
                      {t.tagline}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-dashed border-border/60">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-foreground/70 group-hover:text-foreground">
                    Open instrument
                  </span>
                  <ArrowRight className={`w-4 h-4 ${iconColor} transition-transform group-hover:translate-x-1`} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.28em] text-foreground/60">
        Use every tool free · Email required only to download the report PDF
      </p>
    </section>
  );
};

export default HomeFreeTrialArsenal;
