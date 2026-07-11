import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Background } from "@/components/Background";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ContactModal } from "@/components/ContactModal";
import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { BuyToolDialog } from "@/components/BuyToolDialog";
import { SHOP_TOOLS, SHOP_PRICES, type ShopPlan } from "@/lib/tool-shop-catalog";
import { Sparkles, ShoppingCart, Infinity as InfinityIcon, Layers, Cpu } from "lucide-react";

const TechSolutionsPage: React.FC = () => {
  const [contactOpen, setContactOpen] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);
  const [plan, setPlan] = useState<ShopPlan>("single");
  const [preselected, setPreselected] = useState<string[]>([]);

  const openBuy = (p: ShopPlan, ids: string[] = []) => {
    setPlan(p);
    setPreselected(ids);
    setBuyOpen(true);
  };

  const diagnostics = SHOP_TOOLS.filter(t => t.category === "diagnostics");
  const content = SHOP_TOOLS.filter(t => t.category === "content");

  const Section = ({ title, tools, icon: Icon }: { title: string; tools: typeof SHOP_TOOLS; icon: any }) => (
    <section className="mb-14">
      <div className="flex items-center gap-2 mb-5">
        <Icon className="w-4 h-4 text-amber" />
        <h2 className="font-forensic text-2xl md:text-3xl font-bold">{title}</h2>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map(t => (
          <div
            key={t.id}
            className="forensic-tile rounded-sm border border-amber/25 hover:border-amber/60 transition-colors p-5 flex flex-col"
          >
            <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-amber/70 mb-1">
              // {t.category}
            </div>
            <h3 className="font-forensic text-lg font-bold mb-1.5 leading-tight">{t.name}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4 flex-1">{t.tagline}</p>
            <div className="flex gap-2">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="flex-1 border-amber/40 text-amber hover:bg-amber/10"
              >
                <Link to={`/try/${t.id}`}>
                  <Sparkles className="w-3 h-3 mr-1" /> Try free
                </Link>
              </Button>
              <Button
                size="sm"
                onClick={() => openBuy("single", [t.id])}
                className="flex-1 bg-amber text-background hover:bg-amber/90 font-semibold"
              >
                <ShoppingCart className="w-3 h-3 mr-1" /> ${SHOP_PRICES.single.amount / 100}
              </Button>
            </div>
          </div>
        ))}
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
          {/* Hero */}
          <div className="mb-12 max-w-3xl">
            <div className="inline-flex items-center gap-1 font-case text-[7px] uppercase tracking-[0.18em] text-amber mb-4 px-1.5 py-0.5 rounded-full border border-amber/30 bg-amber/10">
              <Cpu className="w-2 h-2" /> Tech · Store
            </div>
            <h1 className="font-forensic text-4xl md:text-6xl font-bold leading-[1.05] mb-4">
              Our systems, <span className="text-amber italic">free to try.</span>
              <br />Or own them for life.
            </h1>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
              Every diagnostic and content system in the Aetheris stack. Same free-run rules
              as the ecosystem — no signup, nothing saved. Ready to keep one? Buy it right here.
            </p>
          </div>

          {/* Pricing tiers */}
          <section className="mb-14 grid md:grid-cols-3 gap-4">
            <div className="forensic-tile rounded-sm border border-amber/30 p-5">
              <div className="font-mono text-[10px] uppercase tracking-widest text-amber mb-1">Single</div>
              <div className="font-forensic text-3xl font-bold">${SHOP_PRICES.single.amount / 100}</div>
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
              <div className="font-forensic text-3xl font-bold">${SHOP_PRICES.triple.amount / 100}</div>
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
              <div className="font-forensic text-3xl font-bold">${SHOP_PRICES.unlimited.amount / 100}</div>
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
