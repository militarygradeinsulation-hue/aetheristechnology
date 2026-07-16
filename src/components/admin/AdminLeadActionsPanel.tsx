import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCw, CheckCircle2, Circle, AlertTriangle, Clock, Users } from "lucide-react";
import { leadActions, type LeadActionItem } from "@/lib/leadActions";
import { useToast } from "@/hooks/use-toast";

interface Lead {
  id: string;
  business_name: string | null;
  website: string | null;
  contact_name: string | null;
  status: string | null;
  assigned_to_code: string | null;
  claimed_by_code: string | null;
  created_by_code: string | null;
  last_touched_at: string | null;
}
interface Rep { code: string; rep_name: string | null }

/**
 * Admin oversight of every rep's active leads and how far through the
 * touch checklist + follow-up sequence each one is. Joseph-only view.
 */
export const AdminLeadActionsPanel: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [items, setItems] = useState<LeadActionItem[]>([]);
  const [reps, setReps] = useState<Rep[]>([]);
  const [repFilter, setRepFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await leadActions.overview();
      setLeads(data.leads || []);
      setItems(data.items || []);
      setReps(data.reps || []);
    } catch (e: any) {
      toast({ title: "Failed to load oversight", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const repNameByCode = useMemo(() => {
    const m: Record<string, string> = {};
    reps.forEach(r => { m[r.code] = r.rep_name || r.code; });
    return m;
  }, [reps]);

  const rowsByRep = useMemo(() => {
    const filtered = leads.filter(l => {
      const code = l.assigned_to_code || l.claimed_by_code || l.created_by_code || "unassigned";
      if (repFilter !== "all" && code !== repFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        const hay = `${l.business_name || ""} ${l.website || ""} ${l.contact_name || ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
    const byRep: Record<string, Lead[]> = {};
    filtered.forEach(l => {
      const code = l.assigned_to_code || l.claimed_by_code || l.created_by_code || "unassigned";
      (byRep[code] = byRep[code] || []).push(l);
    });
    return byRep;
  }, [leads, repFilter, search]);

  const itemsByLead = useMemo(() => {
    const m: Record<string, LeadActionItem[]> = {};
    items.forEach(i => { (m[i.lead_id] = m[i.lead_id] || []).push(i); });
    return m;
  }, [items]);

  const fmtRelative = (iso: string | null) => {
    if (!iso) return "—";
    const days = Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
    if (days <= 0) return "Today";
    if (days === 1) return "1d ago";
    return `${days}d ago`;
  };

  const overdueCount = (its: LeadActionItem[]) =>
    its.filter(i => !i.completed_at && !i.skipped_at && i.due_at && new Date(i.due_at) < new Date()).length;

  const totals = useMemo(() => {
    let active = 0, overdue = 0, completedToday = 0;
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    items.forEach(i => {
      if (!i.completed_at && !i.skipped_at) {
        active++;
        if (i.due_at && new Date(i.due_at) < new Date()) overdue++;
      } else if (i.completed_at && new Date(i.completed_at) >= todayStart) {
        completedToday++;
      }
    });
    return { active, overdue, completedToday };
  }, [items]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
        <div>
          <CardTitle className="font-display flex items-center gap-2">
            <Users className="w-5 h-5 text-amber" /> Rep Lead Progress
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Every active lead, every rep, every step they have or haven't done.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md border border-border bg-card px-3 py-1.5">
              <div className="text-base font-bold text-foreground">{totals.active}</div>
              <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Open</div>
            </div>
            <div className="rounded-md border border-crimson/40 bg-crimson/10 px-3 py-1.5">
              <div className="text-base font-bold text-crimson">{totals.overdue}</div>
              <div className="text-[9px] font-mono uppercase tracking-wider text-crimson/80">Overdue</div>
            </div>
            <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5">
              <div className="text-base font-bold text-emerald-400">{totals.completedToday}</div>
              <div className="text-[9px] font-mono uppercase tracking-wider text-emerald-400/80">Done Today</div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Input
            placeholder="Search lead..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <select
            value={repFilter}
            onChange={e => setRepFilter(e.target.value)}
            className="bg-background border border-input rounded-md px-3 h-9 text-sm"
          >
            <option value="all">All reps</option>
            {reps.map(r => (
              <option key={r.code} value={r.code}>{r.rep_name || r.code}</option>
            ))}
            <option value="unassigned">Unassigned</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-amber" />
          </div>
        ) : Object.keys(rowsByRep).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No active leads match.</p>
        ) : (
          Object.entries(rowsByRep).map(([repCode, repLeads]) => (
            <div key={repCode} className="border border-border rounded-lg overflow-hidden">
              <div className="bg-amber/10 border-b border-amber/30 px-3 py-2 flex items-center justify-between">
                <div className="font-semibold text-sm text-foreground">
                  {repNameByCode[repCode] || repCode}
                  <span className="ml-2 text-xs text-muted-foreground font-mono">{repCode}</span>
                </div>
                <div className="text-xs text-muted-foreground">{repLeads.length} active lead{repLeads.length === 1 ? "" : "s"}</div>
              </div>
              <div className="divide-y divide-border">
                {repLeads.map(l => {
                  const its = (itemsByLead[l.id] || []).sort((a, b) => a.order_idx - b.order_idx);
                  const touch = its.filter(i => i.kind === "touch");
                  const fu = its.filter(i => i.kind === "followup");
                  const tDone = touch.filter(i => i.completed_at).length;
                  const fDone = fu.filter(i => i.completed_at || i.skipped_at).length;
                  const nextDue = fu
                    .filter(i => !i.completed_at && !i.skipped_at && i.due_at)
                    .sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime())[0];
                  const overdue = overdueCount(its);
                  return (
                    <div key={l.id} className="p-3 hover:bg-card/50">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate">
                            {l.business_name || l.website || l.contact_name || "(unnamed)"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {l.website} · {l.status || "new"} · last touched {fmtRelative(l.last_touched_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-foreground">
                            <span className="font-mono text-amber">{tDone}/{touch.length}</span> touch
                          </span>
                          <span className="text-foreground">
                            <span className="font-mono text-amber">{fDone}/{fu.length}</span> follow-up
                          </span>
                          {overdue > 0 && (
                            <span className="font-mono text-crimson flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />{overdue} overdue
                            </span>
                          )}
                          {nextDue && (
                            <span className="font-mono text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />next: {new Date(nextDue.due_at!).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Step grid */}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {its.map(i => {
                          const done = !!i.completed_at;
                          const skipped = !!i.skipped_at;
                          const overdueItem = !done && !skipped && i.due_at && new Date(i.due_at) < new Date();
                          return (
                            <span
                              key={i.id}
                              title={`${i.title}${i.due_at ? ` · due ${new Date(i.due_at).toLocaleDateString()}` : ""}${done ? ` · done by ${i.completed_by}` : ""}`}
                              className={`inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${
                                done ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                                : skipped ? "border-muted text-muted-foreground opacity-60"
                                : overdueItem ? "border-crimson/40 bg-crimson/10 text-crimson"
                                : i.kind === "followup" ? "border-amber/30 bg-amber/5 text-amber/90"
                                : "border-border text-muted-foreground"
                              }`}
                            >
                              {done ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Circle className="w-2.5 h-2.5" />}
                              {i.step_key.replace(/_/g, " ")}
                            </span>
                          );
                        })}
                        {its.length === 0 && (
                          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground italic">
                            Rep hasn't opened this lead yet
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default AdminLeadActionsPanel;
