import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { getAdminToken } from '@/lib/adminAuth';
import { useToast } from '@/hooks/use-toast';
import { openRepMail } from '@/lib/repMail';
import { DollarSign, RefreshCw, Loader2, CheckCircle2, XCircle, Mail, ExternalLink, Send } from 'lucide-react';

interface Payment {
  id: string;
  email: string | null;
  amount_cents: number;
  currency: string;
  status: string;
  environment: string;
  occurred_at: string;
  stripe_session_id: string | null;
}

interface AttemptLite {
  id: string;
  candidate_name: string | null;
  candidate_email: string;
  status: string;
  score_pct: number | null;
  share_code: string | null;
  submitted_at: string | null;
}

const fmt = (cents: number, cur = 'usd') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: (cur || 'usd').toUpperCase() }).format(cents / 100);

export const AdminCareersPayments: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<{ count: number; total_cents: number; unique_emails: number }>({ count: 0, total_cents: 0, unique_emails: 0 });
  const [attempts, setAttempts] = useState<Record<string, AttemptLite>>({});

  const load = async () => {
    setLoading(true);
    try {
      const token = getAdminToken();
      if (!token) throw new Error('Admin session expired');
      const { data, error } = await supabase.functions.invoke('admin-data', {
        body: { action: 'careers_payments' },
        headers: { 'x-admin-token': token },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      setPayments((data as any).payments || []);
      setSummary((data as any).summary || { count: 0, total_cents: 0, unique_emails: 0 });
      setAttempts((data as any).attempts_by_email || {});
    } catch (e) {
      toast({ title: 'Failed to load payments', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const [sending, setSending] = useState<string | null>(null);

  const sendLink = async (p: Payment) => {
    if (!p.email || !p.stripe_session_id) {
      toast({ title: 'Missing email or session', variant: 'destructive' });
      return;
    }
    setSending(p.id);
    try {
      const token = getAdminToken();
      if (!token) throw new Error('Admin session expired');
      const { data, error } = await supabase.functions.invoke('admin-data', {
        body: { action: 'send_careers_test_link', email: p.email, stripe_session_id: p.stripe_session_id },
        headers: { 'x-admin-token': token },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: 'Test link sent', description: `Emailed ${p.email}` });
    } catch (e) {
      toast({ title: 'Send failed', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally {
      setSending(null);
    }
  };

  useEffect(() => { load(); }, []);


  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="font-display flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-amber" /> Careers Test, Payments
          </CardTitle>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />} Refresh
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="rounded-lg border border-border/50 bg-secondary/30 p-3">
            <p className="text-[10px] font-mono uppercase text-muted-foreground">Paid</p>
            <p className="font-display text-2xl text-foreground tabular-nums">{summary.count}</p>
          </div>
          <div className="rounded-lg border border-border/50 bg-secondary/30 p-3">
            <p className="text-[10px] font-mono uppercase text-muted-foreground">Revenue</p>
            <p className="font-display text-2xl text-amber tabular-nums">{fmt(summary.total_cents)}</p>
          </div>
          <div className="rounded-lg border border-border/50 bg-secondary/30 p-3">
            <p className="text-[10px] font-mono uppercase text-muted-foreground">Unique payers</p>
            <p className="font-display text-2xl text-foreground tabular-nums">{summary.unique_emails}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading && payments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Loading…</p>
        ) : payments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No one has paid the test fee yet.</p>
        ) : (
          <div className="space-y-2">
            {payments.map(p => {
              const key = (p.email || '').toLowerCase();
              const at = attempts[key];
              const passed = at?.status === 'passed';
              return (
                <div key={p.id} className="rounded-lg border border-border/50 bg-secondary/20 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <button onClick={() => p.email && openRepMail(p.email)} className="text-amber hover:underline font-mono text-sm truncate max-w-[240px] flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {p.email || '(no email)'}
                      </button>
                      <Badge className="bg-green-500/15 text-green-400 border border-green-500/30 text-[10px]">{p.status}</Badge>
                      <Badge variant="outline" className="text-[10px] uppercase">{p.environment}</Badge>
                      <span className="font-mono text-sm text-foreground">{fmt(p.amount_cents, p.currency)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(p.occurred_at).toLocaleString()}
                      {p.stripe_session_id && <span className="ml-2 font-mono">· {p.stripe_session_id.slice(0, 22)}…</span>}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {at ? (
                      <div className="flex items-center gap-2 justify-end">
                        <Badge className={passed ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-destructive/20 text-destructive border border-destructive/30'}>
                          {passed ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />} {at.status}
                        </Badge>
                        {typeof at.score_pct === 'number' && (
                          <Badge variant="outline" className="font-mono text-[10px]">{Math.round(at.score_pct)}%</Badge>
                        )}
                        {at.share_code && (
                          <span className="font-mono text-[10px] text-muted-foreground">#{at.share_code}</span>
                        )}
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        Paid, no test taken yet <ExternalLink className="w-3 h-3 ml-1" />
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminCareersPayments;
