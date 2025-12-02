import React from 'react';
import { RevealOnScroll } from './RevealOnScroll';

export const VoiceAI: React.FC = () => {
  return (
    <section id="voice-ai" className="relative py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <RevealOnScroll>
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
              Talk to Our <span className="text-cyan glow-text">AI Assistant</span>
            </h2>
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
    </section>
  );
};
