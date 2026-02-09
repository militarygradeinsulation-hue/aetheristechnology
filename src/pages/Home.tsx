import React, { useState } from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { ThePitch } from '@/components/ThePitch';

import { Testimonials } from '@/components/Testimonials';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { ChatWidget } from '@/components/ChatWidget';
import { VoiceAgent } from '@/components/VoiceAgent';

const Home = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  return (
    <div className="relative min-h-screen">
      <Background />
      
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />
        <Hero onContactClick={() => setIsContactModalOpen(true)} />
        <ThePitch />
        <Testimonials />
        <Footer />
      </div>

      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
      />

      <ChatWidget />
      <VoiceAgent />
    </div>
  );
};

export default Home;
