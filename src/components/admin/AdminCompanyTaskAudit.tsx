import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, ListChecks, Check, X, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getAdminToken } from "@/lib/adminAuth";
import { getPortalToken } from "@/lib/portalAuth";
import { useToast } from "@/hooks/use-toast";

interface RepRow {
  code: string; rep_name: string; role: string;
  completed: boolean[]; done_count: number; total: number;
}
interface ItemRow {
  entry_id: string; title: string; kind: string;
  tasks: string[]; per_rep: RepRow[];
}

function headers(): Record<string, string> {
  const h: Record<string, string> = {};
  const a = getAdminToken(); if (a) h["x-admin-token"] = a;
  const p = getPortalToken(); if (p) h["x-portal-token"] = p;
  return h;
}

const todayIndy = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Indiana/Indianapolis",
  year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date());

export const AdminCompanyTaskAudit: React.FC = () => {
  const { toast } = useToast();
  const [date, setDate] = useState<string>(todayIndy());
  const [items, setItems] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("portal-company-tasks", {
        body: { action: "admin_overview", date },
        headers: headers(),
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setItems((data as any).items || []);
    } catch (e) {
      toast({ title: "Couldn't load audit", description: (e as Error).message, variant: "destructive" });
    } finally { setLoading(false); }
  }, [date, toast]);

  useEffect(() => { void refresh(); }, [refresh]);

  // Polling fallback (rep_company_task_completions removed from Realtime
  // publication to stop broadcasting completion events to anon subscribers).
  useEffect(() => {
    const id = setInterval(() => { void refresh(); }, 15000);
    return () => { clearInterval(id); };
  }, [refresh]);

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="font-display flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-amber" /> Rep Task Completion Audit
          </CardTitle>
          <div className="flex items-center gap-2">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
            <Button size="icon" variant="outline" onClick={() => void refresh()} title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="py-6 flex items-center justify-center text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading…
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tasks set for {date}.</p>
        ) : items.map((it) => (
          <div key={it.entry_id} className="border border-border/60 rounded-lg overflow-hidden">
            <div className="px-3 py-2 bg-card/60 border-b border-border/60">
              <div className="font-semibold text-foreground text-sm">{it.title}</div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mt-0.5">
                {it.tasks.length} task{it.tasks.length === 1 ? "" : "s"}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left bg-muted/40">
                    <th className="px-3 py-2 sticky left-0 bg-muted/40 z-10 min-w-[180px]">Rep</th>
                    {it.tasks.map((t, i) => (
                      <th key={i} className="px-2 py-2 font-normal text-muted-foreground max-w-[180px]">
                        <div className="text-[10px] font-mono uppercase tracking-wider text-amber mb-1">#{i + 1}</div>
                        <div className="line-clamp-3">{t}</div>
                      </th>
                    ))}
                    <th className="px-3 py-2 text-right font-mono text-amber">Done</th>
                  </tr>
                </thead>
                <tbody>
                  {it.per_rep.map((r) => (
                    <tr key={r.code} className="border-t border-border/40">
                      <td className="px-3 py-2 sticky left-0 bg-background z-10 font-medium">
                        {r.rep_name}
                        {r.role === "partner" && <span className="ml-1 text-[10px] uppercase text-amber">· Partner</span>}
                        <div className="text-[10px] font-mono text-muted-foreground">{r.code}</div>
                      </td>
                      {r.completed.map((done, i) => (
                        <td key={i} className="px-2 py-2 text-center">
                          {done
                            ? <Check className="w-4 h-4 text-amber inline" />
                            : <X className="w-4 h-4 text-muted-foreground/40 inline" />}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right font-mono">
                        <span className={r.done_count === r.total && r.total > 0 ? "text-amber" : "text-muted-foreground"}>
                          {r.done_count}/{r.total}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default AdminCompanyTaskAudit;
