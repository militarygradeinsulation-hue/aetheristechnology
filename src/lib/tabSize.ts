import { useEffect, useState, useCallback } from 'react';

const KEY = 'ui.tabSize.v1';
const MIN = 0.85;
const MAX = 1.8;
const DEFAULT = 1;

const read = (): number => {
  try {
    const v = parseFloat(localStorage.getItem(KEY) || '');
    if (!isNaN(v) && v >= MIN && v <= MAX) return v;
  } catch {}
  return DEFAULT;
};

export function useTabSize() {
  const [scale, setScaleState] = useState<number>(read);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setScaleState(read());
    };
    const onCustom = () => setScaleState(read());
    window.addEventListener('storage', onStorage);
    window.addEventListener('tabsize:changed', onCustom);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('tabsize:changed', onCustom);
    };
  }, []);

  const setScale = useCallback((v: number) => {
    const clamped = Math.max(MIN, Math.min(MAX, v));
    try { localStorage.setItem(KEY, String(clamped)); } catch {}
    setScaleState(clamped);
    try { window.dispatchEvent(new Event('tabsize:changed')); } catch {}
  }, []);

  return { scale, setScale, min: MIN, max: MAX };
}

/** Inline style to apply to each tab Button so it scales with the slider. */
export function tabButtonStyle(scale: number): React.CSSProperties {
  return {
    height: `${Math.round(40 * scale)}px`,
    paddingLeft: `${Math.round(16 * scale)}px`,
    paddingRight: `${Math.round(16 * scale)}px`,
    fontSize: `${(14 * scale).toFixed(2)}px`,
    lineHeight: 1.1,
  };
}

export function tabIconSize(scale: number): number {
  return Math.round(16 * scale);
}
