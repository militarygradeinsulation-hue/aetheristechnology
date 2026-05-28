import React, { useEffect, useMemo, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Wrench, Plus, Save, Trash2, Maximize2, Minimize2, X, HelpCircle, GripVertical, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { wb, type WidgetEntry, type WorkbenchLayout } from "@/lib/workbench";
import { TOOL_REGISTRY, type ToolGroup } from "./toolRegistry";
import { WorkbenchWidget } from "./WorkbenchWidget";
import { hasValidPortalSession } from "@/lib/portalAuth";
import { hasValidAdminToken } from "@/lib/adminAuth";
import { useToast } from "@/hooks/use-toast";

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
  const [open, setOpen] = useState(false);
  const [stack, setStack] = useState<WidgetEntry[]>([]);
  const [layouts, setLayouts] = useState<WorkbenchLayout[]>([]);
  const [active, setActive] = useState("default");
  const [width, setWidth] = useState<"sm" | "md" | "lg" | "full">("md");
  const [saveName, setSaveName] = useState("");
  const dragIndex = useRef<number | null>(null);

  // Determine visibility (staff/admin/rep only) and recheck on storage changes.
  useEffect(() => {
    const check = () => setVisible(hasValidPortalSession() || hasValidAdminToken());
    check();
    window.addEventListener("storage", check);
    const t = setInterval(check, 5000);
    return () => { window.removeEventListener("storage", check); clearInterval(t); };
  }, []);

  // Load persisted state once visibility is known.
  useEffect(() => {
    if (!visible) return;
    setStack(wb.getStack());
    setLayouts(wb.getLayouts());
    setActive(wb.getActive());
    setWidth(wb.getWidth());
    setOpen(wb.getOpen());
  }, [visible]);

  useEffect(() => { if (visible) wb.setStack(stack); }, [stack, visible]);
  useEffect(() => { if (visible) wb.setLayouts(layouts); }, [layouts, visible]);
  useEffect(() => { if (visible) wb.setActive(active); }, [active, visible]);
  useEffect(() => { if (visible) wb.setWidth(width); }, [width, visible]);
  useEffect(() => { if (visible) wb.setOpen(open); }, [open, visible]);

  const grouped = useMemo(() => {
    const g: Record<ToolGroup, typeof TOOL_REGISTRY> = {
      Outreach: [], Diagnostics: [], Content: [], Briefs: [],
    };
    TOOL_REGISTRY.forEach(t => g[t.group].push(t));
    return g;
  }, []);

  const addTool = (toolId: string) => {
    if (stack.some(s => s.toolId === toolId)) {
      toast({ title: "Already in workbench", description: "Scroll to find it." });
      return;
    }
    setStack(s => [...s, { toolId, collapsed: false, size: "md" }]);
  };
  const removeAt = (idx: number) => setStack(s => s.filter((_, i) => i !== idx));
  const toggleAt = (idx: number) =>
    setStack(s => s.map((w, i) => i === idx ? { ...w, collapsed: !w.collapsed } : w));
  const cycleSizeAt = (idx: number) => {
    const order: Array<"sm" | "md" | "lg" | "xl"> = ["sm", "md", "lg", "xl"];
    setStack(s => s.map((w, i) => {
      if (i !== idx) return w;
      const cur = (w.size || "md") as "sm" | "md" | "lg" | "xl";
      return { ...w, size: order[(order.indexOf(cur) + 1) % order.length] };
    }));
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
    setStack(s => {
      const next = [...s];
      const [moved] = next.splice(from, 1);
      next.splice(idx, 0, moved);
      return next;
    });
  };

  const applyLayout = (name: string) => {
    setActive(name);
    if (name === "default") { setStack([]); return; }
    const l = layouts.find(x => x.name === name);
    if (l) setStack(l.stack);
  };
  const saveLayout = () => {
    const name = saveName.trim();
    if (!name) { toast({ title: "Name required", variant: "destructive" }); return; }
    if (name === "default") { toast({ title: "Reserved name", variant: "destructive" }); return; }
    setLayouts(ls => {
      const exists = ls.some(l => l.name === name);
      return exists ? ls.map(l => l.name === name ? { name, stack } : l) : [...ls, { name, stack }];
    });
    setActive(name);
    setSaveName("");
    toast({ title: `Saved layout "${name}"` });
  };
  const deleteLayout = (name: string) => {
    if (!confirm(`Delete layout "${name}"?`)) return;
    setLayouts(ls => ls.filter(l => l.name !== name));
    if (active === name) { setActive("default"); setStack([]); }
  };

  const cycleWidth = () => {
    const i = widthOrder.indexOf(width);
    setWidth(widthOrder[(i + 1) % widthOrder.length]);
  };

  if (!visible) return null;

  return (
    <>
      {/* Floating launcher */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-[60] h-12 px-4 rounded-full bg-amber text-background font-mono text-xs uppercase tracking-wider font-semibold shadow-[0_8px_32px_rgba(0,0,0,0.45)] hover:scale-105 transition-transform flex items-center gap-2"
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

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className={`${widthClass[width]} w-full p-0 flex flex-col bg-background border-l border-amber/20`}
        >
          <SheetHeader className="px-4 py-3 border-b border-border/40 bg-card/40">
            <div className="flex items-center justify-between gap-2">
              <SheetTitle className="font-display flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber" />
                Workbench
              </SheetTitle>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={cycleWidth} title={`Width: ${width}`}>
                  {width === "full" ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap pt-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="h-8 bg-amber text-background hover:bg-amber/90">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add tool
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 max-h-[60vh] overflow-y-auto" align="start">
                  {(Object.keys(grouped) as ToolGroup[]).map(group => grouped[group].length > 0 && (
                    <React.Fragment key={group}>
                      <DropdownMenuLabel className="text-amber font-mono text-[10px] uppercase tracking-wider">
                        {group}
                      </DropdownMenuLabel>
                      {grouped[group].map(t => {
                        const Icon = t.icon;
                        const already = stack.some(s => s.toolId === t.id);
                        return (
                          <DropdownMenuItem
                            key={t.id}
                            disabled={already}
                            onClick={() => addTool(t.id)}
                            className="gap-2"
                          >
                            <Icon className="w-3.5 h-3.5 text-amber" />
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
                <SelectContent>
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
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {stack.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground font-mono">
                Empty workbench. Click <span className="text-amber">+ Add tool</span> to stack widgets.
              </div>
            ) : (
              stack.map((w, idx) => (
                <WorkbenchWidget
                  key={w.toolId}
                  toolId={w.toolId}
                  collapsed={!!w.collapsed}
                  onToggle={() => toggleAt(idx)}
                  onRemove={() => removeAt(idx)}
                  onDragStart={onDragStart(idx)}
                  onDragOver={onDragOver}
                  onDrop={onDrop(idx)}
                />
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default FloatingWorkbench;
