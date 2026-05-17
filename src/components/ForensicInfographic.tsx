import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface ForensicInfographicProps {
  image: string;
  imageAlt: string;
  caseNumber: string;
  title: string;
  summary: string;
  fullText?: string | string[];
  reverse?: boolean;
}

/**
 * Two-column case-file tile: forensic infographic + short summary,
 * with an optional collapsible block for the long-form copy.
 * Stacks on mobile, image-first on desktop.
 */
export const ForensicInfographic: React.FC<ForensicInfographicProps> = ({
  image,
  imageAlt,
  caseNumber,
  title,
  summary,
  fullText,
  reverse = false,
}) => {
  const [open, setOpen] = useState(false);
  const paragraphs = Array.isArray(fullText) ? fullText : fullText ? [fullText] : [];

  return (
    <article className="forensic-tile rounded-sm border border-border/60 p-5 md:p-7">
      <div className={`grid gap-6 md:gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] items-center ${reverse ? 'md:[&>*:first-child]:order-2' : ''}`}>
        <div className="relative rounded-sm overflow-hidden border border-amber/20 bg-background/40">
          <img
            src={image}
            alt={imageAlt}
            width={1024}
            height={1024}
            loading="lazy"
            className="w-full h-auto block aspect-square object-cover"
          />
          <span className="absolute bottom-2 right-2 font-case text-[9px] uppercase tracking-widest text-amber/80 bg-background/70 px-2 py-0.5 rounded-sm border border-amber/20">
            Aetheris AI Studio
          </span>
        </div>

        <div className="flex flex-col">
          <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">
            Case · {caseNumber}
          </div>
          <h3 className="font-forensic text-2xl md:text-3xl font-bold text-foreground leading-tight mb-3">
            {title}
          </h3>
          <p className="text-foreground/85 leading-relaxed">{summary}</p>

          {paragraphs.length > 0 && (
            <div className="mt-5">
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="inline-flex items-center gap-1.5 font-case text-[10px] uppercase tracking-widest text-amber/90 hover:text-amber transition-colors"
              >
                {open ? 'Hide full case notes' : 'Read full case notes'}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>
              {open && (
                <div className="mt-4 space-y-3 text-sm text-foreground/75 leading-relaxed border-l-2 border-amber/30 pl-4">
                  {paragraphs.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
};
