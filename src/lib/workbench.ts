// Floating Workbench persistence (localStorage only, per-rep).
import { getPortalProfile } from "@/lib/portalAuth";

export type WidgetSize = "sm" | "md" | "lg" | "xl";
export type WidgetEntry = { toolId: string; collapsed?: boolean; size?: WidgetSize };
export type WorkbenchLayout = { name: string; stack: WidgetEntry[] };

function ns(): string {
  const p = getPortalProfile();
  const hasAdmin = typeof localStorage !== "undefined" && !!localStorage.getItem("aetheris_admin_token");
  const code = p?.code || (hasAdmin ? "admin" : null) || "anon";
  return `workbench.${code}`;
}

function legacyAdminNs(): string | null {
  if (typeof localStorage === "undefined" || getPortalProfile()) return null;
  const token = localStorage.getItem("aetheris_admin_token");
  return token ? `workbench.${token.slice(-8)}` : null;
}

const STACK = () => `${ns()}.stack`;
const LAYOUTS = () => `${ns()}.layouts`;
const ACTIVE = () => `${ns()}.activeLayout`;
const OPEN = () => `${ns()}.open`;
const WIDTH = () => `${ns()}.width`;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
function readWithLegacy<T>(key: string, legacyKey: string | null, fallback: T): T {
  const value = read<T>(key, fallback);
  if (JSON.stringify(value) !== JSON.stringify(fallback) || !legacyKey) return value;
  return read<T>(legacyKey, fallback);
}
function write<T>(key: string, value: T) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export const wb = {
  getStack: (): WidgetEntry[] => readWithLegacy<WidgetEntry[]>(STACK(), legacyAdminNs() ? `${legacyAdminNs()}.stack` : null, []),
  setStack: (s: WidgetEntry[]) => write(STACK(), s),
  getLayouts: (): WorkbenchLayout[] => readWithLegacy<WorkbenchLayout[]>(LAYOUTS(), legacyAdminNs() ? `${legacyAdminNs()}.layouts` : null, []),
  setLayouts: (l: WorkbenchLayout[]) => write(LAYOUTS(), l),
  upsertLayout: (name: string, stack: WidgetEntry[]) => {
    const layouts = read<WorkbenchLayout[]>(LAYOUTS(), []);
    const cleanStack = stack.map(w => ({ ...w }));
    const next = layouts.some(l => l.name === name)
      ? layouts.map(l => l.name === name ? { name, stack: cleanStack } : l)
      : [...layouts, { name, stack: cleanStack }];
    write(LAYOUTS(), next);
    return next;
  },
  getActive: (): string => readWithLegacy<string>(ACTIVE(), legacyAdminNs() ? `${legacyAdminNs()}.activeLayout` : null, "default"),
  setActive: (n: string) => write(ACTIVE(), n),
  getOpen: (): boolean => readWithLegacy<boolean>(OPEN(), legacyAdminNs() ? `${legacyAdminNs()}.open` : null, false),
  setOpen: (o: boolean) => write(OPEN(), o),
  getWidth: (): "sm" | "md" | "lg" | "full" => readWithLegacy(WIDTH(), legacyAdminNs() ? `${legacyAdminNs()}.width` : null, "md"),
  setWidth: (w: "sm" | "md" | "lg" | "full") => write(WIDTH(), w),
};
