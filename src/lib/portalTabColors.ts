import { useEffect, useState, useCallback } from 'react';

export type TabColorMode = 'uniform' | 'rainbow';

const STORAGE_KEY = 'aetheris.portal.tabColorMode';

// Distinct color sets — each entry is [activeClasses, idleClasses].
// Using arbitrary tailwind palette (not semantic tokens) intentionally since
// this is an opt-in visual personalization toggle.
const PALETTE: Array<[string, string]> = [
  ['bg-amber text-background hover:bg-amber/90 border-amber',
   'border-amber/40 text-amber hover:bg-amber/10 hover:text-amber'],
  ['bg-sky-500 text-white hover:bg-sky-500/90 border-sky-400',
   'border-sky-400/40 text-sky-300 hover:bg-sky-500/10 hover:text-sky-200'],
  ['bg-emerald-500 text-white hover:bg-emerald-500/90 border-emerald-400',
   'border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/10 hover:text-emerald-200'],
  ['bg-fuchsia-500 text-white hover:bg-fuchsia-500/90 border-fuchsia-400',
   'border-fuchsia-400/40 text-fuchsia-300 hover:bg-fuchsia-500/10 hover:text-fuchsia-200'],
  ['bg-rose-500 text-white hover:bg-rose-500/90 border-rose-400',
   'border-rose-400/40 text-rose-300 hover:bg-rose-500/10 hover:text-rose-200'],
  ['bg-violet-500 text-white hover:bg-violet-500/90 border-violet-400',
   'border-violet-400/40 text-violet-300 hover:bg-violet-500/10 hover:text-violet-200'],
  ['bg-cyan-500 text-background hover:bg-cyan-500/90 border-cyan-400',
   'border-cyan-400/40 text-cyan-300 hover:bg-cyan-500/10 hover:text-cyan-200'],
  ['bg-lime-500 text-background hover:bg-lime-500/90 border-lime-400',
   'border-lime-400/40 text-lime-300 hover:bg-lime-500/10 hover:text-lime-200'],
  ['bg-orange-500 text-white hover:bg-orange-500/90 border-orange-400',
   'border-orange-400/40 text-orange-300 hover:bg-orange-500/10 hover:text-orange-200'],
  ['bg-pink-500 text-white hover:bg-pink-500/90 border-pink-400',
   'border-pink-400/40 text-pink-300 hover:bg-pink-500/10 hover:text-pink-200'],
];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function getTabColorClasses(key: string, active: boolean, mode: TabColorMode): string {
  const pair = mode === 'rainbow' ? PALETTE[hash(key) % PALETTE.length] : PALETTE[0];
  return active ? pair[0] : pair[1];
}

export function useTabColorMode(): { mode: TabColorMode; toggle: () => void; setMode: (m: TabColorMode) => void } {
  const [mode, setModeState] = useState<TabColorMode>(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      return v === 'rainbow' ? 'rainbow' : 'uniform';
    } catch { return 'uniform'; }
  });

  const setMode = useCallback((m: TabColorMode) => {
    setModeState(m);
    try { localStorage.setItem(STORAGE_KEY, m); } catch {}
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setModeState(e.newValue === 'rainbow' ? 'rainbow' : 'uniform');
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggle = useCallback(() => setMode(mode === 'rainbow' ? 'uniform' : 'rainbow'), [mode, setMode]);
  return { mode, toggle, setMode };
}
