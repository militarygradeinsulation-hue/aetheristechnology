import React, { useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas-pro';
import { X, Loader2 } from 'lucide-react';

interface Props {
  onCapture: (dataUrl: string) => void;
  onCancel: () => void;
}

/** Full-screen overlay that lets the user drag-select a rectangle of the page,
 *  then captures that region of the live DOM to a PNG dataUrl via html2canvas. */
export const ScreenSnip: React.FC<Props> = ({ onCapture, onCancel }) => {
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [end, setEnd] = useState<{ x: number; y: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel, busy]);

  const rect = (() => {
    if (!start || !end) return null;
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const w = Math.abs(end.x - start.x);
    const h = Math.abs(end.y - start.y);
    return { x, y, w, h };
  })();

  const onDown = (e: React.MouseEvent) => {
    if (busy) return;
    setStart({ x: e.clientX, y: e.clientY });
    setEnd({ x: e.clientX, y: e.clientY });
  };
  const onMove = (e: React.MouseEvent) => {
    if (!start || busy) return;
    setEnd({ x: e.clientX, y: e.clientY });
  };
  const onUp = async () => {
    if (!rect || rect.w < 8 || rect.h < 8 || busy) {
      setStart(null);
      setEnd(null);
      return;
    }
    setBusy(true);
    try {
      // Hide the overlay so it isn't captured.
      if (overlayRef.current) overlayRef.current.style.display = 'none';
      await new Promise((r) => requestAnimationFrame(r));

      const scrollX = window.scrollX;
      const scrollY = window.scrollY;
      const canvas = await html2canvas(document.body, {
        x: rect.x + scrollX,
        y: rect.y + scrollY,
        width: rect.w,
        height: rect.h,
        backgroundColor: null,
        useCORS: true,
        logging: false,
        scale: Math.min(window.devicePixelRatio || 1, 2),
      });
      const dataUrl = canvas.toDataURL('image/png');
      onCapture(dataUrl);
    } catch (err) {
      console.error('ScreenSnip failed:', err);
      onCancel();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[10000] cursor-crosshair"
      style={{ background: 'rgba(0,0,0,0.35)' }}
      onMouseDown={onDown}
      onMouseMove={onMove}
      onMouseUp={onUp}
    >
      <div className="absolute top-4 left-1/2 -translate-x-1/2 glass border border-amber/40 rounded-full px-4 py-1.5 text-xs font-mono uppercase tracking-widest text-amber flex items-center gap-2 pointer-events-none">
        {busy ? (<><Loader2 className="w-3 h-3 animate-spin" /> Capturing…</>) : 'Drag to select an area · Esc to cancel'}
      </div>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onCancel(); }}
        className="absolute top-3 right-3 p-2 rounded-full bg-background/80 border border-border text-foreground hover:bg-background"
        aria-label="Cancel area selection"
      >
        <X className="w-4 h-4" />
      </button>
      {rect && (
        <div
          className="absolute border-2 border-amber bg-amber/10 pointer-events-none"
          style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
        />
      )}
    </div>
  );
};

export default ScreenSnip;
