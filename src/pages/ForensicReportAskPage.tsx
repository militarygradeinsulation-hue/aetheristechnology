import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { SEOHead } from "@/components/SEOHead";
import { GoldenFixPanel, type FixPanelReport } from "@/components/GoldenFixPanel";
import { trackGoldenReportEvent } from "@/lib/goldenReportTracking";

export default function ForensicReportAskPage() {
  const { scanId } = useParams<{ scanId: string }>();
  const [meta, setMeta] = useState<{ company_name: string | null; target_url: string } | null>(null);
  const [report, setReport] = useState<FixPanelReport | null>(null);

  useEffect(() => {
    if (scanId) trackGoldenReportEvent(scanId, "page_view");
  }, [scanId]);

  useEffect(() => {
    (async () => {
      if (!scanId) return;
      try {
        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
        const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
        const r = await fetch(`${SUPABASE_URL}/functions/v1/forensic-scan-all?id=${encodeURIComponent(scanId)}`, {
          headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
        });
        if (r.ok) {
          const data = await r.json();
          if (data) {
            setMeta({ company_name: data.company_name ?? null, target_url: data.target_url });
            setReport((data.report as FixPanelReport) ?? null);
          }
        }
      } catch { /* ignore */ }
    })();
  }, [scanId]);

  const company = meta?.company_name || meta?.target_url || "";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title="Fix this for me — Aetheris Chaos Theory Forensics"
        description="Live operator advice on your forensic audit."
        path={`/report/${scanId}/ask`}
      />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-4">
          <div className="text-xs uppercase tracking-widest text-amber-500">Aetheris · Live Operator</div>
          <h1 className="text-2xl font-serif font-bold">Fix this for me</h1>
          {company && <p className="text-sm text-muted-foreground">{company}</p>}
        </div>
        {scanId && <GoldenFixPanel scanId={scanId} report={report} company={company} variant="page" />}
      </div>
    </div>
  );
}
