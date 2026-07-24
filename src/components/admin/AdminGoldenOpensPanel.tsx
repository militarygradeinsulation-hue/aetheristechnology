import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Radio, MapPin, Building2, User, Clock } from "lucide-react";

type Event = {
  id: string;
  scan_id: string | null;
  company_name: string | null;
  target_url: string | null;
  event_type: "scan_completed" | "page_view" | "email_open" | "link_click" | "pdf_download";
  recipient_email: string | null;
  ip: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  is_internal: boolean;
  rep_code: string | null;
  created_at: string;
};

const LABELS: Record<Event["event_type"], string> = {
  scan_completed: "Report generated",
  page_view: "Viewed page",
  email_open: "Email opened",
  link_click: "Clicked link",
  pdf_download: "Downloaded PDF",
};

const COLORS: Record<Event["event_type"], string> = {
  scan_completed: "bg-slate-500/20 text-slate-300 border-slate-500/40",
  page_view: "bg-sky-500/20 text-sky-300 border-sky-500/40",
  email_open: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  link_click: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  pdf_download: "bg-purple-500/20 text-purple-300 border-purple-500/40",
};

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function AdminGoldenOpensPanel() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInternal, setShowInternal] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("golden_report_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setEvents((data as any) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const iv = setInterval(load, 15000);
    const ch = supabase
      .channel("golden-events")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "golden_report_events" }, (payload) => {
        const ev = payload.new as Event;
        setEvents((prev) => [ev, ...prev].slice(0, 200));
        if (pushEnabled && !ev.is_internal && typeof Notification !== "undefined" && Notification.permission === "granted") {
          const loc = [ev.city, ev.region, ev.country].filter(Boolean).join(", ") || "unknown";
          new Notification(`Golden Report: ${LABELS[ev.event_type]}`, {
            body: `${ev.company_name || "Someone"} · ${loc}`,
            tag: `golden-${ev.id}`,
          });
        }
      })
      .subscribe();
    return () => {
      clearInterval(iv);
      supabase.removeChannel(ch);
    };
  }, [pushEnabled]);

  const filtered = useMemo(() => events.filter((e) => showInternal || !e.is_internal), [events, showInternal]);

  const scanTotals = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of events) {
      if (e.is_internal || !e.scan_id || e.event_type === "scan_completed") continue;
      m.set(e.scan_id, (m.get(e.scan_id) || 0) + 1);
    }
    return m;
  }, [events]);

  async function enablePush() {
    if (typeof Notification === "undefined") return;
    const perm = await Notification.requestPermission();
    setPushEnabled(perm === "granted");
  }

  return (
    <Card className="p-4 md:p-6 bg-black/40 border-amber-500/20">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-amber-500 font-mono">
            <Radio className="w-3 h-3" /> Live signal · Golden Report opens
          </div>
          <h3 className="text-xl font-serif font-bold mt-1">Who's reading their case file</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time feed. Internal reps/staff filtered by default. Email opens rate-limited to 1 alert per hour per event.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <Switch checked={showInternal} onCheckedChange={setShowInternal} id="show-internal" />
            <label htmlFor="show-internal" className="cursor-pointer">Show reps/internal</label>
          </div>
          <Button
            size="sm"
            variant={pushEnabled ? "default" : "outline"}
            onClick={enablePush}
            className={pushEnabled ? "bg-amber-500 text-black hover:bg-amber-400" : ""}
          >
            {pushEnabled ? "Push on" : "Enable push"}
          </Button>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`w-3 h-3 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No events yet.</p>
      ) : (
        <div className="space-y-2 max-h-[70vh] overflow-y-auto">
          {filtered.map((e) => {
            const loc = [e.city, e.region, e.country].filter(Boolean).join(", ") || "unknown";
            const total = e.scan_id ? scanTotals.get(e.scan_id) || 0 : 0;
            return (
              <div key={e.id} className="border border-amber-500/10 rounded p-3 bg-black/30 hover:bg-black/50 transition-colors">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={COLORS[e.event_type]}>{LABELS[e.event_type]}</Badge>
                      {e.is_internal && <Badge variant="outline" className="text-xs">internal{e.rep_code ? ` · ${e.rep_code}` : ""}</Badge>}
                      {total > 1 && <span className="text-xs text-amber-400">{total}× opens</span>}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-sm">
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="font-medium truncate">{e.company_name || e.target_url || "Unknown"}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><User className="w-3 h-3" />{e.recipient_email || "anonymous"}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{loc}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(e.created_at)}</span>
                    </div>
                  </div>
                  {e.scan_id && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`/golden-report?scan=${e.scan_id}`, "_blank")}
                      className="shrink-0"
                    >
                      Open
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
