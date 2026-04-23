import { useState } from "react";
import { Database, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const HubSpotConnectCard = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleConnect = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("hubspot-oauth-start");
      if (error) throw error;
      if (data?.authorizeUrl) {
        window.location.href = data.authorizeUrl;
      } else {
        throw new Error("No authorize URL returned");
      }
    } catch (err: any) {
      toast({
        title: "Connection unavailable",
        description: err.message || "HubSpot integration not yet configured.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-8 md:p-10 text-center">
      <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-5">
        <Database className="h-6 w-6 text-primary" />
      </div>
      <h2 className="text-xl font-semibold mb-2">Connect your HubSpot</h2>
      <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
        Authorize read access to your CRM. We mirror contacts, deals, and engagements into a secure, isolated workspace
        for analysis. Nothing is written back without your approval.
      </p>
      <Button size="lg" onClick={handleConnect} disabled={loading} className="gap-2">
        <ExternalLink className="h-4 w-4" />
        {loading ? "Opening HubSpot…" : "Connect HubSpot"}
      </Button>
    </div>
  );
};
