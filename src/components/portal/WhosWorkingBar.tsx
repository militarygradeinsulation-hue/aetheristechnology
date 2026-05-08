import React, { useEffect, useState } from 'react';
import { portalTimeclock, formatDuration, type TimeSummaryRow } from '@/lib/portalTimeclock';
import { Activity, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const WhosWorkingBar: React.FC = () => {
  const [rows, setRows] = useState<TimeSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = async () => {
    try {
      const data = await portalTimeclock.summary();
      setRows(data.summary || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    const i = setInterval(load, 60000);
    return () => clearInterval(i);
  }, []);

  const working = rows.filter(r => r.currently_open);

  return (
    <div className="bg-card border border-border/50 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-3 py-2 flex items-center gap-2 text-xs hover:bg-muted/30 transition"
      >
        <Activity className={`w-3.5 h-3.5 ${working.length ? 'text-green-400' : 'text-muted-foreground'}`} />
        <span className="font-mono uppercase tracking-wider text-muted-foreground">Working now</span>
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : (
          <Badge variant="outline" className={working.length ? 'border-green-500/40 text-green-400' : ''}>
            {working.length}
          </Badge>
        )}
        <div className="flex-1 truncate text-left text-foreground/80">
          {working.length === 0 ? 'No one clocked in' :
            working.slice(0, 4).map(w => w.rep_name).join(', ') + (working.length > 4 ? '…' : '')}
        </div>
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {open && (
        <div className="border-t border-border/50 p-2 space-y-1 max-h-64 overflow-y-auto">
          {working.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">Nobody is clocked in right now.</p>
          ) : working.map(w => (
            <div key={w.code} className="flex items-center justify-between gap-2 text-xs px-2 py-1 rounded bg-secondary/30">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="font-medium truncate">{w.rep_name}</span>
                <Badge variant="outline" className="font-mono text-[10px]">{w.role}</Badge>
              </div>
              <span className="text-muted-foreground font-mono">
                {w.last_in ? `since ${new Date(w.last_in).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}
                {w.seconds_window ? ` · ${formatDuration(w.seconds_window)} today` : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WhosWorkingBar;
