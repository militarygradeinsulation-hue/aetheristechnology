import { useEffect, useState, useCallback } from 'react';

const KEY = 'admin.tabsClassic.v1';
const EVT = 'classictabs:changed';

// Classic flat tab row is now the default for all reps/partners. Users can
// still opt into category sections via the toggle, which persists their
// explicit choice ('0') in localStorage.
const read = (): boolean => {
  try {
    const v = localStorage.getItem(KEY);
    if (v === '1') return true;
    if (v === '0') return false;
    return true; // default ON
  } catch { return true; }
};

export function useClassicTabs() {
  const [classic, setClassicState] = useState<boolean>(read);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) setClassicState(read()); };
    const onCustom = () => setClassicState(read());
    window.addEventListener('storage', onStorage);
    window.addEventListener(EVT, onCustom);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(EVT, onCustom);
    };
  }, []);

  const setClassic = useCallback((v: boolean) => {
    try { localStorage.setItem(KEY, v ? '1' : '0'); } catch {}
    setClassicState(v);
    try { window.dispatchEvent(new Event(EVT)); } catch {}
  }, []);

  return { classic, setClassic, toggle: () => setClassic(!read()) };
}
