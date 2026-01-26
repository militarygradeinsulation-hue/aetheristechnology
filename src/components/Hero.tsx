import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Gift, Users, TrendingUp, Award, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';

interface HeroProps {
  onContactClick: () => void;
}

// Animated counter component
const AnimatedCounter: React.FC<{ end: number; suffix?: string; prefix?: string; duration?: number }> = ({ 
  end, suffix = '', prefix = '', duration = 2000 
}) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    let startTime: number;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [end, duration]);
  
  return <span>{prefix}{count.toLocaleString()}{suffix}</span>;
};

export const Hero: React.FC<HeroProps> = ({ onContactClick }) => {
  const navigate = useNavigate();
  
  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 pt-20">
      <div className="max-w-6xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-6"
        >
          {/* Free Trial Badge - Conversion Hook */}
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan/20 to-primary/20 border border-cyan/40 px-5 py-2.5 rounded-full"
          >
            <Gift className="w-5 h-5 text-cyan animate-pulse" />
            <span className="text-sm font-semibold text-cyan">Start Your 7-Day Free Trial</span>
            <span className="text-xs bg-cyan/20 text-cyan px-2 py-0.5 rounded-full">No Card Required</span>
          </motion.div>

          {/* Simplified Headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight">
            <span className="text-foreground">AI That Works</span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan via-primary to-cyan">
              While You Sleep
            </span>
          </h1>

          {/* Simple Value Prop */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            You know you need AI for your business. We build it, deploy it, and manage it—so you can focus on growth.
          </p>

          {/* CTA Buttons - More Prominent */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button
              size="lg"
              onClick={onContactClick}
              className="bg-gradient-to-r from-cyan to-primary hover:from-cyan/90 hover:to-primary/90 text-primary-foreground text-lg px-8 py-6 group shadow-lg shadow-cyan/25"
            >
              <Gift className="mr-2 w-5 h-5" />
              Start Free Trial
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="glass-hover border-border text-lg px-8 py-6"
              onClick={() => navigate('/services')}
            >
              See How It Works
            </Button>
          </div>

          {/* Trust Indicator */}
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Clock className="w-4 h-4" />
            Setup in 48 hours • Cancel anytime • 30-day money-back guarantee
          </p>

          {/* Social Proof Counters */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 pt-12 max-w-4xl mx-auto"
          >
            {[
              { icon: Users, label: 'Happy Clients', value: 100, suffix: '+' },
              { icon: TrendingUp, label: 'Revenue Generated', value: 25, prefix: '$', suffix: 'M+' },
              { icon: Award, label: 'Success Rate', value: 99, suffix: '%' },
              { icon: Clock, label: 'Hours Saved Monthly', value: 500, suffix: '+' },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                className="glass p-4 md:p-6 rounded-xl border border-border/50 hover:border-cyan/30 transition-colors"
              >
                <stat.icon className="w-6 h-6 text-cyan mx-auto mb-2" />
                <div className="text-2xl md:text-3xl font-bold text-cyan">
                  <AnimatedCounter end={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
                </div>
                <div className="text-xs md:text-sm text-muted-foreground mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
