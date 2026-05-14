import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ListChecks, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getPortalToken } from "@/lib/portalAuth";
import { getAdminToken } from "@/lib/adminAuth";
import { useToast } from "@/hooks/use-toast";

interface TaskItem { index: number; text: string; done: boolean }
interface EntryItem {
  entry_id: string;
  title: string;
  summary?: string;
  kind: string;
  tasks: TaskItem[];
}

function headers(): Record<string, string> {
  const h: Record<string, string> = {};
  const p = getPortalToken(); if (p) h["x-portal-token"] = p;
  const a = getAdminToken(); if (a) h["x-admin-token"] = a;
  return h;
}

export const CompanyDailyTasksCard: React.FC = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<EntryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [date, setDate] = useState<string>("");

  const refresh = React.useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("portal-company-tasks", {
        body: { action: "list_today" },
        headers: headers(),
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setItems((data as any).items || []);
      setDate((data as any).date || "");
    } catch (e) {
      toast({ title: "Couldn't load company tasks", description: (e as Error).message, variant: "destructive" });
    } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { void refresh(); }, [refresh]);

  const toggle = async (entry_id: string, task_index: number, completed: boolean) => {
    const key = `${entry_id}:${task_index}`;
    setSaving(key);
    // optimistic
    setItems((prev) => prev.map((it) =>
      it.entry_id === entry_id
        ? { ...it, tasks: it.tasks.map((t) => t.index === task_index ? { ...t, done: completed } : t) }
        : it
    ));
    try {
      const { data, error } = await supabase.functions.invoke("portal-company-tasks", {
        body: { action: "toggle", entry_id, task_index, completed },
        headers: headers(),
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
    } catch (e) {
      toast({ title: "Save failed", description: (e as Error).message, variant: "destructive" });
      void refresh();
    } finally { setSaving(null); }
  };

  const totals = useMemo(() => {
    const total = items.reduce((n, it) => n + it.tasks.length, 0);
    const done = items.reduce((n, it) => n + it.tasks.filter((t) => t.done).length, 0);
    return { total, done };
  }, [items]);

  if (loading) {
    return (
      <Card><CardContent className="py-6 flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading today's company tasks…
      </CardContent></Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="font-display flex items-center gap-2 text-base">
            <ListChecks className="w-5 h-5 text-amber" /> Company Tasks — Today
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No company tasks set for today. Check back later or open the Company Calendar.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="font-display flex items-center gap-2 text-base">
              <ListChecks className="w-5 h-5 text-amber" /> Company Tasks — Today
            </CardTitle>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber mt-1">
              {totals.done}/{totals.total} complete · {date}
            </p>
          </div>
          {totals.done === totals.total && totals.total > 0 && (
            <span className="flex items-center gap-1 text-xs text-amber">
              <CheckCircle2 className="w-4 h-4" /> All clear
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((it) => (
          <div key={it.entry_id} className="rounded-lg border border-border/60 bg-card/40 p-3">
            <div className="font-semibold text-foreground text-sm">{it.title}</div>
            {it.summary && <p className="text-xs text-muted-foreground mt-1">{it.summary}</p>}
            <ul className="space-y-2 mt-3">
              {it.tasks.map((t) => {
                const key = `${it.entry_id}:${t.index}`;
                return (
                  <li key={t.index} className="flex items-start gap-3">
                    <Checkbox
                      checked={t.done}
                      disabled={saving === key}
                      onCheckedChange={(v) => toggle(it.entry_id, t.index, !!v)}
                      className="mt-0.5"
                    />
                    <span className={`text-sm leading-snug ${t.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {t.text}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default CompanyDailyTasksCard;
