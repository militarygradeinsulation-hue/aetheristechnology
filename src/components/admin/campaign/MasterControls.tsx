import React from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Send, Sparkles, Inbox } from 'lucide-react';

interface Settings {
  is_active: boolean;
  daily_limit: number;
}

interface Props {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onSave: () => Promise<void>;
  saving: boolean;
  onSendBatch: () => Promise<void>;
  onGenerateWave: () => Promise<void>;
  onCheckReplies: () => Promise<void>;
  busy: { send: boolean; generate: boolean; replies: boolean };
}

export const MasterControls: React.FC<Props> = ({ settings, onChange, onSave, saving, onSendBatch, onGenerateWave, onCheckReplies, busy }) => {
  return (
    <div className="glass p-6 rounded-xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-foreground font-display">Master Controls</h3>
          <p className="text-xs text-muted-foreground">Pause or run the entire campaign engine.</p>
        </div>
        <div className="flex items-center gap-3">
          <Label htmlFor="active" className="text-sm">{settings.is_active ? 'LIVE' : 'PAUSED'}</Label>
          <Switch id="active" checked={settings.is_active} onCheckedChange={(v) => onChange({ is_active: v })} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="limit" className="text-xs text-muted-foreground">Daily send limit</Label>
          <Input id="limit" type="number" min={1} max={1000} value={settings.daily_limit}
            onChange={(e) => onChange({ daily_limit: parseInt(e.target.value) || 0 })} />
        </div>
        <div className="flex items-end">
          <Button onClick={onSave} disabled={saving} className="w-full">
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
            Save Settings
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
        <Button variant="outline" onClick={onSendBatch} disabled={busy.send}>
          {busy.send ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
          Send Next Batch Now
        </Button>
        <Button variant="outline" onClick={onGenerateWave} disabled={busy.generate}>
          {busy.generate ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
          Generate Next Wave
        </Button>
        <Button variant="outline" onClick={onCheckReplies} disabled={busy.replies}>
          {busy.replies ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Inbox className="w-4 h-4 mr-1" />}
          Check Inbox For Replies
        </Button>
      </div>
    </div>
  );
};
