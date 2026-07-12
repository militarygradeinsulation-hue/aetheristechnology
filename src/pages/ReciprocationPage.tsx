import React, { useState } from "react";
import { Background } from "@/components/Background";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ContactModal } from "@/components/ContactModal";
import { SEOHead } from "@/components/SEOHead";
import { ReciprocationDoctrineTool } from "@/components/ReciprocationDoctrineTool";
import { PublicToolLock } from "@/components/PublicToolLock";
import { Handshake } from "lucide-react";
import reciprocationAsset from "@/assets/tools/reciprocation.jpg.asset.json";

const ReciprocationPage: React.FC = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Reciprocation Gift — Free Cold Outreach Report | Aetheris"
        description="Generate a custom reciprocation report to send cold prospects. Ethical Cialdini-style door-opener with leaks, citations, and next-step CTA."
        path="/reciprocation"
        keywords="reciprocation report, cialdini reciprocation, cold outreach gift, door opener report, sales reciprocity"
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "Reciprocation Gift", path: "/reciprocation" },
        ]}
        speakable={["h1"]}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />
        <div className="pt-24 px-4 pb-16">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 font-case text-[10px] uppercase tracking-widest text-amber mb-3">
                <Handshake className="w-3 h-3" /> Free · Doctrine Engine
              </div>
              <h1 className="font-forensic text-3xl md:text-5xl font-bold leading-tight">
                The <span className="text-amber italic">Reciprocation</span> Engine
              </h1>
              <p className="mt-3 text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
                Cialdini's Rule of Reciprocation, rebuilt as 6 editable operator tactics — each with academic
                citations, an ethical-use line, a manipulator-abuse warning, and a reader defense checklist so
                nobody can weaponize it against you.
              </p>
            </div>
            <PublicToolLock toolLabel="Reciprocation Engine">
              <ReciprocationDoctrineTool />
            </PublicToolLock>
          </div>
        </div>
        <Footer />
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default ReciprocationPage;
