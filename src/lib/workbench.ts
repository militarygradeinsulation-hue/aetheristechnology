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
function write<T>(key: string, value: T) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export const wb = {
  getStack: (): WidgetEntry[] => read<WidgetEntry[]>(STACK(), []),
  setStack: (s: WidgetEntry[]) => write(STACK(), s),
  getLayouts: (): WorkbenchLayout[] => read<WorkbenchLayout[]>(LAYOUTS(), []),
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
  getActive: (): string => read<string>(ACTIVE(), "default"),
  setActive: (n: string) => write(ACTIVE(), n),
  getOpen: (): boolean => read<boolean>(OPEN(), false),
  setOpen: (o: boolean) => write(OPEN(), o),
  getWidth: (): "sm" | "md" | "lg" | "full" => read(WIDTH(), "md"),
  setWidth: (w: "sm" | "md" | "lg" | "full") => write(WIDTH(), w),
};
