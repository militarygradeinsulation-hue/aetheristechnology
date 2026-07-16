import { useEffect, useState } from "react";
import { Database, ExternalLink, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type ConnState =
  | { kind: "loading" }
  | { kind: "disconnected" }
  | { kind: "connected"; writeEnabled: boolean };

const WRITE_SCOPES = [
  "crm.objects.contacts.write",
  "crm.objects.deals.write",
  "crm.objects.companies.write",
];

export const HubSpotConnectCard = () => {
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<ConnState>({ kind: "loading" });
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setState({ kind: "disconnected" });
        return;
      }
      const { data } = await supabase
        .from("accounts")
        .select("hubspot_portal_id, hubspot_scopes")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (!data?.hubspot_portal_id) {
        setState({ kind: "disconnected" });
        return;
      }
      const granted = (data.hubspot_scopes || "").split(/\s+/).filter(Boolean);
      const writeEnabled = WRITE_SCOPES.every((s) => granted.includes(s));
      setState({ kind: "connected", writeEnabled });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("hubspot-oauth-start");
      if (error) throw error;
      if (typeof data?.authorizeUrl === "string" && data.authorizeUrl.startsWith("https://app.hubspot.com/")) {
        // HubSpot blocks loading inside iframes (preview). Always break out to a new top-level tab.
        const win = window.open(data.authorizeUrl, "_blank", "noopener,noreferrer");
        if (!win) {
          // Popup blocked, fall back to top-level navigation (escape iframe if possible)
          try {
            if (window.top && window.top !== window.self) {
              (window.top as Window).location.href = data.authorizeUrl;
            } else {
              window.location.href = data.authorizeUrl;
            }
          } catch {
            window.location.href = data.authorizeUrl;
          }
        }
        setLoading(false);
      } else {
        throw new Error("No authorize URL returned");
      }
    } catch (err: any) {
      console.error("HubSpot connect failed", err);
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
        Authorize access to your CRM. We mirror contacts, deals, and engagements into a secure, isolated workspace
        for analysis. Nothing is written back without your approval.
      </p>

      {state.kind === "connected" && state.writeEnabled && (
        <div className="flex items-center justify-center gap-2 text-sm text-primary mb-5">
          <CheckCircle2 className="h-4 w-4" />
          <span>Write-back enabled</span>
        </div>
      )}

      {state.kind === "connected" && !state.writeEnabled && (
        <div className="max-w-md mx-auto mb-5 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-sm text-left flex gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <div className="font-medium text-amber-500">Read-only access</div>
            <div className="text-muted-foreground mt-1">
              Reconnect to enable write-back (required for Hygiene fixes).
            </div>
          </div>
        </div>
      )}

      <Button size="lg" onClick={handleConnect} disabled={loading} className="gap-2">
        <ExternalLink className="h-4 w-4" />
        {loading
          ? "Opening HubSpot…"
          : state.kind === "connected"
          ? "Reconnect HubSpot"
          : "Connect HubSpot"}
      </Button>
    </div>
  );
};
