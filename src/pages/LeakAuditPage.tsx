import React, { useState } from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';
import { LeakAuditFlow } from '@/components/lander/LeakAuditFlow';

const LeakAuditPage = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="The Leak Audit™ — Free Business Forensics Self-Scan | Aetheris"
        description="Complete a free 14-question business assessment. Receive a directional 0–100 score, modeled annual exposure range, prioritized findings, and a downloadable PDF."
        path="/leak-audit/self-scan"
        keywords="business leak audit, revenue leak assessment, business forensics audit, sales leak finder, operational diagnostic, AI consulting Indianapolis"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Free Leak Check', path: '/leak-audit/self-scan' },
        ]}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />

        <main className="pt-28 pb-16 px-4">
          <LeakAuditFlow />
        </main>

        <Footer />
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default LeakAuditPage;
