import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, SkipForward, SkipBack, X } from "lucide-react";
import type { OnboardingModule } from "@/lib/onboardingApi";
import { updateProgress } from "@/lib/onboardingApi";

interface Props {
  module: OnboardingModule;
  onClose?: () => void;
  trackProgress?: boolean; // only true in rep portal
}

export const OnboardingPlayer: React.FC<Props> = ({ module, onClose, trackProgress = false }) => {
  const slides = module.slides_json || [];
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const slide = slides[idx];

  const total = module.total_duration_sec || slides.reduce((a, s) => a + (s.duration_sec || 0), 0);

  // Watched-seconds accumulator
  const watchedRef = useRef(0);
  const lastTickRef = useRef<number | null>(null);

  useEffect(() => {
    // Switching slides: pause and reset audio
    setPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [idx]);

  useEffect(() => {
    if (!playing) {
      lastTickRef.current = null;
      return;
    }
    const interval = setInterval(() => {
      const now = Date.now();
      if (lastTickRef.current) {
        watchedRef.current += (now - lastTickRef.current) / 1000;
      }
      lastTickRef.current = now;
    }, 500);
    return () => clearInterval(interval);
  }, [playing]);

  // Persist progress every 10s + on unmount
  useEffect(() => {
    if (!trackProgress) return;
    const i = setInterval(() => {
      void updateProgress(module.slug, watchedRef.current);
    }, 10000);
    return () => {
      clearInterval(i);
      const completed = watchedRef.current >= (total * 0.9);
      void updateProgress(module.slug, watchedRef.current, completed);
    };
  }, [module.slug, total, trackProgress]);

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) { void a.play(); setPlaying(true); }
    else { a.pause(); setPlaying(false); }
  };

  const next = () => {
    if (idx < slides.length - 1) setIdx(idx + 1);
    else {
      // finished — flush completion
      if (trackProgress) void updateProgress(module.slug, total, true);
    }
  };
  const prev = () => idx > 0 && setIdx(idx - 1);

  if (!slide) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No slides yet. Generate this module first.
      </div>
    );
  }

  return (
    <div className="bg-background border border-border rounded-lg overflow-hidden flex flex-col">
      {/* Slide canvas */}
      <div
        className="relative aspect-video w-full overflow-hidden"
        style={{
          background: "linear-gradient(135deg, hsl(220 30% 8%) 0%, hsl(220 25% 12%) 100%)",
          color: "hsl(45 20% 95%)",
        }}
      >
        {/* Live screenshot / iframe of the area being narrated */}
        {slide.image_url ? (
          <img
            src={slide.image_url}
            alt={slide.title}
            className="absolute inset-0 w-full h-full object-cover opacity-90"
          />
        ) : slide.route ? (
          <iframe
            key={slide.route}
            src={slide.route}
            title={`Live preview: ${slide.title}`}
            className="absolute inset-0 w-full h-full border-0 bg-background"
            sandbox="allow-same-origin allow-scripts allow-forms"
          />
        ) : null}

        {/* Caption overlay (semi-transparent so the screenshot is visible behind) */}
        <div
          className={`absolute inset-0 flex flex-col justify-end px-10 py-8 ${
            slide.route || slide.image_url
              ? "bg-gradient-to-t from-black/85 via-black/55 to-transparent"
              : ""
          }`}
        >
          {/* Header strip */}
          <div className="absolute top-3 left-4 right-4 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] font-mono text-amber-400/80">
            <span className="bg-black/50 px-2 py-0.5 rounded">{module.title}</span>
            <span className="bg-black/50 px-2 py-0.5 rounded">Slide {idx + 1} / {slides.length}</span>
          </div>
          <h2
            className="text-2xl md:text-3xl font-serif font-bold mb-4 text-amber-100 drop-shadow-lg"
            style={{ fontFamily: "Fraunces, Georgia, serif" }}
          >
            {slide.title}
          </h2>
          <ul className="space-y-2 max-w-2xl">
            {slide.bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-3 text-sm md:text-base">
                <span className="mt-1.5 inline-block w-2 h-2 bg-amber-500 rounded-full flex-shrink-0" />
                <span className="text-foreground/95 drop-shadow" style={{ color: "hsl(45 15% 95%)" }}>{b}</span>
              </li>
            ))}
          </ul>
          {/* Watermark */}
          <div className="absolute bottom-3 right-4 text-[9px] font-mono uppercase tracking-widest text-amber-500/60">
            Aetheris AI Studio
          </div>
        </div>
      </div>

      {/* Audio + controls */}
      <div className="bg-card border-t border-border p-3 flex items-center gap-2">
        <Button size="icon" variant="ghost" onClick={prev} disabled={idx === 0}>
          <SkipBack className="w-4 h-4" />
        </Button>
        <Button size="icon" onClick={togglePlay} disabled={!slide.audio_url}>
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
        <Button size="icon" variant="ghost" onClick={next} disabled={idx === slides.length - 1}>
          <SkipForward className="w-4 h-4" />
        </Button>
        <audio
          ref={audioRef}
          src={slide.audio_url}
          onEnded={() => { setPlaying(false); next(); }}
          onPause={() => setPlaying(false)}
          onPlay={() => setPlaying(true)}
          className="flex-1 h-8"
          controls
        />
        {onClose && (
          <Button size="icon" variant="ghost" onClick={onClose} title="Close">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Narration transcript (collapsed) */}
      <details className="bg-muted/20 border-t border-border px-4 py-2 text-xs">
        <summary className="cursor-pointer text-muted-foreground font-mono uppercase tracking-wider">
          Transcript
        </summary>
        <p className="mt-2 text-foreground/80 whitespace-pre-wrap">{slide.narration}</p>
      </details>
    </div>
  );
};

export default OnboardingPlayer;
