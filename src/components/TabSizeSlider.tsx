import React from 'react';
import { Type } from 'lucide-react';
import { useTabSize } from '@/lib/tabSize';

/**
 * Compact slider that scales the top-row tab buttons.
 * Persists to localStorage and updates instantly via a window event.
 */
export const TabSizeSlider: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { scale, setScale, min, max } = useTabSize();
  const pct = Math.round(scale * 100);

  return (
    <div
      className={`flex items-center gap-2 px-2 py-1 rounded-md border border-border bg-background/50 ${className}`}
      title="Resize the top tab buttons"
    >
      <Type className="w-3 h-3 text-amber" />
      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground hidden sm:inline">
        Tab size
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={0.05}
        value={scale}
        onChange={(e) => setScale(parseFloat(e.target.value))}
        className="w-24 accent-amber cursor-pointer"
        aria-label="Tab size"
      />
      <span className="text-[10px] font-mono tabular-nums text-amber w-9 text-right">{pct}%</span>
    </div>
  );
};

export default TabSizeSlider;
