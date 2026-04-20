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
        title="Contact the Forensics Operator | Aetheris Indianapolis"
        description="Find where your business is leaking. Call (317) 376-2110, email hello@aetheris.technology, or run the free Leak Audit™. Indianapolis, US-wide."
        path="/contact"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "ContactPage",
          "mainEntity": {
            "@type": "Organization",
            "name": "Aetheris",
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
