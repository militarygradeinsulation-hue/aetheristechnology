import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Activity } from 'lucide-react';

interface RepRow {
  code: string;
  rep_name: string;
  last_login: string | null;
  logins_7d: number;
  claims_7d: number;
  touches_7d: number;
  uploads_7d: number;
}

export const RepActivityPanel: React.FC = () => {
  const [rows, setRows] = useState<RepRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const [{ data: reps }, { data: events }] = await Promise.all([
        supabase.from('rep_codes').select('code,rep_name').eq('is_active', true),
        supabase.from('rep_activity').select('rep_code,event,created_at').gte('created_at', since).limit(5000),
      ]);
      const map = new Map<string, RepRow>();
      (reps || []).forEach(r => map.set(r.code, {
        code: r.code, rep_name: r.rep_name || '',
        last_login: null, logins_7d: 0, claims_7d: 0, touches_7d: 0, uploads_7d: 0,
      }));
      (events || []).forEach(e => {
        const row = map.get(e.rep_code);
        if (!row) return;
        if (e.event === 'login') {
          row.logins_7d++;
          if (!row.last_login || e.created_at > row.last_login) row.last_login = e.created_at;
        } else if (e.event === 'lead_claim') row.claims_7d++;
        else if (e.event === 'lead_touch') row.touches_7d++;
        else if (e.event === 'lead_upload') row.uploads_7d++;
      });
      setRows(Array.from(map.values()).sort((a,b) => (b.logins_7d + b.claims_7d) - (a.logins_7d + a.claims_7d)));
      setLoading(false);
    };
    load();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display">
          <Activity className="w-5 h-5 text-amber" /> Rep Activity (Last 7 Days)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No active reps yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border/50">
                  <th className="text-left py-2">Rep</th>
                  <th className="text-right py-2">Last login</th>
                  <th className="text-right py-2">Logins</th>
                  <th className="text-right py-2">Claims</th>
                  <th className="text-right py-2">Touches</th>
                  <th className="text-right py-2">Uploads</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.code} className="border-b border-border/30">
                    <td className="py-2">
                      <p className="font-semibold text-foreground">{r.rep_name || r.code}</p>
                      <p className="text-xs font-mono text-muted-foreground">{r.code}</p>
                    </td>
                    <td className="text-right text-muted-foreground text-xs">
                      {r.last_login ? new Date(r.last_login).toLocaleString() : '—'}
                    </td>
                    <td className="text-right">{r.logins_7d}</td>
                    <td className="text-right">{r.claims_7d}</td>
                    <td className="text-right">{r.touches_7d}</td>
                    <td className="text-right">{r.uploads_7d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
