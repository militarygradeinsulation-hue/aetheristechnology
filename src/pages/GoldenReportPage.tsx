import React, { useState } from "react";
import { Background } from "@/components/Background";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ContactModal } from "@/components/ContactModal";
import { SEOHead } from "@/components/SEOHead";
import { ForensicScanAllPanel } from "@/components/ForensicScanAllPanel";
import { ToolEmailGate } from "@/components/ToolEmailGate";
import { ScrollText } from "lucide-react";

const GoldenReportPage: React.FC = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

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
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />
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
            </div>
            <ToolEmailGate
              toolSlug="golden-report"
              toolTitle="Golden Report"
              source="golden_report_page"
              headline="Drop your email to run the Golden Report."
              subhead="One URL, one email. You'll get the full 14-chapter forensic case file — and our team gets pinged the moment a real operator is on the scan."
            >
              <ForensicScanAllPanel />
            </ToolEmailGate>
          </div>
        </div>
        <Footer />
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default GoldenReportPage;
