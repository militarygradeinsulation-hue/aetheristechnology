import React, { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, CalendarClock, Sparkles, ExternalLink } from "lucide-react";
import { Background } from "@/components/Background";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ContactModal } from "@/components/ContactModal";
import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { BuyToolDialog } from "@/components/BuyToolDialog";
import { ToolThumbnail } from "@/components/ToolThumbnail";
import { findTool, formatToolPrice, type ShopPlan } from "@/lib/tool-shop-catalog";
import { tierBadgeForTool } from "@/lib/aetherisTiers";
import { TOOL_INFO } from "@/lib/toolInfo";

const ToolInfoPage: React.FC = () => {
  const { toolId } = useParams<{ toolId: string }>();
  const tool = toolId ? findTool(toolId) : undefined;
  const [contactOpen, setContactOpen] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);
  const [plan, setPlan] = useState<ShopPlan>("single");

  if (!tool) return <Navigate to="/tech-solutions" replace />;

  const info = TOOL_INFO[tool.id];
  const openBuy = (p: ShopPlan) => { setPlan(p); setBuyOpen(true); };

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title={`${tool.name} — Aetheris Tech Solutions`}
        description={info?.summary ?? tool.tagline}
        path={`/tech-solutions/${tool.id}`}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setContactOpen(true)} />
        <main className="pt-28 pb-16 px-4 max-w-4xl mx-auto">
          <Link
            to="/tech-solutions"
            className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-amber/70 hover:text-amber transition-colors mb-6"
          >
            <ArrowLeft className="w-3 h-3" /> Back to all tools
          </Link>

          <div className="forensic-tile rounded-sm border border-amber/30 overflow-hidden">
            <ToolThumbnail id={tool.id} alt={tool.name} />
            <div className="p-6 md:p-8">
              <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-amber/70 mb-2">
                // {tool.category}
              </div>
              <h1 className="font-forensic text-3xl md:text-5xl font-bold leading-tight mb-3">
                {tool.name}
              </h1>
              <p className="text-base md:text-lg text-foreground/80 leading-relaxed mb-6">
                {info?.summary ?? tool.tagline}
              </p>

              {info?.bullets?.length ? (
                <ul className="mb-8 grid sm:grid-cols-2 gap-2">
                  {info.bullets.map(b => (
                    <li key={b} className="flex items-center gap-2 text-sm text-foreground/85">
                      <Check className="w-4 h-4 text-amber shrink-0" /> {b}
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild variant="outline" className="border-amber/50 text-amber hover:bg-amber/10">
                  <Link to={`/try/${tool.id}`}>
                    <Sparkles className="w-4 h-4 mr-1.5" /> Try free
                  </Link>
                </Button>
                <Button
                  onClick={() => openBuy("single")}
                  className="bg-amber text-background hover:bg-amber/90 font-semibold"
                >
                  <CalendarClock className="w-4 h-4 mr-1.5" /> {tierBadgeForTool(tool.id)}
                </Button>
                {tool.route && tool.route !== `/try/${tool.id}` && (
                  <Button asChild variant="ghost" className="text-amber hover:bg-amber/5">
                    <Link to={tool.route}>
                      Open full runner <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                    </Link>
                  </Button>
                )}
              </div>

              <div className="mt-8 pt-6 border-t border-amber/15 flex flex-wrap gap-4 text-xs font-mono text-muted-foreground">
                <span>Included in your Aetheris tier</span>
                <span>·</span>
                <span>Sandbox runs are free</span>
                <span>·</span>
                <Link to="/tech-solutions" className="text-amber hover:underline">
                  See the full tier ladder <ArrowRight className="inline w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
      <ContactModal isOpen={contactOpen} onClose={() => setContactOpen(false)} />
      <BuyToolDialog open={buyOpen} onOpenChange={setBuyOpen} plan={plan} preselectedToolIds={[tool.id]} />
    </div>
  );
};

export default ToolInfoPage;
