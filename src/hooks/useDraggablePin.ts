import { useCallback, useEffect, useRef, useState } from "react";

export type Corner = "bottom-right" | "bottom-left" | "top-right" | "top-left";

type Pos = { x: number; y: number };

type Persisted = { x: number; y: number; pinned: boolean };

function defaultPos(corner: Corner, w: number, h: number, margin = 16): Pos {
  if (typeof window === "undefined") return { x: margin, y: margin };
  const W = window.innerWidth, H = window.innerHeight;
  switch (corner) {
    case "bottom-right": return { x: W - w - margin, y: H - h - margin };
    case "bottom-left":  return { x: margin,         y: H - h - margin };
    case "top-right":    return { x: W - w - margin, y: margin };
    case "top-left":     return { x: margin,         y: margin };
  }
}

function load(key: string): Persisted | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (typeof v?.x === "number" && typeof v?.y === "number") {
      return { x: v.x, y: v.y, pinned: !!v.pinned };
    }
  } catch { /* ignore */ }
  return null;
}

function clamp(p: Pos, w: number, h: number): Pos {
  if (typeof window === "undefined") return p;
  return {
    x: Math.min(Math.max(8, p.x), Math.max(8, window.innerWidth - w - 8)),
    y: Math.min(Math.max(8, p.y), Math.max(8, window.innerHeight - h - 8)),
  };
}

function snapEdge(p: Pos, w: number, margin = 12): Pos {
  if (typeof window === "undefined") return p;
  const W = window.innerWidth;
  const center = p.x + w / 2;
  const x = center < W / 2 ? margin : W - w - margin;
  return { x, y: p.y };
}

export function useDraggablePin(opts: {
  storageKey: string;
  defaultCorner?: Corner;
  width?: number;
  height?: number;
  longPressMs?: number;
  snapToEdge?: boolean;
}) {
  const {
    storageKey,
    defaultCorner = "bottom-right",
    width = 64,
    height = 64,
    longPressMs = 350,
    snapToEdge = true,
  } = opts;
  const [pos, setPos] = useState<Pos>(() => {
    const saved = load(storageKey);
    return saved ? { x: saved.x, y: saved.y } : defaultPos(defaultCorner, width, height);
  });
  const [pinned, setPinned] = useState<boolean>(() => load(storageKey)?.pinned ?? false);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ dx: number; dy: number; moved: boolean; active: boolean } | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Persist
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ ...pos, pinned }));
    } catch { /* ignore */ }
  }, [pos, pinned, storageKey]);

  // Keep on-screen on resize
  useEffect(() => {
    const onResize = () => setPos((p) => clamp(p, width, height));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [width, height]);

  // Global pointer move/up
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragRef.current || !dragRef.current.active || pinned) return;
      const { dx, dy } = dragRef.current;
      dragRef.current.moved = true;
      e.preventDefault();
      setPos(clamp({ x: e.clientX - dx, y: e.clientY - dy }, width, height));
    };
    const onUp = () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      const wasActive = dragRef.current?.active;
      dragRef.current = null;
      document.body.style.userSelect = "";
      setDragging(false);
      if (wasActive && snapToEdge) {
        setPos((p) => snapEdge(p, width));
      }
    };
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [pinned, width, height, snapToEdge]);

  // Immediate drag (handle)
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (pinned) return;
    dragRef.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y, moved: false, active: true };
    document.body.style.userSelect = "none";
    setDragging(true);
  }, [pinned, pos.x, pos.y]);

  // Long-press anywhere on the body to start dragging
  const onBodyPointerDown = useCallback((e: React.PointerEvent) => {
    if (pinned) return;
    const startX = e.clientX, startY = e.clientY;
    dragRef.current = { dx: startX - pos.x, dy: startY - pos.y, moved: false, active: false };
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      if (dragRef.current) {
        dragRef.current.active = true;
        document.body.style.userSelect = "none";
        setDragging(true);
        try { (navigator as any).vibrate?.(20); } catch {}
      }
    }, longPressMs);
  }, [pinned, pos.x, pos.y, longPressMs]);

  const togglePin = useCallback(() => setPinned((p) => !p), []);

  const justDragged = useCallback(() => !!dragRef.current?.moved, []);

  return { pos, pinned, dragging, togglePin, onPointerDown, onBodyPointerDown, justDragged, setPos };
}
