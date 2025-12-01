import React from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';
import { Button } from './ui/button';
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
                Ready to Transform Your Business?
              </h2>
              
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12">
                Let's discuss how AI can revolutionize your operations. 
                Get a free consultation with our experts.
              </p>

              <Button
                size="lg"
                onClick={onContactClick}
                className="bg-primary hover:bg-primary/90 text-primary-foreground mb-12"
              >
                Schedule a Call
              </Button>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
                {[
                  { icon: Mail, label: 'Email', value: 'hello@aetheris.ai' },
                  { icon: Phone, label: 'Phone', value: '+1 (555) 123-4567' },
                  { icon: MapPin, label: 'Location', value: 'San Francisco, CA' },
                ].map((item) => (
                  <div key={item.label} className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <item.icon className="w-6 h-6 text-cyan" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">{item.label}</div>
                      <div className="text-foreground font-medium">{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
};
