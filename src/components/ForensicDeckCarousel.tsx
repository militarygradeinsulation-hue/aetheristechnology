import React, { useState, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, Download, Maximize2, X } from "lucide-react";

const SLIDE_COUNT = 17;
const slides = Array.from({ length: SLIDE_COUNT }, (_, i) => {
  const n = String(i + 1).padStart(2, "0");
  return `/downloads/forensic-deck/slide-${n}.jpg`;
});

const PDF_URL = "/downloads/Forensic-Revenue-Recovery.pdf";
const PPTX_URL = "/downloads/Forensic-Revenue-Recovery.pptx";

export const ForensicDeckCarousel: React.FC = () => {
  const [idx, setIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  const prev = useCallback(() => setIdx((i) => (i - 1 + SLIDE_COUNT) % SLIDE_COUNT), []);
  const next = useCallback(() => setIdx((i) => (i + 1) % SLIDE_COUNT), []);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, prev, next]);

  return (
    <section className="mt-6 max-w-3xl mx-auto animate-fade-in" style={{ animationDelay: "280ms", animationFillMode: "both" }}>
      <div className="relative rounded-2xl border border-amber/30 bg-gradient-to-br from-amber/[0.08] via-white/[0.03] to-transparent backdrop-blur-xl ring-1 ring-inset ring-white/10 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.15)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10 bg-background/30">
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-amber">Case File · Deck</div>
            <div className="font-forensic text-sm sm:text-base font-bold text-foreground leading-tight truncate">
              Forensic Revenue Recovery
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <a
              href={PDF_URL}
              download
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-amber/40 bg-amber/10 hover:bg-amber/20 text-amber font-mono text-[10px] uppercase tracking-wider transition-colors"
              title="Download PDF"
            >
              <Download className="w-3 h-3" /> PDF
            </a>
            <a
              href={PPTX_URL}
              download
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-white/20 bg-white/5 hover:bg-white/10 text-foreground font-mono text-[10px] uppercase tracking-wider transition-colors"
              title="Download PPTX"
            >
              <Download className="w-3 h-3" /> PPTX
            </a>
          </div>
        </div>

        {/* Slide stage */}
        <div className="relative bg-black/40">
          <button
            type="button"
            onClick={() => setLightbox(true)}
            className="block w-full aspect-[16/9] overflow-hidden group"
            aria-label="Expand slide"
          >
            <img
              src={slides[idx]}
              alt={`Forensic Revenue Recovery — slide ${idx + 1} of ${SLIDE_COUNT}`}
              className="w-full h-full object-contain transition-transform group-hover:scale-[1.01]"
              loading="lazy"
              draggable={false}
            />
            <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-background/70 backdrop-blur border border-white/15 text-[10px] font-mono text-foreground/80 opacity-0 group-hover:opacity-100 transition-opacity">
              <Maximize2 className="w-3 h-3" /> Expand
            </span>
          </button>

          {/* Prev / Next */}
          <button
            type="button"
            onClick={prev}
            aria-label="Previous slide"
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/70 hover:bg-background border border-white/15 text-foreground backdrop-blur transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next slide"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/70 hover:bg-background border border-white/15 text-foreground backdrop-blur transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Counter */}
          <div className="absolute bottom-2 left-2 px-2 py-1 rounded-md bg-background/70 backdrop-blur border border-white/15 font-mono text-[10px] tracking-widest text-foreground/80">
            {String(idx + 1).padStart(2, "0")} / {String(SLIDE_COUNT).padStart(2, "0")}
          </div>
        </div>

        {/* Thumbnails */}
        <div className="px-3 py-3 border-t border-white/10 bg-background/30 overflow-x-auto">
          <div className="flex gap-2 min-w-min">
            {slides.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => setIdx(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`relative shrink-0 w-20 aspect-[16/9] rounded-md overflow-hidden border transition-all ${
                  i === idx
                    ? "border-amber ring-2 ring-amber/40"
                    : "border-white/10 hover:border-white/30 opacity-70 hover:opacity-100"
                }`}
              >
                <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" draggable={false} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setLightbox(false)}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setLightbox(false); }}
            aria-label="Close"
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20"
          >
            <X className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); prev(); }}
            aria-label="Previous"
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); next(); }}
            aria-label="Next"
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
          <img
            src={slides[idx]}
            alt={`Slide ${idx + 1}`}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-md bg-white/10 backdrop-blur border border-white/20 font-mono text-xs text-white tracking-widest">
            {String(idx + 1).padStart(2, "0")} / {String(SLIDE_COUNT).padStart(2, "0")}
          </div>
        </div>
      )}
    </section>
  );
};

export default ForensicDeckCarousel;
