import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { getAdminToken } from '@/lib/adminAuth';
import { useToast } from '@/hooks/use-toast';
import { openRepMail } from '@/lib/repMail';
import { DollarSign, RefreshCw, Loader2, CheckCircle2, XCircle, Mail, Send, ArrowUpDown, X, Copy, Link as LinkIcon } from 'lucide-react';

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

type SortKey = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc' | 'email_asc';
type TestFilter = 'all' | 'taken' | 'not_taken' | 'passed' | 'failed';

export const AdminCareersPayments: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<{ count: number; total_cents: number; unique_emails: number }>({ count: 0, total_cents: 0, unique_emails: 0 });
  const [attempts, setAttempts] = useState<Record<string, AttemptLite>>({});
  const [emailStatus, setEmailStatus] = useState<Record<string, { status: string; error: string | null; sent_at: string | null }>>({});
  const [linkBase, setLinkBase] = useState<string>('https://aetheris.technology/careers/test?session_id=');
  const [sending, setSending] = useState<string | null>(null);

  // Filters
  const [emailQ, setEmailQ] = useState('');
  const [minAmt, setMinAmt] = useState('');
  const [maxAmt, setMaxAmt] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [testFilter, setTestFilter] = useState<TestFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('date_desc');

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
      setEmailStatus((data as any).email_send_status || {});
      if ((data as any).test_link_base) setLinkBase((data as any).test_link_base);
    } catch (e) {
      toast({ title: 'Failed to load payments', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

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

  const clearFilters = () => {
    setEmailQ(''); setMinAmt(''); setMaxAmt('');
    setFromDate(''); setToDate(''); setTestFilter('all'); setSortKey('date_desc');
  };

  const filtered = useMemo(() => {
    const min = minAmt ? Number(minAmt) * 100 : null;
    const max = maxAmt ? Number(maxAmt) * 100 : null;
    const from = fromDate ? new Date(fromDate).getTime() : null;
    const to = toDate ? new Date(toDate).getTime() + 86_400_000 : null; // inclusive
    const q = emailQ.trim().toLowerCase();

    const rows = payments.filter(p => {
      if (q && !(p.email || '').toLowerCase().includes(q)) return false;
      if (min !== null && p.amount_cents < min) return false;
      if (max !== null && p.amount_cents > max) return false;
      const t = new Date(p.occurred_at).getTime();
      if (from !== null && t < from) return false;
      if (to !== null && t >= to) return false;
      const at = attempts[(p.email || '').toLowerCase()];
      if (testFilter === 'taken' && !at) return false;
      if (testFilter === 'not_taken' && at) return false;
      if (testFilter === 'passed' && at?.status !== 'passed') return false;
      if (testFilter === 'failed' && !(at && at.status !== 'passed')) return false;
      return true;
    });

    rows.sort((a, b) => {
      switch (sortKey) {
        case 'date_asc': return new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime();
        case 'amount_desc': return b.amount_cents - a.amount_cents;
        case 'amount_asc': return a.amount_cents - b.amount_cents;
        case 'email_asc': return (a.email || '').localeCompare(b.email || '');
        case 'date_desc':
        default: return new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime();
      }
    });
    return rows;
  }, [payments, attempts, emailQ, minAmt, maxAmt, fromDate, toDate, testFilter, sortKey]);

  const filteredTotal = filtered.reduce((s, p) => s + (p.status === 'paid' ? p.amount_cents : 0), 0);
  const activeFilters = !!(emailQ || minAmt || maxAmt || fromDate || toDate || testFilter !== 'all' || sortKey !== 'date_desc');

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

        {/* Filters */}
        <div className="mt-4 rounded-lg border border-border/50 bg-background/40 p-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] font-mono uppercase text-muted-foreground">Payer email</label>
              <Input value={emailQ} onChange={e => setEmailQ(e.target.value)} placeholder="search email…" className="h-8 mt-1" />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase text-muted-foreground">Amount ($)</label>
              <div className="flex items-center gap-1 mt-1">
                <Input type="number" min="0" value={minAmt} onChange={e => setMinAmt(e.target.value)} placeholder="min" className="h-8" />
                <span className="text-muted-foreground text-xs">–</span>
                <Input type="number" min="0" value={maxAmt} onChange={e => setMaxAmt(e.target.value)} placeholder="max" className="h-8" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase text-muted-foreground">Date range</label>
              <div className="flex items-center gap-1 mt-1">
                <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="h-8" />
                <span className="text-muted-foreground text-xs">–</span>
                <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="h-8" />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono uppercase text-muted-foreground">Test:</span>
            {(['all', 'taken', 'not_taken', 'passed', 'failed'] as TestFilter[]).map(k => (
              <button
                key={k}
                onClick={() => setTestFilter(k)}
                className={`text-[11px] font-mono uppercase px-2 py-1 rounded border transition ${
                  testFilter === k ? 'border-amber bg-amber/15 text-amber' : 'border-border/50 text-muted-foreground hover:text-foreground'
                }`}
              >
                {k.replace('_', ' ')}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
              <select
                value={sortKey}
                onChange={e => setSortKey(e.target.value as SortKey)}
                className="h-8 rounded border border-border/50 bg-background text-xs px-2"
              >
                <option value="date_desc">Newest first</option>
                <option value="date_asc">Oldest first</option>
                <option value="amount_desc">Amount, high → low</option>
                <option value="amount_asc">Amount, low → high</option>
                <option value="email_asc">Email A → Z</option>
              </select>
              {activeFilters && (
                <Button size="sm" variant="ghost" onClick={clearFilters} className="h-8 text-xs">
                  <X className="w-3 h-3 mr-1" /> Clear
                </Button>
              )}
            </div>
          </div>
          <p className="text-[11px] font-mono text-muted-foreground">
            Showing <span className="text-foreground">{filtered.length}</span> of {payments.length} · Filtered revenue{' '}
            <span className="text-amber">{fmt(filteredTotal)}</span>
          </p>
        </div>
      </CardHeader>
      <CardContent>
        {loading && payments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {payments.length === 0 ? 'No one has paid the test fee yet.' : 'No payments match those filters.'}
          </p>
        ) : (
          <div className="space-y-2">
            {filtered.map(p => {
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
                      <div className="flex items-center gap-2 justify-end flex-wrap">
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          Paid, no test taken yet
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => sendLink(p)}
                          disabled={sending === p.id || !p.email || !p.stripe_session_id}
                          className="h-7 text-xs"
                        >
                          {sending === p.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Send className="w-3 h-3 mr-1" />}
                          Email test link
                        </Button>
                      </div>
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
