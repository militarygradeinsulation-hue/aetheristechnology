import React, { useMemo } from "react";
import type { LucideIcon } from "lucide-react";

export type MindMapNodeData = {
  id: string;
  label: string;
  sublabel?: string;
  icon: LucideIcon;
  onClick?: () => void;
};

type NodePos = { x: number; y: number; ring: number };

function computeLayout(n: number): NodePos[] {
  if (n === 0) return [];
  const rings = [
    { r: 22, cap: 5 },
    { r: 36, cap: 9 },
    { r: 46, cap: 14 },
  ];
  const positions: NodePos[] = [];
  let placed = 0;
  for (let i = 0; i < rings.length && placed < n; i++) {
    const { r, cap } = rings[i];
    const count = Math.min(cap, n - placed);
    const offset = -Math.PI / 2 + (i % 2 === 0 ? 0 : Math.PI / count);
    for (let k = 0; k < count; k++) {
      const a = offset + (k * 2 * Math.PI) / count;
      positions.push({
        x: 50 + r * Math.cos(a),
        y: 50 + r * Math.sin(a),
        ring: i,
      });
    }
    placed += count;
  }
  return positions;
}

export type LeakMindMapProps = {
  hub: {
    eyebrow?: string;
    title: React.ReactNode;
    subtitle?: string;
  };
  nodes: MindMapNodeData[];
  heightClass?: string;
  accent?: "amber" | "crimson";
};

const accentMap = {
  amber: {
    border: "border-amber/40 group-hover:border-amber",
    bg: "group-hover:bg-amber/10",
    icon: "text-amber",
    glow: "shadow-[0_0_20px_hsl(var(--amber)/0.15)] group-hover:shadow-[0_0_30px_hsl(var(--amber)/0.4)]",
    ring: "border-amber/30 group-hover:border-amber/70",
    sublabel: "text-crimson",
    label: "group-hover:text-amber",
  },
  crimson: {
    border: "border-crimson/40 group-hover:border-crimson",
    bg: "group-hover:bg-crimson/10",
    icon: "text-crimson",
    glow: "shadow-[0_0_20px_hsl(var(--crimson)/0.15)] group-hover:shadow-[0_0_30px_hsl(var(--crimson)/0.4)]",
    ring: "border-crimson/30 group-hover:border-crimson/70",
    sublabel: "text-amber",
    label: "group-hover:text-crimson",
  },
};

const LeakMindMap: React.FC<LeakMindMapProps> = ({
  hub,
  nodes,
  heightClass = "h-[720px] md:h-[820px] lg:h-[880px]",
  accent = "amber",
}) => {
  const positions = useMemo(() => computeLayout(nodes.length), [nodes.length]);
  const ringGroups = useMemo(() => {
    const g: Record<number, number[]> = {};
    positions.forEach((p, i) => {
      (g[p.ring] ||= []).push(i);
    });
    return g;
  }, [positions]);
  const a = accentMap[accent];

  return (
    <div className={`relative w-full ${heightClass}`}>
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <radialGradient id="lmm-hub-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(var(--crimson))" stopOpacity="0.35" />
            <stop offset="70%" stopColor="hsl(var(--crimson))" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="lmm-spoke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(var(--crimson))" stopOpacity="0.55" />
            <stop offset="100%" stopColor="hsl(var(--amber))" stopOpacity="0.35" />
          </linearGradient>
        </defs>

        <circle cx="50" cy="50" r="18" fill="url(#lmm-hub-glow)" />

        {positions.map((p, i) => (
          <line
            key={`spoke-${i}`}
            x1="50"
            y1="50"
            x2={p.x}
            y2={p.y}
            stroke="url(#lmm-spoke)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
            strokeDasharray="4 6"
            style={{ animation: `mindmap-flow 6s linear ${(i % 8) * -0.5}s infinite` }}
          />
        ))}

        {Object.values(ringGroups).flatMap((idxs, gi) =>
          idxs.map((idx, k) => {
            if (idxs.length < 2) return null;
            const next = idxs[(k + 1) % idxs.length];
            const A = positions[idx];
            const B = positions[next];
            const mx = (A.x + B.x) / 2;
            const my = (A.y + B.y) / 2;
            const dx = mx - 50;
            const dy = my - 50;
            const len = Math.max(0.001, Math.hypot(dx, dy));
            const bulge = 1.08;
            const cx = 50 + (dx / len) * len * bulge;
            const cy = 50 + (dy / len) * len * bulge;
            return (
              <path
                key={`arc-${gi}-${k}`}
                d={`M ${A.x} ${A.y} Q ${cx} ${cy} ${B.x} ${B.y}`}
                fill="none"
                stroke="hsl(var(--amber))"
                strokeOpacity="0.18"
                strokeWidth="0.8"
                vectorEffect="non-scaling-stroke"
                strokeDasharray="2 5"
              />
            );
          })
        )}
      </svg>

      {/* Central hub */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
        <div className="relative">
          <span
            aria-hidden
            className="absolute inset-0 rounded-full border border-crimson/40"
            style={{ animation: "mindmap-pulse 2.6s ease-out infinite" }}
          />
          <span
            aria-hidden
            className="absolute inset-0 rounded-full border border-crimson/30"
            style={{ animation: "mindmap-pulse 2.6s ease-out 1.3s infinite" }}
          />
          <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full bg-background border-2 border-crimson flex flex-col items-center justify-center text-center px-3 shadow-[0_0_40px_hsl(var(--crimson)/0.4)]">
            {hub.eyebrow && (
              <div className="font-case text-[10px] md:text-xs uppercase tracking-widest text-crimson">
                {hub.eyebrow}
              </div>
            )}
            <div className="font-forensic font-bold text-base md:text-xl leading-tight text-foreground mt-1">
              {hub.title}
            </div>
            {hub.subtitle && (
              <div className="font-mono text-[10px] md:text-xs text-amber mt-1">{hub.subtitle}</div>
            )}
          </div>
        </div>
      </div>

      {nodes.map((n, i) => {
        const p = positions[i];
        if (!p) return null;
        const Icon = n.icon;
        const isButton = !!n.onClick;
        const Comp: any = isButton ? "button" : "div";
        return (
          <Comp
            key={n.id}
            type={isButton ? "button" : undefined}
            onClick={n.onClick}
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              animationDelay: `${i * 60}ms`,
            }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 group animate-fade-in z-10 ${isButton ? "cursor-pointer" : ""}`}
          >
            <div className="relative flex flex-col items-center">
              <span
                aria-hidden
                className={`absolute top-0 left-1/2 -translate-x-1/2 w-16 h-16 md:w-20 md:h-20 rounded-full border transition-colors ${a.ring}`}
                style={{ animation: `mindmap-pulse 3.2s ease-out ${(i % 6) * 0.4}s infinite` }}
              />
              <div
                className={`relative w-16 h-16 md:w-20 md:h-20 rounded-full bg-background/95 border-2 flex items-center justify-center transition-all ${a.border} ${a.bg} ${a.glow}`}
              >
                <Icon className={`w-7 h-7 md:w-8 md:h-8 ${a.icon}`} />
              </div>
              <div className="mt-2 text-center max-w-[140px]">
                <div className={`font-forensic text-xs md:text-sm font-bold text-foreground leading-tight transition-colors ${a.label}`}>
                  {n.label}
                </div>
                {n.sublabel && (
                  <div className={`font-mono text-[10px] md:text-xs leading-tight mt-0.5 ${a.sublabel}`}>
                    {n.sublabel}
                  </div>
                )}
              </div>
            </div>
          </Comp>
        );
      })}
    </div>
  );
};

export default LeakMindMap;
