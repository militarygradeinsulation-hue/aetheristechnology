// Public, read-only CRM demo. Shareable link for client pitches.
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles, Database } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { CrmShell } from "@/components/crm/CrmShell";
import { loadDemoDataset, EMPTY_DATASET, type CrmDataset } from "@/lib/crm";
import { Button } from "@/components/ui/button";

const CrmDemoPage: React.FC = () => {
  const [dataset, setDataset] = useState<CrmDataset>(EMPTY_DATASET);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDemoDataset()
      .then(setDataset)
      .catch(() => { /* gracefully degrade to empty */ })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        path="/crm-demo"
        title="Live CRM Demo | Aetheris AI"
        description="Walk through a live demo of the Aetheris CRM — contacts, companies, deals pipeline, and activity timeline. Sample data only."
      />

      <header className="border-b border-border px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="icon" title="Back to site">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <Database className="w-5 h-5 text-amber" />
            <h1 className="text-xl font-bold text-foreground font-display">Aetheris CRM — Live Demo</h1>
          </div>
          <Link to="/contact">
            <Button size="sm">
              <Sparkles className="w-4 h-4 mr-1" /> Get Yours Built
            </Button>
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="glass border border-amber/40 bg-amber/5 px-4 py-3 rounded-lg mb-6 flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm text-foreground">
            <span className="font-bold text-amber">Demo mode.</span>{" "}
            Sample data only. Drag a deal between stages to see how the pipeline works.
          </p>
          <Link to="/contact" className="text-xs text-amber hover:underline">
            Want one wired to your real data? →
          </Link>
        </div>

        <CrmShell dataset={dataset} loading={loading} readOnly />
      </div>
    </div>
  );
};

export default CrmDemoPage;
