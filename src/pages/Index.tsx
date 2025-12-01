import React, { useState } from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { Services } from '@/components/Services';
import { NeuralHub } from '@/components/NeuralHub';
import { WhyUs } from '@/components/WhyUs';
import { CEOProfile } from '@/components/CEOProfile';
import { TechLogos } from '@/components/TechLogos';
import { Contact } from '@/components/Contact';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';

const Index = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  return (
    <div className="relative min-h-screen">
      <Background />
      
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />
        <Hero onContactClick={() => setIsContactModalOpen(true)} />
        <Services />
        <NeuralHub />
        <WhyUs />
        <CEOProfile />
        <TechLogos />
        <Contact onContactClick={() => setIsContactModalOpen(true)} />
        <Footer />
      </div>

      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
      />
    </div>
  );
};

export default Index;
