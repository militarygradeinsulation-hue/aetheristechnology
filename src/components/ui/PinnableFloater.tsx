import React from "react";
import { GripVertical, Pin, PinOff } from "lucide-react";
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
}

/**
 * Wraps any floating launcher/bubble in a draggable + pinnable container.
 * Position and pin state persist per storageKey in localStorage.
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
}) => {
  const { pos, pinned, togglePin, onPointerDown } = useDraggablePin({
    storageKey, defaultCorner, width, height,
  });

  return (
    <div
      className={`fixed ${className || ""}`}
      style={{ left: pos.x, top: pos.y, zIndex }}
    >
      {!hideHandle && (
        <div className="absolute -top-3 -left-3 flex items-center gap-0.5 rounded-full bg-background/90 border border-amber/40 shadow-md backdrop-blur px-1 py-0.5 opacity-70 hover:opacity-100 transition-opacity">
          <button
            type="button"
            onPointerDown={onPointerDown}
            title={pinned ? "Unpin to move" : "Drag to move"}
            aria-label="Drag handle"
            disabled={pinned}
            className={`p-0.5 rounded ${pinned ? "cursor-not-allowed opacity-50" : "cursor-grab active:cursor-grabbing"} touch-none`}
          >
            <GripVertical className="w-3 h-3 text-amber" />
          </button>
          <button
            type="button"
            onClick={togglePin}
            title={pinned ? "Unpin" : "Pin in place"}
            aria-label={pinned ? "Unpin" : "Pin"}
            className="p-0.5 rounded hover:bg-amber/20"
          >
            {pinned
              ? <Pin className="w-3 h-3 text-amber fill-amber" />
              : <PinOff className="w-3 h-3 text-muted-foreground" />}
          </button>
        </div>
      )}
      {children}
    </div>
  );
};
