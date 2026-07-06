import React, { useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChaosScanReport, type ChaosMap, type IntelMeta } from "@/components/ChaosScanReport";

/**
 * Home-page public Chaos Scan.
 * Any visitor enters a URL and gets the same golden-report Chaos Map the
 * admin tool produces — with the "Chaos" / "Source closed" toggle so they
 * can see their site as a tangled leak and then as a sealed system.
 */
export const PublicChaosScan: React.FC = () => {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<ChaosMap | null>(null);
  const [meta, setMeta] = useState<IntelMeta | null>(null);

  const runScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    if (trimmed.length > 500) {
      toast.error("URL too long");
      return;
    }
    setBusy(true);
    setData(null);
    setMeta(null);
    try {
      const { data: res, error } = await supabase.functions.invoke("public-chaos-scan", {
        body: { url: trimmed },
      });
      if (error) throw error;
      if (res?.error) throw new Error(res.error);
      if (!res?.map) throw new Error("No map returned");
      setData(res.map);
      setMeta(res.intel_meta || null);
      // Auto-scroll to results
      setTimeout(() => {
        document.getElementById("public-chaos-scan-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Chaos scan failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section id="public-leak-scan" className="px-4 py-10 scroll-mt-24">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-6">
          <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">
            Free · 60-second Chaos Scan
          </div>
          <h2 className="font-forensic text-2xl md:text-4xl font-bold leading-tight">
            See your <span className="text-crimson italic">chaos</span> — then see it{" "}
            <span className="text-amber">closed</span>.
          </h2>
          <p className="mt-3 text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
            Drop your URL. We scrape your site, map every symptom back to the one source feeding
            them, and show you the exact dollar leak — plus what changes when the source is sealed.
          </p>
        </div>

        <form
          onSubmit={runScan}
          className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-2 mb-8"
        >
          <Input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://yourcompany.com"
            className="flex-1 h-12 text-base"
            disabled={busy}
            maxLength={500}
            required
          />
          <Button type="submit" disabled={busy || !url.trim()} className="h-12 px-6 bg-crimson text-background hover:bg-crimson/90 font-semibold">
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
            {busy ? "Scanning…" : "Run Chaos Scan"}
          </Button>
        </form>

        {busy && (
          <div className="text-center text-xs font-mono uppercase tracking-widest text-amber/80 animate-pulse">
            Deep-scraping site · mapping sitemap · analyzing pricing / about / contact / services · synthesizing leaks…
          </div>
        )}

        {data && (
          <div id="public-chaos-scan-result" className="mt-4">
            <ChaosScanReport data={data} meta={meta} />
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Ready to seal the source? The Leak Audit turns this map into a fix plan.
              </p>
              <a href="/leak-audit"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-amber text-background hover:bg-amber/90 font-semibold px-5 py-2.5 text-sm">
                Start the Leak Audit — $2,500 flat →
              </a>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default PublicChaosScan;
