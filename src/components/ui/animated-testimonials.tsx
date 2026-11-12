"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Adapted for the Aetheris Vite + shadcn setup from the supplied component.
 * Vite uses standard img, not next/image. Lucide is already installed.
 *
 * "quote" is a public-research example description, never a fabricated
 * customer quote or endorsement.
 */
export type Testimonial = {
  quote: string;
  name: string;
  designation: string;
  src: string;
  fallbackSrc?: string;
  category?: string;
  portraitCredit?: string;
  href?: string;
};

function Portrait({
  src, fallbackSrc, name, decorative = false, className,
}: {
  src: string;
  fallbackSrc?: string;
  name: string;
  decorative?: boolean;
  className?: string;
}) {
  const [imageIndex, setImageIndex] = useState(0);
  useEffect(() => setImageIndex(0), [src, fallbackSrc]);
  const images = [src, fallbackSrc].filter(Boolean) as string[];
  if (imageIndex >= images.length) {
    return (
      <div className={cn("flex h-full w-full items-center justify-center bg-[#202125] text-4xl font-display font-semibold text-white/80", className)}
        aria-label={decorative ? undefined : "Portrait unavailable for " + name} aria-hidden={decorative}>
        {name.split(" ").map(part => part[0]).slice(0, 2).join("")}
      </div>
    );
  }
  return (
    <img
      src={images[imageIndex]}
      onError={() => setImageIndex(index => index + 1)}
      alt={decorative ? "" : name + " portrait"}
      aria-hidden={decorative}
      referrerPolicy="no-referrer"
      loading={decorative ? "lazy" : "eager"}
      draggable={false}
      className={cn("h-full w-full object-cover object-top", className)}
    />
  );
}

export function AnimatedTestimonials({
  testimonials, autoplay = false, className,
}: {
  testimonials: Testimonial[];
  autoplay?: boolean;
  className?: string;
}) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();
  const count = testimonials.length;
  const currentIndex = count ? active % count : 0;
  const selected = testimonials[currentIndex];

  useEffect(() => {
    if (!autoplay || paused || reduceMotion || count < 2) return;
    const timer = window.setInterval(() => setActive(index => (index + 1) % count), 6500);
    return () => window.clearInterval(timer);
  }, [autoplay, paused, reduceMotion, count]);

  if (!selected) return null;

  const next = () => setActive(index => (index + 1) % count);
  const previous = () => setActive(index => (index - 1 + count) % count);

  const initialMotion = reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.93, rotate: -5, y: 20 };
  const shownMotion = { opacity: 1, scale: 1, rotate: 0, y: 0 };
  const exitMotion = reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, rotate: 4, y: -18 };

  return (
    <div
      className={cn("mx-auto w-full max-w-6xl px-1 py-5 sm:px-4 md:py-10", className)}
      data-testid="animated-mindprint-examples"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setPaused(false);
      }}
    >
      <div className="grid items-center gap-8 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] md:gap-12">
        <div className="min-w-0">
          <div className="relative h-[310px] overflow-hidden rounded-[24px] border border-white/15 bg-[#101216] shadow-[0_24px_80px_rgba(0,0,0,0.55)] sm:h-[400px] md:h-[460px]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={selected.name}
                initial={initialMotion}
                animate={shownMotion}
                exit={exitMotion}
                transition={{ duration: reduceMotion ? 0.12 : 0.48, ease: "easeInOut" }}
                className="absolute inset-0"
              >
                <Portrait
                  key={selected.src}
                  src={selected.src}
                  fallbackSrc={selected.fallbackSrc}
                  name={selected.name}
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-3">
                  <span className="rounded-md border border-white/25 bg-black/60 px-3 py-2 font-case text-[10px] uppercase tracking-[0.18em] text-white/90 backdrop-blur-md">
                    Mindprint / Public example
                  </span>
                  <span className="font-case text-sm tabular-nums text-white/80">
                    {String(currentIndex + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2 sm:gap-3" aria-label="Choose a Mindprint example">
            {testimonials.map((person, index) => (
              <button
                key={person.name}
                type="button"
                aria-label={"Show " + person.name + " Mindprint example"}
                aria-pressed={index === currentIndex}
                onClick={() => setActive(index)}
                className={cn(
                  "group relative aspect-[4/3] min-w-0 overflow-hidden rounded-xl border bg-[#15171b] text-white transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#eaa57c]",
                  index === currentIndex ? "border-[#eaa57c] ring-1 ring-[#eaa57c]/70" : "border-white/15 opacity-65 hover:border-white/50 hover:opacity-100",
                )}
              >
                <Portrait src={person.src} fallbackSrc={person.fallbackSrc} name={person.name}
                  decorative className="transition-transform duration-300 group-hover:scale-105" />
                <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-1 pb-1.5 pt-4 text-center font-case text-[9px] font-semibold leading-3 text-white sm:text-[10px]">
                  {person.name.split(" ")[0]}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-center font-case text-[10px] text-white/45">
            {selected.portraitCredit || "Public-source portrait"}
          </p>
        </div>

        <div className="flex min-w-0 flex-col justify-center md:py-5" aria-live="polite" aria-atomic="true">
          <div className="mb-5 flex items-center gap-3 font-case text-[10px] font-semibold uppercase tracking-[0.22em] text-[#eaa57c]">
            <span className="h-px w-9 bg-[#eaa57c]/60" aria-hidden="true" />
            Evidence over assumptions
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={selected.name}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
              transition={{ duration: reduceMotion ? 0.1 : 0.25, ease: "easeInOut" }}
            >
              <p className="mb-3 font-case text-xs uppercase tracking-[0.2em] text-[#eaa57c]/85">
                {selected.category || "Professional research"}
              </p>
              <h3 className="font-forensic text-4xl font-semibold leading-[1.1] text-white sm:text-5xl">
                {selected.name}
              </h3>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/65 sm:text-base">
                {selected.designation}
              </p>
              <div className="my-7 h-px w-full bg-gradient-to-r from-[#eaa57c]/70 via-white/15 to-transparent" />
              <p className="mb-2 font-case text-[10px] uppercase tracking-[0.18em] text-white/50">
                What this example shows
              </p>
              <p className="min-h-[95px] max-w-xl text-base leading-7 text-white/85 sm:text-lg sm:leading-8">
                {selected.quote}
              </p>
              {selected.href && (
                <a
                  href={selected.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-7 inline-flex min-h-12 items-center justify-center gap-3 rounded-lg border border-[#eaa57c]/70 bg-white/[0.04] px-5 py-3 font-case text-xs font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#eaa57c]/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#eaa57c]"
                >
                  Open the public Mindprint report <ArrowUpRight size={17} aria-hidden="true" />
                </a>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex items-center justify-between gap-5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={previous}
                disabled={count < 2}
                aria-label="Previous Mindprint example"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/[0.06] text-white transition hover:border-[#eaa57c] hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#eaa57c] disabled:opacity-40"
              >
                <ArrowLeft size={19} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={next}
                disabled={count < 2}
                aria-label="Next Mindprint example"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/[0.06] text-white transition hover:border-[#eaa57c] hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#eaa57c] disabled:opacity-40"
              >
                <ArrowRight size={19} aria-hidden="true" />
              </button>
            </div>
            <div className="flex gap-2" aria-label="Mindprint example position">
              {testimonials.map((person, index) => (
                <button key={person.name} type="button"
                  aria-label={"Go to example " + (index + 1) + ": " + person.name}
                  aria-current={index === currentIndex ? "true" : undefined}
                  onClick={() => setActive(index)}
                  className={cn("h-1.5 rounded-full transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#eaa57c]",
                    index === currentIndex ? "w-8 bg-[#eaa57c]" : "w-3 bg-white/25 hover:bg-white/55")} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
