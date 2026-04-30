// Admin-mode CRM wrapper: loads real data from Supabase and re-uses CrmShell.
import React, { useCallback, useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { CrmShell } from "./CrmShell";
import { AdminCrmRepView } from "./AdminCrmRepView";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { loadAdminDataset, EMPTY_DATASET, type CrmDataset } from "@/lib/crm";
import { Database, Users } from "lucide-react";

export const AdminCrm: React.FC = () => {
  const { toast } = useToast();
  const [dataset, setDataset] = useState<CrmDataset>(EMPTY_DATASET);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const d = await loadAdminDataset();
      setDataset(d);
    } catch (e) {
      toast({
        title: "Failed to load CRM",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const empty = !loading &&
    dataset.contacts.length === 0 &&
    dataset.companies.length === 0 &&
    dataset.deals.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Database className="w-6 h-6 text-amber" />
        <h2 className="text-2xl font-bold text-foreground font-display">CRM</h2>
        <span className="text-xs text-muted-foreground ml-2">Unified contacts, companies, deals & activity</span>
      </div>

      {empty && (
        <div className="glass p-8 rounded-xl border border-amber/30 bg-amber/5">
          <p className="text-foreground font-semibold mb-2">Your CRM is empty.</p>
          <p className="text-sm text-muted-foreground">
            Add contacts directly, or use the lead-bridge function to import from existing tables
            (contact submissions, drip prospects, diagnostic/assessment leads, purchases).
          </p>
        </div>
      )}

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all"><Database className="w-4 h-4 mr-1" />All Records</TabsTrigger>
          <TabsTrigger value="reps"><Users className="w-4 h-4 mr-1" />By Rep</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          <CrmShell dataset={dataset} loading={loading} onMutate={fetchAll} />
        </TabsContent>
        <TabsContent value="reps" className="mt-4">
          <AdminCrmRepView />
        </TabsContent>
      </Tabs>
    </div>
  );
};
