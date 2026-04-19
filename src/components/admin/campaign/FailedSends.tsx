import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, Download, RefreshCw, Ban, RotateCcw } from 'lucide-react';

const FREE_DOMAINS = new Set([
  'gmail.com','yahoo.com','hotmail.com','outlook.com','aol.com','icloud.com',
  'att.net','sbcglobal.net','comcast.net','verizon.net','msn.com','live.com',
  'ymail.com','me.com','mac.com','roadrunner.com','rr.com','bellsouth.net',
  'cox.net','charter.net','earthlink.net','juno.com','mail.com','protonmail.com','gmx.com',
]);

interface FailedRow {
  id: string;
  prospect_id: string;
  subject: string | null;
  step_index: number;
  scheduled_for: string;
  attempt_count: number | null;
  error_message: string | null;
  drip_prospects: {
    id: string;
    email: string;
    business_name: string | null;
    status: string;
  } | null;
}

function providerType(email: string): 'free' | 'business' {
  const dom = email.split('@')[1]?.toLowerCase() ?? '';
  return FREE_DOMAINS.has(dom) ? 'free' : 'business';
}

function csvEscape(v: string | number | null | undefined): string {
  const s = v == null ? '' : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export const FailedSends: React.FC = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<FailedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('drip_emails')
      .select('id, prospect_id, subject, step_index, scheduled_for, attempt_count, error_message, drip_prospects(id, email, business_name, status)')
      .eq('status', 'failed')
      .order('scheduled_for', { ascending: false })
      .limit(1000);
    if (error) toast({ title: 'Failed to load', description: error.message, variant: 'destructive' });
    setRows((data as unknown as FailedRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const summary = useMemo(() => {
    let free = 0, business = 0;
    const byDate: Record<string, number> = {};
    for (const r of rows) {
      const email = r.drip_prospects?.email || '';
      if (email) (providerType(email) === 'free' ? free++ : business++);
      const day = r.scheduled_for.slice(0, 10);
      byDate[day] = (byDate[day] || 0) + 1;
    }
    return { total: rows.length, free, business, byDate };
  }, [rows]);

  const downloadCsv = () => {
    const header = ['email','business_name','subject','step_index','scheduled_for','batch_date','email_provider_type','prospect_status','attempt_count','error_message'];
    const lines = [header.join(',')];
    for (const r of rows) {
      const email = r.drip_prospects?.email || '';
      lines.push([
        csvEscape(email),
        csvEscape(r.drip_prospects?.business_name || ''),
        csvEscape(r.subject || ''),
        csvEscape(r.step_index),
        csvEscape(r.scheduled_for),
        csvEscape(r.scheduled_for.slice(0, 10)),
        csvEscape(email ? providerType(email) : ''),
        csvEscape(r.drip_prospects?.status || ''),
        csvEscape(r.attempt_count ?? 0),
        csvEscape((r.error_message || '').replace(/[\r\n]+/g, ' ')),
      ].join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `failed-drip-contacts-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const requeueAll = async () => {
    if (!confirm(`Requeue ALL ${rows.length} failed emails to send again in 1 hour?`)) return;
    setBusy(true);
    try {
      const ids = rows.map(r => r.id);
      const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const { error } = await supabase
        .from('drip_emails')
        .update({ status: 'pending', scheduled_for: future, attempt_count: 0, error_message: null })
        .in('id', ids);
      if (error) throw error;
      toast({ title: 'Requeued', description: `${ids.length} emails set to pending for ${future}` });
      await load();
    } catch (e) {
      toast({ title: 'Requeue failed', description: e instanceof Error ? e.message : 'Unknown', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const markAllBounced = async () => {
    if (!confirm(`Mark all ${rows.length} failed recipients as bounced? They will be excluded from future sends.`)) return;
    setBusy(true);
    try {
      const prospectIds = Array.from(new Set(rows.map(r => r.drip_prospects?.id).filter(Boolean) as string[]));
      const { error } = await supabase
        .from('drip_prospects')
        .update({ status: 'bounced' })
        .in('id', prospectIds);
      if (error) throw error;
      toast({ title: 'Marked bounced', description: `${prospectIds.length} prospects updated` });
      await load();
    } catch (e) {
      toast({ title: 'Update failed', description: e instanceof Error ? e.message : 'Unknown', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="glass p-8 rounded-xl flex items-center justify-center gap-2 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin" /> Loading failed sends...</div>;
  }

  return (
    <div className="glass p-6 rounded-xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-foreground font-display">Failed Sends</h3>
          <p className="text-sm text-muted-foreground">
            {summary.total} failed · {summary.free} free-mail · {summary.business} business
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={busy}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
          <Button variant="outline" size="sm" onClick={downloadCsv} disabled={!rows.length}><Download className="w-4 h-4 mr-1" /> Download CSV</Button>
          <Button variant="outline" size="sm" onClick={markAllBounced} disabled={busy || !rows.length}><Ban className="w-4 h-4 mr-1" /> Mark all bounced</Button>
          <Button variant="default" size="sm" onClick={requeueAll} disabled={busy || !rows.length}><RotateCcw className="w-4 h-4 mr-1" /> Requeue all</Button>
        </div>
      </div>

      {Object.keys(summary.byDate).length > 0 && (
        <div className="text-xs text-muted-foreground">
          By batch date: {Object.entries(summary.byDate).sort().map(([d, n]) => `${d}: ${n}`).join(' · ')}
        </div>
      )}

      <div className="overflow-x-auto border border-border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left text-xs uppercase text-muted-foreground">
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Business</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Step</th>
              <th className="px-3 py-2">Scheduled</th>
              <th className="px-3 py-2">Attempts</th>
              <th className="px-3 py-2">Error</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">No failed sends 🎉</td></tr>
            )}
            {rows.slice(0, 200).map(r => {
              const email = r.drip_prospects?.email || '—';
              const type = email !== '—' ? providerType(email) : '';
              return (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-3 py-2 font-mono text-xs">{email}</td>
                  <td className="px-3 py-2">{r.drip_prospects?.business_name || '—'}</td>
                  <td className="px-3 py-2">
                    <span className={type === 'free' ? 'text-amber-500' : 'text-emerald-500'}>{type}</span>
                  </td>
                  <td className="px-3 py-2">{r.step_index}</td>
                  <td className="px-3 py-2 text-xs">{new Date(r.scheduled_for).toLocaleString()}</td>
                  <td className="px-3 py-2">{r.attempt_count ?? 0}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground max-w-md truncate" title={r.error_message || ''}>
                    {r.error_message || '— (no error captured)'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length > 200 && (
          <div className="px-3 py-2 text-xs text-muted-foreground border-t border-border">
            Showing first 200 of {rows.length}. Download CSV for the full list.
          </div>
        )}
      </div>
    </div>
  );
};
