import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MessageSquare, GitFork, TrendingDown, PhoneOff, Unplug, Trash2, Gauge,
  ClipboardList, Globe, Phone, Network, Users, DollarSign, ListChecks,
  Cog, Brain, Eye, Cable, FileText, Bell,
  Search, Microscope, Wrench, Building2, Newspaper, BookOpen,
} from "lucide-react";
import LeakMindMap, { type MindMapNodeData } from "@/components/LeakMindMap";

type TabId = "symptoms" | "steps" | "systems" | "services";

const TABS: { id: TabId; label: string; blurb: string }[] = [
  { id: "symptoms", label: "Where it leaks",   blurb: "Seven categories. Every business has at least four active right now." },
  { id: "steps",    label: "The 7-step audit", blurb: "How we trace the leak from symptom to dollar figure." },
  { id: "systems",  label: "The system stack", blurb: "The AI + tooling layer that runs quiet in the background." },
  { id: "services", label: "The offer map",    blurb: "Three doors in. One methodology behind all of them." },
];

export const HomeMindMapSection: React.FC<{ onBookAudit: () => void }> = ({ onBookAudit }) => {
  const [tab, setTab] = useState<TabId>("symptoms");
  const navigate = useNavigate();

  const symptoms: MindMapNodeData[] = [
    { id: "vocab",     label: "Vocabulary Friction",  sublabel: "Words that kill deals", icon: MessageSquare },
    { id: "brand",     label: "Brand Contradictions", sublabel: "Promise ≠ delivery",    icon: GitFork },
    { id: "convert",   label: "Conversion Drop-offs", sublabel: "Silent exits",          icon: TrendingDown },
    { id: "followup",  label: "Follow-up Failures",   sublabel: "Leads left to die",     icon: PhoneOff },
    { id: "systems",   label: "System Disconnects",   sublabel: "Data that dies",        icon: Unplug },
    { id: "waste",     label: "Operational Waste",    sublabel: "Headcount vs software", icon: Trash2 },
    { id: "ceiling",   label: "Growth Ceilings",      sublabel: "Stuck at this number",  icon: Gauge },
  ];

  const steps: MindMapNodeData[] = [
    { id: "01", label: "Intake & Scope",       sublabel: "01",  icon: ClipboardList },
    { id: "02", label: "Website & Vocabulary", sublabel: "02",  icon: Globe },
    { id: "03", label: "Sales & Follow-up",    sublabel: "03",  icon: Phone },
    { id: "04", label: "Systems & Data Map",   sublabel: "04",  icon: Network },
    { id: "05", label: "Ops & Headcount",      sublabel: "05",  icon: Users },
    { id: "06", label: "Dollar-Quantified Findings", sublabel: "06", icon: DollarSign },
    { id: "07", label: "Fix Stack & Priority Ledger", sublabel: "07", icon: ListChecks },
  ];

  const systems: MindMapNodeData[] = [
    { id: "aetheris",  label: "Aetheris Ops",    sublabel: "Workflow engine",   icon: Cog },
    { id: "ctoguy",    label: "CTOguy AI",       sublabel: "Analysis brain",    icon: Brain },
    { id: "ghost",     label: "Ghost Analyst",   sublabel: "Silent monitoring", icon: Eye },
    { id: "bridge",    label: "Data Bridge",     sublabel: "Integrations",      icon: Cable },
    { id: "report",    label: "Report Engine",   sublabel: "Sealed findings",   icon: FileText },
    { id: "alerts",    label: "Leak Alerts",     sublabel: "Signals, not noise", icon: Bell },
  ];

  const services: MindMapNodeData[] = [
    { id: "prescan",  label: "Free Pre-Scan",     sublabel: "$0",         icon: Search,     onClick: () => navigate("/leak-audit") },
    { id: "audit",    label: "The Leak Audit",    sublabel: "$2,500",     icon: Microscope, onClick: onBookAudit },
    { id: "impl",     label: "Implementation",    sublabel: "$15K / mo",  icon: Wrench,     onClick: onBookAudit },
    { id: "industry", label: "Industry Case Files", sublabel: "20+ verticals", icon: Building2, onClick: () => navigate("/industries") },
    { id: "field",    label: "Field Notes",       sublabel: "Live cases", icon: Newspaper,  onClick: () => navigate("/blog") },
    { id: "playbooks",label: "Playbooks",         sublabel: "Sealed IP",  icon: BookOpen,   onClick: () => navigate("/resources") },
  ];

  const activeTab = TABS.find(t => t.id === tab)!;
  const nodes =
    tab === "symptoms" ? symptoms :
    tab === "steps"    ? steps    :
    tab === "systems"  ? systems  : services;

  const hubByTab: Record<TabId, { eyebrow: string; title: React.ReactNode; subtitle: string }> = {
    symptoms: { eyebrow: "Every business",  title: <>Revenue<br/>Leaks</>,     subtitle: "The Leak Audit™" },
    steps:    { eyebrow: "7-step protocol", title: <>The Leak<br/>Audit</>,    subtitle: "$2,500 flat" },
    systems:  { eyebrow: "Ambient layer",   title: <>The System<br/>Stack</>,  subtitle: "Runs quiet 24/7" },
    services: { eyebrow: "Three doors",     title: <>Case<br/>Openings</>,     subtitle: "One methodology" },
  };
  const accent: "amber" | "crimson" = tab === "symptoms" ? "crimson" : "amber";

  return (
    <section
      className="mt-8 max-w-6xl mx-auto animate-fade-in"
      style={{ animationDelay: "260ms", animationFillMode: "both" }}
    >
      <div className="rounded-sm border border-amber/30 bg-card/60 backdrop-blur-sm p-5 sm:p-6">
        <div className="text-center mb-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber">The Leak Ecosystem</div>
          <h2 className="font-forensic text-2xl sm:text-3xl font-bold mt-1 leading-tight">
            One business. Four maps. <span className="text-crimson">Every ripple traced.</span>
          </h2>
        </div>

        {/* Tab switcher */}
        <div className="flex flex-wrap gap-2 justify-center mb-2">
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-sm border font-mono text-[11px] uppercase tracking-wider transition-colors ${
                tab === t.id
                  ? "border-amber bg-amber/15 text-amber"
                  : "border-border/50 text-foreground/70 hover:border-amber/40 hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="text-center text-xs sm:text-sm text-foreground/65 mb-2">{activeTab.blurb}</p>

        <LeakMindMap
          key={tab}
          hub={hubByTab[tab]}
          nodes={nodes}
          accent={accent}
          heightClass="h-[680px] md:h-[780px] lg:h-[840px]"
        />

        <p className="text-center text-[11px] font-mono uppercase tracking-widest text-foreground/50 mt-2">
          Lines pulse toward the hub — that's how leaks travel through the business.
        </p>
      </div>
    </section>
  );
};

export default HomeMindMapSection;
