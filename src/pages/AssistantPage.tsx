import React, { useState } from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { MessageCircle } from 'lucide-react';
import { RevealOnScroll } from '@/components/RevealOnScroll';

const AssistantPage = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  return (
    <div className="relative min-h-screen">
      <Background />
      
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />
        
        <div className="pt-32 pb-12 px-4">
          <div className="max-w-7xl mx-auto">
            <RevealOnScroll>
              <div className="text-center mb-12">
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 rounded-full bg-cyan/20 flex items-center justify-center border-2 border-cyan/30">
                    <MessageCircle className="h-10 w-10 text-cyan" />
                  </div>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
                  Talk to Our <span className="text-cyan glow-text">AI Assistant</span>
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  Experience our voice AI technology firsthand. Ask questions, learn about our services, and see how AI can transform your business.
                </p>
              </div>
            </RevealOnScroll>

            <RevealOnScroll delay={0.2}>
              <div className="glass p-8 rounded-xl">
                <div className="rounded-lg overflow-hidden border border-border/50" style={{ height: '600px' }}>
                  <iframe 
                    src="https://aetheris-voice-ai-352627143115.us-west1.run.app"
                    className="w-full h-full"
                    title="Aetheris Voice AI Assistant"
                    allow="microphone"
                    style={{ border: 'none' }}
                  />
                </div>
              </div>
            </RevealOnScroll>
          </div>
        </div>

        <Footer />
      </div>

      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
      />
    </div>
  );
};

export default AssistantPage;
