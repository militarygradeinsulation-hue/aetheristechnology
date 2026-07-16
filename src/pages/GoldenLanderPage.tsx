import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Background } from "@/components/Background";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ContactModal } from "@/components/ContactModal";
import { SEOHead } from "@/components/SEOHead";
import { ArrowRight, Cpu } from "lucide-react";
import goldenPoster from "@/assets/tools/golden-report.png.asset.json";

/**
 * Case-file landing page for the Golden Report.
 * Recreates the filmstrip / ticket design in real HTML so CTAs
 * drive traffic straight into the working /golden-report scanner.
 */
const GoldenLanderPage: React.FC = () => {
  const [contactOpen, setContactOpen] = useState(false);

  // Filmstrip perforation column (repeats vertically).
  const Perf = ({ side }: { side: "left" | "right" }) => (
    <div
      aria-hidden
      className={`absolute top-0 bottom-0 ${side === "left" ? "left-3" : "right-3"} w-3 flex flex-col items-center justify-around py-6 pointer-events-none`}
    >
      {Array.from({ length: 22 }).map((_, i) => (
        <span key={i} className="block w-3 h-4 rounded-sm bg-amber/70" />
      ))}
    </div>
  );

  const Corner = ({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) => {
    const map = {
      tl: "top-4 left-4 border-t-2 border-l-2 rounded-tl-md",
      tr: "top-4 right-4 border-t-2 border-r-2 rounded-tr-md",
      bl: "bottom-4 left-4 border-b-2 border-l-2 rounded-bl-md",
      br: "bottom-4 right-4 border-b-2 border-r-2 rounded-br-md",
    } as const;
    return <span aria-hidden className={`absolute w-6 h-6 border-amber/70 ${map[pos]}`} />;
  };

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Check Your Company Free — The Golden Report | Aetheris"
        description="Drop one URL. Aetheris runs the full forensic stack — a 14-chapter case file, positioning message, hero imagery, per-platform social posts, and a 30-day schedule. Free."
        path="/golden"
        keywords="golden report, free forensic scan, business audit, revenue leak, aetheris"
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "Golden Report", path: "/golden" },
        ]}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setContactOpen(true)} />

        <main className="pt-24 pb-16 px-4">
          <div className="max-w-4xl mx-auto">
            {/* Filmstrip case-file card */}
            <section className="relative rounded-lg border border-amber/25 bg-[#0a0a0e]/95 shadow-[0_20px_80px_-20px_hsl(38_92%_55%/0.25)] overflow-hidden">
              {/* Top micro-header */}
              <div className="flex items-center justify-between px-8 pt-5 pb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-amber/80">
                <span>AETH-GR / IC-14</span>
                <span>LOT · V4.0.2 · USA</span>
              </div>

              {/* Inner ticket frame */}
              <div className="relative mx-6 md:mx-10 my-4 rounded-md border border-amber/25 bg-black/40 px-5 md:px-14 py-10 md:py-14">
                <Corner pos="tl" />
                <Corner pos="tr" />
                <Corner pos="bl" />
                <Corner pos="br" />
                <Perf side="left" />
                <Perf side="right" />

                {/* Little tab notch */}
                <span
                  aria-hidden
                  className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-3 rounded-full border border-amber/40 bg-[#0a0a0e]"
                />

                <div className="relative text-center">
                  <div className="font-mono text-[10px] md:text-xs uppercase tracking-[0.35em] text-muted-foreground/80">
                    Aetheris · Golden Report
                  </div>
                  <div className="mt-3 inline-flex items-center gap-2 border border-amber/40 bg-amber/5 px-3 py-1 rounded-full font-mono text-[10px] uppercase tracking-[0.25em] text-amber">
                    <Cpu className="w-3 h-3" /> Free · 14-Chapter Case File
                  </div>

                  <h1 className="mt-6 font-forensic text-4xl md:text-6xl leading-[1.05] text-foreground">
                    Check your <span className="text-amber italic">company</span>
                    <br />
                    <span className="text-amber">FREE</span>
                  </h1>

                  {/* Poster preview */}
                  <div className="mt-9 mx-auto max-w-2xl rounded-md border border-amber/20 bg-black/50 p-3 md:p-4 shadow-[0_10px_40px_-12px_hsl(38_92%_55%/0.25)]">
                    <img
                      src={goldenPoster.url}
                      alt="Golden Report — 14-chapter forensic case file preview"
                      className="w-full rounded-sm"
                      loading="lazy"
                    />
                  </div>

                  <p className="mt-9 text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                    Drop one URL. Aetheris runs the full forensic stack{" "}
                    <span className="text-amber">and</span> builds a fully branded content
                    kit — 14-chapter case file, positioning message, hero imagery,
                    per-platform social posts, and a 30-day schedule.
                  </p>

                  {/* Ticket CTA */}
                  <div className="mt-10 flex justify-center">
                    <Link
                      to="/golden-report"
                      className="group relative block w-full max-w-2xl text-left"
                    >
                      <div className="relative rounded-md bg-[#f6efe0] text-[#1a1a1a] pl-14 pr-6 py-6 shadow-[0_8px_30px_-8px_rgba(0,0,0,0.6)] transition-transform group-hover:-translate-y-0.5">
                        {/* Perforated stub */}
                        <div className="absolute inset-y-0 left-8 border-l border-dashed border-[#1a1a1a]/40" />
                        <div className="absolute inset-y-0 left-0 w-8 flex flex-col justify-around py-3">
                          {Array.from({ length: 6 }).map((_, i) => (
                            <span
                              key={i}
                              className="w-3 h-3 rounded-full bg-[#0a0a0e] mx-auto"
                            />
                          ))}
                        </div>

                        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.25em] text-[#1a1a1a]/70">
                          <span>Exhibit · A</span>
                          <span>No. GR-014</span>
                        </div>

                        <div className="mt-3 font-forensic text-2xl md:text-3xl font-bold">
                          Golden Report
                        </div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#1a1a1a]/70 mt-1">
                          14-Chapter Forensic Case File
                        </div>

                        {/* Barcode */}
                        <div className="mt-4 flex items-center gap-3">
                          <svg
                            viewBox="0 0 200 40"
                            className="h-9 flex-1"
                            aria-hidden
                            preserveAspectRatio="none"
                          >
                            {Array.from({ length: 46 }).map((_, i) => {
                              const w = (i * 7) % 5 < 2 ? 1 : (i * 3) % 4 === 0 ? 3 : 2;
                              const x = i * 4.2;
                              return (
                                <rect
                                  key={i}
                                  x={x}
                                  y={0}
                                  width={w}
                                  height={40}
                                  fill="#1a1a1a"
                                />
                              );
                            })}
                          </svg>
                          <span className="font-mono text-lg font-bold tracking-widest">
                            FREE
                          </span>
                        </div>

                        <div className="mt-4 flex items-center justify-between">
                          <span className="inline-flex items-center gap-2 border border-[#1a1a1a] rounded-sm px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.25em]">
                            Open File
                          </span>
                          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#1a1a1a]/70 hidden sm:inline">
                            aetheris.technology/golden
                          </span>
                          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </Link>
                  </div>

                  <div className="mt-8 font-mono text-[10px] uppercase tracking-[0.35em] text-muted-foreground/70">
                    Secure Processing Enclave
                  </div>
                </div>
              </div>

              <div className="h-4" />
            </section>

            {/* Under-fold reassurance strip */}
            <div className="mt-8 grid sm:grid-cols-3 gap-3 text-center">
              {[
                ["100% Confidential", "Your data stays with us."],
                ["Evidence-Backed", "Every leak is proven."],
                ["Action-First", "We don't just find leaks. We fix them."],
              ].map(([t, d]) => (
                <div
                  key={t}
                  className="rounded-sm border border-amber/20 bg-background/40 p-4"
                >
                  <div className="font-mono text-[10px] uppercase tracking-widest text-amber mb-1">
                    {t}
                  </div>
                  <div className="text-xs text-muted-foreground">{d}</div>
                </div>
              ))}
            </div>
          </div>
        </main>

        <Footer />
      </div>
      <ContactModal isOpen={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  );
};

export default GoldenLanderPage;
