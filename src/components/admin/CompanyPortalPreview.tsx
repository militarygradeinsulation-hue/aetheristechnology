import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink, RefreshCw, Building2, Shield, Monitor, Smartphone, Tablet } from 'lucide-react';

type Role = 'partner' | 'rep';
type Device = 'desktop' | 'tablet' | 'mobile';

const DEVICE_WIDTHS: Record<Device, string> = {
  desktop: '100%',
  tablet: '820px',
  mobile: '414px',
};

export const CompanyPortalPreview: React.FC = () => {
  const [role, setRole] = useState<Role>('partner');
  const [device, setDevice] = useState<Device>('desktop');
  const [nonce, setNonce] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const src = `/portal?adminPreview=1&role=${role}&n=${nonce}`;

  const refresh = () => setNonce(n => n + 1);
  const openInNewTab = () => window.open(src, '_blank', 'noopener,noreferrer');

  return (
    <div className="space-y-4">
      <div className="glass p-4 rounded-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-amber" />
          <div>
            <h2 className="text-lg font-bold text-foreground font-display leading-tight">Company Portal — Live Preview</h2>
            <p className="text-xs text-muted-foreground">Exactly what reps and partners see. Edit, click around, push leads, and test workflows.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Role */}
          <div className="flex items-center rounded-md border border-border overflow-hidden">
            {(['partner', 'rep'] as const).map(r => (
              <button
                key={r}
                onClick={() => { setRole(r); refresh(); }}
                className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1 ${
                  role === r ? 'bg-amber text-background' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {r === 'partner' ? <Building2 className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                {r === 'partner' ? 'Partner view' : 'Rep view'}
              </button>
            ))}
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
        Tip: switch between <span className="text-amber">Partner</span> (full access including Company Portal tab) and <span className="text-amber">Rep</span> (sales-focused) to see the exact experience each role gets. Changes you make here (leads pushed, notes added, settings saved) hit the live database — same as a real user.
      </p>
    </div>
  );
};
