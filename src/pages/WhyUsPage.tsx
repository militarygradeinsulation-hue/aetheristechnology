import React, { useState } from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { WhyUs } from '@/components/WhyUs';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';

const WhyUsPage = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Why Aetheris — Business Forensics, Not Consulting"
        description="Why owner-led businesses choose Aetheris over traditional consultants: forensic proof over strategy decks, fixed fees, $2,500 Forensic Diagnostic applied toward engagement."
        path="/why-us"
        keywords="why aetheris, business forensics vs consulting, revenue leak audit Indianapolis, operator-led diagnostic, fixed-fee consulting"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Why Us', path: '/why-us' },
        ]}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />
        <div className="pt-24">
          <WhyUs />
        </div>
        <Footer />
      </div>

      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
      />
    </div>
  );
};

export default WhyUsPage;
