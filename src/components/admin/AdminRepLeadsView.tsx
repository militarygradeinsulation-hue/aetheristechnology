// Renders the rep-portal Leads workspace (LeadsBoard + all its tools)
// inline inside the admin dashboard — full width, no iframe, no shrunken
// preview. Admin picks a rep; we silently impersonate to obtain a portal
// token, then render the rep's actual Leads UI.

import React, { useEffect, useState } from 'react';
import { Loader2, User, Shield, Building2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { getAdminToken } from '@/lib/adminAuth';
import {
  setPortalSession,
  clearPortalSession,
  getPortalProfile,
  type PortalProfile,
} from '@/lib/portalAuth';
import { useToast } from '@/hooks/use-toast';
import { LeadsBoard } from '@/components/portal/LeadsBoard';

interface RepOption {
  code: string;
  rep_name: string;
  role: 'rep' | 'partner';
  is_active: boolean;
}

const REP_KEY = 'admin.leadsView.selectedRep.v1';

export const AdminRepLeadsView: React.FC = () => {
  const { toast } = useToast();
  const [reps, setReps] = useState<RepOption[]>([]);
  const [selected, setSelected] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(REP_KEY) || '';
  });
  const [loadingReps, setLoadingReps] = useState(true);
  const [impersonating, setImpersonating] = useState(false);
  const [profile, setProfile] = useState<PortalProfile | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => { try { localStorage.setItem(REP_KEY, selected); } catch {} }, [selected]);

  // Load active reps + partners
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('admin-rep-codes', {
          body: { action: 'list' },
          headers: { 'x-admin-token': getAdminToken() || '' },
        });
        if (error) throw error;
        const list: RepOption[] = (data?.reps || data || [])
          .filter((r: RepOption) => r.is_active !== false)
          .sort((a: RepOption, b: RepOption) =>
            (a.role === b.role ? 0 : a.role === 'partner' ? -1 : 1) ||
            (a.rep_name || '').localeCompare(b.rep_name || ''),
          );
        setReps(list);
        // Default to first rep if nothing chosen
        if (!selected && list.length) setSelected(list[0].code);
      } catch (e) {
        console.warn('Could not load reps', e);
      } finally {
        setLoadingReps(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Impersonate selected rep so LeadsBoard's portal token works
  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    (async () => {
      setImpersonating(true);
      try {
        const { data, error } = await supabase.functions.invoke('admin-impersonate-rep', {
          body: { code: selected },
          headers: { 'x-admin-token': getAdminToken() || '' },
        });
        if (error || !data?.ok) throw new Error(data?.error || error?.message || 'Failed');
        if (cancelled) return;
        setPortalSession(data.token, data.profile as PortalProfile);
        setProfile(data.profile as PortalProfile);
        setNonce(n => n + 1);
      } catch (e) {
        toast({
          title: 'Could not load rep leads',
          description: e instanceof Error ? e.message : String(e),
          variant: 'destructive',
        });
      } finally {
        if (!cancelled) setImpersonating(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selected, toast]);

  // Clear impersonation when leaving the admin Leads tab
  useEffect(() => () => { clearPortalSession(); }, []);

  const selectedRep = reps.find(r => r.code === selected);

  return (
    <div className="space-y-4">
      <div className="glass p-4 rounded-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {selectedRep?.role === 'partner'
            ? <Building2 className="w-5 h-5 text-amber" />
            : <Shield className="w-5 h-5 text-amber" />}
          <div>
            <h2 className="text-lg font-bold text-foreground font-display leading-tight">
              Leads Workspace
            </h2>
            <p className="text-xs text-muted-foreground">
              The same Leads board, Game Plan, Detective, clues trail and playbook your reps use — full size, inside admin. Pick a rep to load their queue. Changes are live.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border border-border bg-background pl-2 pr-1">
            <User className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              disabled={loadingReps}
              className="bg-background text-foreground text-xs py-1.5 pr-2 focus:outline-none cursor-pointer max-w-[260px] [&>optgroup]:bg-background [&>optgroup]:text-muted-foreground [&>option]:bg-background [&>option]:text-foreground"
            >
              {!selected && <option value="">Select a rep…</option>}
              {reps.filter(r => r.role === 'partner').length > 0 && (
                <optgroup label="Partners">
                  {reps.filter(r => r.role === 'partner').map(r => (
                    <option key={r.code} value={r.code}>{r.rep_name || r.code} ({r.code})</option>
                  ))}
                </optgroup>
              )}
              {reps.filter(r => r.role !== 'partner').length > 0 && (
                <optgroup label="Reps">
                  {reps.filter(r => r.role !== 'partner').map(r => (
                    <option key={r.code} value={r.code}>{r.rep_name || r.code} ({r.code})</option>
                  ))}
                </optgroup>
              )}
            </select>
            {(loadingReps || impersonating) && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
          </div>
          <Button variant="outline" size="sm" onClick={() => setNonce(n => n + 1)} disabled={!profile}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Reload
          </Button>
        </div>
      </div>

      {selectedRep && profile && (
        <div className="glass px-4 py-2 rounded-lg flex items-center gap-3 text-xs">
          {selectedRep.role === 'partner'
            ? <Building2 className="w-4 h-4 text-amber" />
            : <Shield className="w-4 h-4 text-amber" />}
          <span className="font-semibold text-foreground">Viewing as: {selectedRep.rep_name || selectedRep.code}</span>
          <span className="font-mono text-muted-foreground">{selectedRep.code}</span>
          <span className="text-muted-foreground uppercase tracking-wider">{selectedRep.role}</span>
          <span className="ml-auto text-crimson font-mono uppercase">● Live data</span>
        </div>
      )}

      {!selected && !loadingReps && (
        <div className="glass p-12 rounded-xl text-center text-muted-foreground">
          Select a rep above to load their Leads workspace.
        </div>
      )}

      {selected && impersonating && !profile && (
        <div className="glass p-12 rounded-xl text-center text-muted-foreground inline-flex items-center justify-center gap-2 w-full">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading rep session…
        </div>
      )}

      {profile && (
        <div key={`${profile.code}-${nonce}`}>
          <LeadsBoard />
        </div>
      )}
    </div>
  );
};
