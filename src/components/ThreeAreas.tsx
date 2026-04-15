import React, { useState, useEffect, useRef } from 'react';
import { RevealOnScroll } from './RevealOnScroll';
import digitalStrategyThumb from '@/assets/digital-strategy-thumb.jpg';
import brandingMessageThumb from '@/assets/branding-message-thumb.jpg';
import internalSystemsThumb from '@/assets/internal-systems-thumb.jpg';
import crmVideo from '@/assets/crm-demo-video.mp4';

// High-quality render images for Digital Strategy carousel
import render1 from '@/assets/renders/render-activity-panel.png';
import render2 from '@/assets/renders/render-archiscan-modern-house.png';
import render3 from '@/assets/renders/render-classic-estate.png';
import render4 from '@/assets/renders/render-aerial-landscape-pool.png';
import render5 from '@/assets/renders/render-woodland-playground.png';
import render6 from '@/assets/renders/render-amphitheater-pavilion.png';

const digitalStrategyImages = [render1, render2, render3, render4, render5, render6];

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

const InternalSystemsTile: React.FC = () => {
  const [hovered, setHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (hovered && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    } else if (videoRef.current) {
      videoRef.current.pause();
    }
  }, [hovered]);

  return (
    <div
      className="w-full aspect-square overflow-hidden relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <img
        src={internalSystemsThumb}
        alt="Internal Systems"
        loading="lazy"
        width={512}
        height={512}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
          hovered ? 'opacity-0' : 'opacity-100'
        }`}
      />
      <video
        ref={videoRef}
        src={crmVideo}
        muted
        loop
        playsInline
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
          hovered ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
};

const areas = [
  {
    id: 'digital-strategy',
    title: 'Digital Strategy',
    description: 'I fix old graphics and outdated images hurting your brand.',
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
            <span className="text-amber font-bold text-lg tracking-wide uppercase">🚨 The 3 Key Areas I Focus On</span>
          </div>
        </RevealOnScroll>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {areas.map((area) => (
            <RevealOnScroll key={area.title}>
              <div className="glass rounded-2xl overflow-hidden border border-border hover:border-amber/40 transition-colors h-full">
                {area.id === 'digital-strategy' ? (
                  <DigitalStrategyTile />
                ) : area.id === 'internal-systems' ? (
                  <InternalSystemsTile />
                ) : (
                  <div className="w-full aspect-square overflow-hidden">
                    <img
                      src={area.thumbnail}
                      alt={area.title}
                      loading="lazy"
                      width={512}
                      height={512}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-8 text-center">
                  <h3 className="text-xl font-bold text-foreground font-display mb-3">{area.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{area.description}</p>
                </div>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
};
