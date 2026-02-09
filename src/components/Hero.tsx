import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Shield, Camera, CheckCircle, Clock, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import heroVideo from '@/assets/office/hero-video.mp4';

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
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.play().catch(() => {});
    }
  }, []);
  
  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 pt-20">
      <div className="max-w-6xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-6"
        >
          {/* Triple-AI Badge */}
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan/20 via-primary/20 to-orange-500/20 border border-cyan/40 px-5 py-2.5 rounded-full"
          >
            <Shield className="w-5 h-5 text-cyan animate-pulse" />
            <span className="text-sm font-semibold bg-gradient-to-r from-cyan via-primary to-orange-500 bg-clip-text text-transparent">Triple-AI Powered Platform</span>
          </motion.div>

          {/* Headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight">
            <span className="text-foreground">Three AI Engines.</span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan via-primary to-orange-500">
              One Mission. Zero Compromises.
            </span>
          </h1>

          {/* Value Prop */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            Instant compliance assessments, predictive maintenance, and real-time safety monitoring 
            for parks, schools, and recreation facilities. ASTM/CPSC compliant.
          </p>

          {/* Team Video */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="relative max-w-2xl mx-auto rounded-2xl overflow-hidden shadow-2xl shadow-cyan/20"
          >
            <video 
              ref={videoRef}
              src={heroVideo}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-auto object-cover rounded-2xl"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent rounded-2xl" />
          </motion.div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button
              size="lg"
              onClick={onContactClick}
              className="bg-gradient-to-r from-cyan to-primary hover:from-cyan/90 hover:to-primary/90 text-primary-foreground text-lg px-8 py-6 group shadow-lg shadow-cyan/25"
            >
              <Camera className="mr-2 w-5 h-5" />
              Upload Photo for Free Assessment
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="glass-hover border-border text-lg px-8 py-6"
              onClick={() => navigate('/safety-science')}
            >
              Learn the Science
            </Button>
          </div>

          {/* Trust Indicator */}
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Clock className="w-4 h-4" />
            48-hour reports • ASTM F1292 Compliant • 30-day money-back guarantee
          </p>

          {/* Social Proof Counters */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 pt-12 max-w-4xl mx-auto"
          >
            {[
              { icon: Shield, label: 'AI Layers Working Together', value: 3, prefix: '', suffix: '' },
              { icon: CheckCircle, label: 'Detection Accuracy', value: 95, prefix: '', suffix: '%+' },
              { icon: Award, label: 'ASTM Standards Covered', value: 4, prefix: '', suffix: '+' },
              { icon: Clock, label: 'Hour Report Turnaround', value: 48, prefix: '', suffix: '' },
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
