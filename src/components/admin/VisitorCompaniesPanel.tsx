import React, { useEffect, useState, useCallback } from 'react';
import { openRepMail } from '@/lib/repMail';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Building2, ExternalLink, UserPlus, RefreshCw, Inbox } from 'lucide-react';

interface IdentifiedVisitor {
  id: string;
  company_name: string | null;
  company_domain: string | null;
  person_name: string | null;
  person_email: string | null;
  person_linkedin_url: string | null;
  title: string | null;
  location: string | null;
  pages_viewed: unknown;
  last_seen_at: string;
  added_to_crm: boolean;
}

export const VisitorCompaniesPanel: React.FC = () => {
  const { toast } = useToast();
  const [visitors, setVisitors] = useState<IdentifiedVisitor[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('identified_visitors')
      .select('*')
      .order('last_seen_at', { ascending: false })
      .limit(200);
    if (error) toast({ title: 'Load failed', description: error.message, variant: 'destructive' });
    else setVisitors((data as IdentifiedVisitor[]) || []);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const addToCrm = async (v: IdentifiedVisitor) => {
    try {
      let companyId: string | null = null;
      if (v.company_name) {
        const { data: company, error: cErr } = await supabase
          .from('crm_companies')
          .insert({
            name: v.company_name,
            website: v.company_domain ? `https://${v.company_domain}` : null,
            location: v.location,
          })
          .select('id')
          .single();
        if (cErr) throw cErr;
        companyId = company.id;
      }

      if (v.person_name || v.person_email) {
        const { error: pErr } = await supabase.from('crm_contacts').insert({
          full_name: v.person_name || 'Unknown Visitor',
          email: v.person_email,
          title: v.title,
          source: 'identified_visitor',
          company_id: companyId,
          notes: v.person_linkedin_url ? `LinkedIn: ${v.person_linkedin_url}` : null,
        });
        if (pErr) throw pErr;
      }

      await supabase.from('identified_visitors').update({ added_to_crm: true }).eq('id', v.id);
      toast({ title: 'Added to CRM' });
      load();
    } catch (e) {
      toast({ title: 'Failed', description: String(e), variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-foreground font-display flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber" /> Identified Visitors
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Companies and people who visited your site, identified via RB2B-style webhook.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {visitors.length === 0 && !loading && (
        <div className="glass p-12 rounded-xl text-center">
          <Inbox className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-foreground font-medium">No identified visitors yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            Configure your RB2B Script ID in the Retargeting tab and point its webhook to:
          </p>
          <code className="block mt-2 text-xs bg-secondary/50 p-2 rounded text-amber font-mono break-all">
            https://{import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/rb2b-webhook
          </code>
        </div>
      )}

      <div className="space-y-3">
        {visitors.map((v) => (
          <div key={v.id} className="glass p-4 rounded-xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-foreground">{v.company_name || v.company_domain || 'Unknown company'}</span>
                  {v.company_domain && (
                    <a href={`https://${v.company_domain}`} target="_blank" rel="noreferrer" className="text-xs text-amber hover:underline flex items-center gap-1">
                      {v.company_domain} <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {v.added_to_crm && <span className="text-xs bg-amber/20 text-amber px-2 py-0.5 rounded-full">In CRM</span>}
                </div>
                {(v.person_name || v.title) && (
                  <div className="text-sm text-muted-foreground mt-1">
                    {v.person_name && <span className="font-medium text-foreground">{v.person_name}</span>}
                    {v.title && <span>, {v.title}</span>}
                  </div>
                )}
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-2">
                  {v.person_email && <a href="#" onClick={(e)=>{e.preventDefault();openRepMail(v.person_email);}} className="hover:text-amber">{v.person_email}</a>}
                  {v.person_linkedin_url && (
                    <a href={v.person_linkedin_url} target="_blank" rel="noreferrer" className="text-amber hover:underline flex items-center gap-1">
                      LinkedIn <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {v.location && <span>📍 {v.location}</span>}
                  <span>Last seen {new Date(v.last_seen_at).toLocaleString()}</span>
                </div>
              </div>
              {!v.added_to_crm && (
                <Button size="sm" variant="outline" onClick={() => addToCrm(v)}>
                  <UserPlus className="w-4 h-4 mr-1" /> Add to CRM
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
