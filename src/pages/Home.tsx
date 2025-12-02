import React, { useState } from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { ThePitch } from '@/components/ThePitch';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { AetherisAssistant } from '@/components/AetherisAssistant';

const Home = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  return (
    <div className="relative min-h-screen">
      <Background />
      
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />
        <Hero onContactClick={() => setIsContactModalOpen(true)} />
        <ThePitch />
        <div id="assistant" className="h-1" />
        <Footer />
      </div>

      <AetherisAssistant />

      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
      />
    </div>
  );
};

export default Home;
