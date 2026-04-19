import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Phone, Mail } from 'lucide-react';
import { Button } from './ui/button';
import { useTrackEvent } from '@/hooks/useTrackEvent';

interface HeroProps {
  onContactClick: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onContactClick }) => {
  const { trackEvent } = useTrackEvent();

  return (
    <section className="relative min-h-[70vh] flex items-center justify-center px-4 pt-20 pb-8">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-5"
        >
          <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full mb-4">
            <Sparkles className="w-4 h-4 text-amber animate-pulse-glow" />
            <span className="text-sm text-muted-foreground">B2B AI Consulting &amp; Co-CEO Partnership</span>
          </div>

          <p className="text-lg md:text-xl font-semibold text-foreground/90 italic max-w-3xl mx-auto">
            "With us, you're paying for <span className="text-amber">honesty &amp; accuracy</span> — not overhead disguised as <span className="text-amber">'productivity'</span>."
          </p>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] font-display tracking-tight text-float">
            <span className="text-foreground">Most brands are quietly losing revenue to </span>
            <span className="text-gradient-amber">outdated digital presence</span>
            <span className="text-foreground"> and systems that </span>
            <span className="text-gradient-amber">can't keep up.</span>
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-body">
            We expose where it's leaking — then rebuild the digital presence, brand message, and internal systems to stop it.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <a href="mailto:hello@aetheris.technology?subject=I%20Need%20Help" onClick={() => trackEvent('click', { label: 'email_hero', location: 'hero' })}>
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground group hover-lift animate-glow-pulse cursor-glow"
                onMouseMove={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
                  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
                }}
              >
                <Mail className="mr-2 w-5 h-5" />
                Start the Conversation
              </Button>
            </a>
            <a href="tel:+13173762110" onClick={() => trackEvent('click', { label: 'call_now', location: 'hero' })}>
              <Button
                size="lg"
                variant="outline"
                className="glass-hover border-border group hover-lift cursor-glow"
                onMouseMove={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
                  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
                }}
              >
                <Phone className="mr-2 w-5 h-5" />
                Call (317) 376-2110
              </Button>
            </a>
          </div>

          <div className="pt-2">
            <a
              href="https://gamma.app/docs/The-14-Day-Operational-Systems-Diagnostic-e8i6rcv30d33m8s"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent('click', { label: 'see_diagnostic', location: 'hero' })}
              className="inline-flex items-center gap-1 text-sm text-amber/80 hover:text-amber transition-colors group"
            >
              See the 14-Day Operational Diagnostic
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
