import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';

interface HeroProps {
  onContactClick: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onContactClick }) => {
  const navigate = useNavigate();
  
  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 pt-20">
      <div className="max-w-7xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-8"
        >
          <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-amber animate-pulse-glow" />
            <span className="text-sm text-muted-foreground">Business Consulting &amp; Digital Intelligence</span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-9xl font-bold leading-[0.95] font-display tracking-tight">
            <span className="text-foreground">This Isn't Feel-Good Consulting.</span>
            <br />
            <span className="text-foreground">This Is </span>
            <span className="text-gradient-amber">
              Fix-Your-Business
            </span>
            <span className="text-foreground"> Consulting.</span>
          </h1>

          <div className="inline-flex items-center gap-2 glass px-6 py-3 rounded-full border border-amber/30">
            <span className="text-base md:text-lg font-semibold text-amber">
              I step in as your Co-CEO. I find them. I close them. I prove it with numbers.
            </span>
          </div>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed font-body">
            Most consultants give you a PDF and disappear. I embed into your operation, 
            expose the friction bleeding your revenue, rebuild the systems causing it, 
            and stay until the numbers move.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <a href="tel:+13173762110">
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground group"
              >
                <Phone className="mr-2 w-5 h-5" />
                Call Now — (317) 376-2110
              </Button>
            </a>
            <a href="mailto:aetheris.technology@outlook.com?subject=14-Day%20Diagnostic%20Inquiry">
              <Button
                size="lg"
                variant="outline"
                className="glass-hover border-border group"
              >
                Email for a Diagnostic
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </a>
            <a href="https://gamma.app/docs/The-14-Day-Operational-Systems-Diagnostic-e8i6rcv30d33m8s" target="_blank" rel="noopener noreferrer">
              <Button
                size="lg"
                variant="outline"
                className="glass-hover border-amber/30 text-amber hover:bg-amber/10 group"
              >
                See the Diagnostic
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </a>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-16 max-w-4xl mx-auto">
            {[
              { label: 'Avg. Wasted on Bad Strategy', value: '$92K' },
              { label: 'Leads Die in Broken CRMs', value: '67%' },
              { label: 'Can\'t Prove Marketing ROI', value: '54%' },
              { label: 'Client Operations Fixed', value: '200+' },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 + index * 0.1 }}
                className="glass p-6 rounded-lg"
              >
                <div className="text-3xl md:text-4xl font-bold text-amber glow-text font-display">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground mt-2">{stat.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Immediate trust strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.6 }}
            className="pt-8"
          >
            <p className="text-sm text-muted-foreground mb-3">Ready to talk? Pick what's easiest for you:</p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
              <a href="tel:+13173762110" className="glass px-4 py-2 rounded-full hover:border-amber/40 border border-transparent transition-colors text-foreground">
                📞 (317) 376-2110
              </a>
              <a href="mailto:aetheris.technology@outlook.com?subject=I%20Need%20Help" className="glass px-4 py-2 rounded-full hover:border-amber/40 border border-transparent transition-colors text-foreground">
                ✉️ aetheris.technology@outlook.com
              </a>
              <a href="https://www.linkedin.com/in/aisystemsarchitect" target="_blank" rel="noopener noreferrer" className="glass px-4 py-2 rounded-full hover:border-amber/40 border border-transparent transition-colors text-amber">
                💼 Connect on LinkedIn
              </a>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
