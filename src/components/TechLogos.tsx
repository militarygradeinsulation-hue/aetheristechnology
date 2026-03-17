import React, { useEffect, useRef } from 'react';

export const TechLogos: React.FC = () => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const technologies = [
    'TensorFlow',
    'PyTorch',
    'OpenAI',
    'Hugging Face',
    'AWS',
    'Google Cloud',
    'Azure',
    'Python',
    'React',
    'Node.js',
  ];

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let scrollAmount = 0;
    let animationId: number;

    const animate = () => {
      scrollAmount += 0.5;
      el.scrollLeft = scrollAmount;

      if (scrollAmount >= el.scrollWidth / 2) {
        scrollAmount = 0;
      }
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <div className="w-full py-8 border-y border-border glass overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 mb-6">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse-glow" />
          Technologies We Master
        </h3>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-8 overflow-x-hidden"
        style={{ scrollBehavior: 'auto' }}
      >
        {[...technologies, ...technologies].map((tech, index) => (
          <div
            key={index}
            className="flex-shrink-0 glass px-8 py-4 rounded-lg border border-amber/20"
          >
            <span className="text-lg font-semibold text-muted-foreground whitespace-nowrap">
              {tech}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
