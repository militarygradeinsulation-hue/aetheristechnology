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

export function useDraggablePin(opts: {
  storageKey: string;
  defaultCorner?: Corner;
  width?: number;
  height?: number;
}) {
  const { storageKey, defaultCorner = "bottom-right", width = 64, height = 64 } = opts;
  const [pos, setPos] = useState<Pos>(() => {
    const saved = load(storageKey);
    return saved ? { x: saved.x, y: saved.y } : defaultPos(defaultCorner, width, height);
  });
  const [pinned, setPinned] = useState<boolean>(() => load(storageKey)?.pinned ?? false);
  const dragRef = useRef<{ dx: number; dy: number; moved: boolean } | null>(null);

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
      if (!dragRef.current || pinned) return;
      const { dx, dy } = dragRef.current;
      dragRef.current.moved = true;
      setPos(clamp({ x: e.clientX - dx, y: e.clientY - dy }, width, height));
    };
    const onUp = () => {
      dragRef.current = null;
      document.body.style.userSelect = "";
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [pinned, width, height]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (pinned) return;
    dragRef.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y, moved: false };
    document.body.style.userSelect = "none";
  }, [pinned, pos.x, pos.y]);

  const togglePin = useCallback(() => setPinned((p) => !p), []);

  const justDragged = useCallback(() => !!dragRef.current?.moved, []);

  return { pos, pinned, togglePin, onPointerDown, justDragged, setPos };
}
