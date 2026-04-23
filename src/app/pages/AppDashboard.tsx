import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Users, Briefcase, DollarSign, Activity } from "lucide-react";
import { AppLayout } from "../AppLayout";
import { useAccount } from "../lib/useAccount";
import { HubSpotConnectCard } from "../components/HubSpotConnectCard";
import { SyncStatusCard } from "../components/SyncStatusCard";
import { StatCard } from "../components/StatCard";
import { RunAuditCard } from "../components/RunAuditCard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MirrorStats {
  contacts: number;
  deals: number;
  pipelineValue: number;
  engagements: number;
}

const AppDashboard = () => {
  const { account, loading, refetch } = useAccount();
  const [stats, setStats] = useState<MirrorStats>({ contacts: 0, deals: 0, pipelineValue: 0, engagements: 0 });
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    if (searchParams.get("connected") === "1") {
      toast({ title: "HubSpot connected", description: "Initial sync starting in the background." });
      searchParams.delete("connected");
      setSearchParams(searchParams, { replace: true });
      refetch();
    }
  }, [searchParams, setSearchParams, toast, refetch]);

  useEffect(() => {
    if (!account?.id) return;
    const loadStats = async () => {
      const [{ count: contacts }, { data: deals }, { count: engagements }] = await Promise.all([
        supabase.from("mirror_contacts").select("*", { count: "exact", head: true }).eq("account_id", account.id),
        supabase.from("mirror_deals").select("amount").eq("account_id", account.id),
        supabase.from("mirror_engagements").select("*", { count: "exact", head: true }).eq("account_id", account.id),
      ]);
      const pipelineValue = (deals || []).reduce((sum, d: any) => sum + (Number(d.amount) || 0), 0);
      setStats({
        contacts: contacts || 0,
        deals: (deals || []).length,
        pipelineValue,
        engagements: engagements || 0,
      });
    };
    loadStats();
  }, [account?.id, account?.last_sync_at]);

  // Poll while sync is running
  useEffect(() => {
    if (account?.last_sync_status !== "running") return;
    const interval = setInterval(refetch, 3000);
    return () => clearInterval(interval);
  }, [account?.last_sync_status, refetch]);

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <div className="h-32 bg-muted rounded animate-pulse" />
        </div>
      </AppLayout>
    );
  }

  const isConnected = !!account?.hubspot_portal_id;
  const hasData = stats.contacts > 0 || stats.deals > 0;

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isConnected ? `Portal ${account?.hubspot_portal_id}` : "Get started by connecting your CRM or loading demo data in Settings"}
        </p>
      </div>

      {!isConnected && !hasData ? (
        <HubSpotConnectCard />
      ) : (
        <div className="space-y-6">
          {account && hasData && <RunAuditCard accountId={account.id} hasData={hasData} />}
          {account && isConnected && <SyncStatusCard account={account} onRefresh={refetch} />}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Contacts" value={stats.contacts.toLocaleString()} icon={Users} />
            <StatCard label="Open deals" value={stats.deals.toLocaleString()} icon={Briefcase} />
            <StatCard
              label="Pipeline value"
              value={`$${(stats.pipelineValue / 1000).toFixed(1)}k`}
              icon={DollarSign}
            />
            <StatCard label="Engagements" value={stats.engagements.toLocaleString()} icon={Activity} />
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default AppDashboard;
