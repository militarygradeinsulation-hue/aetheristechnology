import React, { useState, useEffect } from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { ThePitch } from '@/components/ThePitch';

import { Testimonials } from '@/components/Testimonials';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { ChatWidget } from '@/components/ChatWidget';

const Home = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  useEffect(() => {
    // Load ElevenLabs widget script
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

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
      
      {/* ElevenLabs Voice Agent Widget */}
      <div dangerouslySetInnerHTML={{ __html: '<elevenlabs-convai agent-id="agent_7701k5xv4272ekwaw1d0nx7cwf3m"></elevenlabs-convai>' }} />
    </div>
  );
};

export default Home;
