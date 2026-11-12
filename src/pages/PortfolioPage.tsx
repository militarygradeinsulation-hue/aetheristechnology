import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { SEOHead } from "@/components/SEOHead";
import { LanderNavbar } from "@/components/lander/LanderNavbar";
import { Footer } from "@/components/Footer";
import { AnimatedTestimonials } from "@/components/ui/animated-testimonials";
import { MINDPRINT_PORTFOLIO_EXAMPLES } from "@/lib/mindprintPortfolio";

export default function PortfolioPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#080a0e] text-white">
      <SEOHead
        title="Mindprint Portfolio | Public Intelligence Examples | Aetheris"
        description="See four publicly sourced professional Mindprint examples, including portraits and links to the underlying intelligence reports."
        path="/portfolio"
        keywords="Mindprint examples, public research, business intelligence portfolio, Aetheris professional profiles"
      />
      <LanderNavbar />
      <main id="main-content">
        <section className="relative overflow-hidden px-4 pb-6 pt-36 sm:px-6 sm:pb-12 sm:pt-40">
          <div aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-5 h-[350px] w-[min(900px,90vw)] -translate-x-1/2 rounded-full bg-[#df895b]/[0.09] blur-[110px]" />
          <div className="relative mx-auto max-w-6xl">
            <p className="font-case text-[11px] font-semibold uppercase tracking-[0.24em] text-[#eaa57c]">
              Aetheris / Portfolio / 01
            </p>
            <h1 className="mt-5 max-w-4xl font-forensic text-4xl font-semibold leading-[1.07] text-white sm:text-5xl md:text-6xl">
              Walk in knowing <span className="text-white/55">what others have to guess.</span>
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-7 text-white/70 sm:text-lg sm:leading-8">
              These are the four public Mindprint examples featured on the Mindprint homepage.
              Each example uses the actual person's public portrait and opens the corresponding report.
            </p>
          </div>
        </section>
        <section aria-labelledby="portfolio-examples-heading" className="px-4 pb-20 sm:px-6">
          <div className="mx-auto max-w-6xl rounded-[30px] border border-white/10 bg-white/[0.025] px-3 py-7 shadow-[0_25px_100px_rgba(0,0,0,0.25)] sm:px-6 sm:py-10">
            <div className="mb-3 px-2 sm:px-4">
              <p className="font-case text-[10px] font-semibold uppercase tracking-[0.22em] text-[#eaa57c]">Public research examples</p>
              <h2 id="portfolio-examples-heading" className="mt-2 font-forensic text-2xl font-semibold text-white sm:text-3xl">
                Choose a person. Open the evidence.
              </h2>
            </div>
            <AnimatedTestimonials testimonials={MINDPRINT_PORTFOLIO_EXAMPLES} autoplay />
          </div>
          <div className="mx-auto mt-8 flex max-w-6xl flex-wrap items-start justify-between gap-5">
            <p className="max-w-2xl text-xs leading-6 text-white/50">
              These are editorial demonstrations of public-source professional research.
              They are not customer reviews, endorsements, medical assessments, or claims
              about access to anyone's private thoughts. Review source quality and limits
              inside each Mindprint report.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="https://businessforensics.tech/" target="_blank" rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#eaa57c]/60 px-4 py-3 font-case text-xs font-semibold uppercase tracking-wider text-white hover:bg-[#eaa57c]/10">
                Open Mindprint <ArrowUpRight size={16} aria-hidden="true" />
              </a>
              <Link to="/"
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/20 px-4 py-3 font-case text-xs font-semibold uppercase tracking-wider text-white/80 hover:bg-white/10">
                <ArrowLeft size={16} aria-hidden="true" /> Back to Aetheris
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
