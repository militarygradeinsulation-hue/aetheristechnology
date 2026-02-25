import React from 'react';
import { Mail, MapPin, Phone } from 'lucide-react';
import { RevealOnScroll } from './RevealOnScroll';

interface ContactProps {
  onContactClick: () => void;
}

export const Contact: React.FC<ContactProps> = ({ onContactClick }) => {
  return (
    <section id="contact" className="relative py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <RevealOnScroll>
          <div className="glass p-12 md:p-16 rounded-2xl text-center relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan/10 rounded-full blur-3xl" />
            
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
                Ready to Talk Strategy?
              </h2>
              
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12">
                Let's discuss how AI consulting can transform your operations. 
                Schedule a consultation with our experts.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                <a href="tel:+13173762110" className="flex flex-col items-center gap-3 group">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                    <Phone className="w-6 h-6 text-cyan" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Phone</div>
                    <div className="text-foreground font-medium group-hover:text-cyan transition-colors">1 (317) 376-2110</div>
                  </div>
                </a>

                <a href="mailto:aetheris.technology@outlook.com" className="flex flex-col items-center gap-3 group">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                    <Mail className="w-6 h-6 text-cyan" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Email</div>
                    <div className="text-foreground font-medium group-hover:text-cyan transition-colors">aetheris.technology@outlook.com</div>
                  </div>
                </a>

                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-cyan" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Location</div>
                    <div className="text-foreground font-medium">Indianapolis, Indiana</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
};
