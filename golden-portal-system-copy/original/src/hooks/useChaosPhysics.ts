import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";

export type ChaosTuning = {
  /** How hard a drag pushes neighbors. 0 = none, 1 = strong shove. */
  dragImpulse: number;
  /** Radius (px) around the dragged node that other nodes feel the ripple. */
  rippleRadius: number;
  /** Ripple sharpness — 1 = linear falloff, 3 = steep/focused, 0.5 = wide/soft. */
  rippleSharpness: number;
  /** Return speed — how fast bubbles settle back (0.05 = drifty, 1 = snap). */
  returnSpeed: number;
  /** Bounciness — 0 = molasses (no overshoot), 1 = springy (lots of overshoot). */
  bounciness: number;
  /** Coefficient of restitution when hitting the stage edge (0 = stick, 0.9 = bouncy). */
  edgeBounce: number;
  /** Padding (px) inside the stage where nodes can't cross. */
  edgePadding: number;
};

export const DEFAULT_TUNING: ChaosTuning = {
  dragImpulse: 0.55,
  rippleRadius: 240,
  rippleSharpness: 1.4,
  returnSpeed: 0.42,
  bounciness: 0.55,
  edgeBounce: 0.55,
  edgePadding: 32,
};

export type Pos = { x: number; y: number };

// Max clamp so pushes never explode a bubble across the stage in one frame.
const MAX_VELOCITY = 2400; // px/s
const MAX_SUBSTEP = 1 / 120; // seconds — cap physics dt for stability

/**
 * Map intuitive tuning (returnSpeed 0..1, bounciness 0..1) to spring/damping.
 *   omega  = angular frequency (rad/s), higher = faster settle
 *   zeta   = damping ratio (0 = undamped oscillation, 1 = critical, >1 = overdamped)
 *   k      = omega^2                  (stiffness)
 *   c      = 2 * zeta * omega         (damping coefficient)
 */
function springParams(T: ChaosTuning) {
  const omega = 2 + T.returnSpeed * 14;           // ~2..16 rad/s
  const zeta = 1.15 - T.bounciness * 1.05;        // ~1.15 (overdamped)..0.1 (very bouncy)
  return { k: omega * omega, c: 2 * zeta * omega };
}

/**
 * Shared chaos physics for draggable mind-map nodes.
 * - Pointer + touch drag
 * - Velocity-based ripple impulse to neighbors (uses actual pointer speed)
 * - Spring-back to origin, tuned via intuitive returnSpeed/bounciness
 * - Substepped integration + velocity clamp for stability at any settings
 * - Soft edge bounce so nodes can't get lost
 * - Live tuning via a ref (mutations take effect immediately, no re-render needed)
 */
export function useChaosPhysics(
  positions: Pos[],
  tuningRef: React.MutableRefObject<ChaosTuning>,
  stageRef: React.RefObject<HTMLElement>
) {
  const n = positions.length;
  const [offsets, setOffsets] = useState<{ dx: number; dy: number }[]>(
    () => positions.map(() => ({ dx: 0, dy: 0 }))
  );
  const offsetsRef = useRef(offsets);
  offsetsRef.current = offsets;

  const velocitiesRef = useRef<{ vx: number; vy: number }[]>(
    positions.map(() => ({ vx: 0, vy: 0 }))
  );

  const draggingRef = useRef<number | null>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const dragStartRef = useRef<{ px: number; py: number; dx: number; dy: number } | null>(null);
  const movedRef = useRef(0);
  const lastMoveRef = useRef<{ x: number; y: number; t: number } | null>(null);

  // Resize velocity/offset arrays when node count changes
  useEffect(() => {
    setOffsets(positions.map(() => ({ dx: 0, dy: 0 })));
    velocitiesRef.current = positions.map(() => ({ vx: 0, vy: 0 }));
  }, [n]); // eslint-disable-line react-hooks/exhaustive-deps

  // rAF physics loop with sub-stepping so high-stiffness / low-damping is stable
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const frame = Math.min(0.05, (now - last) / 1000);
      last = now;
      const T = tuningRef.current;
      const { k, c } = springParams(T);
      const stage = stageRef.current?.getBoundingClientRect();
      const vels = velocitiesRef.current;
      let cur = offsetsRef.current;
      let anyMoving = false;

      // Number of substeps sized to keep k*dt small (semi-implicit Euler stability).
      const steps = Math.max(1, Math.ceil(frame / MAX_SUBSTEP));
      const dt = frame / steps;

      for (let s = 0; s < steps; s++) {
        const next = cur.map((o, i) => {
          if (draggingRef.current === i) return o;
          const v = vels[i];
          const ax = -k * o.dx - c * v.vx;
          const ay = -k * o.dy - c * v.vy;
          v.vx += ax * dt;
          v.vy += ay * dt;
          // clamp so a huge accidental impulse can't nuke everything
          const sp = Math.hypot(v.vx, v.vy);
          if (sp > MAX_VELOCITY) {
            v.vx = (v.vx / sp) * MAX_VELOCITY;
            v.vy = (v.vy / sp) * MAX_VELOCITY;
          }
          let ndx = o.dx + v.vx * dt;
          let ndy = o.dy + v.vy * dt;

          // soft edge bounce
          if (stage && positions[i]) {
            const pad = T.edgePadding;
            const anchorX = (positions[i].x / 100) * stage.width + ndx;
            const anchorY = (positions[i].y / 100) * stage.height + ndy;
            if (anchorX < pad) {
              ndx += pad - anchorX;
              v.vx = Math.abs(v.vx) * T.edgeBounce;
            } else if (anchorX > stage.width - pad) {
              ndx -= anchorX - (stage.width - pad);
              v.vx = -Math.abs(v.vx) * T.edgeBounce;
            }
            if (anchorY < pad) {
              ndy += pad - anchorY;
              v.vy = Math.abs(v.vy) * T.edgeBounce;
            } else if (anchorY > stage.height - pad) {
              ndy -= anchorY - (stage.height - pad);
              v.vy = -Math.abs(v.vy) * T.edgeBounce;
            }
          }

          if (
            Math.abs(ndx) > 0.05 || Math.abs(ndy) > 0.05 ||
            Math.abs(v.vx) > 0.05 || Math.abs(v.vy) > 0.05
          ) anyMoving = true;
          return { dx: ndx, dy: ndy };
        });
        cur = next;
      }

      if (anyMoving || draggingRef.current !== null) setOffsets(cur);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [positions, stageRef, tuningRef]);

  const onNodePointerDown = useCallback((i: number, e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    e.stopPropagation();
    draggingRef.current = i;
    setDraggingIdx(i);
    dragStartRef.current = {
      px: e.clientX,
      py: e.clientY,
      dx: offsetsRef.current[i]?.dx ?? 0,
      dy: offsetsRef.current[i]?.dy ?? 0,
    };
    movedRef.current = 0;
    lastMoveRef.current = { x: e.clientX, y: e.clientY, t: performance.now() };
    velocitiesRef.current[i] = { vx: 0, vy: 0 };
  }, []);

  const onNodePointerMove = useCallback((i: number, e: React.PointerEvent) => {
    if (draggingRef.current !== i || !dragStartRef.current) return;
    const s = dragStartRef.current;
    const nx = s.dx + (e.clientX - s.px);
    const ny = s.dy + (e.clientY - s.py);
    movedRef.current = Math.max(
      movedRef.current,
      Math.hypot(e.clientX - s.px, e.clientY - s.py)
    );

    const T = tuningRef.current;
    const cur = [...offsetsRef.current];
    cur[i] = { dx: nx, dy: ny };

    // Compute actual pointer velocity (px/s) from the last move sample so
    // ripple strength scales with how fast you're flinging, not how many
    // pointer events fired this frame.
    const now = performance.now();
    const prev = lastMoveRef.current;
    let vx = 0, vy = 0;
    if (prev) {
      const dtMs = Math.max(1, now - prev.t);
      vx = ((e.clientX - prev.x) / dtMs) * 1000;
      vy = ((e.clientY - prev.y) / dtMs) * 1000;
    }
    // Also drive the dragged node's own velocity so releasing a fling gets kinetic follow-through.
    velocitiesRef.current[i] = { vx, vy };

    const stage = stageRef.current?.getBoundingClientRect();
    if (stage) {
      const dragAnchor = {
        x: (positions[i].x / 100) * stage.width + nx,
        y: (positions[i].y / 100) * stage.height + ny,
      };
      const speed = Math.hypot(vx, vy);
      // Normalize speed to a 0..1-ish range so the slider behaves the same on
      // slow drags and fast flings. 1500 px/s ≈ a brisk fling.
      const speedNorm = Math.min(1, speed / 1500);
      for (let j = 0; j < cur.length; j++) {
        if (j === i || !positions[j]) continue;
        const anchor = {
          x: (positions[j].x / 100) * stage.width + cur[j].dx,
          y: (positions[j].y / 100) * stage.height + cur[j].dy,
        };
        const rdx = anchor.x - dragAnchor.x;
        const rdy = anchor.y - dragAnchor.y;
        const d = Math.hypot(rdx, rdy) || 1;
        if (d < T.rippleRadius) {
          const falloff = Math.pow(1 - d / T.rippleRadius, T.rippleSharpness);
          // Push along the drag direction (feels natural — you're shoving them
          // the way you're moving), scaled by the outward component so nodes
          // don't get sucked back into the dragged one.
          const outward = (rdx * vx + rdy * vy) / (d * (speed || 1)); // -1..1
          const align = Math.max(0.15, outward + 0.35); // never fully zero — you still bump them
          const push = T.dragImpulse * 900 * speedNorm * falloff * align;
          velocitiesRef.current[j].vx += (rdx / d) * push;
          velocitiesRef.current[j].vy += (rdy / d) * push;
        }
      }
    }
    lastMoveRef.current = { x: e.clientX, y: e.clientY, t: now };
    setOffsets(cur);
  }, [positions, stageRef, tuningRef]);

  const onNodePointerUp = useCallback((i: number, _e: React.PointerEvent) => {
    if (draggingRef.current === i) {
      draggingRef.current = null;
      setDraggingIdx(null);
      dragStartRef.current = null;
    }
  }, []);

  /** true if the last pointer interaction was a drag (should suppress click) */
  const wasDragged = useCallback(() => movedRef.current > 6, []);
  const clearDrag = useCallback(() => { movedRef.current = 0; }, []);

  const resetAll = useCallback(() => {
    setOffsets(positions.map(() => ({ dx: 0, dy: 0 })));
    velocitiesRef.current = positions.map(() => ({ vx: 0, vy: 0 }));
  }, [positions]);

  /** Kick every node with a random impulse — great for testing tuning changes. */
  const shake = useCallback((strength = 700) => {
    velocitiesRef.current = velocitiesRef.current.map(() => ({
      vx: (Math.random() * 2 - 1) * strength,
      vy: (Math.random() * 2 - 1) * strength,
    }));
  }, []);

  return {
    offsets,
    draggingIdx,
    onNodePointerDown,
    onNodePointerMove,
    onNodePointerUp,
    wasDragged,
    clearDrag,
    resetAll,
    shake,
  };
}
