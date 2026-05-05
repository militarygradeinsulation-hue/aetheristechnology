import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink, RefreshCw, Building2, Shield, Monitor, Smartphone, Tablet, User, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getAdminToken } from '@/lib/adminAuth';
import { setPortalSession, clearPortalSession, type PortalProfile } from '@/lib/portalAuth';
import { useToast } from '@/hooks/use-toast';

type Device = 'desktop' | 'tablet' | 'mobile';

const DEVICE_WIDTHS: Record<Device, string> = {
  desktop: '100%',
  tablet: '820px',
  mobile: '414px',
};

interface RepOption {
  code: string;
  rep_name: string;
  role: 'rep' | 'partner';
  is_active: boolean;
}

const GENERIC_PARTNER = '__partner__';
const GENERIC_REP = '__rep__';

export const CompanyPortalPreview: React.FC = () => {
  const { toast } = useToast();
  const [device, setDevice] = useState<Device>('desktop');
  const [nonce, setNonce] = useState(0);
  const [reps, setReps] = useState<RepOption[]>([]);
  const [selected, setSelected] = useState<string>(GENERIC_PARTNER);
  const [loadingReps, setLoadingReps] = useState(true);
  const [impersonating, setImpersonating] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Load reps for the picker
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
      } catch (e) {
        console.warn('Could not load reps for impersonation', e);
      } finally {
        setLoadingReps(false);
      }
    })();
  }, []);

  // When selection changes, set up the portal session in localStorage so the
  // iframe (same origin) loads as that rep with their real data.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Generic = synthetic admin preview (handled by PortalPage)
      if (selected === GENERIC_PARTNER || selected === GENERIC_REP) {
        clearPortalSession();
        setNonce(n => n + 1);
        return;
      }
      setImpersonating(true);
      try {
        const { data, error } = await supabase.functions.invoke('admin-impersonate-rep', {
          body: { code: selected },
          headers: { 'x-admin-token': getAdminToken() || '' },
        });
        if (error || !data?.ok) throw new Error(data?.error || error?.message || 'Failed');
        if (cancelled) return;
        setPortalSession(data.token, data.profile as PortalProfile);
        setNonce(n => n + 1);
      } catch (e) {
        toast({
          title: 'Could not load rep portal',
          description: e instanceof Error ? e.message : String(e),
          variant: 'destructive',
        });
      } finally {
        if (!cancelled) setImpersonating(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  // Always clear the impersonated session when leaving this view so the
  // admin's own portal session (if any) isn't left polluted.
  useEffect(() => () => { clearPortalSession(); }, []);

  const role: 'rep' | 'partner' =
    selected === GENERIC_REP
      ? 'rep'
      : selected === GENERIC_PARTNER
        ? 'partner'
        : (reps.find(r => r.code === selected)?.role ?? 'rep');

  const src = `/portal?adminPreview=1&role=${role}&n=${nonce}`;

  const refresh = () => setNonce(n => n + 1);
  const openInNewTab = () => window.open(src, '_blank', 'noopener,noreferrer');

  const selectedRep = reps.find(r => r.code === selected);

  return (
    <div className="space-y-4">
      <div className="glass p-4 rounded-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-amber" />
          <div>
            <h2 className="text-lg font-bold text-foreground font-display leading-tight">Company Portal — Live Preview</h2>
            <p className="text-xs text-muted-foreground">View any rep's real portal — leads, commissions, calendar, training. Changes are live.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Rep / Partner picker */}
          <div className="flex items-center gap-1 rounded-md border border-border bg-background pl-2 pr-1">
            <User className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              disabled={loadingReps}
              className="bg-transparent text-xs py-1.5 pr-2 focus:outline-none cursor-pointer max-w-[220px]"
            >
              <optgroup label="Generic preview">
                <option value={GENERIC_PARTNER}>Generic Partner view</option>
                <option value={GENERIC_REP}>Generic Rep view</option>
              </optgroup>
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
          {/* Device */}
          <div className="flex items-center rounded-md border border-border overflow-hidden">
            <button onClick={() => setDevice('desktop')} className={`px-2 py-1.5 ${device === 'desktop' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`} title="Desktop"><Monitor className="w-3.5 h-3.5" /></button>
            <button onClick={() => setDevice('tablet')} className={`px-2 py-1.5 ${device === 'tablet' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`} title="Tablet"><Tablet className="w-3.5 h-3.5" /></button>
            <button onClick={() => setDevice('mobile')} className={`px-2 py-1.5 ${device === 'mobile' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`} title="Mobile"><Smartphone className="w-3.5 h-3.5" /></button>
          </div>
          <Button variant="outline" size="sm" onClick={refresh}><RefreshCw className="w-3.5 h-3.5 mr-1" /> Reload</Button>
          <Button variant="outline" size="sm" onClick={openInNewTab}><ExternalLink className="w-3.5 h-3.5 mr-1" /> Open in new tab</Button>
        </div>
      </div>

      {selectedRep && (
        <div className="glass px-4 py-2 rounded-lg flex items-center gap-3 text-xs">
          {selectedRep.role === 'partner' ? <Building2 className="w-4 h-4 text-amber" /> : <Shield className="w-4 h-4 text-amber" />}
          <span className="font-semibold text-foreground">Viewing as: {selectedRep.rep_name || selectedRep.code}</span>
          <span className="font-mono text-muted-foreground">{selectedRep.code}</span>
          <span className="text-muted-foreground uppercase tracking-wider">{selectedRep.role}</span>
          <span className="ml-auto text-crimson font-mono uppercase">● Live data</span>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card/30 p-3 flex justify-center overflow-auto">
        <iframe
          ref={iframeRef}
          key={nonce}
          src={src}
          title="Company Portal Preview"
          className="bg-background rounded-lg border border-border/50 w-full"
          style={{ width: DEVICE_WIDTHS[device], height: '80vh', maxWidth: '100%' }}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Pick a specific <span className="text-amber">rep or partner</span> to load their actual portal — assigned leads, notes, calendar, commissions, training. Generic views show the empty experience. Anything you change here writes to the live database.
      </p>
    </div>
  );
};
