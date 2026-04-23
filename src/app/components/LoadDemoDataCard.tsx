import { useState } from "react";
import { Database, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  accountId: string;
  onSeeded: () => void;
}

export const LoadDemoDataCard = ({ accountId, onSeeded }: Props) => {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const { toast } = useToast();

  const handleLoad = async () => {
    if (!confirm("Load demo data? This wipes any existing mirror data for this account and replaces it with mock data for a fictional commercial playground equipment manufacturer (~10,000 records).")) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("seed-demo-data", { body: { account_id: accountId } });
      if (error) throw error;
      toast({ title: "Demo data loaded", description: `${data.counts.contacts} contacts, ${data.counts.deals} deals, ${data.counts.engagements.toLocaleString()} engagements.` });
      setDone(true);
      onSeeded();
    } catch (err: any) {
      toast({ title: "Seed failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center gap-3 mb-2">
        <Database className="h-5 w-5 text-muted-foreground" />
        <h2 className="font-semibold">Demo Data</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Load realistic mock CRM data for a commercial playground equipment manufacturer. Useful for testing the audit engine before connecting HubSpot.
      </p>
      <Button onClick={handleLoad} disabled={loading} variant="outline" size="sm" className="gap-2">
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Database className="h-3.5 w-3.5" />}
        {loading ? "Seeding..." : done ? "Loaded" : "Load Demo Data"}
      </Button>
    </div>
  );
};
