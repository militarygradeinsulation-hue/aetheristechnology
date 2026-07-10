// Launches HubSpot's native calling window and PopTox in popups. Both apps
// block iframes (X-Frame-Options), so popups are the only in-browser option.
// Reps sign in once per popup; the browser keeps the session between launches.
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Phone, ExternalLink, Search, PhoneCall, PhoneOutgoing } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const HUBSPOT_CALLING_URL = 'https://app-na2.hubspot.com/calling-window-ui/244481481';
const HUBSPOT_CONTACTS_URL = 'https://app-na2.hubspot.com/contacts/244481481/objects/0-1/views/all/list';
const POPTOX_URL = 'https://www.poptox.com/dialpad';

function normalizeNumber(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, '');
  if (!digits) return '';
  if (digits.startsWith('+')) return digits;
  // Assume US if 10 digits
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return `+${digits}`;
}

function openHubspotPopup(url: string) {
  const w = 460, h = 720;
  const y = window.top?.outerHeight
    ? Math.round((window.top.outerHeight - h) / 2 + (window.top.screenY || 0))
    : 100;
  const x = window.top?.outerWidth
    ? Math.round((window.top.outerWidth - w) / 2 + (window.top.screenX || 0))
    : 100;
  return window.open(
    url,
    'hubspot-calling',
    `width=${w},height=${h},left=${x},top=${y},toolbar=no,menubar=no,location=no`,
  );
}

export const DialerPanel: React.FC = () => {
  const { toast } = useToast();
  const [number, setNumber] = useState('');
  const [contactSearch, setContactSearch] = useState('');

  const launchDialer = () => {
    const win = openHubspotPopup(HUBSPOT_CALLING_URL);
    if (!win) {
      toast({
        title: 'Popup blocked',
        description: 'Allow popups for this site and click again.',
        variant: 'destructive',
      });
      return;
    }
    if (number.trim()) {
      const normalized = normalizeNumber(number);
      // Copy to clipboard so the rep can paste into HubSpot's dial field
      navigator.clipboard?.writeText(normalized).catch(() => {});
      toast({
        title: 'HubSpot dialer opened',
        description: `${normalized} copied to clipboard — paste it into HubSpot's dial field.`,
      });
    } else {
      toast({ title: 'HubSpot dialer opened', description: 'Sign in if prompted, then dial.' });
    }
  };

  const launchPoptox = () => {
    const w = 460, h = 720;
    const y = window.top?.outerHeight
      ? Math.round((window.top.outerHeight - h) / 2 + (window.top.screenY || 0))
      : 100;
    const x = window.top?.outerWidth
      ? Math.round((window.top.outerWidth - w) / 2 + (window.top.screenX || 0))
      : 100;
    const win = window.open(
      POPTOX_URL,
      'poptox-dialer',
      `width=${w},height=${h},left=${x},top=${y},toolbar=no,menubar=no,location=no`,
    );
    if (!win) {
      toast({
        title: 'Popup blocked',
        description: 'Allow popups for this site and click again.',
        variant: 'destructive',
      });
      return;
    }
    if (number.trim()) {
      const normalized = normalizeNumber(number);
      navigator.clipboard?.writeText(normalized).catch(() => {});
      toast({
        title: 'PopTox opened',
        description: `${normalized} copied to clipboard — paste it into PopTox's dial field.`,
      });
    } else {
      toast({ title: 'PopTox opened', description: 'Sign in if prompted, then dial.' });
    }
  };

  const openContactSearch = () => {
    const q = contactSearch.trim();
    const url = q
      ? `${HUBSPOT_CONTACTS_URL}?query=${encodeURIComponent(q)}`
      : HUBSPOT_CONTACTS_URL;
    window.open(url, '_blank', 'noopener');
  };

  return (
    <div className="space-y-4">
      {/* Primary: launch the HubSpot dialer */}
      <Card className="bg-black/40 border-amber-400/25">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-400/15 border border-amber-400/30 flex items-center justify-center flex-shrink-0">
              <PhoneCall className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-amber-100">HubSpot Calling Window</h3>
              <p className="text-sm text-amber-100/60 mt-1">
                Launch HubSpot's built-in dialer in a popup. Every call is auto-logged to
                the contact record inside HubSpot. First launch will ask you to sign in;
                after that it stays signed in.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-[1fr,auto] gap-2">
            <div>
              <Label className="text-xs uppercase tracking-wider text-amber-100/70">
                Optional — pre-copy a number to your clipboard
              </Label>
              <Input
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="+14155550123 or 415-555-0123"
                className="mt-1 font-mono bg-black/60 border-amber-400/30 text-amber-50"
              />
            </div>
            <div className="flex items-end gap-2">
              <Button
                onClick={launchDialer}
                className="w-full md:w-auto h-10 bg-amber-500 hover:bg-amber-600 text-black font-semibold"
              >
                <Phone className="w-4 h-4 mr-2" />
                HubSpot Dialer
              </Button>
              <Button
                onClick={launchDesktopDialer}
                variant="outline"
                className="w-full md:w-auto h-10 border-amber-400/40 text-amber-100 hover:bg-amber-400/10"
                title="Requires the Aetheris Desktop Dialer app (PopTox wrapper)"
              >
                <Monitor className="w-4 h-4 mr-2" />
                PopTox Desktop
              </Button>
            </div>
          </div>

          <div className="text-[11px] text-amber-100/50 border-t border-amber-400/15 pt-3 space-y-2">
            <p>
              <strong className="text-amber-200/70">HubSpot Dialer:</strong> Opens HubSpot's calling
              window in a popup. Calls auto-log to the contact record.
            </p>
            <p>
              <strong className="text-amber-200/70">PopTox Desktop:</strong> Hands the number off to
              the Aetheris Dialer desktop app (Electron wrapper around PopTox that stays signed in).
              Download and install it once per machine using the buttons below.
            </p>
          </div>

          <div className="border-t border-amber-400/15 pt-3 space-y-2">
            <Label className="text-xs uppercase tracking-wider text-amber-100/70">
              Download Aetheris Desktop Dialer (macOS)
            </Label>
            <div className="grid sm:grid-cols-2 gap-2">
              <Button asChild variant="outline" className="h-auto py-2 border-amber-400/40 text-amber-100 hover:bg-amber-400/10 justify-start">
                <a href={DIALER_DOWNLOADS.appleSilicon} download>
                  <Apple className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="text-left">
                    <span className="block text-sm font-semibold">Apple Silicon</span>
                    <span className="block text-[10px] text-amber-100/60">M1 / M2 / M3 / M4 · ~281 MB</span>
                  </span>
                  <Download className="w-4 h-4 ml-auto" />
                </a>
              </Button>
              <Button asChild variant="outline" className="h-auto py-2 border-amber-400/40 text-amber-100 hover:bg-amber-400/10 justify-start">
                <a href={DIALER_DOWNLOADS.intel} download>
                  <Apple className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="text-left">
                    <span className="block text-sm font-semibold">Intel Mac</span>
                    <span className="block text-[10px] text-amber-100/60">x64 · ~294 MB</span>
                  </span>
                  <Download className="w-4 h-4 ml-auto" />
                </a>
              </Button>
            </div>
            <p className="text-[10px] text-amber-100/50 leading-relaxed">
              Unzip → drag <code className="text-amber-300">AetherisDialer.app</code> into Applications →
              right-click → <em>Open</em> the first time to bypass the unsigned-app warning. This
              registers the <code className="text-amber-300">aetheris-dialer://</code> handler so the
              <strong className="text-amber-200/70"> PopTox Desktop</strong> button above works.
              Windows build coming soon.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Secondary: jump to a HubSpot contact and dial from there */}
      <Card className="bg-black/40 border-amber-400/25">
        <CardContent className="p-6 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center flex-shrink-0">
              <Search className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-amber-100">Or call straight from a contact</h3>
              <p className="text-xs text-amber-100/60 mt-1">
                Jump to the HubSpot contact record and hit "Call" there — that method
                links the call to the contact automatically without any clipboard step.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Input
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') openContactSearch(); }}
              placeholder="Search contacts by name, email, or company"
              className="bg-black/60 border-amber-400/30 text-amber-50"
            />
            <Button onClick={openContactSearch} variant="outline" className="border-amber-400/30 text-amber-100">
              <ExternalLink className="w-4 h-4 mr-2" /> Open in HubSpot
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DialerPanel;
