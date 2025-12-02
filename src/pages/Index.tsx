import React, { useState } from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { ThePitch } from '@/components/ThePitch';
import { Services } from '@/components/Services';
import { AutonomousWorkforce } from '@/components/AutonomousWorkforce';
import { IndustriesWeServe } from '@/components/IndustriesWeServe';
import { NeuralHub } from '@/components/NeuralHub';
import { WhyUs } from '@/components/WhyUs';
import { CEOProfile } from '@/components/CEOProfile';
import { TechLogos } from '@/components/TechLogos';
import { Contact } from '@/components/Contact';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { VoiceAI } from '@/components/VoiceAI';

const Index = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  return (
    <div className="relative min-h-screen">
      <Background />
      
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />
        <Hero onContactClick={() => setIsContactModalOpen(true)} />
        <ThePitch />
        <Services />
        <AutonomousWorkforce />
        <IndustriesWeServe />
        <NeuralHub />
        <WhyUs />
        <CEOProfile />
        <TechLogos />
        <VoiceAI />
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
