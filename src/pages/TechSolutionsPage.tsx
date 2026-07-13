import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Background } from "@/components/Background";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ContactModal } from "@/components/ContactModal";
import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { BuyToolDialog } from "@/components/BuyToolDialog";
import { SHOP_TOOLS, SHOP_PRICES, type ShopPlan } from "@/lib/tool-shop-catalog";
import { Sparkles, ShoppingCart, Infinity as InfinityIcon, Layers, Cpu, Check, ArrowRight, Trophy, Users } from "lucide-react";
import { ToolThumbnail } from "@/components/ToolThumbnail";
import { TechSolutionsAccessBar, useTechAccess, isToolUnlockedByAccess } from "@/components/TechSolutionsAccessBar";
import { EasyModeRecommender } from "@/components/EasyModeRecommender";
import { toast } from "sonner";

// Rich per-tool summaries — what it does, who it's for, what you walk away with.
const TOOL_SUMMARIES: Record<string, { summary: string; bullets: string[] }> = {
  "website-scanner":      { summary: "Point it at any URL and get a live forensic sweep of the revenue leaks costing that site money right now.",  bullets: ["Live URL scan", "Ranked leak list", "Fix-first order"] },
  "brand-contradictions": { summary: "Surfaces every spot where a brand's promise and its actual buyer experience don't match — trust killers, exposed.", bullets: ["Promise vs. reality", "Trust-gap map", "Copy fixes"] },
  "friction-audit":       { summary: "Walks the buyer journey click-by-click and pins the exact steps where prospects quietly bail on the sale.",     bullets: ["Step-by-step audit", "Drop-off flags", "Priority fixes"] },
  "strategic-questions":  { summary: "Generates the boardroom-grade questions leadership keeps avoiding — the ones that actually move the P&L.",       bullets: ["Custom to biz", "Boardroom tier", "Instant deck-ready"] },
  "detective-mode":       { summary: "A deep forensic sweep on a single business surface — one target, full case file, no fluff.",                     bullets: ["Deep single-target", "Case file output", "Evidence-backed"] },
  "forensic-scan-all":    { summary: "Runs every diagnostic tool at once and stitches the findings into one unified leak report.",                     bullets: ["All diagnostics", "One report", "Save hours"] },
  "all-in-one":           { summary: "One prompt → blog post, social pack, and email sequence, all voice-locked and ready to publish.",                bullets: ["Blog + social + email", "One prompt", "On-brand"] },
  "content-calendar":     { summary: "Builds 30 days of aligned, on-brand content in minutes so you never stare at a blank calendar again.",           bullets: ["30-day plan", "Voice-locked", "Auto-scheduled"] },
  "playbook-generator":   { summary: "Turn a plain-English brief into a custom operating playbook for any function — sales, ops, hiring, anything.",   bullets: ["Any function", "Step-by-step", "Team-ready"] },
  "social-content":       { summary: "An endless feed of voice-locked social posts that sound like you wrote them — because it learned how you write.",bullets: ["Voice-locked", "Endless supply", "Post-ready"] },
  "content-engine":       { summary: "Long-form + short-form pipeline in one place. Feed it a topic, get a full content stack out.",                   bullets: ["Long + short form", "One pipeline", "Repurpose built-in"] },
  "image-studio":         { summary: "On-brand imagery generated and watermarked in seconds — no stock photos, no designer bottleneck.",               bullets: ["On-brand images", "Auto-watermark", "Seconds not days"] },
  "creation-studio":      { summary: "Mixed-media asset generator with memory — remembers your brand across every image, doc, and post.",              bullets: ["Mixed media", "Brand memory", "One workspace"] },
  "easy-mode":            { summary: "Paste any output and it rewrites it in plain-English, paste-ready copy your team can actually use.",             bullets: ["Plain English", "Paste-ready", "Any input"] },
  "tool-generator":       { summary: "Describe a mini-tool in plain English and it builds it — your own custom instrument in minutes.",                bullets: ["Plain-English brief", "Custom tools", "Minutes to build"] },

  // Reports
  "golden-report":        { summary: "The flagship forensic report that turns a diagnostic into a paid monthly retainer — the deliverable clients pay to keep.", bullets: ["Retainer-closer", "Full case file", "Boardroom-ready"] },
  "head-to-head":         { summary: "Side-by-side competitor comparison showing exactly where the prospect wins, loses, and can pull ahead.",              bullets: ["Competitor teardown", "Win/lose map", "Move recommendations"] },
  "resume-forensics":     { summary: "Audits and rewrites a resume to beat ATS filters and land more interviews — hand-off ready deliverable.",             bullets: ["ATS-proof rewrite", "Interview-ready", "Instant PDF"] },
  "reciprocation":        { summary: "Generates a free, high-value custom report you send cold — opens doors that cold email never will.",                  bullets: ["Cold-door opener", "Fully custom", "Reciprocity built-in"] },
  "ai-checklist":         { summary: "Scores any business on AI readiness in one pass — perfect opener for selling automation and AI services.",             bullets: ["Readiness score", "Gap list", "Sales opener"] },
  "nexus-iq":             { summary: "Builds the pre-meeting dossier that makes you the smartest person in the room before you even walk in.",              bullets: ["Deep dossier", "Talking points", "Meeting-ready"] },

  // Sales
  "sales-scripts":        { summary: "Battle-tested cold, warm, and follow-up scripts so you always know exactly what to say on every call.",               bullets: ["Cold + warm + follow-up", "Objection-ready", "Copy-paste"] },
  "follow-up-plan":       { summary: "Plug-and-play post-meeting email sequences that keep deals alive when prospects go quiet.",                           bullets: ["Post-meeting plays", "Silence-breakers", "Deal savers"] },
  "linkedin-playbook":    { summary: "The complete LinkedIn system that turns your profile into a lead-generating machine — profile, posts, DMs.",           bullets: ["Full LI system", "Profile + posts + DMs", "Lead engine"] },
};

const TechSolutionsPage: React.FC = () => {
  const [contactOpen, setContactOpen] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);
  const [plan, setPlan] = useState<ShopPlan>("single");
  const [preselected, setPreselected] = useState<string[]>([]);
  const [access, setAccess] = useTechAccess();

  const openBuy = (p: ShopPlan, ids: string[] = []) => {
    setPlan(p);
    setPreselected(ids);
    setBuyOpen(true);
  };

  // Throttle: after trying 3 different tools, lock the rest for 24h.
  const LOCK_KEY = "tech_solutions_tries_v1";
  const LOCK_WINDOW_MS = 24 * 60 * 60 * 1000;
  type TriesState = { ids: string[]; firstAt: number };
  const readTries = (): TriesState => {
    try {
      const raw = localStorage.getItem(LOCK_KEY);
      if (!raw) return { ids: [], firstAt: 0 };
      const p = JSON.parse(raw) as TriesState;
      if (!p.firstAt || Date.now() - p.firstAt > LOCK_WINDOW_MS) return { ids: [], firstAt: 0 };
      return { ids: Array.isArray(p.ids) ? p.ids : [], firstAt: p.firstAt };
    } catch { return { ids: [], firstAt: 0 }; }
  };
  const [tries, setTries] = useState<TriesState>(readTries);
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const i = setInterval(() => {
      setNow(Date.now());
      const fresh = readTries();
      setTries(prev => (prev.firstAt !== fresh.firstAt || prev.ids.length !== fresh.ids.length ? fresh : prev));
    }, 60_000);
    return () => clearInterval(i);
  }, []);
  const isLockedActive = tries.ids.length >= 3 && (now - tries.firstAt) < LOCK_WINDOW_MS;
  const hasFullAccess = access.unlockedAll;
  const isToolLocked = (id: string) => {
    if (hasFullAccess || isToolUnlockedByAccess(access, id)) return false;
    return isLockedActive && !tries.ids.includes(id);
  };
  const needsEmail = (id: string) => !hasFullAccess && !isToolUnlockedByAccess(access, id) && !access.email;
  const recordTry = useCallback((id: string) => {
    setTries(prev => {
      if (prev.ids.includes(id)) return prev;
      if (prev.ids.length >= 3 && (Date.now() - prev.firstAt) < LOCK_WINDOW_MS) return prev;
      const next: TriesState = {
        ids: [...prev.ids, id],
        firstAt: prev.ids.length === 0 ? Date.now() : prev.firstAt,
      };
      try { localStorage.setItem(LOCK_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);
  const unlockMs = Math.max(0, tries.firstAt + LOCK_WINDOW_MS - now);
  const unlockHrs = Math.ceil(unlockMs / (60 * 60 * 1000));

  // Staff bypass: triple-tap the header, then enter code 9822 to clear the lock.
  const tapsRef = React.useRef<number[]>([]);
  const handleSecretTap = () => {
    const t = Date.now();
    tapsRef.current = [...tapsRef.current.filter(x => t - x < 1200), t];
    if (tapsRef.current.length >= 3) {
      tapsRef.current = [];
      const code = window.prompt("Enter unlock code:");
      if (code && code.trim() === "9822") {
        try { localStorage.removeItem(LOCK_KEY); } catch {}
        setTries({ ids: [], firstAt: 0 });
        setAccess({ ...access, code: "STAFF", plan: "staff", unlockedAll: true, toolIds: [] });
        window.alert("Staff unlocked. Every tool is free — no email required.");
      } else if (code !== null) {
        window.alert("Invalid code.");
      }
    }
  };


  const diagnostics = SHOP_TOOLS.filter(t => t.category === "diagnostics");
  const content = SHOP_TOOLS.filter(t => t.category === "content");
  const reports = SHOP_TOOLS.filter(t => t.category === "reports");
  const sales = SHOP_TOOLS.filter(t => t.category === "sales");

  const Section = ({ title, tools, icon: Icon }: { title: string; tools: typeof SHOP_TOOLS; icon: any }) => (
    <section className="mb-16">
      <div className="flex items-center gap-2 mb-6 pb-3 border-b border-amber/15">
        <Icon className="w-4 h-4 text-amber" />
        <h2 className="font-forensic text-2xl md:text-3xl font-bold">{title}</h2>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {tools.length} systems
        </span>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {tools.map(t => {
          const info = TOOL_SUMMARIES[t.id];
          const locked = isToolLocked(t.id);
          const gated = needsEmail(t.id);
          const ownedByLicense = !hasFullAccess && isToolUnlockedByAccess(access, t.id);
          return (
            <div
              key={t.id}
              className={`group forensic-tile relative rounded-sm border transition-all duration-300 overflow-hidden flex flex-col ${
                locked
                  ? "border-muted/20 opacity-50 grayscale"
                  : "border-amber/25 hover:border-amber/70 hover:-translate-y-0.5 hover:shadow-[0_10px_40px_-10px_hsl(38_92%_55%/0.35)]"
              }`}
            >
              {/* Thumbnail */}
              <ToolThumbnail id={t.id} alt={t.name} />

              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-amber/70">
                    // {t.category}
                  </div>
                  <div className="font-mono text-[9px] uppercase tracking-widest text-amber/60">
                    ${SHOP_PRICES.single.amount / 100} · lifetime
                  </div>
                </div>

                <h3 className="font-forensic text-lg font-bold mb-2 leading-tight group-hover:text-amber transition-colors">
                  {t.name}
                </h3>
                <p className="text-sm text-foreground/80 leading-relaxed mb-3">
                  {info?.summary ?? t.tagline}
                </p>

                {info && (
                  <ul className="mb-4 space-y-1">
                    {info.bullets.map(b => (
                      <li key={b} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Check className="w-3 h-3 text-amber shrink-0" /> {b}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-auto flex flex-col gap-2 pt-2 border-t border-amber/10">
                  <div className="flex gap-2">
                    {locked ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                        className="flex-1 border-muted/30 text-muted-foreground cursor-not-allowed"
                        title={`Daily free-try limit reached. Come back in ~${unlockHrs}h.`}
                      >
                        <Sparkles className="w-3 h-3 mr-1 opacity-50" /> Back in {unlockHrs}h
                      </Button>
                    ) : gated ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          toast.error("Enter your email above to unlock 3 free runs.");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="flex-1 border-amber/30 text-amber/70 hover:bg-amber/5"
                        title="Enter your email above to unlock free runs"
                      >
                        <Sparkles className="w-3 h-3 mr-1" /> Email to try
                      </Button>
                    ) : (
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className={`flex-1 ${ownedByLicense ? "border-amber/70 text-amber bg-amber/10 hover:bg-amber/20" : "border-amber/40 text-amber hover:bg-amber/10"}`}
                      >
                        <Link
                          to={`/try/${t.id}`}
                          onClick={() => { if (!ownedByLicense && !hasFullAccess) recordTry(t.id); }}
                        >
                          <Sparkles className="w-3 h-3 mr-1" />
                          {ownedByLicense || hasFullAccess ? "Open tool" : "Try free"}
                          <ArrowRight className="w-3 h-3 ml-1 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                        </Link>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => openBuy("single", [t.id])}
                      className="flex-1 bg-amber text-background hover:bg-amber/90 font-semibold"
                    >
                      <ShoppingCart className="w-3 h-3 mr-1" /> Own it
                    </Button>
                  </div>
                  <Link
                    to={`/tech-solutions/${t.id}`}
                    className="text-center font-mono text-[10px] uppercase tracking-[0.2em] text-amber/70 hover:text-amber transition-colors"
                  >
                    → View full page
                  </Link>
                </div>

              </div>
            </div>
          );
        })}
      </div>
    </section>
  );

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Tech Solutions Store — Free Systems + Buy Direct | Aetheris"
        description="Every Aetheris system: try free with the same 3-run rules, or buy direct — $40 single, $100 for 3, $1,000 all-access lifetime."
        path="/tech-solutions"
        keywords="aetheris tools, ai tools store, free ai systems, business forensics tools"
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setContactOpen(true)} />
        <main className="pt-28 pb-16 px-4 max-w-6xl mx-auto">
          <EasyModeRecommender />
          {/* Hero */}
          <div className="mb-12 max-w-3xl">

            <div className="inline-flex items-center gap-1 font-case text-[7px] uppercase tracking-[0.18em] text-amber mb-4 px-1.5 py-0.5 rounded-full border border-amber/30 bg-amber/10">
              <Cpu className="w-2 h-2" /> Tech · Store
            </div>
            <h1
              onClick={handleSecretTap}
              className="font-forensic text-4xl md:text-6xl font-bold leading-[1.05] mb-4 select-none cursor-default"
            >
              Our systems, <span className="text-amber italic">free to try.</span>
              <br />Or own them for life.
            </h1>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
              Every diagnostic and content system in the Aetheris stack. Same free-run rules
              as the ecosystem — no signup, nothing saved. Ready to keep one? Buy it right here.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 text-xs text-amber/80 font-mono border border-amber/20 bg-amber/5 px-3 py-2 rounded-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber"></span>
              </span>
              We are always updating our tools. Bear with us if there are some that don't work momentarily.
            </div>
            {isLockedActive && (
              <div className="mt-3 inline-flex items-center gap-2 text-xs text-crimson font-mono border border-crimson/30 bg-crimson/5 px-3 py-2 rounded-sm">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-crimson" />
                Daily limit reached — you've tried 3 tools. The rest unlock in ~{unlockHrs}h.
              </div>
            )}
          </div>

          {/* Access bar — email or code required to run tools free */}
          <TechSolutionsAccessBar />



          {/* Pricing tiers */}
          <section className="mb-14 grid md:grid-cols-3 gap-4">
            <div className="forensic-tile rounded-sm border border-amber/30 p-5">
              <div className="font-mono text-[10px] uppercase tracking-widest text-amber mb-1">Single</div>
              <div className="font-forensic text-3xl font-bold">${SHOP_PRICES.single.amount / 100} once</div>
              <p className="text-xs text-muted-foreground mt-1 mb-4">{SHOP_PRICES.single.subtitle}</p>
              <Button
                onClick={() => openBuy("single")}
                className="w-full bg-amber text-background hover:bg-amber/90 font-semibold"
              >
                Pick 1 tool
              </Button>
            </div>
            <div className="forensic-tile rounded-sm border border-amber/60 p-5 relative">
              <div className="absolute -top-2 right-3 font-mono text-[9px] tracking-widest uppercase bg-amber text-background px-1.5 py-0.5">Best</div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-amber mb-1">Bundle</div>
              <div className="font-forensic text-3xl font-bold">${SHOP_PRICES.triple.amount / 100} once</div>
              <p className="text-xs text-muted-foreground mt-1 mb-4">{SHOP_PRICES.triple.subtitle}</p>
              <Button
                onClick={() => openBuy("triple")}
                className="w-full bg-amber text-background hover:bg-amber/90 font-semibold"
              >
                <Layers className="w-3.5 h-3.5 mr-1.5" /> Pick 3 tools
              </Button>
            </div>
            <div className="forensic-tile rounded-sm border border-crimson/50 p-5">
              <div className="font-mono text-[10px] uppercase tracking-widest text-crimson mb-1">All-Access</div>
              <div className="font-forensic text-3xl font-bold">${SHOP_PRICES.unlimited.amount / 100} one time</div>
              <p className="text-xs text-muted-foreground mt-1 mb-4">{SHOP_PRICES.unlimited.subtitle}</p>
              <Button
                onClick={() => openBuy("unlimited")}
                variant="outline"
                className="w-full border-crimson/60 text-crimson hover:bg-crimson/10 font-semibold"
              >
                <InfinityIcon className="w-3.5 h-3.5 mr-1.5" /> Own everything
              </Button>
            </div>
          </section>

          <Section title="Diagnostics" tools={diagnostics} icon={Cpu} />
          <Section title="Reports & Deliverables" tools={reports} icon={Trophy} />
          <Section title="Sales Enablement" tools={sales} icon={Users} />
          <Section title="Content Systems" tools={content} icon={Sparkles} />

          <div className="border-l-2 border-crimson/70 pl-5 py-1 max-w-2xl">
            <p className="text-sm text-muted-foreground">
              Same rules as the Try surface: sandbox runs are free, nothing is saved,
              each run is independent. Purchase turns any tool into a lifetime instance
              with persistent memory tied to your account.
            </p>
          </div>
        </main>
        <Footer />
      </div>
      <ContactModal isOpen={contactOpen} onClose={() => setContactOpen(false)} />
      <BuyToolDialog
        open={buyOpen}
        onOpenChange={setBuyOpen}
        plan={plan}
        preselectedToolIds={preselected}
      />
    </div>
  );
};

export default TechSolutionsPage;
