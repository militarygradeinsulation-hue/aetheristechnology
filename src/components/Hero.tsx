import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
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
            <span className="text-sm text-muted-foreground">AI Consulting & Strategy</span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold leading-tight font-display">
            <span className="text-foreground">Expert AI Consulting</span>
            <br />
            <span className="text-gradient-amber">
              For Your Business
            </span>
          </h1>

          <div className="inline-flex items-center gap-2 glass px-6 py-3 rounded-full border border-amber/30">
            <span className="text-base md:text-lg font-semibold text-amber">
              Strategic guidance. Hands-on expertise. Real results.
            </span>
          </div>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed font-body">
            You know you need AI for your business, but you don't know where to start. Let's figure it out together.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <Button
              size="lg"
              onClick={onContactClick}
              className="bg-primary hover:bg-primary/90 text-primary-foreground group"
            >
              Book a Consultation
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="glass-hover border-border"
              onClick={() => navigate('/services')}
            >
              Our Consulting Services
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-16 max-w-4xl mx-auto">
            {[
              { label: 'Engagements', value: '200+' },
              { label: 'Clients Advised', value: '100+' },
              { label: 'Revenue Impacted', value: '$25M' },
              { label: 'Client Satisfaction', value: '99%' },
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
        </motion.div>
      </div>
    </section>
  );
};
