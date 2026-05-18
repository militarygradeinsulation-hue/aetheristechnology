import React, { useState } from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';
import { ContentCalendarGenerator } from '@/components/ContentCalendarGenerator';
import { PostFromSourceGenerator } from '@/components/PostFromSourceGenerator';

const ContentCalendarPage = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="AI Content Calendar, 30 Days of Posts | Aetheris"
        description="Generate a 30-day content calendar with daily topics, hooks, captions, and post times. First 7 days free, full calendar $29."
        path="/content-calendar"
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />
        <div className="pt-32 pb-16 px-4">
          <div className="text-center mb-10">
            <span className="text-amber font-bold text-xl tracking-wide uppercase mb-2 block">AI Content Calendar</span>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground font-display mb-3">
              30 Days of Content <span className="text-gradient-amber">Done For You</span>
            </h1>
            <p className="text-muted-foreground text-xl max-w-2xl mx-auto">Daily post ideas, hooks, topics, and best times, generated for your industry in minutes.</p>
          </div>
          <ContentCalendarGenerator />
          <PostFromSourceGenerator />
        </div>
        <Footer />
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default ContentCalendarPage;
