import React, { useState } from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { ServicesPricing } from '@/components/ServicesPricing';
import { ToolsCapabilities } from '@/components/ToolsCapabilities';
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
          "url": "https://aetheristechnology.lovable.app",
          "logo": "https://aetheristechnology.lovable.app/aetheris-logo.png",
          "description": "Business consulting and AI technology company specializing in operational diagnostics, CRM automation, and digital intelligence for US businesses.",
          "telephone": "+1-317-376-2110",
          "email": "aetheris.technology@outlook.com",
          "address": { "@type": "PostalAddress", "addressLocality": "Indianapolis", "addressRegion": "IN", "addressCountry": "US" },
          "geo": { "@type": "GeoCoordinates", "latitude": 39.7684, "longitude": -86.1581 },
          "priceRange": "$50 - $25,000+",
          "areaServed": { "@type": "Country", "name": "United States" },
          "serviceType": ["Business Consulting", "AI Automation", "Operational Diagnostics", "CRM Development", "Digital Intelligence"],
          "sameAs": ["https://www.linkedin.com/in/aisystemsarchitect"],
          "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.9", "ratingCount": "50" },
          "hasOfferCatalog": {
            "@type": "OfferCatalog",
            "name": "Consulting Services",
            "itemListElement": [
              { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "14-Day Operational Systems Diagnostic", "description": "Complete operational breakdown identifying workflow inefficiencies, disconnected systems, and automation opportunities." }, "price": "7500", "priceCurrency": "USD" },
              { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Rapid Digital Evaluation", "description": "Focused tear-down of messaging, CTA placement, conversion flow and positioning." }, "price": "750", "priceCurrency": "USD" },
              { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Ongoing Digital Oversight", "description": "Continuous oversight on messaging, content direction, visual consistency." }, "price": "1500", "priceCurrency": "USD" }
            ]
          }
        }}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />
        <Hero onContactClick={() => setIsContactModalOpen(true)} />
        <ServicesPricing />
        <ToolsCapabilities />
        <ContactForm />
        <Footer />
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default Home;
