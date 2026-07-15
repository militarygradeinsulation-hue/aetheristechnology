import React, { useEffect, useState, useCallback } from "react";
import { listCalendar, updateCalendarEvent, KIND_META, type CalendarEvent, type LeadSummary } from "@/lib/portalCalendar";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock } from "lucide-react";

export const TodaysTouchpoints: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [leadsById, setLeadsById] = useState<Record<string, LeadSummary>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
      const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
      const res = await listCalendar({ from, to });
      setEvents((res.events || []).filter(e => !e.completed).sort((a, b) => a.start_at.localeCompare(b.start_at)));
      setLeadsById(res.leads_by_id || {});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const complete = async (id: string) => {
    await updateCalendarEvent(id, { completed: true });
    await load();
  };

  if (loading) {
    return <div className="rounded-md border border-border bg-card/40 p-4 text-sm text-muted-foreground">Loading today's touchpoints…</div>;
  }

  return (
    <div className="rounded-md border border-amber/40 bg-amber/5 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-amber">// Today //</div>
          <div className="text-lg font-semibold">Your touchpoints for today</div>
        </div>
        <div className="text-xs text-muted-foreground">{events.length} open</div>
      </div>
      {events.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          Nothing scheduled for today. Claim a lead below and a 5-touch cadence gets seeded automatically.
        </div>
      ) : (
        <ul className="space-y-2">
          {events.map(e => {
            const meta = KIND_META[e.kind] || KIND_META.event;
            const lead = e.lead_id ? leadsById[e.lead_id] : null;
            const time = e.all_day
              ? "All day"
              : new Date(e.start_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
            return (
              <li key={e.id} className={`flex items-start gap-3 rounded border ${meta.color} p-2`}>
                <div className="mt-0.5 text-lg leading-none">{meta.icon}</div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{e.title}</div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{time}</span>
                    {lead ? <span>· {lead.business_name || lead.contact_name}</span> : null}
                    {e.created_by === "system" ? <span className="rounded bg-amber/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber">Auto</span> : null}
                  </div>
                  {e.body ? <div className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs text-muted-foreground">{e.body}</div> : null}
                </div>
                <Button size="sm" variant="outline" onClick={() => complete(e.id)} className="shrink-0">
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Done
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default TodaysTouchpoints;
