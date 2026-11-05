import React, { useEffect, useState } from "react";
import { GripVertical, Pin, PinOff, Droplet } from "lucide-react";
import { useDraggablePin, type Corner } from "@/hooks/useDraggablePin";

interface Props {
  storageKey: string;
  defaultCorner?: Corner;
  width?: number;
  height?: number;
  zIndex?: number;
  className?: string;
  children: React.ReactNode;
  /** Hide the small drag/pin chip (kept visible by default). */
  hideHandle?: boolean;
  /** Disable long-press-anywhere drag (use the grip handle only). Useful when the floater contains interactive content like a chat panel. */
  disableBodyDrag?: boolean;
}

const OPACITY_STEPS = [1, 0.85, 0.65, 0.45, 0.25];

/**
 * Wraps any floating launcher/bubble in a draggable + pinnable container.
 * Position, pin state, and opacity persist per storageKey in localStorage.
 */
export const PinnableFloater: React.FC<Props> = ({
  storageKey,
  defaultCorner = "bottom-right",
  width = 64,
  height = 64,
  zIndex = 50,
  className,
  children,
  hideHandle,
  disableBodyDrag,
}) => {
  const { pos, pinned, dragging, togglePin, onPointerDown, onBodyPointerDown } = useDraggablePin({
    storageKey, defaultCorner, width, height,
  });

  const opacityKey = `${storageKey}:opacity`;
  const [opacity, setOpacity] = useState<number>(1);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(opacityKey);
      if (raw) {
        const n = parseFloat(raw);
        if (!isNaN(n) && n > 0 && n <= 1) setOpacity(n);
      }
    } catch {}
  }, [opacityKey]);

  const cycleOpacity = () => {
    const idx = OPACITY_STEPS.findIndex((v) => Math.abs(v - opacity) < 0.02);
    const next = OPACITY_STEPS[(idx + 1) % OPACITY_STEPS.length];
    setOpacity(next);
    try { localStorage.setItem(opacityKey, String(next)); } catch {}
  };

  return (
    <div
      className={`fixed ${className || ""} ${dragging ? "transition-none select-none" : "transition-[left,top] duration-200 ease-out"}`}
      style={{ left: pos.x, top: pos.y, zIndex, touchAction: dragging ? "none" : undefined }}
      onPointerDown={pinned || disableBodyDrag ? undefined : onBodyPointerDown}
    >
      {!hideHandle && (
        <div className="absolute -top-4 -left-4 flex items-center gap-1 rounded-full bg-background/95 border border-amber/50 shadow-lg backdrop-blur px-1.5 py-1 opacity-80 hover:opacity-100 transition-opacity">
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              try { (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); } catch {}
              onPointerDown(e);
            }}
            onPointerUp={(e) => {
              try { (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId); } catch {}
            }}
            title={pinned ? "Unpin to move" : "Drag to move"}
            aria-label="Drag handle"
            disabled={pinned}
            className={`p-1.5 rounded-full ${pinned ? "cursor-not-allowed opacity-50" : "cursor-grab active:cursor-grabbing hover:bg-amber/20"} touch-none`}
          >
            <GripVertical className="w-4 h-4 text-amber" />
          </button>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={togglePin}
            title={pinned ? "Unpin" : "Pin in place"}
            aria-label={pinned ? "Unpin" : "Pin"}
            className="p-1 rounded hover:bg-amber/20"
          >
            {pinned
              ? <Pin className="w-3.5 h-3.5 text-amber fill-amber" />
              : <PinOff className="w-3.5 h-3.5 text-muted-foreground" />}
          </button>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={cycleOpacity}
            title={`Opacity ${Math.round(opacity * 100)}% — click to cycle`}
            aria-label="Cycle opacity"
            className="p-1 rounded hover:bg-amber/20 flex items-center gap-0.5"
          >
            <Droplet className="w-3.5 h-3.5 text-amber" />
            <span className="text-[9px] font-mono text-amber leading-none">
              {Math.round(opacity * 100)}
            </span>
          </button>
        </div>
      )}
      <div
        style={{ opacity }}
        className={`transition-opacity hover:!opacity-100 ${dragging ? "scale-105 ring-2 ring-amber/60 rounded-xl pointer-events-none" : ""}`}
      >
        {children}
      </div>
    </div>
  );
};
