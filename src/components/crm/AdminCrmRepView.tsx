import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Users, Phone, Mail, Calendar, CheckCircle, AlertTriangle, TrendingDown, Trophy } from "lucide-react";
import { adminPlaybook, type RepRef, type RepCrmSummary } from "@/lib/adminPlaybook";
import { supabase } from "@/integrations/supabase/client";

const fmt$ = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

interface ContactRow { id: string; full_name: string; email: string | null; owner_code: string | null; qualified_at: string | null; tags: string[] | null; created_at: string }
interface DealRow { id: string; title: string; owner_code: string | null; stage: string; value_cents: number; proposal_sent_at: string | null; won_at: string | null; lost_at: string | null; lost_reason: string | null }
interface InteractionRow { id: string; owner_code: string | null; type: string; subject: string | null; occurred_at: string; contact_id: string | null }

export const AdminCrmRepView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [reps, setReps] = useState<RepRef[]>([]);
  const [summary, setSummary] = useState<RepCrmSummary[]>([]);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [interactions, setInteractions] = useState<InteractionRow[]>([]);
  const [selected, setSelected] = useState<string>("__all__");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [{ summary: s, ...rest }, c, d, i] = await Promise.all([
          adminPlaybook.crmRepSummary().then(r => ({ summary: r.summary })) ,
          supabase.from("crm_contacts").select("id, full_name, email, owner_code, qualified_at, tags, created_at").order("created_at", { ascending: false }).limit(500),
          supabase.from("crm_deals").select("id, title, owner_code, stage, value_cents, proposal_sent_at, won_at, lost_at, lost_reason").order("updated_at", { ascending: false }).limit(500),
          supabase.from("crm_interactions").select("id, owner_code, type, subject, occurred_at, contact_id").order("occurred_at", { ascending: false }).limit(300),
        ]);
        setSummary(s);
        setContacts((c.data || []) as ContactRow[]);
        setDeals((d.data || []) as DealRow[]);
        setInteractions((i.data || []) as InteractionRow[]);
        // Get rep list
        const { data: repList } = await supabase.from("rep_codes").select("code, rep_name, role, is_active").order("rep_name");
        setReps((repList || []) as RepRef[]);
      } finally { setLoading(false); }
    })();
  }, []);

  const filterByRep = <T extends { owner_code: string | null }>(arr: T[]) =>
    selected === "__all__" ? arr : selected === "__unassigned__" ? arr.filter(x => !x.owner_code) : arr.filter(x => x.owner_code === selected);

  const fContacts = useMemo(() => filterByRep(contacts), [contacts, selected]);
  const fDeals = useMemo(() => filterByRep(deals), [deals, selected]);
  const fInteractions = useMemo(() => filterByRep(interactions), [interactions, selected]);

  // Funnel for selected rep (or all)
  const funnel = useMemo(() => {
    const talked = fContacts.length;
    const qualified = fContacts.filter(c => c.qualified_at).length;
    const proposalsOut = fDeals.filter(d => d.proposal_sent_at && !d.won_at && !d.lost_at && !["closed_won","closed_lost"].includes(d.stage)).length;
    const won = fDeals.filter(d => d.won_at || d.stage === "closed_won").length;
    const lost = fDeals.filter(d => d.lost_at || d.stage === "closed_lost").length;
    return { talked, qualified, proposalsOut, won, lost };
  }, [fContacts, fDeals]);

  // Leak points
  const leaks = useMemo(() => {
    const out: { label: string; value: string; severity: "low"|"med"|"high" }[] = [];
    if (funnel.talked > 0) {
      const qualRate = funnel.qualified / funnel.talked;
      if (qualRate < 0.15) out.push({ label: "Low qualification rate", value: `${(qualRate * 100).toFixed(0)}%`, severity: "high" });
    }
    if (funnel.qualified > 0) {
      const propRate = funnel.proposalsOut / funnel.qualified;
      if (propRate < 0.4) out.push({ label: "Stalls before proposal", value: `${(propRate * 100).toFixed(0)}% of qualified get a proposal`, severity: "med" });
    }
    if (funnel.proposalsOut + funnel.won + funnel.lost > 0) {
      const closeRate = funnel.won / (funnel.proposalsOut + funnel.won + funnel.lost);
      if (closeRate < 0.2) out.push({ label: "Low close rate", value: `${(closeRate * 100).toFixed(0)}%`, severity: "high" });
    }
    if (funnel.lost > funnel.won * 2 && funnel.won > 0) out.push({ label: "Loss-to-win ratio elevated", value: `${funnel.lost} lost / ${funnel.won} won`, severity: "med" });
    if (out.length === 0 && funnel.talked > 0) out.push({ label: "Funnel looking healthy", value: "No obvious leaks", severity: "low" });
    return out;
  }, [funnel]);

  if (loading) return <div className="glass p-12 rounded-xl flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-amber" /></div>;

  const repName = (code: string | null) => !code ? "—" : (reps.find(r => r.code === code)?.rep_name || code);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-amber" />
          <h3 className="text-xl font-bold font-display">Rep Visibility</h3>
        </div>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="w-72"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All reps ({reps.length})</SelectItem>
            <SelectItem value="__unassigned__">Unassigned</SelectItem>
            {reps.map(r => <SelectItem key={r.code} value={r.code}>{r.rep_name} ({r.code})</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Leaderboard */}
      <Card className="glass">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Trophy className="w-4 h-4 text-amber" />Leaderboard</CardTitle></CardHeader>
        <CardContent>
          {summary.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No rep-tagged CRM activity yet. Tag contacts/deals with an owner code to populate.</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2">Rep</th><th className="pb-2">Talked</th><th className="pb-2">Qualified</th><th className="pb-2">Proposals</th><th className="pb-2">Won</th><th className="pb-2">Lost</th><th className="pb-2">Revenue</th>
              </tr></thead>
              <tbody>{[...summary].sort((a,b)=>b.revenue_won_cents-a.revenue_won_cents).map(s => (
                <tr key={s.rep_code} className={`border-b border-border/50 cursor-pointer hover:bg-card/30 ${selected === s.rep_code ? "bg-amber/5" : ""}`} onClick={() => setSelected(s.rep_code)}>
                  <td className="py-2 font-medium">{repName(s.rep_code)} <span className="text-xs font-mono text-muted-foreground ml-1">{s.rep_code}</span></td>
                  <td className="py-2">{s.talked_to}</td>
                  <td className="py-2">{s.qualified}</td>
                  <td className="py-2">{s.proposals_sent}</td>
                  <td className="py-2 text-emerald-400">{s.deals_won}</td>
                  <td className="py-2 text-destructive">{s.deals_lost}</td>
                  <td className="py-2 font-semibold text-amber">{fmt$(s.revenue_won_cents)}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Funnel + Leaks for selected */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="glass">
          <CardHeader><CardTitle className="text-base">Conversion funnel — {selected === "__all__" ? "all reps" : selected === "__unassigned__" ? "unassigned" : repName(selected)}</CardTitle></CardHeader>
          <CardContent>
            <FunnelStage label="Talked to" count={funnel.talked} max={funnel.talked} icon={<Phone className="w-3 h-3" />} />
            <FunnelStage label="Qualified" count={funnel.qualified} max={funnel.talked} icon={<CheckCircle className="w-3 h-3" />} />
            <FunnelStage label="Proposal sent" count={funnel.proposalsOut} max={funnel.talked} icon={<Mail className="w-3 h-3" />} />
            <FunnelStage label="Won" count={funnel.won} max={funnel.talked} icon={<Trophy className="w-3 h-3" />} color="emerald" />
            <FunnelStage label="Lost" count={funnel.lost} max={funnel.talked} icon={<TrendingDown className="w-3 h-3" />} color="destructive" />
          </CardContent>
        </Card>
        <Card className="glass">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-destructive" />Leak Points</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {leaks.length === 0 && <p className="text-sm text-muted-foreground italic">Not enough data yet.</p>}
            {leaks.map((l, i) => (
              <div key={i} className={`p-3 rounded-lg border ${l.severity === "high" ? "bg-destructive/10 border-destructive/40" : l.severity === "med" ? "bg-amber/10 border-amber/30" : "bg-emerald/10 border-emerald-500/30"}`}>
                <div className="font-semibold text-sm">{l.label}</div>
                <div className="text-xs text-muted-foreground mt-1">{l.value}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Activity timeline */}
      <Card className="glass">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Calendar className="w-4 h-4 text-amber" />Activity timeline</CardTitle></CardHeader>
        <CardContent>
          {fInteractions.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No interactions logged.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {fInteractions.map(i => (
                <div key={i.id} className="flex items-start gap-3 p-2 border-b border-border/30 text-sm">
                  <Badge variant="outline" className="text-[10px] mt-0.5">{i.type}</Badge>
                  <div className="flex-1 min-w-0">
                    <div className="text-foreground truncate">{i.subject || `(${i.type})`}</div>
                    <div className="text-xs text-muted-foreground">{repName(i.owner_code)} · {new Date(i.occurred_at).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deals table */}
      <Card className="glass">
        <CardHeader><CardTitle className="text-base">Deals ({fDeals.length})</CardTitle></CardHeader>
        <CardContent>
          {fDeals.length === 0 ? <p className="text-sm text-muted-foreground italic">None.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2">Title</th><th className="pb-2">Rep</th><th className="pb-2">Stage</th><th className="pb-2">Value</th><th className="pb-2">Proposal</th><th className="pb-2">Status</th>
                </tr></thead>
                <tbody>{fDeals.slice(0, 100).map(d => (
                  <tr key={d.id} className="border-b border-border/50">
                    <td className="py-2 font-medium">{d.title}</td>
                    <td className="py-2 text-xs">{repName(d.owner_code)}</td>
                    <td className="py-2"><Badge variant="outline">{d.stage}</Badge></td>
                    <td className="py-2 font-mono">{fmt$(d.value_cents)}</td>
                    <td className="py-2 text-xs text-muted-foreground">{d.proposal_sent_at ? new Date(d.proposal_sent_at).toLocaleDateString() : "—"}</td>
                    <td className="py-2 text-xs">
                      {d.won_at ? <span className="text-emerald-400">Won</span> :
                       d.lost_at ? <span className="text-destructive">Lost{d.lost_reason ? ` · ${d.lost_reason}` : ""}</span> :
                       <span className="text-muted-foreground">Open</span>}
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const FunnelStage: React.FC<{ label: string; count: number; max: number; icon: React.ReactNode; color?: "amber"|"emerald"|"destructive" }> = ({ label, count, max, icon, color = "amber" }) => {
  const pct = max > 0 ? Math.max((count / max) * 100, 2) : 0;
  const colorClass = color === "emerald" ? "bg-emerald-500/40" : color === "destructive" ? "bg-destructive/40" : "bg-amber/40";
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">{icon}{label}</div>
        <span className="font-mono text-sm font-semibold">{count}</span>
      </div>
      <div className="h-2 bg-card/60 rounded-full overflow-hidden">
        <div className={`h-full ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};
