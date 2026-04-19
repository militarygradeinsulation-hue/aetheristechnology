import React, { useState } from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Contact } from '@/components/Contact';
import { HubSpotMeeting } from '@/components/HubSpotMeeting';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';

const ContactPage = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Contact Aetheris AI — Indianapolis Consulting"
        description="Ready to fix what's broken? AI business consulting in Indianapolis. Call (317) 376-2110 or start the 14-Day Operational Diagnostic."
        path="/contact"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "ContactPage",
          "mainEntity": {
            "@type": "Organization",
            "name": "Aetheris AI",
            "telephone": "+1-317-376-2110",
            "email": "hello@aetheris.technology",
            "address": { "@type": "PostalAddress", "addressLocality": "Indianapolis", "addressRegion": "IN", "addressCountry": "US" }
          }
        }}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />
        <div className="pt-24">
          <Contact onContactClick={() => setIsContactModalOpen(true)} />
        </div>
        <HubSpotMeeting />
        <Footer />
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default ContactPage;
