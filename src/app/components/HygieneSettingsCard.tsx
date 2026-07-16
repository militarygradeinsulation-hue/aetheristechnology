import { useEffect, useState } from "react";
import { Sparkles, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { HygieneSettingsRow } from "../lib/hygiene";

const DEFAULTS: Omit<HygieneSettingsRow, "account_id"> = {
  require_approval: true,
  allow_auto_high_conf: false,
  enable_enrichment: false,
  max_batch_size: 100,
  pause_threshold_pct: 5,
};

export const HygieneSettingsCard = ({ accountId }: { accountId: string }) => {
  const { toast } = useToast();
  const [s, setS] = useState<Omit<HygieneSettingsRow, "account_id">>(DEFAULTS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("hygiene_settings")
        .select("*")
        .eq("account_id", accountId)
        .maybeSingle();
      if (data) {
        setS({
          require_approval: data.require_approval,
          allow_auto_high_conf: data.allow_auto_high_conf,
          enable_enrichment: data.enable_enrichment,
          max_batch_size: data.max_batch_size,
          pause_threshold_pct: data.pause_threshold_pct,
        });
      }
    })();
  }, [accountId]);

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("hygiene_settings")
        .upsert({ account_id: accountId, ...s }, { onConflict: "account_id" });
      if (error) throw error;
      toast({ title: "Hygiene settings saved" });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-4 w-4 text-cyan-400" />
        <h2 className="font-semibold">Hygiene Settings</h2>
      </div>
      <div className="space-y-4">
        <Toggle label="Require my approval for every action" desc="Recommended for first 30 days" v={s.require_approval} onChange={(v) => setS({ ...s, require_approval: v })} />
        <Toggle label="Allow auto-execution of high-confidence actions" desc="Whitespace, casing, phone formatting only" v={s.allow_auto_high_conf} onChange={(v) => setS({ ...s, allow_auto_high_conf: v })} />
        <Toggle label="Enable enrichment via Apollo / Clay" desc="Phase 2, coming soon" v={s.enable_enrichment} onChange={(v) => setS({ ...s, enable_enrichment: v })} disabled />

        <div className="grid sm:grid-cols-2 gap-4 pt-2">
          <div>
            <Label className="text-xs text-muted-foreground">Maximum records per batch</Label>
            <Input type="number" min={1} max={1000} value={s.max_batch_size}
              onChange={(e) => setS({ ...s, max_batch_size: Math.min(1000, Math.max(1, +e.target.value || 1)) })} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Pause if changes exceed (% of records)</Label>
            <Input type="number" min={1} max={50} value={s.pause_threshold_pct}
              onChange={(e) => setS({ ...s, pause_threshold_pct: Math.min(50, Math.max(1, +e.target.value || 1)) })} />
          </div>
        </div>

        <Button onClick={save} disabled={saving} className="bg-cyan-500 hover:bg-cyan-600 text-white gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save settings
        </Button>
      </div>
    </div>
  );
};

const Toggle = ({ label, desc, v, onChange, disabled }: { label: string; desc: string; v: boolean; onChange: (v: boolean) => void; disabled?: boolean }) => (
  <div className="flex items-start justify-between gap-4">
    <div className="flex-1">
      <div className="text-sm font-medium">{label}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
    </div>
    <Switch checked={v} onCheckedChange={onChange} disabled={disabled} />
  </div>
);
