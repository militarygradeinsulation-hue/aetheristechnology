import React, { useState } from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { ThePitch } from '@/components/ThePitch';
import { ServicesPricing } from '@/components/ServicesPricing';
import { Testimonials } from '@/components/Testimonials';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { RevealOnScroll } from '@/components/RevealOnScroll';

const Home = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  return (
    <div className="relative min-h-screen">
      <Background />
      
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />
        <Hero onContactClick={() => setIsContactModalOpen(true)} />

        {/* CEO Featured Video */}
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto">
            <RevealOnScroll>
              <div className="text-center mb-8">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3 font-display">
                  A Message from Our <span className="text-amber glow-text">CEO</span>
                </h2>
                <p className="text-muted-foreground">Hear directly from Joseph Toney on our mission</p>
              </div>
              <div className="glass p-4 rounded-2xl">
                <div style={{ padding: '56.25% 0 0 0', position: 'relative' }}>
                  <iframe
                    src="https://player.vimeo.com/video/1169431542?badge=0&autopause=0&player_id=0&app_id=58479&autoplay=0&muted=0&loop=0"
                    frameBorder="0"
                    allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', borderRadius: '0.75rem' }}
                    title="Joseph Toney - CEO Message"
                  />
                </div>
              </div>
            </RevealOnScroll>
          </div>
        </section>

        
        <ServicesPricing />
        <Testimonials />
        <Footer />
      </div>

      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
      />
    </div>
  );
};

export default Home;
