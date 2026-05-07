import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Layout, Save, Trash2, RotateCcw, Plus, Cloud, Pencil, LayoutGrid, List, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getAdminToken } from "@/lib/adminAuth";

type WidgetSize = 1 | 2 | 3 | 4;
type LayoutMode = "tabs" | "widgets";

interface SavedView {
  name: string;
  tabs: string[];
  layout?: LayoutMode;
  sizes?: Record<string, WidgetSize>;
}
const STORAGE_KEY = "admin.customViews.v1";
const ACTIVE_KEY = "admin.customViews.active";
const KV_KEY = "admin.customViews";

async function kvGet(): Promise<{ views: SavedView[]; active: string } | null> {
  const token = getAdminToken();
  if (!token) return null;
  try {
    const { data, error } = await supabase.functions.invoke("admin-kv", {
      body: { action: "get", key: KV_KEY },
      headers: { "x-admin-token": token },
    });
    if (error) return null;
    return (data?.value as any) || null;
  } catch { return null; }
}
async function kvSet(value: { views: SavedView[]; active: string }) {
  const token = getAdminToken();
  if (!token) return;
  try {
    await supabase.functions.invoke("admin-kv", {
      body: { action: "set", key: KV_KEY, value },
      headers: { "x-admin-token": token },
    });
  } catch {}
}

interface Props {
  allTabs: { key: string; label: string; icon?: React.ElementType }[];
  visibleTabs: string[];
  onChange: (tabs: string[]) => void;
  layout: LayoutMode;
  onLayoutChange: (l: LayoutMode) => void;
  widgetSizes: Record<string, WidgetSize>;
  onWidgetSizeChange: (key: string, size: WidgetSize) => void;
}

export const CustomViewSelector: React.FC<Props> = ({
  allTabs, visibleTabs, onChange, layout, onLayoutChange, widgetSizes, onWidgetSizeChange,
}) => {
  const { toast } = useToast();
  const [views, setViews] = useState<SavedView[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
  });
  const [active, setActive] = useState<string>(() => localStorage.getItem(ACTIVE_KEY) || "default");
  const [open, setOpen] = useState(false);
  const [editingName, setEditingName] = useState<string | null>(null); // null = create new, string = editing existing
  const [draft, setDraft] = useState<string[]>(visibleTabs);
  const [draftLayout, setDraftLayout] = useState<LayoutMode>(layout);
  const [draftSizes, setDraftSizes] = useState<Record<string, WidgetSize>>(widgetSizes);
  const [newName, setNewName] = useState("");

  const hydrated = useRef(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(views)); }, [views]);
  useEffect(() => { localStorage.setItem(ACTIVE_KEY, active); }, [active]);

  // Hydrate from cloud
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const remote = await kvGet();
      if (cancelled) return;
      if (remote && Array.isArray(remote.views)) {
        setViews(remote.views);
        const nextActive = remote.active || "default";
        setActive(nextActive);
        if (nextActive !== "default") {
          const v = remote.views.find(v => v.name === nextActive);
          if (v) applyViewLocal(v);
        }
      } else {
        if (active !== "default") {
          const v = views.find(v => v.name === active);
          if (v) applyViewLocal(v);
        }
        if (views.length > 0) await kvSet({ views, active });
      }
      hydrated.current = true;
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    setSyncing(true);
    kvSet({ views, active }).finally(() => setSyncing(false));
  }, [views, active]);

  const applyViewLocal = (v: SavedView) => {
    onChange(v.tabs);
    onLayoutChange(v.layout || "tabs");
    if (v.sizes) {
      Object.entries(v.sizes).forEach(([k, s]) => onWidgetSizeChange(k, s));
    }
  };

  const applyView = (name: string) => {
    setActive(name);
    if (name === "default") {
      onChange(allTabs.map(t => t.key));
      onLayoutChange("tabs");
      return;
    }
    const v = views.find(v => v.name === name);
    if (v) applyViewLocal(v);
  };

  const openCreate = () => {
    setEditingName(null);
    setNewName("");
    setDraft(visibleTabs);
    setDraftLayout(layout);
    setDraftSizes({ ...widgetSizes });
    setOpen(true);
  };

  const openEdit = (name: string) => {
    const v = views.find(v => v.name === name);
    if (!v) return;
    setEditingName(name);
    setNewName(name);
    setDraft(v.tabs);
    setDraftLayout(v.layout || "tabs");
    setDraftSizes(v.sizes || {});
    setOpen(true);
  };

  const saveView = () => {
    const finalName = newName.trim();
    if (!finalName) { toast({ title: "Name required", variant: "destructive" }); return; }
    if (finalName === "default") { toast({ title: "Reserved name", description: "Pick a different name.", variant: "destructive" }); return; }

    const newView: SavedView = { name: finalName, tabs: draft, layout: draftLayout, sizes: draftSizes };
    let next: SavedView[];
    if (editingName) {
      // Edit/rename existing
      next = views.map(v => v.name === editingName ? newView : v);
      // If renamed, update active marker
      if (active === editingName) setActive(finalName);
    } else {
      const exists = views.some(v => v.name === finalName);
      next = exists ? views.map(v => v.name === finalName ? newView : v) : [...views, newView];
    }
    setViews(next);
    setActive(finalName);
    applyViewLocal(newView);
    toast({ title: editingName ? "View updated" : "View saved" });
    setOpen(false);
    setEditingName(null);
    setNewName("");
  };

  const deleteView = (name: string) => {
    if (!confirm(`Delete view "${name}"?`)) return;
    setViews(views.filter(v => v.name !== name));
    if (active === name) applyView("default");
  };

  const toggleTab = (key: string) => {
    setDraft(d => d.includes(key) ? d.filter(k => k !== key) : [...d, key]);
  };

  const setDraftSize = (key: string, size: WidgetSize) => {
    setDraftSizes(s => ({ ...s, [key]: size }));
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Cloud className={`w-3 h-3 ${syncing ? "text-amber animate-pulse" : "text-muted-foreground/60"}`} aria-label={syncing ? "Syncing views…" : "Views synced"} />

      <Select value={active} onValueChange={applyView}>
        <SelectTrigger className="w-[200px] h-9">
          <Layout className="w-3 h-3 mr-1" />
          <SelectValue placeholder="View" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">Default (all tabs)</SelectItem>
          {views.map(v => <SelectItem key={v.name} value={v.name}>{v.name}{v.layout === "widgets" ? " · widgets" : ""}</SelectItem>)}
        </SelectContent>
      </Select>

      {/* Layout toggle */}
      <div className="inline-flex rounded-md border border-border overflow-hidden h-9">
        <Button
          variant={layout === "tabs" ? "default" : "ghost"}
          size="sm"
          className={`rounded-none h-full px-2.5 ${layout === "tabs" ? "bg-amber text-background hover:bg-amber/90" : ""}`}
          onClick={() => onLayoutChange("tabs")}
          title="Tab view"
        >
          <List className="w-3.5 h-3.5 mr-1" /> Tabs
        </Button>
        <Button
          variant={layout === "widgets" ? "default" : "ghost"}
          size="sm"
          className={`rounded-none h-full px-2.5 ${layout === "widgets" ? "bg-amber text-background hover:bg-amber/90" : ""}`}
          onClick={() => onLayoutChange("widgets")}
          title="Widget board"
        >
          <LayoutGrid className="w-3.5 h-3.5 mr-1" /> Widgets
        </Button>
      </div>

      {active !== "default" && (
        <Button variant="outline" size="sm" className="h-9" onClick={() => openEdit(active)} title="Edit current view">
          <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
        </Button>
      )}

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditingName(null); }}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="h-9" onClick={openCreate}>
            <Plus className="w-3.5 h-3.5 mr-1" /> New View
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingName ? `Edit View — ${editingName}` : "Create New View"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-mono uppercase text-muted-foreground mb-1 block">View Name</label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. 'Daily Driver'" />
            </div>

            <div>
              <label className="text-xs font-mono uppercase text-muted-foreground mb-1 block">Layout</label>
              <div className="inline-flex rounded-md border border-border overflow-hidden">
                <Button variant={draftLayout === "tabs" ? "default" : "ghost"} size="sm" className="rounded-none" onClick={() => setDraftLayout("tabs")}>
                  <List className="w-3 h-3 mr-1" /> Tabs
                </Button>
                <Button variant={draftLayout === "widgets" ? "default" : "ghost"} size="sm" className="rounded-none" onClick={() => setDraftLayout("widgets")}>
                  <LayoutGrid className="w-3 h-3 mr-1" /> Widgets
                </Button>
              </div>
            </div>

            <div>
              <label className="text-xs font-mono uppercase text-muted-foreground mb-1 block">
                Tabs ({draft.length} of {allTabs.length})
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[280px] overflow-y-auto p-2 rounded bg-secondary/30 border border-border">
                {allTabs.map(t => {
                  const checked = draft.includes(t.key);
                  return (
                    <div key={t.key} className="flex items-center justify-between gap-2 px-2 py-1 rounded hover:bg-secondary/50">
                      <label className="flex items-center gap-2 text-sm cursor-pointer flex-1">
                        <Checkbox checked={checked} onCheckedChange={() => toggleTab(t.key)} />
                        {t.icon && <t.icon className="w-3.5 h-3.5 text-amber" />}
                        <span>{t.label}</span>
                      </label>
                      {checked && draftLayout === "widgets" && (
                        <div className="flex items-center gap-0.5">
                          {([1, 2, 3, 4] as WidgetSize[]).map(s => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setDraftSize(t.key, s)}
                              className={`px-1 py-0.5 text-[10px] font-mono rounded border transition ${
                                (draftSizes[t.key] || 2) === s
                                  ? "bg-amber text-background border-amber"
                                  : "border-border text-muted-foreground hover:text-amber"
                              }`}
                              title={`${s}/4 width`}
                            >{s}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2 mt-2">
                <Button variant="outline" size="sm" onClick={() => setDraft(allTabs.map(t => t.key))}>
                  <RotateCcw className="w-3 h-3 mr-1" /> All
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDraft([])}>Clear</Button>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-border">
              <Button onClick={saveView} className="bg-amber text-background hover:bg-amber/90 flex-1">
                <Save className="w-4 h-4 mr-1" /> {editingName ? "Save Changes" : "Save View"}
              </Button>
              {editingName && (
                <Button variant="outline" onClick={() => { deleteView(editingName); setOpen(false); }}>
                  <Trash2 className="w-4 h-4 mr-1 text-red-400" /> Delete
                </Button>
              )}
            </div>

            {!editingName && views.length > 0 && (
              <div className="border-t border-border pt-3">
                <div className="text-xs font-mono uppercase text-muted-foreground mb-2">Saved Views</div>
                <div className="space-y-1">
                  {views.map(v => (
                    <div key={v.name} className="flex items-center justify-between bg-secondary/30 rounded px-2 py-1.5 text-sm">
                      <span className="flex items-center gap-2">
                        {active === v.name && <Star className="w-3 h-3 text-amber fill-amber" />}
                        <span>{v.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {v.tabs.length} tabs · {v.layout === "widgets" ? "widgets" : "tabs"}
                        </span>
                      </span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { applyView(v.name); setOpen(false); }} className="h-6 text-xs">Apply</Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(v.name)}><Pencil className="w-3 h-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteView(v.name)}><Trash2 className="w-3 h-3 text-red-400" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomViewSelector;
