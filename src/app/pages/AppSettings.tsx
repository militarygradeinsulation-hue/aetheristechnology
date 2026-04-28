import { useState } from "react";
import { Unplug, RefreshCw, Beaker } from "lucide-react";
import { AppLayout } from "../AppLayout";
import { useAccount } from "../lib/useAccount";
import { HubSpotConnectCard } from "../components/HubSpotConnectCard";
import { LoadDemoDataCard } from "../components/LoadDemoDataCard";
import { HygieneSettingsCard } from "../components/HygieneSettingsCard";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const AppSettings = () => {
  const { account, loading, refetch } = useAccount();
  const { user } = useAuth();
  const { toast } = useToast();
  const [working, setWorking] = useState<string | null>(null);

  const handleDisconnect = async () => {
    if (!account || !confirm("Disconnect HubSpot? Mirrored data will be retained but no further syncs will run.")) return;
    setWorking("disconnect");
    try {
      const { error } = await supabase.functions.invoke("hubspot-disconnect", { body: { account_id: account.id } });
      if (error) throw error;
      toast({ title: "Disconnected" });
      refetch();
    } catch (err: any) {
      toast({ title: "Disconnect failed", description: err.message, variant: "destructive" });
    } finally {
      setWorking(null);
    }
  };

  const handleResync = async () => {
    if (!account) return;
    setWorking("sync");
    try {
      const { error } = await supabase.functions.invoke("hubspot-sync", {
        body: { account_id: account.id, mode: "initial" },
      });
      if (error) throw error;
      toast({ title: "Full re-sync started" });
      refetch();
    } catch (err: any) {
      toast({ title: "Sync failed", description: err.message, variant: "destructive" });
    } finally {
      setWorking(null);
    }
  };

  const handleSelfTest = async () => {
    setWorking("selftest");
    try {
      const { data, error } = await supabase.functions.invoke("hubspot-self-test", { body: {} });
      if (error) throw error;
      if (data?.ok) {
        toast({ title: "HubSpot write access confirmed", description: data.message });
      } else {
        toast({ title: "Self-test failed", description: data?.error || "Unknown error", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Self-test failed", description: err.message, variant: "destructive" });
    } finally {
      setWorking(null);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Account and integration management</p>
      </div>

      <div className="space-y-6">
        {account && <HubSpotConnectCard />}

        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold mb-4">Account</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Email</dt><dd>{user?.email}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Account ID</dt><dd className="font-mono text-xs">{account?.id}</dd></div>
          </dl>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold mb-4">HubSpot integration</h2>
          {account?.hubspot_portal_id ? (
            <div className="space-y-4">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Portal ID</dt><dd className="font-mono">{account.hubspot_portal_id}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Connected</dt><dd>{account.hubspot_connected_at ? new Date(account.hubspot_connected_at).toLocaleDateString() : "—"}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Last sync</dt><dd>{account.last_sync_at ? new Date(account.last_sync_at).toLocaleString() : "Never"}</dd></div>
              </dl>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={handleSelfTest} disabled={working !== null} className="gap-2">
                  <Beaker className={`h-3.5 w-3.5 ${working === "selftest" ? "animate-pulse" : ""}`} />
                  Test HubSpot write
                </Button>
                <Button variant="outline" size="sm" onClick={handleResync} disabled={working !== null} className="gap-2">
                  <RefreshCw className={`h-3.5 w-3.5 ${working === "sync" ? "animate-spin" : ""}`} />
                  Full re-sync
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDisconnect} disabled={working !== null} className="gap-2">
                  <Unplug className="h-3.5 w-3.5" />
                  Disconnect
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No HubSpot portal connected. Visit the dashboard to connect.</p>
          )}
        </div>

        {account && <HygieneSettingsCard accountId={account.id} />}
        {account && <LoadDemoDataCard accountId={account.id} onSeeded={refetch} />}
      </div>
    </AppLayout>
  );
};

export default AppSettings;
