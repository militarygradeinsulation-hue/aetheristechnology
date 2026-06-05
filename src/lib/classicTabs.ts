import { useEffect, useState, useCallback } from 'react';

const KEY = 'admin.tabsClassic.v1';
const EVT = 'classictabs:changed';

const read = (): boolean => {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
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
