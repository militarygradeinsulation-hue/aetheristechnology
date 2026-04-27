import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Rect = { x: number; y: number; w: number; h: number };

interface Props {
  onComplete: (rect: Rect | null) => void;
}

/**
 * Full-screen dim overlay with crosshair cursor. User drags a rectangle to
 * select the region they want the assistant to look at. ESC cancels.
 */
export const ScreenCaptureOverlay = ({ onComplete }: Props) => {
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [end, setEnd] = useState<{ x: number; y: number } | null>(null);
  const completedRef = useRef(false);

  const finish = (rect: Rect | null) => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete(rect);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleDown = (e: React.MouseEvent) => {
    setStart({ x: e.clientX, y: e.clientY });
    setEnd({ x: e.clientX, y: e.clientY });
  };
  const handleMove = (e: React.MouseEvent) => {
    if (!start) return;
    setEnd({ x: e.clientX, y: e.clientY });
  };
  const handleUp = () => {
    if (!start || !end) {
      finish(null);
      return;
    }
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const w = Math.abs(end.x - start.x);
    const h = Math.abs(end.y - start.y);
    if (w < 20 || h < 20) {
      finish(null);
      return;
    }
    finish({ x, y, w, h });
  };

  const rect =
    start && end
      ? {
          x: Math.min(start.x, end.x),
          y: Math.min(start.y, end.y),
          w: Math.abs(end.x - start.x),
          h: Math.abs(end.y - start.y),
        }
      : null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] cursor-crosshair select-none"
      style={{ background: "hsla(220, 30%, 5%, 0.45)" }}
      onMouseDown={handleDown}
      onMouseMove={handleMove}
      onMouseUp={handleUp}
    >
      {/* Hint */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-card border border-border rounded-md px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-foreground shadow-lg">
        Drag to select an area · ESC to cancel
      </div>

      {/* Selection rectangle */}
      {rect && (
        <div
          className="absolute border-2 border-primary"
          style={{
            left: rect.x,
            top: rect.y,
            width: rect.w,
            height: rect.h,
            background: "hsla(38, 92%, 50%, 0.08)",
            boxShadow: "0 0 0 9999px hsla(220, 30%, 5%, 0.35)",
          }}
        >
          <div className="absolute -top-6 left-0 bg-primary text-primary-foreground text-[10px] font-mono px-1.5 py-0.5 rounded">
            {Math.round(rect.w)} × {Math.round(rect.h)}
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
};
