import { Link } from "react-router-dom";
import { ScrollText, ArrowRight } from "lucide-react";

/**
 * Homepage CTA for the free Golden Report — the primary way visitors check
 * their company on the main site.
 */
export function HomeToolShopGrid() {
  return (
    <section className="mt-6 max-w-5xl mx-auto animate-fade-in">
      <div className="rounded-sm border border-amber/40 bg-card/70 backdrop-blur-sm p-6 sm:p-10 text-center">
        <div className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-amber mb-3">
          <ScrollText className="w-3 h-3" /> Free · 14-chapter case file
        </div>
        <h2 className="font-forensic text-2xl sm:text-4xl font-bold leading-tight mb-3">
          Check your company.
        </h2>
        <p className="text-sm sm:text-base text-foreground/70 max-w-2xl mx-auto mb-6">
          Drop one URL. Aetheris runs the full forensic stack and delivers a 14-chapter case file with verdicts, dollar leaks, and evidence you can search or ask questions of.
        </p>
        <Link
          to="/golden-report"
          className="inline-flex items-center justify-center gap-2 w-full sm:w-auto rounded-sm bg-amber hover:bg-amber/90 text-background px-6 sm:px-10 py-4 text-sm sm:text-base font-mono uppercase tracking-widest font-bold transition-colors shadow-[0_0_30px_-4px_hsl(var(--amber)/0.45)]"
        >
          Run the Golden Report
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
