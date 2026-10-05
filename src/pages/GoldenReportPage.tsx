import React, { useEffect, useState } from "react";
import { Background } from "@/components/Background";
import { LanderNavbar } from "@/components/lander/LanderNavbar";
import { Footer } from "@/components/Footer";
import { ContactModal } from "@/components/ContactModal";
import { SEOHead } from "@/components/SEOHead";
import { ForensicScanAllPanel } from "@/components/ForensicScanAllPanel";
import { useStaffUnlock } from "@/hooks/useStaffUnlock";
import { ACCESS_KEY } from "@/components/TechSolutionsAccessBar";
import { ScrollText } from "lucide-react";
import { trackGoldenReportEvent } from "@/lib/goldenReportTracking";

const GoldenReportPage: React.FC = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const staffUnlocked = useStaffUnlock();
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const tryCode = () => {
    if (code.trim() === "9822") {
      try {
        localStorage.setItem(ACCESS_KEY, JSON.stringify({ plan: "staff", unlockedAll: true, code: "STAFF" }));
      } catch { /* ignore */ }
      window.dispatchEvent(new Event("tech-access-changed"));
    } else {
      setCodeError("That code isn't valid. Connect with us to get a Golden Report.");
    }
  };
  // If the URL carries ?scan=<id>, we came from a shared Golden Report link.
  // Skip the email gate so recipients see their case file immediately.
  const sharedScanId = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("scan") : null;
  const hasSharedScan = !!sharedScanId;

  useEffect(() => {
    if (sharedScanId) trackGoldenReportEvent(sharedScanId, "page_view");
  }, [sharedScanId]);


  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Golden Report — One URL, Full Forensic Case File | Aetheris"
        description="Free tool. Drop one URL. Aetheris runs site crawl, brand contradictions, friction, SEO, and pipeline signals — then synthesizes a 14-chapter Golden Report you can download as a Smart PDF."
        path="/golden-report"
        keywords="golden report, forensic scan, business forensics, revenue leak audit, aetheris"
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "Golden Report", path: "/golden-report" },
        ]}
      />
      <Background />
      <div className="relative z-10">
        <LanderNavbar minimal />
        <div className="pt-24 px-4 pb-16">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-1 font-case text-[7px] uppercase tracking-[0.18em] text-amber mb-4 px-1.5 py-0.5 rounded-full border border-amber/30 bg-amber/10">
                <ScrollText className="w-2 h-2" /> Free · 14-ch case file
              </div>
              <h1 className="font-forensic text-4xl md:text-6xl font-bold leading-[1.1]">
                The <span className="text-amber italic">Golden</span> Report
              </h1>
              <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-3xl mx-auto">
                One URL in. A full forensic case file out — site crawl, brand contradictions, friction vocabulary,
                SEO, pipeline signals — synthesized into a 14-chapter Smart PDF with verdicts, dollar leaks, and
                evidence you can search or ask questions of.
              </p>
              <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-amber/80 max-w-2xl mx-auto">
                Evidence first · produced inside a working engagement · no plan to pick, no cart to fill
              </p>
            </div>
            {hasSharedScan || staffUnlocked ? (
              <ForensicScanAllPanel />
            ) : (
              <div className="max-w-xl mx-auto rounded-sm border border-amber/30 bg-card/60 p-6 text-center">
                <h2 className="font-forensic text-2xl font-bold mb-2">Golden Reports are run with our team.</h2>
                <p className="text-sm text-muted-foreground mb-5">
                  Want a Golden Report on your business? Connect with us and we'll run it together.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center mb-6">
                  <button
                    onClick={() => setIsContactModalOpen(true)}
                    className="px-5 py-2.5 rounded-sm bg-amber text-background font-semibold text-sm"
                  >
                    Talk With Aetheris
                  </button>
                </div>
                <form
                  onSubmit={(e) => { e.preventDefault(); tryCode(); }}
                  className="flex gap-2 items-center justify-center"
                >
                  <label className="font-case text-[10px] uppercase tracking-widest text-amber shrink-0">Have a code?</label>
                  <input
                    value={code}
                    onChange={(e) => { setCode(e.target.value); setCodeError(null); }}
                    placeholder="Enter code"
                    inputMode="numeric"
                    className="w-32 bg-background/60 border border-border rounded-sm px-3 py-1.5 text-sm font-mono"
                  />
                  <button type="submit" className="px-3 py-1.5 rounded-sm border border-amber/50 text-amber text-sm font-semibold">
                    Use code
                  </button>
                </form>
                {codeError && <p className="text-xs text-destructive mt-2">{codeError}</p>}
              </div>
            )}
          </div>
        </div>
        <Footer />
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default GoldenReportPage;
