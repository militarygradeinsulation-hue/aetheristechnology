import React from 'react';
import { Mail, MapPin, Phone, Linkedin, ArrowRight, Clock, Shield, Calendar } from 'lucide-react';
import { RevealOnScroll } from './RevealOnScroll';
import { Button } from './ui/button';
import { BOOK_MEETING_URL } from '@/lib/links';

interface ContactProps {
  onContactClick: () => void;
}

export const Contact: React.FC<ContactProps> = ({ onContactClick }) => {
  return (
    <section id="contact" className="relative py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <RevealOnScroll>
          <div className="text-center mb-12">
            <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-3">
              Open a Case
            </div>
            <h2 className="font-forensic text-4xl md:text-5xl font-bold mb-4 text-foreground">
              Let's find where you're <span className="text-crimson">leaking</span>.
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              No pitch decks. No funnels. Pick the channel that's easiest, and we'll start the autopsy.
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
              href="https://www.linkedin.com/in/thejosephtoney"
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

        {/* The Forensic Diagnostic CTA */}
        <RevealOnScroll delay={0.5}>
          <div className="max-w-4xl mx-auto glass p-10 md:p-14 rounded-sm border-2 border-amber/30 text-center relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber/10 rounded-full blur-3xl" />
            
            <div className="relative z-10">
              <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-3">
                Operator-Led Investigation · $2,500 Flat
              </div>
              <h3 className="font-forensic text-3xl md:text-4xl font-bold text-foreground mb-4">
                The Forensic Diagnostic
              </h3>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                14 days inside your operation — CRM, inboxes, sales pipeline, team workflows. 
                Every leak named, traced, and dollar-quantified in a sealed case file. Applied toward engagement if you proceed.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="glass p-4 rounded-sm border border-border/40">
                  <Clock className="w-6 h-6 text-amber mx-auto mb-2" />
                  <p className="text-sm font-semibold text-foreground">14-Day Investigation</p>
                  <p className="text-xs text-muted-foreground">Operator embedded, not observing</p>
                </div>
                <div className="glass p-4 rounded-sm border border-border/40">
                  <Shield className="w-6 h-6 text-amber mx-auto mb-2" />
                  <p className="text-sm font-semibold text-foreground">Sealed Case File</p>
                  <p className="text-xs text-muted-foreground">Every leak named & quantified</p>
                </div>
                <div className="glass p-4 rounded-sm border border-border/40">
                  <ArrowRight className="w-6 h-6 text-amber mx-auto mb-2" />
                  <p className="text-sm font-semibold text-foreground">Credited Toward Fix</p>
                  <p className="text-xs text-muted-foreground">$2,500 applied to engagement</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a href={BOOK_MEETING_URL} target="_blank" rel="noopener noreferrer">
                  <Button size="lg" className="bg-amber hover:bg-amber/90 text-background">
                    <Calendar className="mr-2 w-5 h-5" />
                    Book the Diagnostic
                  </Button>
                </a>
                <a href="/leak-audit">
                  <Button size="lg" variant="outline" className="glass-hover border-amber/30 text-amber hover:bg-amber/10">
                    Run the Free Leak Audit™
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </a>
                <a href="tel:+13173762110">
                  <Button size="lg" variant="outline" className="glass-hover border-border">
                    <Phone className="mr-2 w-5 h-5" />
                    (317) 376-2110
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
