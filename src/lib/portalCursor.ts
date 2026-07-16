// Per-rep cursor preference for the portal. Persisted in localStorage,
// keyed per rep code so each rep can pick their own pointer.
import { useSyncExternalStore } from 'react';
import { getPortalProfile } from './portalAuth';

export type CursorStyle = 'default' | 'amber' | 'magnifier';

export const CURSOR_OPTIONS: { id: CursorStyle; label: string; description: string }[] = [
  { id: 'default', label: 'Basic pointer', description: 'Standard system cursor' },
  { id: 'amber', label: 'Amber pointer', description: 'High-visibility colored cursor' },
  { id: 'magnifier', label: 'Magnifying glass', description: 'Detective-mode magnifier cursor' },
];

function identifier(): string {
  try {
    const p = getPortalProfile();
    if (p?.code) return `rep:${p.code}`;
  } catch {}
  return 'admin';
}

function storageKey(): string {
  return `aetheris_portalcursor_${identifier()}`;
}

function read(): CursorStyle {
  try {
    const raw = localStorage.getItem(storageKey());
    if (raw === 'amber' || raw === 'magnifier' || raw === 'default') return raw;
  } catch {}
  return 'default';
}

const listeners = new Set<() => void>();
function emit() { listeners.forEach(l => l()); }

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('aetheris_portalcursor_')) emit();
  });
}

function subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }
function snapshot(): string { try { return localStorage.getItem(storageKey()) || 'default'; } catch { return 'default'; } }

export function usePortalCursor() {
  useSyncExternalStore(subscribe, snapshot, () => 'default');
  const style = read();
  return {
    style,
    setStyle: (v: CursorStyle) => {
      try { localStorage.setItem(storageKey(), v); } catch {}
      emit();
    },
    className: style === 'default' ? '' : `portal-cursor-${style}`,
  };
}
