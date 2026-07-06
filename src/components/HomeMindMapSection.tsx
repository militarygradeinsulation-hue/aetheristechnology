import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MessageSquare, GitFork, TrendingDown, PhoneOff, Unplug, Trash2, Gauge,
  ClipboardList, Globe, Phone, Network, Users, DollarSign, ListChecks,
  Cog, Brain, Eye, Cable, FileText, Bell,
  Search, Microscope, Wrench, Building2, Newspaper, BookOpen,
} from "lucide-react";
import LeakMindMap, { type MindMapNodeData } from "@/components/LeakMindMap";



type TabId = "all" | "symptoms" | "steps" | "systems" | "services";

const TABS: { id: TabId; label: string; blurb: string }[] = [
  { id: "all",      label: "The whole ecosystem", blurb: "Every leak, every step, every system, every door — one map." },
  { id: "symptoms", label: "Where it leaks",   blurb: "Seven categories. Every business has at least four active right now." },
  { id: "steps",    label: "The 7-step audit", blurb: "How we trace the leak from symptom to dollar figure." },
  { id: "systems",  label: "The system stack", blurb: "The AI + tooling layer that runs quiet in the background." },
  { id: "services", label: "The offer map",    blurb: "Three doors in. One methodology behind all of them." },
];

export const HomeMindMapSection: React.FC<{ onBookAudit: () => void }> = ({ onBookAudit }) => {
  const [tab, setTab] = useState<TabId>("all");
  const navigate = useNavigate();

  const symptoms: MindMapNodeData[] = [
    { id: "vocab",     label: "Vocabulary Friction",  sublabel: "Words that kill deals", icon: MessageSquare,
      connections: ["Homepage copy that talks about you, not the buyer", "Jargon in the sales deck", "Pricing page that hides the price", "Proposal language that invites objection"],
      affects: [
        { id: "brand",    note: "the words on the site stop matching what buyers actually experience" },
        { id: "convert",  note: "confused visitors bounce before they ever ask for pricing" },
        { id: "followup", note: "reps inherit leads that never understood the offer" },
      ] },
    { id: "brand",     label: "Brand Contradictions", sublabel: "Promise ≠ delivery",    icon: GitFork,
      connections: ["Site says premium, intake feels like a form mill", "Testimonials don't match ICP", "Response time contradicts urgency claim", "Delivery experience undercuts sales promise"],
      affects: [
        { id: "convert",  note: "the pitch and the proof disagree, so the buyer stalls" },
        { id: "followup", note: "reps sell one thing, ops delivers another — trust collapses" },
        { id: "ceiling",  note: "referrals dry up because the story doesn't survive delivery" },
      ] },
    { id: "convert",   label: "Conversion Drop-offs", sublabel: "Silent exits",          icon: TrendingDown,
      connections: ["Form abandoned on field 3", "CTA buried below the fold", "Mobile checkout friction", "Pricing table causes rage-quit"],
      affects: [
        { id: "followup", note: "the pipeline runs thin, so every lead gets over-worked" },
        { id: "ceiling",  note: "marketing spend has to rise just to hold current revenue" },
        { id: "waste",    note: "reps burn hours chasing what the site should've closed" },
      ] },
    { id: "followup",  label: "Follow-up Failures",   sublabel: "Leads left to die",     icon: PhoneOff,
      connections: ["Lead sits in inbox > 4 hours", "No second touch after day 3", "Quote sent, never re-referenced", "Won-lost data never captured"],
      affects: [
        { id: "systems",  note: "no follow-up data means the CRM lies about pipeline health" },
        { id: "brand",    note: "'we care' turns into a ghosted inbox — the promise breaks" },
        { id: "ceiling",  note: "the ceiling is set by how fast leads rot, not by demand" },
      ] },
    { id: "systems",   label: "System Disconnects",   sublabel: "Data that dies",        icon: Unplug,
      connections: ["CRM and email don't talk", "Manual re-entry between tools", "No source-of-truth for customer record", "Reports built off stale exports"],
      affects: [
        { id: "waste",    note: "humans become the integration layer between broken tools" },
        { id: "followup", note: "leads fall through the cracks between systems that don't sync" },
        { id: "ceiling",  note: "you can't scale a business the software can't see" },
      ] },
    { id: "waste",     label: "Operational Waste",    sublabel: "Headcount vs software", icon: Trash2,
      connections: ["Human doing what a webhook could", "Meetings that should be a Loom", "Task queues without SLAs", "Vendor stack paying for overlap"],
      affects: [
        { id: "ceiling",  note: "payroll eats the margin that should fund the next hire" },
        { id: "followup", note: "team is too busy running the machine to answer buyers" },
        { id: "systems",  note: "'we'll just do it manually' becomes permanent tech debt" },
      ] },
    { id: "ceiling",   label: "Growth Ceilings",      sublabel: "Stuck at this number",  icon: Gauge,
      connections: ["Owner is the bottleneck for every deal", "No documented playbook to hand off", "Pipeline math can't fund the next hire", "Delivery capacity capped by one operator"],
      affects: [
        { id: "waste",    note: "the owner keeps absorbing work instead of removing it" },
        { id: "brand",    note: "capacity limits force the team to break delivery promises" },
        { id: "vocab",    note: "no playbook = every rep re-invents the pitch, badly" },
      ] },
  ];

  const steps: MindMapNodeData[] = [
    { id: "01", label: "Intake & Scope",       sublabel: "01",  icon: ClipboardList,
      connections: ["30-minute operator call", "NDA + read-only access to systems", "Symptom list ranked by pain"] },
    { id: "02", label: "Website & Vocabulary", sublabel: "02",  icon: Globe,
      connections: ["Live DOM scan", "Copy leak inventory", "Trust-signal audit"] },
    { id: "03", label: "Sales & Follow-up",    sublabel: "03",  icon: Phone,
      connections: ["Response-time forensic", "Pipeline stage bleed analysis", "Quote-to-close gap"] },
    { id: "04", label: "Systems & Data Map",   sublabel: "04",  icon: Network,
      connections: ["Tool inventory", "Integration diagram", "Data-source-of-truth verdict"] },
    { id: "05", label: "Ops & Headcount",      sublabel: "05",  icon: Users,
      connections: ["Hours spent on automatable work", "Role vs. system waste", "Bottleneck map"] },
    { id: "06", label: "Dollar-Quantified Findings", sublabel: "06", icon: DollarSign,
      connections: ["Every leak carries an annual $ figure", "Ranked by impact and effort", "Attached to the specific fix"] },
    { id: "07", label: "Fix Stack & Priority Ledger", sublabel: "07", icon: ListChecks,
      connections: ["Sequenced fix plan", "Ownership per line", "Recovery tracker template"] },
  ];

  const systems: MindMapNodeData[] = [
    { id: "aetheris",  label: "Aetheris Ops",    sublabel: "Workflow engine",   icon: Cog,
      connections: ["Ties CRM, forms, and comms", "Triggers on real events", "One record, one truth"] },
    { id: "ctoguy",    label: "CTOguy AI",       sublabel: "Analysis brain",    icon: Brain,
      connections: ["Reads scans and CRMs", "Flags patterns humans miss", "Drafts findings on demand"] },
    { id: "ghost",     label: "Ghost Analyst",   sublabel: "Silent monitoring", icon: Eye,
      connections: ["Passive listener across systems", "Watches SLA breach", "Signals only when action is due"] },
    { id: "bridge",    label: "Data Bridge",     sublabel: "Integrations",      icon: Cable,
      connections: ["Two-way syncs", "Custom webhooks", "Legacy-to-modern glue"] },
    { id: "report",    label: "Report Engine",   sublabel: "Sealed findings",   icon: FileText,
      connections: ["PDF/HTML deliverables", "Every claim linked to evidence", "Auto-versioned"] },
    { id: "alerts",    label: "Leak Alerts",     sublabel: "Signals, not noise", icon: Bell,
      connections: ["Threshold-based", "Routed to the right operator", "Silent when nothing needs doing"] },
  ];

  const services: MindMapNodeData[] = [
    { id: "prescan",  label: "Free Pre-Scan",     sublabel: "$0",         icon: Search,     onClick: () => navigate("/leak-audit"),
      connections: ["60-second self-scan", "No email required", "Sting is the point"] },
    { id: "audit",    label: "The Leak Audit",    sublabel: "$2,500",     icon: Microscope, onClick: onBookAudit,
      connections: ["Operator-led forensic workup", "Every leak with a dollar figure", "Fee credits 1:1 to the fix"] },
    { id: "impl",     label: "Implementation",    sublabel: "$15K / mo",  icon: Wrench,     onClick: onBookAudit,
      connections: ["3-month minimum", "Audit clients only", "Accountable to audit numbers"] },
    { id: "industry", label: "Industry Case Files", sublabel: "20+ verticals", icon: Building2, onClick: () => navigate("/industries"),
      connections: ["Sealed cases by sector", "Common leaks per industry", "Benchmark ranges"] },
    { id: "field",    label: "Field Notes",       sublabel: "Live cases", icon: Newspaper,  onClick: () => navigate("/blog"),
      connections: ["Weekly operator dispatches", "Real leaks, real fixes", "No fluff"] },
    { id: "playbooks",label: "Playbooks",         sublabel: "Sealed IP",  icon: BookOpen,   onClick: () => navigate("/resources"),
      connections: ["Named-leak playbooks", "Repeatable fix stacks", "Reserved for operators"] },
  ];

  const activeTab = TABS.find(t => t.id === tab)!;
  const allNodes: MindMapNodeData[] = [...symptoms, ...steps, ...systems, ...services];
  const nodes =
    tab === "all"      ? allNodes  :
    tab === "symptoms" ? symptoms  :
    tab === "steps"    ? steps     :
    tab === "systems"  ? systems   : services;

  const hubByTab: Record<TabId, { eyebrow: string; title: React.ReactNode; subtitle: string }> = {
    all:      { eyebrow: "One business",      title: <>The Leak<br/>Ecosystem</>, subtitle: "Every map at once" },
    symptoms: { eyebrow: "Every business",    title: <>Revenue<br/>Leaks</>,      subtitle: "The Leak Audit™" },
    steps:    { eyebrow: "7-step protocol",   title: <>The Leak<br/>Audit</>,     subtitle: "$2,500 flat" },
    systems:  { eyebrow: "Ambient layer",     title: <>The System<br/>Stack</>,   subtitle: "Runs quiet 24/7" },
    services: { eyebrow: "Three doors",       title: <>Case<br/>Openings</>,      subtitle: "One methodology" },
  };
  const accent: "amber" | "crimson" = tab === "symptoms" || tab === "all" ? "crimson" : "amber";

  return (
    <section
      className="mt-10 max-w-7xl mx-auto animate-fade-in"
      style={{ animationDelay: "260ms", animationFillMode: "both" }}
    >
      <div className="rounded-sm border border-amber/30 bg-card/60 backdrop-blur-sm p-6 sm:p-8 md:p-10">
        <div className="text-center mb-6">
          <div className="font-mono text-xs sm:text-sm uppercase tracking-[0.35em] text-amber">The Leak Ecosystem</div>
          <h2 className="font-forensic text-4xl sm:text-5xl md:text-6xl font-bold mt-3 leading-[1.05]">
            One business. Several maps.<br className="hidden sm:block" />
            <span className="text-crimson">Every clue traced.</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-foreground/75 max-w-3xl mx-auto leading-relaxed">
            The whole ecosystem is on the map. Click any category below to filter.
            Tap any node to trace how one leak feeds the next.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 sm:gap-3 justify-center mb-3">
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-sm border font-mono text-xs sm:text-sm uppercase tracking-wider transition-all ${
                tab === t.id
                  ? "border-amber bg-amber/15 text-amber shadow-[0_0_20px_-4px_hsl(var(--amber)/0.5)]"
                  : "border-border/50 text-foreground/70 hover:border-amber/50 hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="text-center text-sm sm:text-base text-foreground/70 mb-3">{activeTab.blurb}</p>

        <LeakMindMap
          key={tab}
          hub={hubByTab[tab]}
          nodes={nodes}
          accent={accent}
          heightClass="h-[820px] md:h-[960px] lg:h-[1080px]"
        />

        <p className="text-center text-xs sm:text-sm font-mono uppercase tracking-widest text-foreground/55 mt-3">
          Tap any node — watch the ripple hit every other leak it's feeding.
        </p>
      </div>
    </section>
  );
};

export default HomeMindMapSection;
