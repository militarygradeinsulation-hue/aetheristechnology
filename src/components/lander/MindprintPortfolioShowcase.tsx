import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { AnimatedTestimonials } from "@/components/ui/animated-testimonials";
import { MINDPRINT_PORTFOLIO_EXAMPLES } from "@/lib/mindprintPortfolio";

/** Replaces the old built-systems and running-projects strip on the homepage. */
export function MindprintPortfolioShowcase() {
  return (
    <section id="portfolio" aria-labelledby="mindprint-portfolio-heading"
      className="scroll-mt-24 border-t border-white/10 bg-[#080a0e] px-4 py-14 text-white sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <p className="font-case text-[11px] font-semibold uppercase tracking-[0.24em] text-[#eaa57c]">
            Portfolio / Mindprint by Aetheris
          </p>
          <h2 id="mindprint-portfolio-heading"
            className="mt-4 font-forensic text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl">
            Four people. Four public Mindprints. <span className="text-white/55">See the intelligence.</span>
          </h2>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">
            Explore real professional profiles through public-source research.
            Select a portrait to preview the example, then open its complete Mindprint report.
          </p>
        </div>
        <AnimatedTestimonials testimonials={MINDPRINT_PORTFOLIO_EXAMPLES} autoplay />
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
          <p className="max-w-xl text-xs leading-5 text-white/45">
            Illustrative public-source examples, not client testimonials or endorsements.
            Portrait credits and report links come from the Mindprint homepage.
          </p>
          <Link to="/portfolio"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/25 px-5 py-3 font-case text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:border-[#eaa57c] hover:bg-white/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#eaa57c]">
            View the portfolio <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
