import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Props {
  fromName: string;
  fromEmail: string;
  signatureHtml: string;
  onChange: (patch: { from_name?: string; from_email?: string; signature_html?: string }) => void;
}

export const SenderIdentity: React.FC<Props> = ({ fromName, fromEmail, signatureHtml, onChange }) => {
  return (
    <div className="glass p-6 rounded-xl space-y-4">
      <div>
        <h3 className="text-lg font-bold text-foreground font-display">Sender Identity</h3>
        <p className="text-xs text-muted-foreground">How prospects see you in their inbox.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="fname" className="text-xs text-muted-foreground">From Name</Label>
          <Input id="fname" value={fromName} onChange={(e) => onChange({ from_name: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="femail" className="text-xs text-muted-foreground">From Email</Label>
          <Input id="femail" type="email" value={fromEmail} onChange={(e) => onChange({ from_email: e.target.value })} />
        </div>
      </div>

      <div>
        <Label htmlFor="sig" className="text-xs text-muted-foreground">Signature HTML (auto-appended if missing)</Label>
        <Textarea id="sig" rows={5} className="font-mono text-xs" value={signatureHtml}
          onChange={(e) => onChange({ signature_html: e.target.value })} />
      </div>

      <div>
        <Label className="text-xs text-muted-foreground">Preview</Label>
        <div className="mt-1 p-3 rounded-lg bg-secondary/40 border border-border text-sm" dangerouslySetInnerHTML={{ __html: signatureHtml }} />
      </div>
    </div>
  );
};
