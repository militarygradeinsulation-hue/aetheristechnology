import React, { useState } from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { RepCodeFreeScan } from '@/components/RepCodeFreeScan';
import { HubSpotMeeting } from '@/components/HubSpotMeeting';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';

const ContactPage = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Intake Form | Aetheris Business Forensics Indianapolis"
        description="Drop your details and run the free Leak Audit™. Operator-led intake with no public list and no spam. Indianapolis, US-wide."
        path="/contact"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "ContactPage",
          "mainEntity": {
            "@type": "Organization",
            "name": "Aetheris",
            "telephone": "+1-317-376-2110",
            "email": "aetheris.technology@outlook.com",
            "address": { "@type": "PostalAddress", "addressLocality": "Indianapolis", "addressRegion": "IN", "addressCountry": "US" }
          }
        }}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />
        <div className="pt-24">
          <RepCodeFreeScan />
        </div>
        <HubSpotMeeting />
        <Footer />
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default ContactPage;

