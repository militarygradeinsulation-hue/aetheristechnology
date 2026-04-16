import React, { useState } from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { ThreeAreas } from '@/components/ThreeAreas';
import { FreeTools } from '@/components/FreeTools';
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
        title="Fix-Your-Business Consulting & AI Automation"
        description="Aetheris AI embeds into your operation as a Co-CEO to expose revenue leaks, rebuild broken systems, and deploy AI automation. Indianapolis-based consulting for US businesses. Call (317) 376-2110."
        path="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "ProfessionalService",
          "name": "Aetheris AI",
          "url": "https://aetheris.technology",
          "logo": "https://aetheris.technology/aetheris-logo.png",
          "description": "Business consulting and AI technology company specializing in operational diagnostics, CRM automation, and digital intelligence for US businesses.",
          "telephone": "+1-317-376-2110",
          "email": "aetheris.technology@outlook.com",
          "address": { "@type": "PostalAddress", "addressLocality": "Indianapolis", "addressRegion": "IN", "addressCountry": "US" },
          "geo": { "@type": "GeoCoordinates", "latitude": 39.7684, "longitude": -86.1581 },
          "priceRange": "$50 - $25,000+",
          "areaServed": { "@type": "Country", "name": "United States" },
          "serviceType": ["Business Consulting", "AI Automation", "Operational Diagnostics", "CRM Development", "Digital Intelligence"],
          "sameAs": ["https://www.linkedin.com/in/aisystemsarchitect"],
          "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.9", "ratingCount": "50" }
        }}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />
        <Hero onContactClick={() => setIsContactModalOpen(true)} />
        <ThreeAreas />
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
