import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Play, Square, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { portalTimeclock, formatDuration, type TimeEntry } from "@/lib/portalTimeclock";

export const RepClockWidget: React.FC = () => {
  const [open, setOpen] = useState<TimeEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [tick, setTick] = useState(0);
  const tickRef = useRef<number | null>(null);

  const refresh = async () => {
    try {
      const { open } = await portalTimeclock.status();
      setOpen(open);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  // Live ticker while clocked in.
  useEffect(() => {
    if (!open) {
      if (tickRef.current) window.clearInterval(tickRef.current);
      tickRef.current = null;
      return;
    }
    tickRef.current = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => { if (tickRef.current) window.clearInterval(tickRef.current); };
  }, [open]);

  const elapsed = open
    ? Math.max(0, Math.floor((Date.now() - new Date(open.clock_in_at).getTime()) / 1000))
    : 0;

  const handleIn = async () => {
    setActing(true);
    try {
      const { open } = await portalTimeclock.clockIn();
      setOpen(open);
      toast({ title: "Clocked in", description: "Timer started." });
    } catch (e: any) {
      toast({ title: "Could not clock in", description: e.message, variant: "destructive" });
    } finally {
      setActing(false);
    }
  };

  const handleOut = async () => {
    setActing(true);
    try {
      const { entry } = await portalTimeclock.clockOut();
      setOpen(null);
      toast({
        title: "Clocked out",
        description: `Session: ${formatDuration(entry.duration_seconds)}`,
      });
    } catch (e: any) {
      toast({ title: "Could not clock out", description: e.message, variant: "destructive" });
    } finally {
      setActing(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-display flex items-center gap-2 text-base">
          <Clock className="w-4 h-4 text-amber" /> Time Clock
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : open ? (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">On the clock since</p>
              <p className="text-sm text-foreground">{new Date(open.clock_in_at).toLocaleString()}</p>
              <p className="text-2xl font-bold text-amber font-mono mt-1" data-tick={tick}>
                {formatDuration(elapsed)}
              </p>
            </div>
            <Button onClick={handleOut} disabled={acting} variant="destructive" className="gap-2">
              {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
              Clock Out
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-muted-foreground">You're not on the clock. Start a session before working leads or running tools.</p>
            <Button onClick={handleIn} disabled={acting} className="gap-2 bg-amber hover:bg-amber/90 text-background font-bold">
              {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Clock In
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
