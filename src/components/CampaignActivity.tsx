import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Mail, Send, Clock, Flame, Users, AlertCircle, RefreshCw, ChevronDown, ChevronRight, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface DripEmail {
  id: string;
  prospect_id: string;
  sequence_id: string;
  step_index: number;
  status: string;
  subject: string | null;
  scheduled_for: string;
  sent_at: string | null;
}

interface DripProspect {
  id: string;
  email: string;
  business_name: string | null;
  location: string | null;
  industry: string | null;
  status: string;
  website_url: string | null;
  updated_at: string;
}

interface DripSequence {
  id: string;
  name: string;
  steps: unknown;
}

interface ContactSub {
  email: string;
  name: string;
  company: string | null;
  message: string;
  created_at: string;
}

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    sent: 'bg-green-500/20 text-green-400',
    pending: 'bg-amber/20 text-amber',
    scheduled: 'bg-blue-500/20 text-blue-400',
    failed: 'bg-red-500/20 text-red-400',
    bounced: 'bg-red-500/20 text-red-400',
    replied: 'bg-purple-500/20 text-purple-400',
  };
  return map[status] || 'bg-muted text-muted-foreground';
};

export const CampaignActivity: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [emails, setEmails] = useState<DripEmail[]>([]);
  const [prospects, setProspects] = useState<DripProspect[]>([]);
  const [sequences, setSequences] = useState<DripSequence[]>([]);
  const [submissions, setSubmissions] = useState<ContactSub[]>([]);
  const [totalProspects, setTotalProspects] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({ today: true });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [emailRes, prospectRes, seqRes, subRes, countRes] = await Promise.all([
        supabase.from('drip_emails').select('*').order('scheduled_for', { ascending: false }).limit(500),
        supabase.from('drip_prospects').select('*').order('updated_at', { ascending: false }).limit(500),
        supabase.from('drip_sequences').select('id,name,steps'),
        supabase.from('contact_submissions').select('email,name,company,message,created_at').order('created_at', { ascending: false }).limit(100),
        supabase.from('drip_prospects').select('*', { count: 'exact', head: true }),
      ]);
      setEmails((emailRes.data || []) as DripEmail[]);
      setProspects((prospectRes.data || []) as DripProspect[]);
      setSequences((seqRes.data || []) as DripSequence[]);
      setSubmissions((subRes.data || []) as ContactSub[]);
      setTotalProspects(countRes.count || 0);
    } catch {
      toast({ title: 'Failed to load campaign data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const prospectMap = new Map(prospects.map(p => [p.id, p]));
  const sequenceMap = new Map(sequences.map(s => [s.id, s]));
  const submissionEmails = new Set(submissions.map(s => s.email.toLowerCase()));

  const now = new Date();
  const sentEmails = emails.filter(e => e.status === 'sent');
  const pendingEmails = emails.filter(e => e.status === 'pending' || e.status === 'scheduled');
  const failedEmails = emails.filter(e => e.status === 'failed' || e.status === 'bounced');
  const last30 = sentEmails.filter(e => e.sent_at && (now.getTime() - new Date(e.sent_at).getTime()) < 30 * 86400000);

  const todayStr = now.toDateString();
  const sentToday = sentEmails.filter(e => e.sent_at && new Date(e.sent_at).toDateString() === todayStr)
    .sort((a, b) => new Date(b.sent_at!).getTime() - new Date(a.sent_at!).getTime());
  const failedToday = failedEmails.filter(e => {
    const ts = e.sent_at || e.scheduled_for;
    return ts && new Date(ts).toDateString() === todayStr;
  });

  const next24 = pendingEmails.filter(e => {
    const d = new Date(e.scheduled_for);
    return d > now && d.getTime() - now.getTime() < 86400000;
  });
  const next7 = pendingEmails.filter(e => {
    const d = new Date(e.scheduled_for);
    return d > now && d.getTime() - now.getTime() < 7 * 86400000;
  });

  // Hot prospects: those whose email matches a contact submission OR status changed to 'replied'/'interested'
  const hotProspects = prospects.filter(p =>
    submissionEmails.has(p.email.toLowerCase()) ||
    p.status === 'replied' ||
    p.status === 'interested' ||
    p.status === 'contacted'
  );

  // Group pending emails by day
  const queueByDay: Record<string, DripEmail[]> = {};
  pendingEmails.forEach(e => {
    const d = new Date(e.scheduled_for);
    if (d < now) return;
    const key = d.toDateString();
    if (!queueByDay[key]) queueByDay[key] = [];
    queueByDay[key].push(e);
  });
  const sortedDays = Object.keys(queueByDay).sort((a, b) => new Date(a).getTime() - new Date(b).getTime()).slice(0, 14);

  const filteredTimeline = (statusFilter ? emails.filter(e => e.status === statusFilter) : emails).slice(0, 100);

  const stats = [
    { label: 'Sent Today', value: sentToday.length, sub: `${failedToday.length} failed today`, icon: Send },
    { label: 'Total Prospects', value: totalProspects.toLocaleString(), icon: Users },
    { label: 'Sent (30d)', value: last30.length, sub: `${sentEmails.length} all-time`, icon: Send },
    { label: 'Next 24h', value: next24.length, sub: `${next7.length} this week`, icon: Clock },
    { label: 'Hot Prospects', value: hotProspects.length, icon: Flame },
    { label: 'Failed/Bounced', value: failedEmails.length, icon: AlertCircle },
  ];

  if (loading) {
    return (
      <div className="glass p-12 rounded-xl text-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber mx-auto mb-4" />
        <p className="text-muted-foreground">Loading campaign data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground font-display flex items-center gap-2">
          <Mail className="w-6 h-6 text-amber" /> Campaign Activity
        </h2>
        <Button variant="outline" size="sm" onClick={fetchAll}>
          <RefreshCw className="w-4 h-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map(s => (
          <div key={s.label} className="glass p-5 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className="w-4 h-4 text-amber" />
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
            <div className="text-3xl font-bold text-foreground font-display">{s.value}</div>
            {s.sub && <div className="text-xs text-muted-foreground mt-1">{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Hot Prospects */}
      <div className="glass p-6 rounded-xl">
        <h3 className="text-lg font-bold text-foreground font-display mb-4 flex items-center gap-2">
          <Flame className="w-5 h-5 text-amber" /> Hot Prospects
          <span className="text-xs text-muted-foreground font-normal">replied / submitted form / contacted</span>
        </h3>
        {hotProspects.length === 0 ? (
          <p className="text-sm text-muted-foreground">No interested prospects yet. Keep the campaign running.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {hotProspects.slice(0, 50).map(p => {
              const sub = submissions.find(s => s.email.toLowerCase() === p.email.toLowerCase());
              return (
                <div key={p.id} className="flex items-start justify-between gap-3 p-3 bg-secondary/30 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{p.business_name || p.email}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge(p.status)}`}>{p.status}</span>
                      {sub && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">submitted form</span>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      <a href={`mailto:${p.email}`} className="hover:text-amber">{p.email}</a>
                      {p.location && <span> · {p.location}</span>}
                      {p.industry && <span> · {p.industry}</span>}
                    </div>
                    {sub && <p className="text-xs text-foreground/80 mt-1 italic line-clamp-2">"{sub.message}"</p>}
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(p.updated_at).toLocaleDateString()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Next Steps Queue */}
      <div className="glass p-6 rounded-xl">
        <h3 className="text-lg font-bold text-foreground font-display mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber" /> Next Steps Queue
          <span className="text-xs text-muted-foreground font-normal">upcoming sends grouped by day</span>
        </h3>
        {sortedDays.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing queued. Drip system is idle.</p>
        ) : (
          <div className="space-y-2">
            {sortedDays.map(day => {
              const list = queueByDay[day];
              const isToday = day === now.toDateString();
              const key = isToday ? 'today' : day;
              const expanded = expandedDays[key];
              const label = isToday ? 'Today' : new Date(day).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
              return (
                <div key={day} className="bg-secondary/30 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedDays(prev => ({ ...prev, [key]: !prev[key] }))}
                    className="w-full flex items-center justify-between p-3 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      <span className="font-semibold text-foreground">{label}</span>
                      <span className="text-xs text-muted-foreground">{list.length} sends</span>
                    </div>
                  </button>
                  {expanded && (
                    <div className="px-3 pb-3 space-y-1">
                      {list.slice(0, 30).map(e => {
                        const p = prospectMap.get(e.prospect_id);
                        const seq = sequenceMap.get(e.sequence_id);
                        const stepCount = Array.isArray(seq?.steps) ? seq.steps.length : 0;
                        return (
                          <div key={e.id} className="flex items-center justify-between gap-3 text-xs py-1.5 px-2 rounded bg-background/40">
                            <span className="text-muted-foreground whitespace-nowrap">
                              {new Date(e.scheduled_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="text-foreground flex-1 truncate">{p?.business_name || p?.email || 'Unknown'}</span>
                            <span className="text-muted-foreground truncate max-w-[40%]">{e.subject || '—'}</span>
                            <span className="text-amber whitespace-nowrap">Step {e.step_index + 1}{stepCount > 0 ? `/${stepCount}` : ''}</span>
                          </div>
                        );
                      })}
                      {list.length > 30 && <p className="text-xs text-muted-foreground text-center pt-2">+ {list.length - 30} more</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Email Send Timeline */}
      <div className="glass p-6 rounded-xl">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-lg font-bold text-foreground font-display flex items-center gap-2">
            <Send className="w-5 h-5 text-amber" /> Email Send Timeline
          </h3>
          <div className="flex gap-1 flex-wrap">
            {['', 'sent', 'pending', 'failed', 'bounced'].map(f => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  statusFilter === f ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                {f || 'All'}
              </button>
            ))}
          </div>
        </div>
        {filteredTimeline.length === 0 ? (
          <p className="text-sm text-muted-foreground">No emails to show.</p>
        ) : (
          <div className="space-y-1 max-h-[500px] overflow-y-auto">
            {filteredTimeline.map(e => {
              const p = prospectMap.get(e.prospect_id);
              const seq = sequenceMap.get(e.sequence_id);
              const stepCount = Array.isArray(seq?.steps) ? seq.steps.length : 0;
              const ts = e.sent_at || e.scheduled_for;
              return (
                <div key={e.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-secondary/30 text-sm">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-mono whitespace-nowrap ${statusBadge(e.status)}`}>
                    {e.status === 'sent' ? <CheckCircle2 className="w-3 h-3 inline mr-1" /> : e.status === 'failed' ? <XCircle className="w-3 h-3 inline mr-1" /> : null}
                    {e.status}
                  </span>
                  <span className="text-foreground font-medium truncate flex-1 min-w-0">
                    {p?.business_name || p?.email || 'Unknown prospect'}
                  </span>
                  <span className="text-muted-foreground truncate hidden sm:block max-w-[30%]">{e.subject || '—'}</span>
                  <span className="text-amber text-xs whitespace-nowrap">Step {e.step_index + 1}{stepCount > 0 ? `/${stepCount}` : ''}</span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
