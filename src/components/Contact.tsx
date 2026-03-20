import React from 'react';
import { Mail, MapPin, Phone, Linkedin, ArrowRight, Clock, Shield } from 'lucide-react';
import { RevealOnScroll } from './RevealOnScroll';
import { Button } from './ui/button';

interface ContactProps {
  onContactClick: () => void;
}

export const Contact: React.FC<ContactProps> = ({ onContactClick }) => {
  return (
    <section id="contact" className="relative py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <RevealOnScroll>
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground font-display">
              Let's Find What's <span className="text-gradient-amber">Costing You</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              No pitch decks. No runaround. Pick the way that's easiest for you and let's talk about what's actually going on in your business.
            </p>
          </div>
        </RevealOnScroll>

        {/* Primary contact methods - big, obvious, clickable */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12">
          <RevealOnScroll delay={0.1}>
            <a
              href="tel:+13173762110"
              className="glass glass-hover p-8 rounded-2xl flex flex-col items-center text-center group hover:border-amber/30 border border-transparent transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/30 transition-colors">
                <Phone className="w-8 h-8 text-amber" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2 font-display">Call Right Now</h3>
              <p className="text-3xl font-bold text-amber mb-2">(317) 376-2110</p>
              <p className="text-sm text-muted-foreground">Tap to call. No voicemail maze. You get a real person.</p>
            </a>
          </RevealOnScroll>

          <RevealOnScroll delay={0.2}>
            <a
              href="mailto:aetheris.technology@outlook.com?subject=I%20Need%20Help%20With%20My%20Business%20-%2014%20Day%20Diagnostic"
              className="glass glass-hover p-8 rounded-2xl flex flex-col items-center text-center group hover:border-amber/30 border border-transparent transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/30 transition-colors">
                <Mail className="w-8 h-8 text-amber" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2 font-display">Send an Email</h3>
              <p className="text-lg font-medium text-amber mb-2 break-all">aetheris.technology@outlook.com</p>
              <p className="text-sm text-muted-foreground">Tap to email. We respond within 24 hours. Usually faster.</p>
            </a>
          </RevealOnScroll>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12">
          <RevealOnScroll delay={0.3}>
            <a
              href="https://www.linkedin.com/in/aisystemsarchitect"
              target="_blank"
              rel="noopener noreferrer"
              className="glass glass-hover p-8 rounded-2xl flex flex-col items-center text-center group hover:border-amber/30 border border-transparent transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/30 transition-colors">
                <Linkedin className="w-8 h-8 text-amber" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2 font-display">Connect on LinkedIn</h3>
              <p className="text-sm text-muted-foreground">Message Joseph directly. See the work. See the results.</p>
            </a>
          </RevealOnScroll>

          <RevealOnScroll delay={0.4}>
            <div className="glass p-8 rounded-2xl flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                <MapPin className="w-8 h-8 text-amber" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2 font-display">Based In</h3>
              <p className="text-lg text-foreground mb-2">Indianapolis, Indiana</p>
              <p className="text-sm text-muted-foreground">Serving businesses nationwide. Remote-first operations.</p>
            </div>
          </RevealOnScroll>
        </div>

        {/* The 14-Day Diagnostic CTA */}
        <RevealOnScroll delay={0.5}>
          <div className="max-w-4xl mx-auto glass p-10 md:p-14 rounded-2xl border-2 border-amber/30 text-center relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber/10 rounded-full blur-3xl" />
            
            <div className="relative z-10">
              <h3 className="text-3xl md:text-4xl font-bold text-foreground mb-4 font-display">
                The 14-Day Operational Systems Diagnostic
              </h3>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                I spend 14 days inside your business — your CRM, your marketing, your sales pipeline, 
                your team workflows — and show you exactly where the money is leaking. No guesswork. Just numbers.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="glass p-4 rounded-xl">
                  <Clock className="w-6 h-6 text-amber mx-auto mb-2" />
                  <p className="text-sm font-semibold text-foreground">14 Days Deep</p>
                  <p className="text-xs text-muted-foreground">Full operational audit</p>
                </div>
                <div className="glass p-4 rounded-xl">
                  <Shield className="w-6 h-6 text-amber mx-auto mb-2" />
                  <p className="text-sm font-semibold text-foreground">Co-CEO Model</p>
                  <p className="text-xs text-muted-foreground">I work alongside you, not above you</p>
                </div>
                <div className="glass p-4 rounded-xl">
                  <ArrowRight className="w-6 h-6 text-amber mx-auto mb-2" />
                  <p className="text-sm font-semibold text-foreground">Real Deliverables</p>
                  <p className="text-xs text-muted-foreground">Actionable systems, not a PDF</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a href="tel:+13173762110">
                  <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Phone className="mr-2 w-5 h-5" />
                    Call to Start — (317) 376-2110
                  </Button>
                </a>
                <a href="mailto:aetheris.technology@outlook.com?subject=14-Day%20Diagnostic%20Inquiry&body=I%27m%20interested%20in%20the%2014-Day%20Operational%20Systems%20Diagnostic.%20Here%27s%20a%20bit%20about%20my%20business%3A%0A%0A">
                  <Button size="lg" variant="outline" className="glass-hover border-border">
                    Email to Start
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </a>
                <a href="https://gamma.app/docs/The-14-Day-Operational-Systems-Diagnostic-e8i6rcv30d33m8s" target="_blank" rel="noopener noreferrer">
                  <Button size="lg" variant="outline" className="glass-hover border-amber/30 text-amber hover:bg-amber/10">
                    View Full Diagnostic Breakdown
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
};
