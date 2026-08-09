import React, { Suspense, lazy, useEffect, useState } from "react";

const GenerativeArtScene = lazy(() => import("./GenerativeArtScene"));

interface AnomalousMatterHeroProps {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
}

/** Static fallback used when motion is reduced or WebGL is unavailable. */
const StaticField: React.FC = () => (
  <div
    aria-hidden
    className="absolute inset-0"
    style={{
      background:
        "radial-gradient(circle at 50% 45%, hsl(var(--amber-glow) / 0.18) 0%, transparent 55%)",
    }}
  />
);

export const AnomalousMatterHero: React.FC<AnomalousMatterHeroProps> = ({
  eyebrow,
  title,
  description,
  children,
}) => {
  const [allowMotion, setAllowMotion] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setAllowMotion(!reduced);
  }, []);

  return (
    <section className="relative w-full min-h-[78vh] md:min-h-[88vh] text-foreground overflow-hidden flex flex-col justify-center items-center py-24 px-6">
      {/* Ambient field behind the orb: grid, corner brackets, drifting motes */}
      <div aria-hidden className="ambient-bg absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="ambient-grid absolute inset-0" />
        <div className="ambient-corner absolute left-6 top-6 border-l border-t" />
        <div className="ambient-corner absolute right-6 top-6 border-r border-t" />
        <div className="ambient-corner absolute bottom-6 left-6 border-b border-l" />
        <div className="ambient-corner absolute bottom-6 right-6 border-b border-r" />
        <div className="ambient-mote" style={{ left: "14%", top: "24%", animationDelay: "0s" }} />
        <div className="ambient-mote" style={{ left: "80%", top: "30%", animationDelay: "1.4s" }} />
        <div className="ambient-mote" style={{ left: "30%", top: "70%", animationDelay: "2.6s" }} />
        <div className="ambient-mote" style={{ left: "68%", top: "78%", animationDelay: "3.8s" }} />
      </div>

      <div className="absolute inset-0 z-[1] pointer-events-none">
        {allowMotion ? (
          <Suspense fallback={<StaticField />}>
            <GenerativeArtScene />
          </Suspense>
        ) : (
          <StaticField />
        )}
      </div>

      <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-t from-background/85 via-background/35 to-transparent" />

      <div className="relative z-20 flex flex-col items-center justify-center max-w-3xl text-center mx-auto space-y-6">
        {eyebrow && (
          <span className="font-case text-[10px] sm:text-xs tracking-[0.3em] text-amber uppercase px-3 py-1 rounded-full bg-amber/10 border border-amber/20">
            {eyebrow}
          </span>
        )}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.05] tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-xl mx-auto">
            {description}
          </p>
        )}
        {children}
      </div>
    </section>
  );
};

export default AnomalousMatterHero;
