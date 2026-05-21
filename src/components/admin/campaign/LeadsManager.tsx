import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Pencil, Trash2, RefreshCw, Search, Users, Phone, Sparkles, Mail, Linkedin, Building2, ExternalLink } from 'lucide-react';
import { getAdminToken } from '@/lib/adminAuth';

interface LookupResult {
  local_matches: { source: string; label: string; data: any }[];
  rocketreach: any | null;
  rocketreach_error?: string | null;
}

const ContactLookupPanel: React.FC = () => {
  const { toast } = useToast();
  const [q, setQ] = useState({ phone: '', email: '', name: '', company: '', linkedin: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);

  const run = async () => {
    if (!q.phone && !q.email && !q.name && !q.company && !q.linkedin) {
      toast({ title: 'Enter at least one field', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const token = getAdminToken();
      const { data, error } = await supabase.functions.invoke('admin-lookup-contact', {
        body: q,
        headers: token ? { 'x-admin-token': token } : {},
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      setResult(data as LookupResult);
    } catch (e: any) {
      toast({ title: 'Lookup failed', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const rr = result?.rocketreach;
  return (
    <div className="glass p-6 rounded-xl space-y-4">
      <div>
        <h3 className="text-lg font-bold text-foreground font-display flex items-center gap-2">
          <Search className="w-5 h-5 text-amber" /> Contact Lookup
        </h3>
        <p className="text-xs text-muted-foreground">
          Paste a phone, email, name, company, or LinkedIn URL. Searches our database first, then RocketReach.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="relative">
          <Phone className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8" placeholder="Phone number" value={q.phone}
            onChange={(e) => setQ({ ...q, phone: e.target.value })} />
        </div>
        <div className="relative">
          <Mail className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8" placeholder="Email" value={q.email}
            onChange={(e) => setQ({ ...q, email: e.target.value })} />
        </div>
        <Input placeholder="Full name" value={q.name} onChange={(e) => setQ({ ...q, name: e.target.value })} />
        <div className="relative">
          <Building2 className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8" placeholder="Company" value={q.company}
            onChange={(e) => setQ({ ...q, company: e.target.value })} />
        </div>
        <div className="relative md:col-span-2">
          <Linkedin className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8" placeholder="LinkedIn profile URL (optional)" value={q.linkedin}
            onChange={(e) => setQ({ ...q, linkedin: e.target.value })} />
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={run} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
          Look up
        </Button>
        {result && (
          <Button variant="ghost" onClick={() => { setResult(null); setQ({ phone:'', email:'', name:'', company:'', linkedin:'' }); }}>
            Clear
          </Button>
        )}
      </div>

      {result && (
        <div className="space-y-4 pt-2 border-t border-border">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-amber mb-2">
              In our database ({result.local_matches.length})
            </div>
            {result.local_matches.length === 0 ? (
              <p className="text-sm text-muted-foreground">No matches in our data.</p>
            ) : (
              <div className="space-y-2">
                {result.local_matches.map((m, i) => (
                  <div key={i} className="bg-secondary/30 rounded-lg p-3 text-sm">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{m.label}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400">{m.source}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 space-x-2">
                      {m.data.email && <span>📧 {m.data.email}</span>}
                      {m.data.candidate_email && <span>📧 {m.data.candidate_email}</span>}
                      {m.data.phone && <span>📞 {m.data.phone}</span>}
                      {m.data.candidate_phone && <span>📞 {m.data.candidate_phone}</span>}
                      {m.data.status && <span>· {m.data.status}</span>}
                      {m.data.created_at && <span>· {new Date(m.data.created_at).toLocaleDateString()}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-amber mb-2">RocketReach</div>
            {result.rocketreach_error && (
              <p className="text-sm text-red-400">{result.rocketreach_error}</p>
            )}
            {!rr && !result.rocketreach_error && (
              <p className="text-sm text-muted-foreground">No RocketReach match found.</p>
            )}
            {rr && (
              <div className="bg-secondary/30 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  {rr.profile_pic && <img src={rr.profile_pic} alt="" className="w-12 h-12 rounded-full" />}
                  <div className="flex-1">
                    <div className="font-bold text-foreground">{rr.name}</div>
                    <div className="text-sm text-muted-foreground">{rr.title}{rr.employer ? ` · ${rr.employer}` : ''}</div>
                    {rr.location && <div className="text-xs text-muted-foreground">{rr.location}</div>}
                    {rr.linkedin_url && (
                      <a href={rr.linkedin_url} target="_blank" rel="noreferrer"
                         className="inline-flex items-center gap-1 text-xs text-amber hover:underline mt-1">
                        <Linkedin className="w-3 h-3" /> LinkedIn <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
                {!!rr.emails?.length && (
                  <div>
                    <div className="text-xs font-bold text-foreground mb-1">Emails</div>
                    {rr.emails.map((e: any, i: number) => (
                      <div key={i} className="text-sm text-muted-foreground">
                        {e.email} <span className="text-xs">({[e.type, e.grade, e.smtp_valid].filter(Boolean).join(' · ')})</span>
                      </div>
                    ))}
                  </div>
                )}
                {!!rr.phones?.length && (
                  <div>
                    <div className="text-xs font-bold text-foreground mb-1">Phones</div>
                    {rr.phones.map((p: any, i: number) => (
                      <div key={i} className="text-sm text-muted-foreground">{p.number} {p.type ? `(${p.type})` : ''}</div>
                    ))}
                  </div>
                )}
                {!!rr.job_history?.length && (
                  <div>
                    <div className="text-xs font-bold text-foreground mb-1">Work history</div>
                    {rr.job_history.map((j: any, i: number) => (
                      <div key={i} className="text-xs text-muted-foreground">
                        {j.title} @ {j.company_name} {j.start_date ? `(${j.start_date}${j.end_date ? `–${j.end_date}` : '–present'})` : ''}
                      </div>
                    ))}
                  </div>
                )}
                {!!rr.additional?.length && (
                  <div>
                    <div className="text-xs font-bold text-foreground mb-1">Other people at this company</div>
                    {rr.additional.map((p: any, i: number) => (
                      <div key={i} className="text-xs text-muted-foreground py-1 border-t border-border/50">
                        <div className="text-foreground font-semibold">{p.name} — {p.title}</div>
                        {p.emails?.length > 0 && <div>{p.emails.join(', ')}</div>}
                        {p.phones?.length > 0 && <div>{p.phones.join(', ')}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface Lead {
  id: string;
  email: string;
  business_name: string | null;
  industry: string | null;
  location: string | null;
  website_url: string | null;
  status: string;
  updated_at: string;
}

const STATUS_OPTIONS = ['new', 'imported', 'active', 'replied', 'unsubscribed', 'not_interested', 'bounced'];

export const LeadsManager: React.FC = () => {
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editing, setEditing] = useState<Lead | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('drip_prospects')
      .select('id,email,business_name,industry,location,website_url,status,updated_at')
      .order('updated_at', { ascending: false })
      .limit(500);
    if (error) toast({ title: 'Failed to load leads', description: error.message, variant: 'destructive' });
    setLeads((data || []) as Lead[]);
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = leads.filter(l => {
    if (statusFilter && l.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return l.email.toLowerCase().includes(q)
        || (l.business_name || '').toLowerCase().includes(q)
        || (l.industry || '').toLowerCase().includes(q)
        || (l.location || '').toLowerCase().includes(q);
    }
    return true;
  });

  const remove = async (lead: Lead) => {
    if (!confirm(`Delete ${lead.business_name || lead.email}? This also removes their queued emails.`)) return;
    // Delete queued emails first (FK)
    await supabase.from('drip_emails').delete().eq('prospect_id', lead.id);
    const { error } = await supabase.from('drip_prospects').delete().eq('id', lead.id);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
      return;
    }
    setLeads(prev => prev.filter(l => l.id !== lead.id));
    toast({ title: 'Lead deleted' });
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase.from('drip_prospects').update({
      email: editing.email.trim().toLowerCase(),
      business_name: editing.business_name || null,
      industry: editing.industry || null,
      location: editing.location || null,
      website_url: editing.website_url || null,
      status: editing.status,
    }).eq('id', editing.id);
    setSaving(false);
    if (error) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
      return;
    }
    setEditing(null);
    toast({ title: 'Lead updated' });
    load();
  };

  const statusColor = (s: string) => {
    if (s === 'replied' || s === 'interested') return 'bg-green-500/20 text-green-400';
    if (s === 'unsubscribed' || s === 'bounced') return 'bg-red-500/20 text-red-400';
    if (s === 'active') return 'bg-amber/20 text-amber';
    if (s === 'not_interested') return 'bg-muted text-muted-foreground';
    return 'bg-blue-500/20 text-blue-400';
  };

  return (
    <div className="space-y-4">
      <ContactLookupPanel />
      <div className="glass p-6 rounded-xl space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-bold text-foreground font-display flex items-center gap-2">
            <Users className="w-5 h-5 text-amber" /> Leads
          </h3>
          <p className="text-xs text-muted-foreground">Edit, delete, or change status of any prospect.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search email, business, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-background border border-input rounded-md px-3 text-sm"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="text-xs text-muted-foreground">
        Showing {filtered.length} of {leads.length} leads
      </div>

      <div className="max-h-[500px] overflow-y-auto space-y-1">
        {filtered.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground text-center py-8">No leads match your filter.</p>
        )}
        {filtered.map(lead => (
          <div key={lead.id} className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg text-sm">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-foreground truncate">{lead.business_name || lead.email}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(lead.status)}`}>{lead.status}</span>
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {lead.email}
                {lead.location && <> · {lead.location}</>}
                {lead.industry && <> · {lead.industry}</>}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setEditing({ ...lead })}>
              <Pencil className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => remove(lead)}>
              <Trash2 className="w-4 h-4 text-red-400" />
            </Button>
          </div>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Lead</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Email</Label>
                <Input value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Business name</Label>
                <Input value={editing.business_name || ''} onChange={(e) => setEditing({ ...editing, business_name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Industry</Label>
                  <Input value={editing.industry || ''} onChange={(e) => setEditing({ ...editing, industry: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Location</Label>
                  <Input value={editing.location || ''} onChange={(e) => setEditing({ ...editing, location: e.target.value })} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Website</Label>
                <Input value={editing.website_url || ''} onChange={(e) => setEditing({ ...editing, website_url: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <select
                  value={editing.status}
                  onChange={(e) => setEditing({ ...editing, status: e.target.value })}
                  className="w-full bg-background border border-input rounded-md px-3 h-10 text-sm"
                >
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
