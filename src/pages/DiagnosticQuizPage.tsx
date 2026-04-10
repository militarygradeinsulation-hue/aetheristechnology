import React, { useState } from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { BusinessDiagnostic } from '@/components/BusinessDiagnostic';
import { WebsiteScanner } from '@/components/WebsiteScanner';
import { SEOHead } from '@/components/SEOHead';

const DiagnosticQuizPage: React.FC = () => {
  const [isContactOpen, setIsContactOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title="Free Business Diagnostic"
        description="Take the free Aetheris Business Diagnostic to discover where your business is quietly losing money. Get a personalized score and actionable recommendations."
        path="/business-diagnostic"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'Free Business Diagnostic — Aetheris AI',
          description: 'Discover where your business is quietly losing money with our free 20-question diagnostic.',
          url: 'https://aetheris.technology/business-diagnostic',
        }}
      />
      <Background />
      <Navbar onContactClick={() => setIsContactOpen(true)} />
      <main className="relative z-10 pt-32 pb-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border border-border bg-background/90 backdrop-blur-xl p-6 md:p-10 shadow-2xl">
            <div className="text-center mb-12">
              <span className="text-primary text-sm font-semibold tracking-wider uppercase">🔥 Free Business Diagnostic</span>
              <h1 className="text-4xl md:text-5xl font-bold font-display mt-3 text-foreground">
                Where Is Your Business<br />Quietly Losing Money?
              </h1>
              <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
                Answer 20 quick questions to uncover hidden revenue leaks in your marketing, conversion, branding, systems, and growth strategy.
              </p>
            </div>
            <BusinessDiagnostic />
          </div>
        </div>
      </main>
      <Footer />
      <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
    </div>
  );
};

export default DiagnosticQuizPage;
