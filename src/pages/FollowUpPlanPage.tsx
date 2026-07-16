import React, { useState } from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';
import { FollowUpPlanGenerator } from '@/components/FollowUpPlanGenerator';
import { useStaffUnlock } from '@/hooks/useStaffUnlock';

const FollowUpPlanPage = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const staffUnlock = useStaffUnlock();

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="AI Follow-Up System, 14-Day Cadence | Aetheris"
        description="14-day multi-channel follow-up system with email, SMS, and call templates. First 4 days free, full system $49."
        path="/follow-up-plan"
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />
        <div className="pt-32 pb-16 px-4">
          <div className="text-center mb-10">
            <span className="text-amber font-bold text-xl tracking-wide uppercase mb-2 block">AI Follow-Up System</span>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground font-display mb-3">
              Never Lose a Lead <span className="text-gradient-amber">Again</span>
            </h1>
            <p className="text-muted-foreground text-xl max-w-2xl mx-auto">A 14-day multi-channel follow-up plan with ready-to-use templates for every touchpoint.</p>
          </div>
          <FollowUpPlanGenerator adminMode={staffUnlock} />
        </div>
        <Footer />
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default FollowUpPlanPage;
