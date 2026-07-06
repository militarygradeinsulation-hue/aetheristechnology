import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";

export type ChaosTuning = {
  /** How hard a drag pushes neighbors (higher = more shove). Range 0–20. */
  dragImpulse: number;
  /** Radius (px) around the dragged node that other nodes feel the ripple. */
  rippleRadius: number;
  /** Spring stiffness pulling nodes back to origin. Higher = snappier return. */
  springStiffness: number;
  /** Damping (friction) — higher = calms down faster, lower = oscillates. */
  damping: number;
  /** Coefficient of restitution when hitting the stage edge (0 = stick, 0.9 = bouncy). */
  edgeBounce: number;
  /** Padding (px) inside the stage where nodes can't cross. */
  edgePadding: number;
};

export const DEFAULT_TUNING: ChaosTuning = {
  dragImpulse: 6,
  rippleRadius: 220,
  springStiffness: 22,
  damping: 5.5,
  edgeBounce: 0.55,
  edgePadding: 32,
};

export type Pos = { x: number; y: number };

/**
 * Shared chaos physics for draggable mind-map nodes.
 * - Pointer + touch drag (pointer events with touch-action:none on nodes)
 * - Ripple impulse to nearby nodes based on drag velocity
 * - Spring-back to origin with damping
 * - Soft edge bounce so nodes can't get lost
 * - Live tuning via a ref (mutations take effect immediately)
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

  // rAF physics loop
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const T = tuningRef.current;
      const cur = offsetsRef.current;
      const vels = velocitiesRef.current;
      const stage = stageRef.current?.getBoundingClientRect();
      let anyMoving = false;

      const next = cur.map((o, i) => {
        if (draggingRef.current === i) return o;
        const v = vels[i];
        // spring back to origin
        const ax = -T.springStiffness * o.dx - T.damping * v.vx;
        const ay = -T.springStiffness * o.dy - T.damping * v.vy;
        v.vx += ax * dt;
        v.vy += ay * dt;
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
      if (anyMoving || draggingRef.current !== null) setOffsets(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [positions, stageRef, tuningRef]);

  const onNodePointerDown = useCallback((i: number, e: React.PointerEvent) => {
    // Prevent scroll/text selection on touch so drag feels crisp
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
    const prev = cur[i];
    const ddx = nx - prev.dx;
    const ddy = ny - prev.dy;
    cur[i] = { dx: nx, dy: ny };

    // ripple: push neighbors along drag delta, scaled by inverse distance
    const stage = stageRef.current?.getBoundingClientRect();
    if (stage) {
      const dragAnchor = {
        x: (positions[i].x / 100) * stage.width + nx,
        y: (positions[i].y / 100) * stage.height + ny,
      };
      const dragMag = Math.hypot(ddx, ddy);
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
          const falloff = 1 - d / T.rippleRadius;
          const push = dragMag * falloff * T.dragImpulse * 0.5;
          velocitiesRef.current[j].vx += (rdx / d) * push;
          velocitiesRef.current[j].vy += (rdy / d) * push;
        }
      }
    }
    lastMoveRef.current = { x: e.clientX, y: e.clientY, t: performance.now() };
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

  return {
    offsets,
    draggingIdx,
    onNodePointerDown,
    onNodePointerMove,
    onNodePointerUp,
    wasDragged,
    clearDrag,
    resetAll,
  };
}
