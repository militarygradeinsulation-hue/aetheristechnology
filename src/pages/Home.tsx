import React, { useState } from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { ThreeAreas } from '@/components/ThreeAreas';
import { FreeTools } from '@/components/FreeTools';
import { ServiceCapabilities } from '@/components/ServiceCapabilities';
import { WhatsWrongDiagnostic } from '@/components/WhatsWrongDiagnostic';
import { ContactForm } from '@/components/ContactForm';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';

const Home = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Aetheris AI — Indianapolis AI Consulting & Automation"
        description="B2B AI consulting in Indianapolis. AI strategy, automation, CRM, and ROI analysis. Reduce operational costs with AI. (317) 376-2110."
        path="/"
        keywords="AI consultant Indianapolis, B2B AI consulting, AI strategy consulting, AI ROI analysis, AI adoption roadmap, how to implement AI in business, reduce operational costs with AI, technology consultant Indianapolis, digital transformation Indiana, CRM automation Indianapolis"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "ProfessionalService",
          "name": "Aetheris AI",
          "url": "https://aetheris.technology",
          "logo": "https://aetheris.technology/aetheris-logo.png",
          "description": "B2B AI consulting and technology firm specializing in AI strategy, operational diagnostics, CRM automation, LLMs, AI agents, and workflow automation for US businesses.",
          "telephone": "+1-317-376-2110",
          "email": "aetheris.technology@outlook.com",
          "address": { "@type": "PostalAddress", "addressLocality": "Indianapolis", "addressRegion": "IN", "addressCountry": "US" },
          "geo": { "@type": "GeoCoordinates", "latitude": 39.7684, "longitude": -86.1581 },
          "priceRange": "$50 - $25,000+",
          "areaServed": { "@type": "Country", "name": "United States" },
          "serviceType": ["AI Strategy Consulting", "AI Maturity Assessment", "Digital Transformation", "Generative AI", "LLM Implementation", "AI Agents", "Workflow Automation", "Conversational AI", "Responsible AI", "AI ROI Analysis"],
          "sameAs": ["https://www.linkedin.com/in/aisystemsarchitect"],
          "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.9", "ratingCount": "50" }
        }}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />
        <Hero onContactClick={() => setIsContactModalOpen(true)} />
        <ThreeAreas />
        <ServiceCapabilities />
        <FreeTools />
        <WhatsWrongDiagnostic />
        <ContactForm />
        <Footer />
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default Home;
