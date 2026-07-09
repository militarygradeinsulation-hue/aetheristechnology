import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Wrench, Plus, Save, Trash2, X, HelpCircle, GripVertical, ChevronDown, ExternalLink } from "lucide-react";
import { wb, type WidgetEntry, type WorkbenchLayout } from "@/lib/workbench";
import { TOOL_REGISTRY, type ToolGroup } from "./toolRegistry";
import { WorkbenchWidget } from "./WorkbenchWidget";
import { hasValidPortalSession, getPortalProfile } from "@/lib/portalAuth";
import { hasValidAdminToken } from "@/lib/adminAuth";
import { useToast } from "@/hooks/use-toast";
import { PinnableFloater } from "@/components/ui/PinnableFloater";
import { useActiveLead, clearActiveLead } from "@/lib/activeLead";

// Reps see ONLY the Golden Report. Admin (Joseph), Dean (482917), and
// Braden (963169) keep the full workbench. Everyone else is locked to
// forensic-scan-all so their demo portal stays front-and-center on the
// one tool that matters.
const GOLDEN_ONLY_TOOL_ID = "forensic-scan-all";
const FULL_ACCESS_REP_CODES = new Set(["482917", "963169"]);
function isRepRestrictedToGolden(): boolean {
  if (hasValidAdminToken()) return false;
  const p = getPortalProfile();
  if (!p) return false;
  if (FULL_ACCESS_REP_CODES.has(p.code)) return false;
  return true;
}

// Widths applied at ALL viewports (no sm: prefix) so mobile users can
// resize too. Sheet base has w-3/4 + sm:max-w-sm — we override both via
// tailwind-merge by passing these in className.
const widthClass: Record<"sm" | "md" | "lg" | "full", string> = {
  sm:   "w-full max-w-md sm:max-w-md",
  md:   "w-full max-w-2xl sm:max-w-2xl",
  lg:   "w-full max-w-4xl sm:max-w-4xl",
  full: "w-screen max-w-[100vw] sm:max-w-[100vw]",
};
const widthOrder: Array<"sm" | "md" | "lg" | "full"> = ["sm", "md", "lg", "full"];

export const FloatingWorkbench: React.FC = () => {
  const { toast } = useToast();
  const [visible, setVisible] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [restricted, setRestricted] = useState(false);
  const [open, setOpen] = useState(false);
  const [stack, setStack] = useState<WidgetEntry[]>([]);
  const [layouts, setLayouts] = useState<WorkbenchLayout[]>([]);
  const [active, setActive] = useState("default");
  const [width, setWidth] = useState<"sm" | "md" | "lg" | "full">("md");
  const [saveName, setSaveName] = useState("");
  const [showTips, setShowTips] = useState(false);
  const dragIndex = useRef<number | null>(null);
  const hydrated = useRef(false);
  const activeLead = useActiveLead();


  // Determine visibility (staff/admin/rep only) and recheck on storage changes.
  // Only ever appear on portal/admin routes — never on the public site,
  // even if a stale portal session is still in localStorage.
  const isBackendRoute = () => {
    if (typeof window === "undefined") return false;
    const p = window.location.pathname;
    return p.startsWith("/admin")
        || p.startsWith("/portal")
        || p.startsWith("/partner-portal")
        || p.startsWith("/rep-portal")
        || p.startsWith("/app");
  };

  useEffect(() => {
    const check = () => {
      const admin = hasValidAdminToken();
      setIsAdmin(admin);
      setRestricted(isRepRestrictedToGolden());
      setVisible(isBackendRoute() && (hasValidPortalSession() || admin));
    };
    check();
    const openHandler = () => { setVisible(true); setOpen(true); };
    window.addEventListener("storage", check);
    window.addEventListener("popstate", check);
    window.addEventListener("workbench:toggle", openHandler);
    const t = setInterval(check, 1500);
    return () => {
      window.removeEventListener("storage", check);
      window.removeEventListener("popstate", check);
      window.removeEventListener("workbench:toggle", openHandler);
      clearInterval(t);
    };
  }, []);


  // Load persisted state once visibility is known. Mark hydrated AFTER load
  // so the write effects below don't clobber saved values with initial defaults.
  useEffect(() => {
    if (!visible) return;
    if (restricted) {
      // Restricted reps: only Golden Report, always pinned, panel open.
      const goldenStack: WidgetEntry[] = [{ toolId: GOLDEN_ONLY_TOOL_ID, collapsed: false, size: "lg" }];
      setStack(goldenStack);
      setLayouts([]);
      setActive("default");
      setWidth("lg");
      setOpen(true);
      hydrated.current = true;
      return;
    }
    setStack(wb.getStack());
    setLayouts(wb.getLayouts());
    setActive(wb.getActive());
    setWidth(wb.getWidth());
    setOpen(wb.getOpen());
    hydrated.current = true;
  }, [visible, restricted]);


  useEffect(() => { if (hydrated.current && !restricted) wb.setStack(stack); }, [stack, restricted]);
  useEffect(() => { if (hydrated.current && !restricted) wb.setLayouts(layouts); }, [layouts, restricted]);
  useEffect(() => { if (hydrated.current && !restricted) wb.setActive(active); }, [active, restricted]);
  useEffect(() => { if (hydrated.current && !restricted) wb.setWidth(width); }, [width, restricted]);
  useEffect(() => { if (hydrated.current && !restricted) wb.setOpen(open); }, [open, restricted]);


  const grouped = useMemo(() => {
    const g: Record<ToolGroup, typeof TOOL_REGISTRY> = {
      Outreach: [], Diagnostics: [], Content: [], Briefs: [],
    };
    const source = restricted
      ? TOOL_REGISTRY.filter(t => t.id === GOLDEN_ONLY_TOOL_ID)
      : TOOL_REGISTRY;
    source.forEach(t => g[t.group].push(t));
    return g;
  }, [restricted]);

  const persistStack = (next: WidgetEntry[]) => {
    if (restricted) return; // Reps can't reshape the stack.
    wb.setStack(next);
    if (active !== "default") {
      setLayouts(wb.upsertLayout(active, next));
    }
    setStack(next);
  };

  const addTool = (toolId: string) => {
    if (restricted && toolId !== GOLDEN_ONLY_TOOL_ID) return;
    if (stack.some(s => s.toolId === toolId)) {
      toast({ title: "Already in workbench", description: "Scroll to find it." });
      return;
    }
    const next = [...stack, { toolId, collapsed: false, size: "md" as const }];
    persistStack(next);
  };
  const removeAt = (idx: number) => {
    if (restricted) return; // Golden Report stays pinned.
    const next = stack.filter((_, i) => i !== idx);
    persistStack(next);
  };

  const toggleAt = (idx: number) => {
    const next = stack.map((w, i) => i === idx ? { ...w, collapsed: !w.collapsed } : w);
    persistStack(next);
  };
  const cycleSizeAt = (idx: number) => {
    const order: Array<"sm" | "md" | "lg" | "xl"> = ["sm", "md", "lg", "xl"];
    const next = stack.map((w, i) => {
      if (i !== idx) return w;
      const cur = (w.size || "md") as "sm" | "md" | "lg" | "xl";
      return { ...w, size: order[(order.indexOf(cur) + 1) % order.length] };
    });
    persistStack(next);
  };

  const onDragStart = (idx: number) => (e: React.DragEvent) => {
    dragIndex.current = idx;
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };
  const onDrop = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from === null || from === idx) return;
    const next = [...stack];
    const [moved] = next.splice(from, 1);
    next.splice(idx, 0, moved);
    persistStack(next);
  };

  const applyLayout = (name: string) => {
    wb.setActive(name);
    setActive(name);
    if (name === "default") { wb.setStack([]); setStack([]); return; }
    const l = layouts.find(x => x.name === name);
    if (l) { wb.setStack(l.stack); setStack(l.stack); }
  };
  const saveLayout = () => {
    const name = saveName.trim();
    if (!name) { toast({ title: "Name required", variant: "destructive" }); return; }
    if (name === "default") { toast({ title: "Reserved name", variant: "destructive" }); return; }
    const nextLayouts = wb.upsertLayout(name, stack);
    wb.setActive(name);
    wb.setStack(stack);
    setLayouts(nextLayouts);
    setActive(name);
    setSaveName("");
    toast({ title: `Force-saved layout "${name}"`, description: "It will reload after closing, routing, or refreshing." });
  };
  const deleteLayout = (name: string) => {
    if (!confirm(`Delete layout "${name}"?`)) return;
    const next = layouts.filter(l => l.name !== name);
    wb.setLayouts(next);
    setLayouts(next);
    if (active === name) { wb.setActive("default"); wb.setStack([]); setActive("default"); setStack([]); }
  };

  const cycleWidth = () => {
    const i = widthOrder.indexOf(width);
    setWidth(widthOrder[(i + 1) % widthOrder.length]);
  };

  if (!visible) return null;

  return (
    <>
      {/* Floating launcher — hidden for admin (Joseph opens via tab/button) */}
      {!open && !isAdmin && (
        <PinnableFloater storageKey="floater.workbench.launcher" defaultCorner="bottom-right" width={160} height={48} zIndex={60}>
          <button
            onClick={() => setOpen(true)}
            className="h-12 px-4 rounded-full bg-amber text-background font-mono text-xs uppercase tracking-wider font-semibold shadow-[0_8px_32px_rgba(0,0,0,0.45)] hover:scale-105 transition-transform flex items-center gap-2"
            title="Open Workbench"
            aria-label="Open Workbench"
          >
            <Wrench className="w-4 h-4" />
            Workbench
            {stack.length > 0 && (
              <span className="ml-1 bg-background/20 text-background rounded-full px-1.5 py-0.5 text-[10px]">
                {stack.length}
              </span>
            )}
          </button>
        </PinnableFloater>
      )}

      {/* Backdrop (only when open) — click to close, work stays mounted */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm"
          aria-hidden="true"
        />
      )}

      {/*
        Persistent panel — always mounted so tool state survives close/open.
        We slide it offscreen via translate-x when closed instead of unmounting.
      */}
      <aside
        className={`fixed top-0 right-0 z-[80] h-screen ${widthClass[width]} bg-background border-l border-amber/20 shadow-2xl flex flex-col transition-transform duration-300 ease-out ${open ? "translate-x-0" : "translate-x-full pointer-events-none"}`}
        aria-hidden={!open}
      >
          <div className="px-4 py-3 border-b border-border/40 bg-card/40">
            <div className="flex items-center justify-between gap-2">
              {restricted ? (
                <div className="space-y-1">
                  <p className="font-case text-[10px] uppercase tracking-[0.2em] text-amber">
                    Demo Portal · One Tool
                  </p>
                  <h2 className="font-forensic text-xl italic font-bold tracking-tight">
                    Golden Report
                  </h2>
                </div>
              ) : (
                <h2 className="font-display flex items-center gap-2 text-lg font-semibold">
                  <Wrench className="w-4 h-4 text-amber" />
                  Workbench
                </h2>
              )}
              <div className="flex items-center gap-1">
                {!restricted && (
                  <>
                    <Select value={width} onValueChange={(v) => setWidth(v as typeof width)}>
                      <SelectTrigger className="h-8 w-[88px]" title="Panel width">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[100]">
                        <SelectItem value="sm">Small</SelectItem>
                        <SelectItem value="md">Medium</SelectItem>
                        <SelectItem value="lg">Large</SelectItem>
                        <SelectItem value="full">Full</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8"
                      onClick={() => setShowTips(t => !t)}
                      title="How the Workbench works"
                    >
                      <HelpCircle className={`w-4 h-4 ${showTips ? "text-amber" : ""}`} />
                    </Button>
                  </>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(false)} title="Hide (keeps work)">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {activeLead && (
              <div className="mt-2 flex items-center gap-2 rounded-md border border-amber/40 bg-amber/10 px-2 py-1.5 text-[11px]">
                <span className="font-mono uppercase tracking-wider text-amber">Active Lead</span>
                <span className="truncate text-foreground font-semibold">
                  {activeLead.business_name || activeLead.website || activeLead.contact_name || activeLead.leadId.slice(0, 8)}
                </span>
                {activeLead.website && (
                  <span className="truncate text-muted-foreground hidden sm:inline">· {activeLead.website}</span>
                )}
                <span className="ml-auto text-muted-foreground hidden md:inline">Tools auto-fill</span>
                <button
                  onClick={clearActiveLead}
                  className="text-muted-foreground hover:text-foreground"
                  title="Clear active lead"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}


            {!restricted && (
            <div className="flex items-center gap-2 flex-wrap pt-2">

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="h-8 bg-amber text-background hover:bg-amber/90">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add tool
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 max-h-[60vh] overflow-y-auto z-[100]" align="start">
                  {(Object.keys(grouped) as ToolGroup[]).map(group => grouped[group].length > 0 && (
                    <React.Fragment key={group}>
                      <DropdownMenuLabel className="text-amber font-mono text-[10px] uppercase tracking-wider">
                        {group}
                      </DropdownMenuLabel>
                      {grouped[group].map(t => {
                        const Icon = t.icon;
                        const already = stack.some(s => s.toolId === t.id);
                        const accent = `hsl(${t.accent})`;
                        return (
                          <DropdownMenuItem
                            key={t.id}
                            disabled={already}
                            onClick={() => addTool(t.id)}
                            className="gap-2 border-l-2"
                            style={{ borderLeftColor: accent }}
                          >
                            <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
                            <span className="flex-1">{t.label}</span>
                            {already && <span className="text-[10px] text-muted-foreground">added</span>}
                          </DropdownMenuItem>
                        );
                      })}

                      <DropdownMenuSeparator />
                    </React.Fragment>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Select value={active} onValueChange={applyLayout}>
                <SelectTrigger className="h-8 w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[100]">
                  <SelectItem value="default">Default (empty)</SelectItem>
                  {layouts.map(l => <SelectItem key={l.name} value={l.name}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-1">
                <Input
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  placeholder="Layout name"
                  className="h-8 w-[140px]"
                />
                <Button size="sm" variant="outline" className="h-8" onClick={saveLayout} title="Save current as layout">
                  <Save className="w-3.5 h-3.5" />
                </Button>
                {active !== "default" && (
                  <Button size="sm" variant="ghost" className="h-8" onClick={() => deleteLayout(active)} title="Delete layout">
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
            )}

          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {showTips && (
              <div className="forensic-tile rounded-lg p-4 border border-amber/30 bg-amber/5">
                <div className="flex items-center gap-2 mb-2">
                  <HelpCircle className="w-4 h-4 text-amber" />
                  <h3 className="font-display text-sm font-semibold">How the Workbench works</h3>
                </div>
                <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-5">
                  <li><span className="text-foreground font-semibold">Add tool</span> stacks any tool as a widget. Multiple tools can run side by side.</li>
                  <li><span className="text-foreground font-semibold">Panel width</span> (Small/Medium/Large/Full) resizes the whole Workbench drawer.</li>
                  <li>Each widget has its own <span className="text-amber font-mono">S / M / L / XL</span> button — that controls how tall the widget body is before it scrolls.</li>
                  <li>Drag the <GripVertical className="inline w-3 h-3 -mt-0.5" /> grip handle to reorder widgets.</li>
                  <li><ChevronDown className="inline w-3 h-3 -mt-0.5" /> collapses a widget so you can keep many tools loaded without scrolling forever.</li>
                  <li><ExternalLink className="inline w-3 h-3 -mt-0.5" /> opens the tool's dedicated full-page version in a new view.</li>
                  <li><span className="text-foreground font-semibold">Layouts</span>: type a name and hit save — recall any saved combo of tools later from the dropdown.</li>
                  <li>Closing the Workbench just hides it — your tools, inputs, and outputs stay loaded until you remove them or refresh.</li>
                </ul>
                <button
                  onClick={() => setShowTips(false)}
                  className="mt-3 text-[10px] font-mono uppercase tracking-wider text-amber hover:underline"
                >
                  Got it — hide tips
                </button>
              </div>
            )}
            {stack.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground font-mono">
                Empty workbench. Click <span className="text-amber">+ Add tool</span> to stack widgets.
                <div className="mt-3">
                  <button onClick={() => setShowTips(true)} className="text-amber underline text-xs">
                    Show me how this works
                  </button>
                </div>
              </div>
            ) : (
              stack.map((w, idx) => (
                <WorkbenchWidget
                  key={w.toolId}
                  toolId={w.toolId}
                  collapsed={!!w.collapsed}
                  size={(w.size || "md") as "sm" | "md" | "lg" | "xl"}
                  onToggle={() => toggleAt(idx)}
                  onRemove={() => removeAt(idx)}
                  onCycleSize={() => cycleSizeAt(idx)}
                  onDragStart={onDragStart(idx)}
                  onDragOver={onDragOver}
                  onDrop={onDrop(idx)}
                />
              ))
            )}
          </div>
      </aside>
    </>
  );
};

export default FloatingWorkbench;
