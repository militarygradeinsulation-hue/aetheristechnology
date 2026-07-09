import React, { useState } from "react";
import { Background } from "@/components/Background";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ContactModal } from "@/components/ContactModal";
import { SEOHead } from "@/components/SEOHead";
import { PublicChaosScan } from "@/components/PublicChaosScan";
import { PublicToolLock } from "@/components/PublicToolLock";

const ChaosScanPage = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Free Chaos Scan — See Your Revenue Leaks | Aetheris"
        description="Drop your URL. Our free Chaos Scan maps every symptom back to the source leak, shows the dollar impact, and reveals what changes when the source is sealed."
        path="/chaos-scan"
        keywords="chaos scan, revenue leak scan, free business forensics, aetheris scan"
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "Chaos Scan", path: "/chaos-scan" },
        ]}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />
        <div className="pt-20">
          <PublicChaosScan />
        </div>
        <Footer />
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default ChaosScanPage;
