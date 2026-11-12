import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { SEOHead } from "@/components/SEOHead";
import { LanderNavbar } from "@/components/lander/LanderNavbar";
import { Footer } from "@/components/Footer";
import { AnimatedTestimonials } from "@/components/ui/animated-testimonials";
import { MINDPRINT_PORTFOLIO_EXAMPLES } from "@/lib/mindprintPortfolio";
import { ORIGINAL_GOLDEN_REPORTS } from "@/lib/goldenPortfolio";

export default function PortfolioPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#080a0e] text-white">
      <SEOHead
        title="Portfolio | Original Golden Reports and Mindprint | Aetheris"
        description="Open four original Golden Report PDFs and explore four public Mindprint dossiers. Real report covers link directly to the full files."
        path="/portfolio"
        keywords="Aetheris portfolio, original Golden Report PDF, Mindprint examples, business forensic intelligence, public professional research"
      />
      <LanderNavbar />
      <main id="main-content">
        <section className="relative overflow-hidden px-4 pb-6 pt-36 sm:px-6 sm:pb-12 sm:pt-40">
          <div aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-5 h-[350px] w-[min(900px,90vw)] -translate-x-1/2 rounded-full bg-[#df895b]/[0.09] blur-[110px]" />
          <div className="relative mx-auto max-w-6xl">
            <p className="font-case text-[11px] font-semibold uppercase tracking-[0.24em] text-[#eaa57c]">
              Aetheris / Portfolio
            </p>
            <h1 className="mt-5 max-w-4xl font-forensic text-4xl font-semibold leading-[1.07] text-white sm:text-5xl md:text-6xl">
              See the work. <span className="text-white/55">Read the original evidence.</span>
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-7 text-white/70 sm:text-lg sm:leading-8">
              Open the original Golden Report PDFs below. No generated copies. No shortened previews.
              Then explore the four public Mindprint dossiers, with their actual portraits and reports.
            </p>
          </div>
        </section>
        <section id="golden-report-originals" aria-labelledby="original-golden-reports-heading"
          className="relative px-4 pb-16 sm:px-6 sm:pb-24">
          <div className="mx-auto max-w-6xl">
            <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-case text-[11px] font-semibold uppercase tracking-[0.24em] text-[#eaa57c]">
                  01 / Business intelligence / Original documents
                </p>
                <h2 id="original-golden-reports-heading" className="mt-3 font-forensic text-3xl font-semibold text-white sm:text-4xl">
                  Golden Reports
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-white/65">
                  Four complete original PDFs from the Mindprint library. Select a cover to open
                  the actual document in your browser.
                </p>
              </div>
              <span className="rounded-full border border-white/20 px-4 py-2 font-case text-[10px] uppercase tracking-[0.18em] text-white/65">
                4 original PDFs
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
              {ORIGINAL_GOLDEN_REPORTS.map(report => (
                <a
                  key={report.id}
                  href={report.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  type="application/pdf"
                  aria-label={"Open original " + report.pages + "-page Golden Report PDF for " + report.name}
                  className="group flex min-w-0 flex-col overflow-hidden rounded-xl border border-[#eaa57c]/25 bg-white/[0.035] p-3 shadow-[0_20px_48px_rgba(0,0,0,.35)] transition-all hover:-translate-y-1 hover:border-[#eaa57c]/75 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eaa57c] sm:p-4"
                >
                  <div className="relative mx-auto w-full max-w-[230px]" style={{ perspective: "900px" }}>
                    <div className="relative aspect-[595/842] overflow-hidden rounded-[3px_9px_9px_3px] border border-[#eaa57c]/30 bg-[#111218] shadow-[10px_12px_22px_rgba(0,0,0,.6)] transition-transform duration-300 group-hover:-rotate-1">
                      <img
                        src={report.coverUrl}
                        alt={"Original Golden Report cover for " + report.name}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover object-top"
                      />
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col">
                    <p className="mt-4 font-case text-[9px] uppercase tracking-[0.15em] text-[#eaa57c]">
                      {report.pages} pages / Original PDF
                    </p>
                    <h3 className="mt-2 font-display text-sm font-semibold leading-5 text-white sm:text-base">
                      {report.name}
                    </h3>
                    <p className="mt-1 flex-1 text-xs leading-5 text-white/55">{report.sector}</p>
                    <span className="mt-4 inline-flex items-center gap-1.5 font-case text-[10px] font-semibold uppercase tracking-[0.12em] text-[#eaa57c]">
                      Open original PDF <ArrowUpRight size={15} aria-hidden="true" />
                    </span>
                  </div>
                </a>
              ))}
            </div>
            <p className="mt-5 text-xs leading-6 text-white/45">
              These are the original source files, not a recreated report view.
              Revenue exposure figures inside the reports are modeled estimates, not verified recovered funds.
            </p>
          </div>
        </section>
        <section aria-labelledby="portfolio-examples-heading" className="px-4 pb-20 sm:px-6">
          <div className="mx-auto max-w-6xl rounded-[30px] border border-white/10 bg-white/[0.025] px-3 py-7 shadow-[0_25px_100px_rgba(0,0,0,0.25)] sm:px-6 sm:py-10">
            <div className="mb-3 px-2 sm:px-4">
              <p className="font-case text-[10px] font-semibold uppercase tracking-[0.22em] text-[#eaa57c]">02 / People intelligence / Public research examples</p>
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
