import React, { useState } from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { CEOProfile } from '@/components/CEOProfile';
import { TechLogos } from '@/components/TechLogos';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';

const AboutPage = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="About Aetheris AI — Your Co-CEO for Business Operations"
        description="Meet the team behind Aetheris AI — AI business consulting Indianapolis. We embed into your operation to expose inefficiencies, rebuild broken systems, and deploy AI-powered automation. Serving the entire US."
        path="/about"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "AboutPage",
          "mainEntity": {
            "@type": "Organization",
            "name": "Aetheris AI",
            "description": "Business consulting and AI technology company that operates as a Co-CEO model for operational transformation.",
            "foundingLocation": { "@type": "Place", "name": "Indianapolis, Indiana" }
          }
        }}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />
        <div className="pt-24">
          <CEOProfile />
          <TechLogos />
        </div>
        <Footer />
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default AboutPage;
