// Easy Mode + per-tab text/button size scaling.
// Setting is persisted in localStorage, keyed per rep code (or 'admin').
// - Easy Mode = global on/off (simpler labels via <EasyText/>, plainer helper text).
// - Size = per-tab zoom multiplier (0.85 → 1.5).
import { useSyncExternalStore } from 'react';
import { getPortalProfile } from './portalAuth';

interface EasyState {
  easy: boolean;
  sizes: Record<string, number>;
}

function identifier(): string {
  try {
    const p = getPortalProfile();
    if (p?.code) return `rep:${p.code}`;
  } catch {}
  return 'admin';
}

function storageKey(): string {
  return `aetheris_easymode_${identifier()}`;
}

function read(): EasyState {
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return { easy: false, sizes: {} };
    const p = JSON.parse(raw);
    return { easy: !!p.easy, sizes: p.sizes || {} };
  } catch {
    return { easy: false, sizes: {} };
  }
}

const listeners = new Set<() => void>();
function emit() { listeners.forEach(l => l()); }

function write(next: EasyState) {
  try { localStorage.setItem(storageKey(), JSON.stringify(next)); } catch {}
  emit();
}

// Cross-tab sync
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('aetheris_easymode_')) emit();
  });
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}
function snapshot(): string {
  try { return localStorage.getItem(storageKey()) || ''; } catch { return ''; }
}

export function useEasyMode() {
  useSyncExternalStore(subscribe, snapshot, () => '');
  const state = read();
  return {
    easy: state.easy,
    setEasy: (v: boolean) => write({ ...state, easy: v }),
    sizeFor: (tab: string) => state.sizes[tab] || 1,
    setSize: (tab: string, scale: number) => {
      const clamped = Math.max(0.85, Math.min(1.5, scale));
      write({ ...state, sizes: { ...state.sizes, [tab]: clamped } });
    },
    resetSize: (tab: string) => {
      const { [tab]: _drop, ...rest } = state.sizes;
      write({ ...state, sizes: rest });
    },
  };
}

/** Returns the "easy" string when Easy Mode is on, otherwise the normal one. */
export function useEasyText(easy: string, normal: string): string {
  const { easy: isEasy } = useEasyMode();
  return isEasy && easy ? easy : normal;
}
