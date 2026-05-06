import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Layout, Save, Trash2, RotateCcw, Plus, Cloud } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getAdminToken } from "@/lib/adminAuth";

interface SavedView {
  name: string;
  tabs: string[];
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
  allTabs: { key: string; label: string }[];
  visibleTabs: string[];
  onChange: (tabs: string[]) => void;
}

export const CustomViewSelector: React.FC<Props> = ({ allTabs, visibleTabs, onChange }) => {
  const { toast } = useToast();
  const [views, setViews] = useState<SavedView[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
  });
  const [active, setActive] = useState<string>(() => localStorage.getItem(ACTIVE_KEY) || "default");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>(visibleTabs);
  const [newName, setNewName] = useState("");

  const hydrated = useRef(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(views)); }, [views]);
  useEffect(() => { localStorage.setItem(ACTIVE_KEY, active); }, [active]);

  // Hydrate from cloud (so saved views follow you across devices)
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
          if (v) onChange(v.tabs);
        }
      } else {
        if (active !== "default") {
          const v = views.find(v => v.name === active);
          if (v) onChange(v.tabs);
        }
        if (views.length > 0) await kvSet({ views, active });
      }
      hydrated.current = true;
    })();
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      kvGet().then(r => {
        if (r && Array.isArray(r.views)) {
          setViews(r.views);
          setActive(r.active || "default");
        }
      });
    };
    document.addEventListener("visibilitychange", onVis);
    return () => { cancelled = true; document.removeEventListener("visibilitychange", onVis); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push changes to cloud after hydration
  useEffect(() => {
    if (!hydrated.current) return;
    setSyncing(true);
    kvSet({ views, active }).finally(() => setSyncing(false));
  }, [views, active]);

  useEffect(() => { setDraft(visibleTabs); }, [open, visibleTabs]);

  const applyView = (name: string) => {
    setActive(name);
    if (name === "default") onChange(allTabs.map(t => t.key));
    else {
      const v = views.find(v => v.name === name);
      if (v) onChange(v.tabs);
    }
  };

  const saveCurrentAsView = () => {
    if (!newName.trim()) { toast({ title: "Name required", variant: "destructive" }); return; }
    const exists = views.some(v => v.name === newName.trim());
    const next = exists
      ? views.map(v => v.name === newName.trim() ? { ...v, tabs: draft } : v)
      : [...views, { name: newName.trim(), tabs: draft }];
    setViews(next);
    setActive(newName.trim());
    onChange(draft);
    toast({ title: exists ? "View updated" : "View saved" });
    setNewName("");
    setOpen(false);
  };

  const deleteView = (name: string) => {
    if (!confirm(`Delete view "${name}"?`)) return;
    setViews(views.filter(v => v.name !== name));
    if (active === name) applyView("default");
  };

  const toggleTab = (key: string) => {
    setDraft(d => d.includes(key) ? d.filter(k => k !== key) : [...d, key]);
  };

  return (
    <div className="flex items-center gap-2">
      <Cloud className={`w-3 h-3 ${syncing ? "text-amber animate-pulse" : "text-muted-foreground/60"}`} aria-label={syncing ? "Syncing views…" : "Views synced"} />
      <Select value={active} onValueChange={applyView}>
        <SelectTrigger className="w-[180px] h-9">
          <Layout className="w-3 h-3 mr-1" />
          <SelectValue placeholder="View" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">Default (all tabs)</SelectItem>
          {views.map(v => <SelectItem key={v.name} value={v.name}>{v.name}</SelectItem>)}
        </SelectContent>
      </Select>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm"><Plus className="w-3 h-3 mr-1" /> View</Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-display">Customize Admin View</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Pick which tabs you want visible. Save as a view to switch back anytime.</p>
            <div className="grid grid-cols-2 gap-2 max-h-[320px] overflow-y-auto p-2 rounded bg-secondary/30">
              {allTabs.map(t => (
                <label key={t.key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={draft.includes(t.key)} onCheckedChange={() => toggleTab(t.key)} />
                  <span>{t.label}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="View name (e.g. 'Daily Driver')" />
              <Button onClick={saveCurrentAsView} className="bg-amber text-background hover:bg-amber/90">
                <Save className="w-4 h-4 mr-1" /> Save
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { setDraft(allTabs.map(t => t.key)); }}>
                <RotateCcw className="w-3 h-3 mr-1" /> Select all
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDraft([])}>Clear</Button>
            </div>

            {views.length > 0 && (
              <div className="border-t border-border pt-3">
                <div className="text-xs text-muted-foreground mb-2">Saved views</div>
                <div className="space-y-1">
                  {views.map(v => (
                    <div key={v.name} className="flex items-center justify-between bg-secondary/30 rounded px-2 py-1 text-sm">
                      <span>{v.name} <span className="text-xs text-muted-foreground">({v.tabs.length} tabs)</span></span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { applyView(v.name); setOpen(false); }} className="h-6 text-xs">Apply</Button>
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
