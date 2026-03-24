import React from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { useState } from 'react';
import { SEOHead } from '@/components/SEOHead';

const TermsPage = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Terms of Service"
        description="Terms of service for Aetheris AI consulting and technology services. Intellectual property, data handling, and engagement terms."
        path="/terms"
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />
        
        <section className="pt-32 pb-20 px-4">
          <div className="max-w-4xl mx-auto prose prose-invert">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-8 font-display">
              Terms of <span className="text-amber glow-text">Service</span>
            </h1>

            <div className="space-y-8 text-muted-foreground">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-3 font-display">Intellectual Property Ownership</h2>
                <p>All software, AI models, algorithms, visual assets, designs, and related intellectual property displayed on this website and developed by Aetheris AI are exclusively owned by CTOguy.ai. These systems are independently developed works created outside of any employment or contractual obligation.</p>
                <p className="mt-3 font-semibold text-foreground">These systems are expressly excluded from the scope of any Agreement made with any business, person, or employer.</p>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-3 font-display">Non-Affiliation Notice</h2>
                <p>All demonstrations, case studies, and showcased work on this site use synthetic data or authorized assets. No proprietary third-party information is used. Any resemblance to real companies or data is coincidental unless explicitly stated otherwise.</p>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-3 font-display">Use of Services</h2>
                <p>By engaging with Aetheris AI's services, you agree that all AI solutions are customized per client agreement. Solutions are delivered with enterprise-grade security standards. Specific terms and conditions will be outlined in individual client agreements.</p>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-3 font-display">Data Handling</h2>
                <p>All client data is handled with enterprise-grade security measures. We do not share, sell, or distribute client data to third parties without explicit written consent.</p>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-3 font-display">Contact</h2>
                <p>For questions regarding these terms, please contact us at{' '}
                  <a href="mailto:aetheris.technology@outlook.com" className="text-amber hover:underline">aetheris.technology@outlook.com</a>.
                </p>
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default TermsPage;
