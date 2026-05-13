import React, { useEffect, useState } from 'react';
import { openRepMail } from '@/lib/repMail';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Activity, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LeadRow {
  id: string;
  business_name: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  industry: string | null;
  location: string | null;
  score: number | null;
  status: string | null;
  claimed_by_code: string | null;
  assigned_to_code: string | null;
  last_touched_at: string | null;
  assigned_at: string | null;
}

interface RepRow {
  code: string;
  rep_name: string;
  last_login: string | null;
  logins_7d: number;
  claims_7d: number;
  touches_7d: number;
  uploads_7d: number;
  leads_total: number;
  leads_claimed: number;
  leads_assigned: number;
  leads: LeadRow[];
}

export const RepActivityPanel: React.FC = () => {
  const [rows, setRows] = useState<RepRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const [{ data: reps }, { data: events }, { data: leads }] = await Promise.all([
        supabase.from('rep_codes').select('code,rep_name').eq('is_active', true),
        supabase.from('rep_activity').select('rep_code,event,created_at').gte('created_at', since).limit(5000),
        supabase.from('rep_leads')
          .select('id,business_name,contact_name,email,phone,industry,location,score,status,claimed_by_code,assigned_to_code,last_touched_at,assigned_at')
          .or('claimed_by_code.not.is.null,assigned_to_code.not.is.null')
          .order('score', { ascending: false })
          .limit(2000),
      ]);
      const map = new Map<string, RepRow>();
      (reps || []).forEach(r => map.set(r.code, {
        code: r.code, rep_name: r.rep_name || '',
        last_login: null, logins_7d: 0, claims_7d: 0, touches_7d: 0, uploads_7d: 0,
        leads_total: 0, leads_claimed: 0, leads_assigned: 0, leads: [],
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
      (leads || []).forEach(l => {
        const owner = l.claimed_by_code || l.assigned_to_code;
        if (!owner) return;
        const row = map.get(owner);
        if (!row) return;
        row.leads.push(l as LeadRow);
        row.leads_total++;
        if (l.claimed_by_code) row.leads_claimed++;
        else if (l.assigned_to_code) row.leads_assigned++;
      });
      setRows(Array.from(map.values()).sort((a,b) => b.leads_total - a.leads_total || (b.logins_7d + b.claims_7d) - (a.logins_7d + a.claims_7d)));
      setLoading(false);
    };
    load();
  }, []);

  const toggle = (code: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  };

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
                  <th className="text-left py-2 w-8"></th>
                  <th className="text-left py-2">Rep</th>
                  <th className="text-right py-2">Last login</th>
                  <th className="text-right py-2">Logins</th>
                  <th className="text-right py-2">Claims</th>
                  <th className="text-right py-2">Touches</th>
                  <th className="text-right py-2">Uploads</th>
                  <th className="text-right py-2">Leads</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const isOpen = expanded.has(r.code);
                  return (
                    <React.Fragment key={r.code}>
                      <tr className="border-b border-border/30 hover:bg-muted/30">
                        <td className="py-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => toggle(r.code)}
                            disabled={r.leads_total === 0}
                            aria-label={isOpen ? 'Collapse leads' : 'Expand leads'}
                          >
                            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </Button>
                        </td>
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
                        <td className="text-right">
                          <button
                            onClick={() => toggle(r.code)}
                            disabled={r.leads_total === 0}
                            className="font-semibold text-amber hover:underline disabled:text-muted-foreground disabled:no-underline disabled:cursor-default"
                          >
                            {r.leads_total}
                          </button>
                          {r.leads_total > 0 && (
                            <p className="text-[10px] text-muted-foreground">
                              {r.leads_claimed} claimed · {r.leads_assigned} assigned
                            </p>
                          )}
                        </td>
                      </tr>
                      {isOpen && r.leads.length > 0 && (
                        <tr className="bg-muted/20 border-b border-border/30">
                          <td colSpan={8} className="p-3">
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-muted-foreground border-b border-border/40">
                                    <th className="text-left py-1.5 px-2">Business</th>
                                    <th className="text-left py-1.5 px-2">Contact</th>
                                    <th className="text-left py-1.5 px-2">Email</th>
                                    <th className="text-left py-1.5 px-2">Phone</th>
                                    <th className="text-left py-1.5 px-2">Industry</th>
                                    <th className="text-left py-1.5 px-2">Location</th>
                                    <th className="text-right py-1.5 px-2">Score</th>
                                    <th className="text-left py-1.5 px-2">State</th>
                                    <th className="text-left py-1.5 px-2">Status</th>
                                    <th className="text-right py-1.5 px-2">Last touched</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {r.leads.map(l => (
                                    <tr key={l.id} className="border-b border-border/20">
                                      <td className="py-1.5 px-2 font-medium">{l.business_name || '—'}</td>
                                      <td className="py-1.5 px-2">{l.contact_name || '—'}</td>
                                      <td className="py-1.5 px-2">
                                        {l.email ? (
                                          <a
                                            href="#" onClick={(e)=>{e.preventDefault(); l.email && openRepMail(l.email);}}
                                            className="hover:text-amber hover:underline text-left"
                                          >
                                            {l.email}
                                          </a>
                                        ) : '—'}
                                      </td>
                                      <td className="py-1.5 px-2">{l.phone || '—'}</td>
                                      <td className="py-1.5 px-2">{l.industry || '—'}</td>
                                      <td className="py-1.5 px-2">{l.location || '—'}</td>
                                      <td className="py-1.5 px-2 text-right">{l.score ?? '—'}</td>
                                      <td className="py-1.5 px-2">
                                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono ${l.claimed_by_code ? 'bg-amber/20 text-amber' : 'bg-muted text-muted-foreground'}`}>
                                          {l.claimed_by_code ? 'CLAIMED' : 'ASSIGNED'}
                                        </span>
                                      </td>
                                      <td className="py-1.5 px-2">{l.status || '—'}</td>
                                      <td className="py-1.5 px-2 text-right text-muted-foreground">
                                        {l.last_touched_at ? new Date(l.last_touched_at).toLocaleDateString() : '—'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
