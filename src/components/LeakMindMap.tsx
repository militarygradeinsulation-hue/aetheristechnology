import React, { useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { X } from "lucide-react";
import { useChaosPhysics, DEFAULT_TUNING } from "@/hooks/useChaosPhysics";

export type MindMapNodeData = {
  id: string;
  label: string;
  sublabel?: string;
  icon: LucideIcon;
  onClick?: () => void;
  connections?: string[];
  /** Cross-node ripple: how selecting this node affects sibling nodes. */
  affects?: { id: string; note: string }[];
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
    selectedBorder: "border-amber",
    selectedGlow: "shadow-[0_0_40px_hsl(var(--amber)/0.55)]",
    stroke: "hsl(var(--amber))",
  },
  crimson: {
    border: "border-crimson/40 group-hover:border-crimson",
    bg: "group-hover:bg-crimson/10",
    icon: "text-crimson",
    glow: "shadow-[0_0_20px_hsl(var(--crimson)/0.15)] group-hover:shadow-[0_0_30px_hsl(var(--crimson)/0.4)]",
    ring: "border-crimson/30 group-hover:border-crimson/70",
    sublabel: "text-amber",
    label: "group-hover:text-crimson",
    selectedBorder: "border-crimson",
    selectedGlow: "shadow-[0_0_40px_hsl(var(--crimson)/0.55)]",
    stroke: "hsl(var(--crimson))",
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

  const [selected, setSelected] = useState<number | null>(null);

  // Chaos physics — draggable bubbles with ripples
  const stageRef = useRef<HTMLDivElement>(null);
  const tuningRef = useRef(DEFAULT_TUNING);
  const {
    offsets,
    draggingIdx,
    onNodePointerDown,
    onNodePointerMove,
    onNodePointerUp,
    wasDragged,
    clearDrag,
  } = useChaosPhysics(positions, tuningRef, stageRef);

  const idToIndex = useMemo(() => {
    const m = new Map<string, number>();
    nodes.forEach((n, i) => m.set(n.id, i));
    return m;
  }, [nodes]);

  const affectedIdx = useMemo(() => {
    if (selected === null) return new Set<number>();
    const affects = nodes[selected]?.affects ?? [];
    const s = new Set<number>();
    affects.forEach((x) => {
      const idx = idToIndex.get(x.id);
      if (idx !== undefined) s.add(idx);
    });
    return s;
  }, [selected, nodes, idToIndex]);

  return (
    <div ref={stageRef} className={`relative w-full ${heightClass} overflow-hidden`}>

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

        {positions.map((p, i) => {
          const isSel = selected === i;
          const dim = selected !== null && !isSel;
          return (
            <line
              key={`spoke-${i}`}
              x1="50"
              y1="50"
              x2={p.x}
              y2={p.y}
              stroke={isSel ? a.stroke : "url(#lmm-spoke)"}
              strokeWidth={isSel ? "1.8" : "1"}
              strokeOpacity={dim ? 0.15 : 1}
              vectorEffect="non-scaling-stroke"
              strokeDasharray={isSel ? "0" : "4 6"}
              style={{ animation: isSel ? undefined : `mindmap-flow 6s linear ${(i % 8) * -0.5}s infinite` }}
            />
          );
        })}

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
            const isSelArc = selected === idx || selected === next;
            return (
              <path
                key={`arc-${gi}-${k}`}
                d={`M ${A.x} ${A.y} Q ${cx} ${cy} ${B.x} ${B.y}`}
                fill="none"
                stroke={isSelArc ? a.stroke : "hsl(var(--amber))"}
                strokeOpacity={selected !== null ? (isSelArc ? 0.9 : 0.06) : 0.18}
                strokeWidth={isSelArc ? "1.2" : "0.8"}
                vectorEffect="non-scaling-stroke"
                strokeDasharray={isSelArc ? "0" : "2 5"}
              />
            );
          })
        )}

        {/* Ripple links: selected node → affected sibling nodes */}
        {selected !== null && [...affectedIdx].map((tIdx) => {
          const S = positions[selected];
          const T = positions[tIdx];
          if (!S || !T) return null;
          // Curve away from the hub for readability
          const mx = (S.x + T.x) / 2;
          const my = (S.y + T.y) / 2;
          const dx = mx - 50;
          const dy = my - 50;
          const len = Math.max(0.001, Math.hypot(dx, dy));
          const bulge = 1.35;
          const cx = 50 + (dx / len) * len * bulge;
          const cy = 50 + (dy / len) * len * bulge;
          return (
            <path
              key={`ripple-${selected}-${tIdx}`}
              d={`M ${S.x} ${S.y} Q ${cx} ${cy} ${T.x} ${T.y}`}
              fill="none"
              stroke={a.stroke}
              strokeOpacity={0.85}
              strokeWidth="1.4"
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
              style={{ animation: "mindmap-flow 3s linear infinite" }}
            />
          );
        })}
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
        const isSel = selected === i;
        const isAffected = affectedIdx.has(i);
        const dim = selected !== null && !isSel && !isAffected;
        const handleClick = () => {
          if (wasDragged()) { clearDrag(); return; }
          if (isSel) {
            if (n.onClick) n.onClick();
            else setSelected(null);
          } else {
            setSelected(i);
          }
        };
        // Randomize drift per node
        const driftDur = 6 + ((i * 1.3) % 5);
        const driftDelay = (i * 0.5) % 4;
        const off = offsets[i] ?? { dx: 0, dy: 0 };
        const isDragging = draggingIdx === i;
        return (
          <button
            key={n.id}
            type="button"
            onClick={handleClick}
            onPointerDown={(e) => onNodePointerDown(i, e)}
            onPointerMove={(e) => onNodePointerMove(i, e)}
            onPointerUp={(e) => onNodePointerUp(i, e)}
            onPointerCancel={(e) => onNodePointerUp(i, e)}
            onContextMenu={(e) => e.preventDefault()}
            aria-pressed={isSel}
            aria-label={`${n.label}. ${isSel ? "Collapse" : "Expand connections"}`}
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              transform: `translate(calc(-50% + ${off.dx}px), calc(-50% + ${off.dy}px))`,
              touchAction: "none",
              cursor: isDragging ? "grabbing" : "grab",
              WebkitTapHighlightColor: "transparent",
              WebkitUserSelect: "none",
              userSelect: "none",
            }}
            className={`absolute group p-3 sm:p-2 cursor-pointer transition-opacity duration-300 select-none ${
              dim ? "opacity-40" : "opacity-100"
            } ${isSel || isDragging ? "z-30" : "z-10"}`}
          >
            <div
              className="animate-mindmap-drift pointer-events-none"
              style={{
                animationDuration: `${driftDur}s`,
                animationDelay: `-${driftDelay}s`,
                animationPlayState: isDragging ? "paused" : "running",
              }}
            >
              <div className={`relative flex flex-col items-center transition-transform duration-300 ${isSel || isDragging ? "scale-110" : ""}`}>
                <span
                  aria-hidden
                  className={`absolute top-0 left-1/2 -translate-x-1/2 w-16 h-16 md:w-20 md:h-20 rounded-full border transition-colors ${a.ring}`}
                  style={{ animation: `mindmap-pulse 3.2s ease-out ${(i % 6) * 0.4}s infinite` }}
                />
                <div
                  className={`relative w-16 h-16 md:w-20 md:h-20 rounded-full bg-background/95 border-2 flex items-center justify-center transition-all ${
                    isSel
                      ? `${a.selectedBorder} ${a.selectedGlow}`
                      : isAffected
                        ? `${a.selectedBorder} ${a.glow}`
                        : `${a.border} ${a.bg} ${a.glow}`
                  }`}
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
            </div>
          </button>
        );
      })}

      {/* Single centered detail panel — never clipped by node position */}
      {selected !== null && nodes[selected] && (() => {
        const n = nodes[selected];
        return (
          <div
            className="absolute left-1/2 bottom-3 -translate-x-1/2 z-40 w-[min(92%,340px)] max-h-[55%] overflow-y-auto rounded-sm border border-amber/50 bg-background/95 backdrop-blur-md p-3 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] animate-fade-in text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2 gap-2">
              <div className="font-forensic text-sm font-bold text-foreground truncate">
                {n.label}
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setSelected(null); }}
                className="text-foreground/60 hover:text-foreground shrink-0"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="font-mono text-[9px] uppercase tracking-[0.28em] text-amber mb-1.5">
              Connections
            </div>
            {n.connections && n.connections.length > 0 ? (
              <ul className="space-y-1.5">
                {n.connections.map((c, ci) => (
                  <li key={ci} className="flex items-start gap-2 text-[11px] md:text-xs text-foreground/85 leading-snug">
                    <span className="mt-1 h-1 w-1 rounded-full shrink-0 bg-amber" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] text-foreground/70 leading-snug">
                Traces back to the hub. Click again for details.
              </p>
            )}
            {n.affects && n.affects.length > 0 && (
              <div className="mt-3 pt-2 border-t border-crimson/25">
                <div className="font-mono text-[9px] uppercase tracking-[0.28em] text-crimson mb-1.5">
                  Ripple effect
                </div>
                <ul className="space-y-1.5">
                  {n.affects.map((f, fi) => {
                    const target = nodes[idToIndex.get(f.id) ?? -1];
                    return (
                      <li key={fi} className="text-[11px] md:text-xs leading-snug">
                        <span className="font-forensic font-bold text-crimson">
                          → {target?.label ?? f.id}:
                        </span>{" "}
                        <span className="text-foreground/80">{f.note}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {n.onClick && (
              <div className="mt-2 pt-2 border-t border-amber/15 font-mono text-[9px] uppercase tracking-wider text-amber/80">
                Tap again to open →
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
};

export default LeakMindMap;
