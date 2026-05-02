import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, RefreshCw, Loader2, TrendingUp } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { portalTimeclock, formatDuration, type TimeSummaryRow } from "@/lib/portalTimeclock";

const WINDOWS = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "All", days: 3650 },
];

const fmtUsd = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);

export const PartnerTimePanel: React.FC = () => {
  const [windowDays, setWindowDays] = useState(30);
  const [rows, setRows] = useState<TimeSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
      const { summary } = await portalTimeclock.summary(since);
      setRows(summary);
    } catch (e: any) {
      toast({ title: "Could not load time data", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [windowDays]);

  const totalSeconds = rows.reduce((s, r) => s + r.seconds_window, 0);
  const totalCommissionCents = rows.reduce((s, r) => s + r.total_commission_cents, 0);
  const blendedRate = totalSeconds > 0 ? totalCommissionCents / 100 / (totalSeconds / 3600) : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="font-display flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber" /> Rep Time Tracker — pay vs. hours
          </CardTitle>
          <div className="flex items-center gap-1">
            {WINDOWS.map((w) => (
              <button
                key={w.label}
                onClick={() => setWindowDays(w.days)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                  windowDays === w.days
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary/40"
                }`}
              >{w.label}</button>
            ))}
            <Button variant="outline" size="sm" onClick={load} disabled={loading} className="ml-2">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Hours logged in the selected window vs. <strong>lifetime commission</strong>. The $/hr column is your effective payout rate — high $/hr = the rep is efficient, low $/hr = pay-to-time is unfair.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Roll-up */}
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="rounded-lg border border-border/50 bg-card/40 p-3">
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Total hours ({windowDays}d)</p>
            <p className="text-2xl font-semibold text-foreground mt-1">{formatDuration(totalSeconds)}</p>
          </div>
          <div className="rounded-lg border border-amber/30 bg-amber/10 p-3">
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Lifetime commission paid</p>
            <p className="text-2xl font-bold text-amber mt-1">{fmtUsd(totalCommissionCents)}</p>
          </div>
          <div className="rounded-lg border border-border/50 bg-card/40 p-3">
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Blended $/hr</p>
            <p className="text-2xl font-semibold text-foreground mt-1 inline-flex items-center gap-2">
              {blendedRate !== null ? `$${blendedRate.toFixed(2)}` : "—"}
              <TrendingUp className="w-4 h-4 text-amber" />
            </p>
          </div>
        </div>

        {/* Per-rep table */}
        <div className="overflow-x-auto rounded-lg border border-border/50">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rep</TableHead>
                <TableHead className="text-right">Hours ({windowDays}d)</TableHead>
                <TableHead className="text-right">Sessions</TableHead>
                <TableHead className="text-right">Last seen</TableHead>
                <TableHead className="text-right">Lifetime $</TableHead>
                <TableHead className="text-right">Commission paid</TableHead>
                <TableHead className="text-right">Effective $/hr</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-amber inline" />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No reps yet.
                  </TableCell>
                </TableRow>
              ) : rows.map((r) => {
                const lastSeen = r.last_in ? new Date(r.last_in) : null;
                return (
                  <TableRow key={r.code} className={r.role === "partner" ? "bg-amber/5" : undefined}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{r.rep_name}</span>
                        <span className="text-[10px] font-mono text-muted-foreground">{r.code}{r.role === "partner" ? " · partner" : ""}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">{formatDuration(r.seconds_window)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{r.sessions_window}</TableCell>
                    <TableCell className="text-right text-muted-foreground text-xs">
                      {lastSeen ? lastSeen.toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{fmtUsd(r.total_sales_cents)}</TableCell>
                    <TableCell className="text-right font-semibold text-amber">{fmtUsd(r.total_commission_cents)}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {r.dollars_per_hour !== null ? `$${r.dollars_per_hour.toFixed(2)}` : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.currently_open ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-green-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> ON
                        </span>
                      ) : !r.is_active ? (
                        <span className="text-xs text-muted-foreground">inactive</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">off</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <p className="text-xs text-muted-foreground">
          Effective $/hr = lifetime commission ÷ hours logged in this window. A rep with high commission and few hours has the best ratio. A rep with many hours and little commission needs coaching or a different role. Time data is permanent — every clock-in/out is recorded.
        </p>
      </CardContent>
    </Card>
  );
};
