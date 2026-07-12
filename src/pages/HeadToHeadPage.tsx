import React, { useState } from "react";
import { Background } from "@/components/Background";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ContactModal } from "@/components/ContactModal";
import { SEOHead } from "@/components/SEOHead";
import HeadToHeadTool from "@/components/admin/HeadToHeadTool";
import { PublicToolLock } from "@/components/PublicToolLock";
import { Swords } from "lucide-react";

const HeadToHeadPage: React.FC = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Head-to-Head Report — Competitor Comparison | Aetheris"
        description="Compare your URL against a rival's in 6 categories. Get a dollar-quantified scorecard, win/loss map, and takeover playbook."
        path="/head-to-head"
        keywords="competitor analysis, competitor comparison tool, head-to-head report, url vs url"
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "Head-to-Head Report", path: "/head-to-head" },
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
                <Swords className="w-3 h-3" /> Free · Live Comparison
              </div>
              <h1 className="font-forensic text-3xl md:text-5xl font-bold leading-tight">
                Head-to-Head: <span className="text-amber">You</span> vs{" "}
                <span className="text-crimson italic">Them</span>
              </h1>
              <p className="mt-3 text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
                Two URLs. One verdict. A war-room map of every category you're winning, losing, or silently bleeding —
                plus the Takeover Playbook to flip the score.
              </p>
            </div>
            <PublicToolLock toolLabel="Head-to-Head">
              <HeadToHeadTool />
            </PublicToolLock>
          </div>
        </div>
        <Footer />
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default HeadToHeadPage;
