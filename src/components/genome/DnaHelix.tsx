import { useEffect, useRef } from "react";

/**
 * Particle-rendered double helix in the "sci-fi lab HUD" style.
 * Pure canvas, no deps. Highlighted segments glow in accent colors and
 * report their on-screen positions so HTML callouts can track them.
 */

export type HelixSegment = {
  id: string;
  /** 0..1 position along the helix (top → bottom) */
  from: number;
  to: number;
  color: string; // rgb triple, e.g. "255,138,61"
};

type Props = {
  segments: HelixSegment[];
  className?: string;
  /** Called every frame with each segment's midpoint in CSS pixels, relative to the canvas. */
  onAnchors?: (anchors: Record<string, { x: number; y: number }>) => void;
  /** Horizontal tilt of the helix axis, in px across the full height. */
  tilt?: number;
};

type Particle = { t: number; strand: 0 | 1 | 2; off: number; jitter: number; size: number; phase: number };

const TURNS = 3.2;

export function DnaHelix({ segments, className, onAnchors, tilt = 90 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const segRef = useRef(segments);
  const anchorsRef = useRef(onAnchors);
  const redrawRef = useRef<() => void>(() => {});
  segRef.current = segments;
  anchorsRef.current = onAnchors;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    let dpr = 1;
    let particles: Particle[] = [];
    let raf = 0;

    const build = () => {
      const count = Math.round(Math.min(9000, Math.max(3200, (w * h) / 30)));
      particles = [];
      for (let i = 0; i < count; i++) {
        const r = Math.random();
        // 38% strand A, 38% strand B, 24% rungs
        const strand: 0 | 1 | 2 = r < 0.38 ? 0 : r < 0.76 ? 1 : 2;
        particles.push({
          t: Math.random(),
          strand,
          off: Math.random(), // position across rung
          jitter: (Math.random() - 0.5) * (strand === 2 ? 4 : 16),
          size: Math.random() * 1.6 + 0.4,
          phase: Math.random() * Math.PI * 2,
        });
      }
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    };

    // fillStyle strings cached per color with alpha quantized, so the particle loop allocates nothing
    const ALPHA_STEPS = 24;
    const fillCache = new Map<string, string[]>();
    const fillFor = (rgb: string, alpha: number) => {
      let steps = fillCache.get(rgb);
      if (!steps) {
        steps = Array.from({ length: ALPHA_STEPS + 1 }, (_, i) => `rgba(${rgb},${(i / ALPHA_STEPS).toFixed(3)})`);
        fillCache.set(rgb, steps);
      }
      return steps[Math.max(0, Math.min(ALPHA_STEPS, Math.round(alpha * ALPHA_STEPS)))];
    };
    const BASE_TINTS = 8;
    const baseRgb = Array.from({ length: BASE_TINTS + 1 }, (_, i) => {
      const d = i / BASE_TINTS;
      return `${Math.round(200 + d * 40)},${Math.round(210 + d * 35)},255`;
    });

    const segFor = (t: number) => {
      for (const s of segRef.current) if (t >= s.from && t <= s.to) return s;
      return null;
    };

    const start = performance.now();
    const draw = (now: number) => {
      const time = reduced ? 0 : (now - start) / 1000;
      const rot = time * 0.35;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";

      const padY = h * 0.04;
      const usableH = h - padY * 2;
      const radius = Math.min(w * 0.27, 130);
      const cx = w / 2;

      const pos = (t: number, strandPhase: number) => {
        const a = t * TURNS * Math.PI * 2 + rot + strandPhase;
        const axisX = cx + (t - 0.5) * -tilt;
        return {
          x: axisX + Math.cos(a) * radius,
          y: padY + t * usableH + Math.sin(a) * radius * 0.18,
          z: Math.sin(a), // -1 back, 1 front
        };
      };

      // Segment glow halos (behind particles)
      for (const s of segRef.current) {
        const steps = 22;
        for (let i = 0; i <= steps; i++) {
          const t = s.from + ((s.to - s.from) * i) / steps;
          for (const ph of [0, Math.PI]) {
            const p = pos(t, ph);
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 16);
            g.addColorStop(0, `rgba(${s.color},${0.1 + 0.08 * (p.z + 1)})`);
            g.addColorStop(1, `rgba(${s.color},0)`);
            ctx.fillStyle = g;
            ctx.fillRect(p.x - 16, p.y - 16, 32, 32);
          }
        }
      }

      for (const p of particles) {
        const seg = segFor(p.t);
        let x: number;
        let y: number;
        let z: number;
        if (p.strand === 2) {
          const a = pos(p.t, 0);
          const b = pos(p.t, Math.PI);
          x = a.x + (b.x - a.x) * p.off;
          y = a.y + (b.y - a.y) * p.off + p.jitter;
          z = a.z + (b.z - a.z) * p.off;
          // only draw rungs at discrete intervals
          const rung = (p.t * 64) % 1;
          if (rung > 0.34) continue;
        } else {
          const q = pos(p.t, p.strand === 0 ? 0 : Math.PI);
          const drift = Math.sin(time * 1.4 + p.phase) * 1.4;
          x = q.x + p.jitter * 0.9 + drift;
          y = q.y + p.jitter * 0.6;
          z = q.z;
        }
        const depth = (z + 1) / 2; // 0 back → 1 front
        const flicker = 0.75 + 0.25 * Math.sin(time * 3 + p.phase);
        const alpha = (0.18 + depth * 0.7) * flicker;
        const size = p.size * (0.6 + depth * 0.8);
        ctx.fillStyle = seg
          ? fillFor(seg.color, Math.min(1, alpha + 0.2))
          : fillFor(baseRgb[Math.round(depth * BASE_TINTS)], alpha);
        ctx.fillRect(x, y, size, size);
      }

      ctx.globalCompositeOperation = "source-over";

      if (anchorsRef.current) {
        const out: Record<string, { x: number; y: number }> = {};
        for (const s of segRef.current) {
          const t = (s.from + s.to) / 2;
          const a = pos(t, 0);
          const b = pos(t, Math.PI);
          const front = a.z > b.z ? a : b;
          out[s.id] = { x: front.x, y: front.y };
        }
        anchorsRef.current(out);
      }

      if (!reduced) raf = requestAnimationFrame(draw);
    };

    resize();
    raf = requestAnimationFrame(draw);
    // With reduced motion only one frame is drawn, so changed segments need an explicit redraw
    redrawRef.current = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(draw);
    };
    const ro = new ResizeObserver(() => {
      resize();
      if (reduced) raf = requestAnimationFrame(draw);
    });
    ro.observe(canvas);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      redrawRef.current = () => {};
    };
  }, [tilt]);

  useEffect(() => {
    redrawRef.current();
  }, [segments]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
