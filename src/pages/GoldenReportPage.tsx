import React, { useState } from "react";
import { Background } from "@/components/Background";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ContactModal } from "@/components/ContactModal";
import { SEOHead } from "@/components/SEOHead";
import { ForensicScanAllPanel } from "@/components/ForensicScanAllPanel";
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
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 font-case text-[10px] uppercase tracking-widest text-amber mb-3">
                <ScrollText className="w-3 h-3" /> Free · 14-chapter case file
              </div>
              <h1 className="font-forensic text-3xl md:text-5xl font-bold leading-tight">
                The <span className="text-amber italic">Golden</span> Report
              </h1>
              <p className="mt-3 text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
                One URL in. A full forensic case file out — site crawl, brand contradictions, friction vocabulary,
                SEO, pipeline signals — synthesized into a 14-chapter Smart PDF with verdicts, dollar leaks, and
                evidence you can search or ask questions of.
              </p>
            </div>
            <ForensicScanAllPanel />
          </div>
        </div>
        <Footer />
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default GoldenReportPage;
