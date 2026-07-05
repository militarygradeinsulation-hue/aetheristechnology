import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Calendar, FileText, Phone, Mail, MapPin, HelpCircle, ChevronDown, Play, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/SEOHead";
import { Background } from "@/components/Background";
import { BOOK_MEETING_URL } from "@/lib/links";
import heroBanner from "@/assets/hero-leaking-building.jpg";
import heroLeakVideo from "@/assets/hero-leak.mp4";
import aetherisLogo from "@/assets/aetheris-new-logo.png";
import homeHeroBanner from "@/assets/home-hero-banner.jpg.asset.json";
import josephSignature from "@/assets/joseph-signature.png.asset.json";
import { ForensicDeckCarousel } from "@/components/ForensicDeckCarousel";
import { PublicLeakScan } from "@/components/PublicLeakScan";

import { Navbar } from "@/components/Navbar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const LeakLanderPage: React.FC = () => {
  const [deckOpen, setDeckOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const navigate = useNavigate();
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleLogoTap = () => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    if (tapCountRef.current >= 3) {
      tapCountRef.current = 0;
      navigate("/staff");
      return;
    }
    tapTimerRef.current = setTimeout(() => { tapCountRef.current = 0; }, 600);
  };

  const toggleVideo = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.muted = false;
      v.volume = 1;
      v.play()
        .then(() => setPlaying(true))
        .catch(() => {
          v.muted = true;
          v.play().then(() => setPlaying(true)).catch(() => {});
        });
    } else {
      v.pause();
      v.currentTime = 0;
      setPlaying(false);
    }
  };

  return (
    <div className="relative min-h-screen text-foreground overflow-x-hidden flex flex-col">
      <Background />
      <div className="relative z-10 flex flex-col flex-1">
        <SEOHead
          title="Your business is bleeding money. Aetheris Business Forensics."
          description="We run forensics on your operation and put the evidence on the table — whether you like it or not. $18,500 flat Revenue Diagnostic. Indianapolis, US-wide."
          path="/"
        />

        {/* LinkedIn premium offer banner — slim, above navbar */}
        <a
          href="https://www.linkedin.com/in/thejosephtoney"
          target="_blank"
          rel="noopener noreferrer"
          className="relative z-30 block w-full text-amber-50 border-b border-amber/30 transition-colors hover:brightness-110"
          style={{ backgroundColor: 'hsl(36 75% 14%)' }}
        >
          <div className="max-w-5xl mx-auto px-4 py-1 text-center text-[11px] sm:text-xs font-medium truncate">
            <span className="font-case uppercase tracking-widest text-amber mr-2">Limited</span>
            Connect on LinkedIn — get a <span className="text-amber font-semibold">free premium analysis</span>
            <span className="ml-2 underline underline-offset-2">Connect →</span>
          </div>
        </a>

        <Navbar onContactClick={() => {}} />

        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 opacity-[0.06] mix-blend-overlay z-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, hsl(var(--amber)) 0%, transparent 40%), radial-gradient(circle at 80% 70%, hsl(var(--crimson, 0 60% 45%)) 0%, transparent 45%)",
          }}
        />

        <main className="relative flex-1 flex items-center justify-center max-w-7xl w-full mx-auto px-4 sm:px-8 py-4">

        <div className="w-full">
          {/* Aetheris logo. top-left, triple-tap to /staff (admins + reps) */}
          <div className="max-w-4xl mx-auto flex justify-start mb-1">
            <button
              type="button"
              onClick={handleLogoTap}
              aria-label="Aetheris"
              className="rounded-full focus:outline-none focus:ring-2 focus:ring-amber/60 select-none"
            >
              <img
                src={aetherisLogo}
                alt="Aetheris"
                className="h-16 sm:h-24 md:h-32 w-auto opacity-90 hover:opacity-100 transition-opacity pointer-events-none"
                draggable={false}
              />
            </button>
          </div>

          {/* Editorial hero banner. merged from /home */}
          <section
            className="mt-1 max-w-5xl mx-auto animate-fade-in"
            style={{ animationDelay: "80ms", animationFillMode: "both" }}
          >
            <img
              src={homeHeroBanner.url}
              alt="Your business is leaking. You just can't see it from inside the building. Aetheris Business Forensics finds hidden revenue leaks, turns real data into insight, and keeps your business confidential."
              className="w-full h-auto rounded-sm border border-amber/20 shadow-xl"
              loading="eager"
              fetchPriority="high"
            />
          </section>


          {/* HERO — raw rewrite */}
          <section
            className="mt-3 max-w-4xl mx-auto text-center animate-fade-in"
            style={{ animationDelay: "120ms", animationFillMode: "both" }}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="h-px w-8 bg-amber/50" />
              <span className="text-[9px] tracking-[0.35em] font-mono text-amber/80 uppercase">Indianapolis · US-Wide</span>
              <span className="h-px w-8 bg-amber/50" />
            </div>
            <h1 className="font-forensic text-2xl sm:text-4xl md:text-5xl font-bold leading-[1.05] tracking-tight">
              Your business is <span className="text-crimson italic">bleeding money</span>.
              <br className="hidden sm:block" />
              <span className="text-foreground/85"> You just haven't found the wound yet.</span>
            </h1>
            <p className="mt-4 text-sm sm:text-base text-foreground/85 max-w-2xl mx-auto leading-relaxed">
              We find it. We show you the number. Then we fix it — or we tell you you're not fixable and walk.
            </p>
            <p className="mt-3 text-sm text-foreground/70 max-w-2xl mx-auto leading-relaxed">
              We are not a marketing agency. We are not consultants who bill you to agree with you. We run forensics on your entire operation — lead flow, sales process, follow-up, systems, brand, ops — and we put the evidence on the table whether you like what it says or not.
            </p>
          </section>

          {/* CTAs */}
          <section
            className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 animate-fade-in"
            style={{ animationDelay: "180ms", animationFillMode: "both" }}
          >
            <Button asChild variant="outline" size="default" className="relative overflow-hidden h-11 px-6 text-sm border-white/20 bg-gradient-to-br from-white/[0.10] via-white/[0.04] to-transparent backdrop-blur-xl ring-1 ring-inset ring-white/10 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.18)] hover:border-amber/50 hover:bg-amber/10 text-foreground font-mono uppercase tracking-wider transition-all">
              <Link to="/leak-audit">
                <FileText className="w-4 h-4 mr-2 text-amber relative" />
                <span className="relative">Run the Free Leak Audit</span>
              </Link>
            </Button>
            <Button
              size="default"
              onClick={() => setBookingOpen(true)}
              className="relative overflow-hidden h-11 px-6 text-sm bg-gradient-to-br from-amber via-amber to-amber/75 text-background hover:from-amber hover:to-amber/85 font-bold font-mono uppercase tracking-wider ring-1 ring-inset ring-white/30 shadow-[0_15px_40px_-10px_hsl(var(--amber)/0.7),inset_0_1px_0_0_rgba(255,255,255,0.45)] transition-all"
            >
              <Calendar className="w-4 h-4 mr-2 relative" />
              <span className="relative">Open a Case — $18,500</span>
              <ArrowRight className="ml-2 w-4 h-4 relative" />
            </Button>
          </section>

          {/* THE FILTER — unmissable */}
          <section
            className="mt-6 max-w-4xl mx-auto animate-fade-in"
            style={{ animationDelay: "200ms", animationFillMode: "both" }}
          >
            <div className="relative rounded-sm border-2 border-crimson/50 bg-crimson/[0.04] p-5 sm:p-6 shadow-[0_20px_60px_-30px_hsl(var(--crimson,0_60%_45%)/0.6)]">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-crimson mb-2">Read this before you contact us</div>
              <h2 className="font-forensic text-xl sm:text-2xl font-bold leading-tight">
                The Filter.
              </h2>
              <p className="mt-3 text-sm sm:text-base text-foreground/85 leading-relaxed">
                If <span className="text-crimson font-semibold">$18,500</span> to find out exactly where your company is hemorrhaging revenue sounds "expensive," you are not our client. Close this tab. No hard feelings — we just don't waste each other's time.
              </p>
              <p className="mt-3 text-sm text-foreground/70 leading-relaxed">
                Our clients don't ask what it costs. They ask what the leak costs. Usually the answer is <span className="text-amber font-semibold">10 to 40 times our fee</span>, every year, compounding while they "think about it."
              </p>
            </div>
          </section>

          {/* WHO WE DON'T / DO WORK WITH */}
          <section
            className="mt-6 max-w-4xl mx-auto grid md:grid-cols-2 gap-4 animate-fade-in"
            style={{ animationDelay: "220ms", animationFillMode: "both" }}
          >
            <div className="rounded-sm border border-crimson/40 bg-card/60 backdrop-blur-sm p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-crimson mb-2">We turn down more than we take</div>
              <h3 className="font-forensic text-lg font-bold mb-3">We don't work with you if:</h3>
              <ul className="space-y-2 text-sm text-foreground/85 leading-relaxed">
                <li>— You want to be told your marketing is fine and the problem is "the economy."</li>
                <li>— You shop consultants by price instead of by findings.</li>
                <li>— You need six stakeholders and a committee to approve fixing your own business.</li>
                <li>— You want a cheerleader. We're the coroner.</li>
                <li>— You'll argue with the evidence. The data doesn't care how long you've done it your way.</li>
              </ul>
            </div>
            <div className="rounded-sm border border-amber/40 bg-card/60 backdrop-blur-sm p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber mb-2">Deliberately</div>
              <h3 className="font-forensic text-lg font-bold mb-3">We work with you if:</h3>
              <ul className="space-y-2 text-sm text-foreground/85 leading-relaxed">
                <li>— You run a real business — $5M to $50M — and you know something's broken but can't name it.</li>
                <li>— You'd rather hear the ugly truth once than a comfortable lie every quarter.</li>
                <li>— You can make a decision without a permission slip.</li>
                <li>— You measure us on one thing: recovered revenue.</li>
              </ul>
            </div>
          </section>

          {/* WHAT WE ACTUALLY DO */}
          <section
            className="mt-6 max-w-4xl mx-auto animate-fade-in"
            style={{ animationDelay: "240ms", animationFillMode: "both" }}
          >
            <div className="rounded-sm border border-amber/30 bg-card/70 backdrop-blur-sm p-5 sm:p-6">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber mb-2">What we actually do</div>
              <h2 className="font-forensic text-xl sm:text-2xl font-bold leading-tight">
                Revenue Forensics. <span className="text-foreground/60">Not marketing. Not "strategy."</span> Forensics.
              </h2>
              <p className="mt-3 text-sm text-foreground/80 leading-relaxed">
                Every business over $5M has leaks. Vocabulary on your site that kills deals before the first call. Brand promises your operation contradicts daily. Leads that die in follow-up purgatory. Systems that don't talk to each other. Waste that got promoted to "process."
              </p>
              <p className="mt-2 text-sm text-foreground/80 leading-relaxed">
                You can't see them because you built them. We can, because we didn't.
              </p>

              <div className="mt-5">
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber mb-3">The Leak Audit™ — 7-point forensic protocol</div>
                <ol className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm text-foreground/85">
                  {[
                    "Vocabulary friction — the words costing you deals",
                    "Brand contradictions — what you promise vs. what you deliver",
                    "Conversion drop-offs — where buyers quietly exit",
                    "Follow-up failures — the leads you paid for and then ignored",
                    "System disconnects — tools that don't talk, data that dies",
                    "Operational waste — headcount solving software problems",
                    "Growth ceilings — the structural reason you're stuck at this number",
                  ].map((item, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="font-mono text-amber text-xs pt-0.5 shrink-0">0{i + 1}</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ol>
                <p className="mt-4 text-xs text-foreground/60 italic">We don't guess. We document. Every finding comes with a dollar figure attached.</p>
              </div>
            </div>
          </section>

          {/* THE OFFER */}
          <section
            className="mt-6 max-w-4xl mx-auto animate-fade-in"
            style={{ animationDelay: "260ms", animationFillMode: "both" }}
          >
            <div className="text-center mb-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber">The Offer</div>
              <h2 className="font-forensic text-xl sm:text-2xl font-bold mt-1">No menus. No packages. No negotiation.</h2>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="rounded-sm border border-amber/25 bg-card/60 backdrop-blur-sm p-5 flex flex-col">
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber">Tier 01</div>
                <div className="font-forensic text-lg font-bold mt-1">Free Leak Audit</div>
                <div className="font-mono text-2xl text-foreground mt-2">$0</div>
                <p className="text-sm text-foreground/75 mt-3 leading-relaxed flex-1">Self-scan. Thirty seconds. It will sting. That's the point.</p>
                <Link to="/leak-audit" className="mt-4 inline-flex items-center gap-2 text-amber font-mono text-[11px] uppercase tracking-wider hover:underline">
                  Run it now <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="rounded-sm border-2 border-amber/60 bg-amber/[0.06] backdrop-blur-sm p-5 flex flex-col shadow-[0_20px_60px_-20px_hsl(var(--amber)/0.4)]">
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber">Tier 02 · Flagship</div>
                <div className="font-forensic text-lg font-bold mt-1">21-Day Revenue Diagnostic</div>
                <div className="font-mono text-2xl text-amber mt-2">$18,500 <span className="text-xs text-foreground/60">flat</span></div>
                <p className="text-sm text-foreground/80 mt-3 leading-relaxed flex-1">
                  We open a case on your business. 21 days. Full forensic workup. You get the evidence file: what's broken, what it costs you annually, and the fix sequence — whether you hire us to execute or not. <span className="text-amber">Every dollar credits 1:1 toward implementation.</span>
                </p>
                <button onClick={() => setBookingOpen(true)} className="mt-4 inline-flex items-center gap-2 text-amber font-mono text-[11px] uppercase tracking-wider hover:underline text-left">
                  Open a case <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="rounded-sm border border-amber/25 bg-card/60 backdrop-blur-sm p-5 flex flex-col">
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber">Tier 03</div>
                <div className="font-forensic text-lg font-bold mt-1">Active Case</div>
                <div className="font-mono text-2xl text-foreground mt-2">$15,000<span className="text-xs text-foreground/60">/mo</span></div>
                <div className="font-mono text-[10px] text-foreground/60 mt-1">3-month minimum · Diagnostic clients only</div>
                <p className="text-sm text-foreground/75 mt-3 leading-relaxed flex-1">We don't implement blind, and you can't skip the autopsy. We build the systems — AI, automation, CRM, follow-up infrastructure — accountable to the numbers in your evidence file.</p>
              </div>
            </div>

            <p className="mt-4 text-center text-sm text-foreground/70 leading-relaxed max-w-2xl mx-auto">
              That's it. There is no fourth option, no "lite" tier, no payment plan. If the math doesn't work for you, the leak isn't big enough to matter yet — <span className="text-amber">come back when it is</span>.
            </p>
          </section>

          {/* WHY WE'RE LIKE THIS */}
          <section
            className="mt-6 max-w-4xl mx-auto animate-fade-in"
            style={{ animationDelay: "280ms", animationFillMode: "both" }}
          >
            <div className="rounded-sm border border-amber/25 bg-card/70 backdrop-blur-sm p-5 sm:p-6">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber mb-2">Why we're like this</div>
              <h2 className="font-forensic text-xl sm:text-2xl font-bold">Because polite consulting is why you're stuck.</h2>
              <p className="mt-3 text-sm text-foreground/80 leading-relaxed">
                Every agency you've hired told you what you wanted to hear, billed you monthly, and called stagnation "brand building." We'd rather lose the sale than join the pile of invoices that changed nothing.
              </p>
              <p className="mt-3 text-sm text-foreground/80 leading-relaxed">
                Marine Corps veteran. Doctorate work in Digital Forensics. We treat your business like a crime scene: <span className="text-amber">evidence first, feelings never, verdict in writing.</span>
              </p>
              <p className="mt-4 font-forensic text-lg font-bold text-amber">Business Forensics. Real Findings. No Sugar.</p>
            </div>
          </section>

          {/* FAQ — the honest version */}
          <section
            className="mt-6 max-w-4xl mx-auto animate-fade-in"
            style={{ animationDelay: "300ms", animationFillMode: "both" }}
          >
            <div className="text-center mb-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber">FAQ · The honest version</div>
              <h2 className="font-forensic text-xl sm:text-2xl font-bold mt-1">Screenshot at your own risk.</h2>
            </div>
            <div className="rounded-sm border border-amber/25 bg-card/60 backdrop-blur-sm divide-y divide-amber/15">
              {[
                { q: "Can you work with our budget?", a: "No. The fee is fixed because the work is fixed. Budgets flex; forensics don't." },
                { q: "Can we get a discount if we commit longer?", a: "You're asking the coroner for a coupon. No." },
                { q: "What if we don't like the findings?", a: "Irrelevant. The findings are true either way. What you do with them is your call." },
                { q: "How do we know it'll work?", a: "You don't, and anyone who guarantees outcomes is selling you a feeling. What we guarantee: you'll know exactly what's broken, exactly what it costs, and exactly what to fix first. Most clients have never had that. That's why they're leaking." },
                { q: "Why should we trust you?", a: "You shouldn't — yet. Run the free audit. If the free version doesn't surface something that bothers you, we're not your firm and that's fine." },
              ].map((item, i) => (
                <div key={i} className="p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <HelpCircle className="w-4 h-4 text-amber mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <div className="font-forensic font-bold text-sm sm:text-base">"{item.q}"</div>
                      <p className="mt-1.5 text-sm text-foreground/80 leading-relaxed">{item.a}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* FINAL CTA — Two Doors */}
          <section
            className="mt-6 max-w-4xl mx-auto animate-fade-in"
            style={{ animationDelay: "320ms", animationFillMode: "both" }}
          >
            <div className="rounded-sm border-2 border-amber/50 bg-gradient-to-br from-amber/[0.08] via-transparent to-crimson/[0.05] p-6 sm:p-8 text-center">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber mb-2">Two doors</div>
              <h2 className="font-forensic text-2xl sm:text-3xl font-bold leading-tight">
                <span className="text-foreground/60">Door one:</span> keep doing what you're doing. The leak keeps its schedule.
                <br />
                <span className="text-amber">Door two:</span> open a case.
              </h2>
              <div className="mt-5 flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild variant="outline" size="default" className="h-11 px-6 border-white/20 bg-white/[0.06] hover:bg-amber/10 hover:border-amber/50 font-mono uppercase tracking-wider">
                  <Link to="/leak-audit">Free Leak Audit</Link>
                </Button>
                <Button size="default" onClick={() => setBookingOpen(true)} className="h-11 px-6 bg-amber text-background hover:bg-amber/90 font-bold font-mono uppercase tracking-wider">
                  Open a Case — $18,500 <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
              <p className="mt-4 text-xs text-foreground/60 italic">
                No newsletter. No "book a friendly chat." No drip sequence begging you to reconsider. We don't chase. We investigate.
              </p>
            </div>
          </section>


          {/* Signature nameplate — official Joseph Toney signature card */}
          <section
            className="mt-5 max-w-4xl mx-auto animate-fade-in"
            style={{ animationDelay: "260ms", animationFillMode: "both" }}
          >
            <div className="relative rounded-sm bg-black border border-[#C5A059]/25 shadow-[0_20px_60px_-20px_rgba(197,160,89,0.3)] overflow-hidden">
              {/* Corner brackets */}
              <div className="pointer-events-none absolute top-3 left-3 w-6 h-6 border-t border-l border-[#C5A059]/40 z-10" />
              <div className="pointer-events-none absolute top-3 right-3 w-6 h-6 border-t border-r border-[#C5A059]/40 z-10" />
              <div className="pointer-events-none absolute bottom-3 left-3 w-6 h-6 border-b border-l border-[#C5A059]/40 z-10" />
              <div className="pointer-events-none absolute bottom-3 right-3 w-6 h-6 border-b border-r border-[#C5A059]/40 z-10" />

              <img
                src={josephSignature.url}
                alt="Joseph Toney — AI Architect · MS, BA · IBM AI Certified · Aetheris.Technology"
                className="w-full h-auto block animate-gold-float"
                loading="lazy"
              />

              <div className="px-6 pb-8 pt-2 flex flex-col items-center text-center">
                <p className="max-w-xl text-foreground/85 text-sm leading-relaxed italic border-l-2 border-[#C5A059]/50 pl-4 text-left">
                  "I sit in the chair next to yours, open your CRM, and tell you in plain English where the money is bleeding out. Then I fix it myself — with AI, automation, and systems built for closing leaks."
                </p>
                <p className="mt-3 text-[10px] font-atelier uppercase tracking-widest text-[#C5A059]/70">
                  Marine veteran · MS Marketing (4.0) · Doctorate, Digital Forensics · Noblesville, IN
                </p>
              </div>
            </div>
          </section>



          {/* Public website leak scan + free tools suite — combined */}
          <div className="mt-5">
            <PublicLeakScan />
          </div>


          {/* Downloads + Deck — combined case-file card */}
          <section
            className="mt-5 max-w-4xl mx-auto animate-fade-in"
            style={{ animationDelay: "320ms", animationFillMode: "both" }}
          >
            <div className="rounded-lg border border-amber/30 bg-card/80 backdrop-blur-sm shadow-[0_10px_30px_-15px_rgba(0,0,0,0.5)] overflow-hidden">
              {/* Row 1: One-tap PDF */}
              <a
                href="/downloads/How-Aetheris-Can-Help-You.pdf"
                download="How-Aetheris-Can-Help-You.pdf"
                target="_blank"
                rel="noopener"
                onClick={async (e) => {
                  try {
                    e.preventDefault();
                    const res = await fetch("/downloads/How-Aetheris-Can-Help-You.pdf", { cache: "no-store" });
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    const blob = await res.blob();
                    const blobUrl = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = blobUrl;
                    a.download = "How-Aetheris-Can-Help-You.pdf";
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
                  } catch {
                    window.open("/downloads/How-Aetheris-Can-Help-You.pdf", "_blank", "noopener");
                  }
                }}
                className="group flex items-center gap-3 px-3 py-2.5 hover:bg-amber/[0.04] transition-colors"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber/15 ring-1 ring-amber/40">
                  <Download className="w-4 h-4 text-amber" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-amber">Free Download · PDF</div>
                  <div className="font-forensic text-sm sm:text-base font-bold text-foreground leading-tight">
                    How Aetheris Can Help You
                  </div>
                  <div className="text-[11px] text-muted-foreground">No email required. Tap to download.</div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-amber shrink-0 group-hover:translate-x-1 transition-transform" />
              </a>

              {/* Divider */}
              <div className="h-px bg-amber/20" />

              {/* Row 2: Deck toggle */}
              <button
                type="button"
                onClick={() => setDeckOpen((v) => !v)}
                className="group w-full flex items-center gap-3 px-3 py-2.5 hover:bg-amber/[0.04] transition-colors text-left"
                aria-expanded={deckOpen}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber/10 ring-1 ring-amber/30">
                  <ChevronDown className={`w-4 h-4 text-amber transition-transform ${deckOpen ? "rotate-180" : ""}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-amber">Case File · Deck</div>
                  <div className="font-forensic text-sm sm:text-base font-bold text-foreground leading-tight">
                    Forensic Revenue Recovery
                  </div>
                  <div className="text-[11px] text-muted-foreground">{deckOpen ? "Tap to collapse." : "Tap to open the deck."}</div>
                </div>
              </button>

              {deckOpen && (
                <div className="border-t border-amber/20 animate-fade-in">
                  <div className="px-3 py-2 flex flex-wrap items-center justify-center gap-2 border-b border-amber/20">
                    <a
                      href="/downloads/Forensic-Revenue-Recovery.pdf"
                      download
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-amber/40 bg-amber/10 hover:bg-amber/20 text-amber font-mono text-[10px] uppercase tracking-wider transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" /> Download PDF
                    </a>
                    <a
                      href="/downloads/Forensic-Revenue-Recovery.pptx"
                      download
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-white/15 bg-white/[0.04] hover:bg-white/[0.10] text-foreground font-mono text-[10px] uppercase tracking-wider transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" /> Download PPTX
                    </a>
                  </div>
                  <div className="p-2">
                    <ForensicDeckCarousel />
                  </div>
                </div>
              )}
            </div>
          </section>




          {/* Contact info. compact glass row */}
          <section
            className="relative mt-6 animate-fade-in"
            style={{ animationDelay: "340ms", animationFillMode: "both" }}
          >
            <div className="rounded-lg border border-amber/25 bg-card/80 backdrop-blur-sm px-3 py-3 sm:px-4 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.5)]">
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-sm">
                <a href="tel:+13173762110" className="group inline-flex items-center gap-1.5 hover:text-amber transition-colors">
                  <Phone className="w-3.5 h-3.5 text-amber" />
                  <span className="font-semibold">(317) 376-2110</span>
                </a>
                <span className="h-3.5 w-px bg-white/15 hidden sm:block" />
                <a href="mailto:Aetheris.technology@outlook.com" className="group inline-flex items-center gap-1.5 hover:text-amber transition-colors">
                  <Mail className="w-3.5 h-3.5 text-amber" />
                  <span className="font-semibold break-all">Aetheris.technology@outlook.com</span>
                </a>
                <span className="h-3.5 w-px bg-white/15 hidden sm:block" />
                <span className="inline-flex items-center gap-1.5 text-foreground">
                  <MapPin className="w-3.5 h-3.5 text-amber" />
                  <span className="font-semibold">Noblesville, Indiana</span>
                </span>
              </div>
            </div>
            <p className="mt-2 text-center text-[10px] font-mono tracking-[0.25em] text-muted-foreground uppercase">
              Aetheris · Business Forensics · aetheris.technology
            </p>
          </section>
        </div>
      </main>

      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <DialogContent className="max-w-3xl w-[95vw] p-0 border border-amber/30 bg-card/95 backdrop-blur-xl overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Book the Diagnostic</DialogTitle>
            <DialogDescription>Pick a time to talk through your business leaks.</DialogDescription>
          </DialogHeader>
          <div className="p-2 md:p-4">
            <iframe
              src={`${BOOK_MEETING_URL}?embed=true`}
              title="Book the Diagnostic"
              className="w-full h-[70vh] min-h-[500px] rounded-sm border-0"
              loading="lazy"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeakLanderPage;
