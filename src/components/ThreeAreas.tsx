import React, { useState, useEffect, useRef } from 'react';
import { RevealOnScroll } from './RevealOnScroll';
import { ParallaxTilt } from './ParallaxTilt';
import { Brain, Bot, Code, Database, Sparkles, Zap } from 'lucide-react';
import digitalStrategyThumb from '@/assets/digital-strategy-thumb.jpg';
import brandingMessageThumb from '@/assets/branding-message-thumb.jpg';
import internalSystemsThumb from '@/assets/internal-systems-thumb.jpg';
import crmVideo from '@/assets/crm-demo-video.mp4';

// High-quality render images for Digital Strategy carousel
import render1 from '@/assets/renders/render-activity-panel.jpg';
import render2 from '@/assets/renders/render-archiscan-modern-house.jpg';
import render3 from '@/assets/renders/render-classic-estate.jpg';
import render4 from '@/assets/renders/render-aerial-landscape-pool.jpg';
import render5 from '@/assets/renders/render-woodland-playground.jpg';
import render6 from '@/assets/renders/render-amphitheater-pavilion.jpg';

const digitalStrategyImages = [render1, render2, render3, render4, render5, render6];

const consultingServices = [
  { icon: Brain, title: 'ML Strategy & Advisory', description: 'Assess your data landscape and recommend the right ML approach.' },
  { icon: Bot, title: 'Automation Consulting', description: 'Identify automation opportunities and design intelligent workflows.' },
  { icon: Code, title: 'AI Implementation Advisory', description: 'Hands-on guidance from architecture to deployment.' },
  { icon: Database, title: 'Data Strategy Consulting', description: 'Build a data-driven culture with the right infrastructure.' },
  { icon: Sparkles, title: 'AI Transformation Strategy', description: 'End-to-end strategic guidance for your AI journey.' },
  { icon: Zap, title: 'Performance & Optimization', description: 'Audit existing AI systems for speed, accuracy, and cost.' },
];

const DigitalStrategyTile: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % digitalStrategyImages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full aspect-square overflow-hidden relative">
      {digitalStrategyImages.map((img, i) => (
        <img
          key={i}
          src={img}
          alt={`Digital Strategy example ${i + 1}`}
          loading="lazy"
          width={512}
          height={512}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
            i === currentIndex ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}
    </div>
  );
};

const BrandingMessageTile: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % consultingServices.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full aspect-square overflow-hidden relative bg-background/80">
      {consultingServices.map((service, i) => {
        const Icon = service.icon;
        return (
          <div
            key={i}
            className={`absolute inset-0 w-full h-full flex flex-col items-center justify-center p-6 text-center transition-opacity duration-700 ${
              i === currentIndex ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="w-16 h-16 rounded-xl bg-primary/20 flex items-center justify-center mb-4">
              <Icon className="w-8 h-8 text-amber" />
            </div>
            <h4 className="text-lg font-bold text-foreground font-display mb-2">{service.title}</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{service.description}</p>
          </div>
        );
      })}
    </div>
  );
};

const InternalSystemsTile: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, []);

  return (
    <div className="w-full aspect-square overflow-hidden relative">
      <video
        ref={videoRef}
        src={crmVideo}
        muted
        loop
        autoPlay
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />
    </div>
  );
};

const areas = [
  {
    id: 'digital-strategy',
    title: 'Digital Strategy',
    description: 'Custom AI-rendered visuals built in-house at Aetheris AI Studio, no stock photos, no generic templates.',
  },
  {
    id: 'branding',
    thumbnail: brandingMessageThumb,
    title: 'Branding Message',
    description: 'Social posts will have 4K quality images that make people want to buy.',
  },
  {
    id: 'internal-systems',
    title: 'Internal Systems',
    description: 'I fix how you get leads, score them, and outreach. All increasing your conversion rate by 75%.',
  },
];

export const ThreeAreas: React.FC = () => {
  return (
    <section className="py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <RevealOnScroll>
          <div className="text-center mb-8">
            <span className="text-amber font-bold text-xl md:text-2xl tracking-wide uppercase">🚨 The 3 Key Areas I Focus On</span>
          </div>
        </RevealOnScroll>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {areas.map((area, idx) => (
            <RevealOnScroll key={area.title} variant="float" delay={idx * 0.08}>
              <ParallaxTilt intensity={0.6}>
                <div className="glass glass-shine shimmer-border hover-lift rounded-2xl overflow-hidden border border-border hover:border-amber/40 h-full">
                  {area.id === 'digital-strategy' ? (
                    <DigitalStrategyTile />
                  ) : area.id === 'branding' ? (
                    <BrandingMessageTile />
                  ) : area.id === 'internal-systems' ? (
                    <InternalSystemsTile />
                  ) : null}
                  <div className="p-8 text-center">
                    <h3 className="text-xl font-bold text-foreground font-display mb-3">{area.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{area.description}</p>
                  </div>
                </div>
              </ParallaxTilt>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
};
