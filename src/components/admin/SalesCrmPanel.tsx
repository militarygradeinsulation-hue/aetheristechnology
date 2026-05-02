import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAdminToken } from "@/lib/adminAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type Sale = {
  id: string; email: string | null; amount_cents: number; currency: string;
  price_id: string | null; product_name: string | null;
  kind: string; status: string; rep_code: string | null;
  environment: string; occurred_at: string;
  stripe_session_id: string | null; stripe_invoice_id: string | null;
};
type Customer = {
  id: string; email: string; name: string | null;
  rep_code: string | null; lifetime_value_cents: number;
  total_purchases: number; last_seen_at: string;
};
type Commission = {
  id: string; sale_id: string; recipient_role: string;
  recipient_code: string | null; amount_cents: number; rate: number;
  status: string; environment: string; paid_at: string | null;
  payout_reference: string | null; created_at: string;
};
type Activity = {
  id: string; event_type: string; summary: string | null;
  rep_code: string | null; created_at: string; metadata: any;
};

const dollars = (cents: number) =>
  `${cents < 0 ? "-" : ""}$${Math.abs(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const csvEscape = (v: any) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const downloadCsv = (filename: string, rows: any[]) => {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const csv = [cols.join(","), ...rows.map(r => cols.map(c => csvEscape(r[c])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = filename; a.click();
};

export default function SalesCrmPanel() {
  const { toast } = useToast();
  const [tab, setTab] = useState<"sales" | "customers" | "commissions" | "activity">("sales");
  const [env, setEnv] = useState<"sandbox" | "live" | "all">("all");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const token = getAdminToken();
      const { data, error } = await supabase.functions.invoke("admin-data", {
        body: { action: "crm", env: env === "all" ? null : env },
        headers: { "x-admin-token": token! },
      });
      if (error) throw error;
      setSales(data.sales || []);
      setCustomers(data.customers || []);
      setCommissions(data.commissions || []);
      setActivity(data.activity || []);
    } catch (e: any) {
      toast({ title: "CRM load failed", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [env]);

  const totals = useMemo(() => {
    const gross = sales.filter(s => s.kind !== "refund").reduce((a, s) => a + s.amount_cents, 0);
    const refunds = sales.filter(s => s.kind === "refund").reduce((a, s) => a + s.amount_cents, 0);
    return { gross, refunds, net: gross + refunds, count: sales.length };
  }, [sales]);

  const filteredSales = useMemo(() => {
    if (!q) return sales;
    const s = q.toLowerCase();
    return sales.filter(r =>
      (r.email ?? "").toLowerCase().includes(s) ||
      (r.price_id ?? "").toLowerCase().includes(s) ||
      (r.rep_code ?? "").toLowerCase().includes(s));
  }, [sales, q]);

  const markPaid = async (id: string) => {
    const ref = prompt("Payout reference (optional)") || "";
    const token = getAdminToken();
    const { error } = await supabase.functions.invoke("admin-data", {
      body: { action: "mark_commission_paid", id, payout_reference: ref },
      headers: { "x-admin-token": token! },
    });
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Marked paid" }); load(); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {(["sales","customers","commissions","activity"] as const).map(t => (
          <Button key={t} size="sm" variant={tab===t?"default":"outline"} onClick={()=>setTab(t)}>
            {t[0].toUpperCase()+t.slice(1)}
          </Button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <select className="bg-background border border-border rounded px-2 py-1 text-sm"
            value={env} onChange={e=>setEnv(e.target.value as any)}>
            <option value="all">All envs</option>
            <option value="sandbox">Sandbox</option>
            <option value="live">Live</option>
          </select>
          <Input placeholder="Search…" value={q} onChange={e=>setQ(e.target.value)} className="w-48" />
          <Button size="sm" variant="outline" onClick={load}>Refresh</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3"><div className="text-xs text-muted-foreground">Gross</div><div className="text-xl font-mono">{dollars(totals.gross)}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Refunds</div><div className="text-xl font-mono">{dollars(totals.refunds)}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Net</div><div className="text-xl font-mono">{dollars(totals.net)}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Transactions</div><div className="text-xl font-mono">{totals.count}</div></Card>
      </div>

      {loading && <div className="text-sm text-muted-foreground">Loading…</div>}

      {tab === "sales" && (
        <Card className="p-3">
          <div className="flex justify-end mb-2"><Button size="sm" variant="outline" onClick={()=>downloadCsv(`sales-${Date.now()}.csv`, filteredSales)}>Export CSV</Button></div>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground border-b border-border">
                <tr><th className="py-2 px-2">Date</th><th>Email</th><th>Product</th><th>Kind</th><th>Rep</th><th className="text-right">Amount</th><th>Env</th></tr>
              </thead>
              <tbody>
                {filteredSales.map(s => (
                  <tr key={s.id} className="border-b border-border/50">
                    <td className="py-2 px-2 font-mono text-xs">{new Date(s.occurred_at).toLocaleString()}</td>
                    <td>{s.email}</td>
                    <td className="font-mono text-xs">{s.price_id || s.product_name || "—"}</td>
                    <td className="text-xs">{s.kind}</td>
                    <td className="font-mono text-xs">{s.rep_code || "—"}</td>
                    <td className="text-right font-mono">{dollars(s.amount_cents)}</td>
                    <td className="text-xs">{s.environment}</td>
                  </tr>
                ))}
                {!filteredSales.length && <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">No sales yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "customers" && (
        <Card className="p-3">
          <div className="flex justify-end mb-2"><Button size="sm" variant="outline" onClick={()=>downloadCsv(`customers-${Date.now()}.csv`, customers)}>Export CSV</Button></div>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground border-b border-border">
                <tr><th className="py-2 px-2">Email</th><th>Name</th><th>Rep</th><th className="text-right">LTV</th><th className="text-right">Purchases</th><th>Last seen</th></tr>
              </thead>
              <tbody>
                {customers.filter(c=>!q || c.email.includes(q.toLowerCase())).map(c => (
                  <tr key={c.id} className="border-b border-border/50">
                    <td className="py-2 px-2">{c.email}</td>
                    <td>{c.name || "—"}</td>
                    <td className="font-mono text-xs">{c.rep_code || "—"}</td>
                    <td className="text-right font-mono">{dollars(c.lifetime_value_cents)}</td>
                    <td className="text-right font-mono">{c.total_purchases}</td>
                    <td className="text-xs">{new Date(c.last_seen_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {!customers.length && <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">No customers yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "commissions" && (
        <Card className="p-3">
          <div className="flex justify-end mb-2"><Button size="sm" variant="outline" onClick={()=>downloadCsv(`commissions-${Date.now()}.csv`, commissions)}>Export CSV</Button></div>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground border-b border-border">
                <tr><th className="py-2 px-2">Date</th><th>Role</th><th>Recipient</th><th className="text-right">Amount</th><th className="text-right">Rate</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {commissions.map(c => (
                  <tr key={c.id} className="border-b border-border/50">
                    <td className="py-2 px-2 font-mono text-xs">{new Date(c.created_at).toLocaleDateString()}</td>
                    <td className="text-xs">{c.recipient_role}</td>
                    <td className="font-mono text-xs">{c.recipient_code || "Aetheris"}</td>
                    <td className="text-right font-mono">{dollars(c.amount_cents)}</td>
                    <td className="text-right text-xs">{(c.rate*100).toFixed(0)}%</td>
                    <td className="text-xs">{c.status}{c.paid_at ? ` (${new Date(c.paid_at).toLocaleDateString()})` : ""}</td>
                    <td>{c.status === "pending" && <Button size="sm" variant="outline" onClick={()=>markPaid(c.id)}>Mark paid</Button>}</td>
                  </tr>
                ))}
                {!commissions.length && <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">No commissions yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "activity" && (
        <Card className="p-3">
          <div className="space-y-2">
            {activity.map(a => (
              <div key={a.id} className="flex gap-3 text-sm border-b border-border/30 pb-2">
                <div className="font-mono text-xs text-muted-foreground w-32 shrink-0">{new Date(a.created_at).toLocaleString()}</div>
                <div className="font-mono text-xs text-amber w-44 shrink-0">{a.event_type}</div>
                <div className="flex-1">{a.summary} {a.rep_code && <span className="text-xs text-muted-foreground">[{a.rep_code}]</span>}</div>
              </div>
            ))}
            {!activity.length && <div className="py-6 text-center text-muted-foreground">No activity yet.</div>}
          </div>
        </Card>
      )}
    </div>
  );
}
