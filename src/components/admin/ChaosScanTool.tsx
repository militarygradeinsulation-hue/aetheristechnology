import React, { useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { getAdminToken } from "@/lib/adminAuth";
import { useToast } from "@/hooks/use-toast";
import { ChaosScanReport, type ChaosMap, type IntelMeta } from "@/components/ChaosScanReport";

const AdminChaosScanTool: React.FC = () => {
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<ChaosMap | null>(null);
  const [meta, setMeta] = useState<IntelMeta | null>(null);

  const runScan = async () => {
    if (!url.trim()) return;
    setBusy(true);
    setData(null);
    setMeta(null);
    try {
      const headers: Record<string, string> = {};
      const tok = getAdminToken();
      if (tok) headers["x-admin-token"] = tok;
      const { data: res, error } = await supabase.functions.invoke("chaos-scan", {
        body: { url: url.trim() },
        headers,
      });
      if (error) throw error;
      if (!res?.map) throw new Error("No map returned");
      setData(res.map);
      setMeta(res.intel_meta || null);
    } catch (e) {
      toast({
        title: "Chaos scan failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-4 md:p-5">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-4">
          <div>
            <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-1">
              Chaos Scan
            </div>
            <h2 className="font-forensic text-xl md:text-2xl font-bold leading-tight">
              Feed a URL. Watch the leaks connect.
            </h2>
            <p className="text-xs md:text-sm text-foreground/70 mt-1">
              Scrapes the site, then maps every symptom back to the single source feeding them.
            </p>
          </div>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); runScan(); }} className="flex flex-col sm:flex-row gap-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://competitor.com"
            className="flex-1"
            disabled={busy}
          />
          <Button type="submit" disabled={busy || !url.trim()}>
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
            {busy ? "Scanning…" : "Run Chaos Scan"}
          </Button>
        </form>
      </Card>

      {data && <ChaosScanReport data={data} meta={meta} />}
    </div>
  );
};

export default AdminChaosScanTool;
