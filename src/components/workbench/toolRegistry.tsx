import React, { lazy, Suspense } from "react";
import {
  Mail, Globe, Sparkles, FileText, MessageSquare, Calendar, BookOpen,
  Target, Eye, Image as ImageIcon, AlertTriangle, Search, ScrollText,
} from "lucide-react";
import { getPortalToken, getPortalProfile } from "@/lib/portalAuth";
import { supabase } from "@/integrations/supabase/client";

const bannerInvoke = async (body: Record<string, unknown>) => {
  const token = getPortalToken();
  return supabase.functions.invoke("portal-image-studio", {
    body, headers: token ? { "x-portal-token": token } : {},
  });
};

export type ToolGroup = "Outreach" | "Diagnostics" | "Content" | "Briefs";

export interface ToolDef {
  id: string;
  label: string;
  group: ToolGroup;
  icon: React.ComponentType<{ className?: string }>;
  fullPagePath?: string;
  /** Renders the tool. Receives nothing; widgets must self-contain. */
  render: () => React.ReactNode;
}

// Lazy-load heavy components so the workbench bundle stays small.
const OutreachEmailCreator = lazy(() =>
  import("@/components/OutreachEmailCreator").then(m => ({ default: m.OutreachEmailCreator })));
const PostFromSourceGenerator = lazy(() =>
  import("@/components/PostFromSourceGenerator").then(m => ({ default: m.PostFromSourceGenerator })));
const LinkedInBannerCreator = lazy(() =>
  import("@/components/LinkedInBannerCreator").then(m => ({ default: m.default })));
const SalesScriptGenerator = lazy(() =>
  import("@/components/SalesScriptGenerator").then(m => ({ default: m.SalesScriptGenerator })));
const FollowUpPlanGenerator = lazy(() =>
  import("@/components/FollowUpPlanGenerator").then(m => ({ default: m.FollowUpPlanGenerator })));

const WebsiteScanner = lazy(() =>
  import("@/components/WebsiteScanner").then(m => ({ default: m.WebsiteScanner })));
const BrandContradictionFinder = lazy(() =>
  import("@/components/BrandContradictionFinder").then(m => ({ default: m.BrandContradictionFinder })));
const FrictionVocabularyAudit = lazy(() =>
  import("@/components/FrictionVocabularyAudit").then(m => ({ default: m.FrictionVocabularyAudit })));
const StrategicQuestionEngine = lazy(() =>
  import("@/components/StrategicQuestionEngine").then(m => ({ default: m.StrategicQuestionEngine })));
const DetectiveModeStandalone = lazy(() =>
  import("@/components/DetectiveModeStandalone").then(m => ({ default: m.DetectiveModeStandalone })));

const AllInOneGenerator = lazy(() =>
  import("@/components/AllInOneGenerator").then(m => ({ default: m.AllInOneGenerator })));
const ContentCalendarGenerator = lazy(() =>
  import("@/components/ContentCalendarGenerator").then(m => ({ default: m.ContentCalendarGenerator })));
const PlaybookCreator = lazy(() =>
  import("@/components/PlaybookCreator").then(m => ({ default: m.PlaybookCreator })));
const SocialContentGenerator = lazy(() =>
  import("@/components/SocialContentGenerator").then(m => ({ default: m.SocialContentGenerator })));

const wrap = (node: React.ReactNode) => (
  <Suspense fallback={<div className="p-6 text-xs font-mono text-muted-foreground">Loading tool…</div>}>
    {node}
  </Suspense>
);

export const TOOL_REGISTRY: ToolDef[] = [
  // Outreach
  {
    id: "outreach-email", label: "Outreach Email", group: "Outreach", icon: Mail,
    fullPagePath: "/portal",
    render: () => wrap(
      <OutreachEmailCreator
        authMode="rep"
        token={getPortalToken() || ""}
        defaultSenderName={getPortalProfile()?.rep_name}
      />
    ),
  },
  { id: "post-from-source", label: "Post From Source", group: "Outreach", icon: MessageSquare,
    render: () => wrap(<PostFromSourceGenerator repMode />) },
  { id: "linkedin-banner", label: "LinkedIn Banner", group: "Outreach", icon: ImageIcon,
    render: () => wrap(<LinkedInBannerCreator />) },
  { id: "sales-scripts", label: "Sales Script", group: "Outreach", icon: ScrollText, fullPagePath: "/sales-scripts",
    render: () => wrap(<SalesScriptGenerator adminMode />) },
  { id: "follow-up-plan", label: "Follow-Up Plan", group: "Outreach", icon: Target, fullPagePath: "/follow-up-plan",
    render: () => wrap(<FollowUpPlanGenerator adminMode />) },

  // Diagnostics
  { id: "scan", label: "Website Scanner", group: "Diagnostics", icon: Globe, fullPagePath: "/scan",
    render: () => wrap(<WebsiteScanner onContactClick={() => {}} hideHeader staffUnlock />) },
  { id: "brand-contradictions", label: "Brand Contradictions", group: "Diagnostics", icon: AlertTriangle, fullPagePath: "/brand-contradictions",
    render: () => wrap(<BrandContradictionFinder adminMode />) },
  { id: "friction-audit", label: "Friction Vocabulary Audit", group: "Diagnostics", icon: Search, fullPagePath: "/friction-audit",
    render: () => wrap(<FrictionVocabularyAudit adminMode />) },
  { id: "strategic-questions", label: "Strategic Questions", group: "Diagnostics", icon: Sparkles, fullPagePath: "/strategic-questions",
    render: () => wrap(<StrategicQuestionEngine adminMode />) },
  { id: "detective", label: "Detective Mode", group: "Diagnostics", icon: Eye,
    render: () => wrap(<DetectiveModeStandalone />) },

  // Content
  { id: "all-in-one", label: "All-In-One Generator", group: "Content", icon: Sparkles, fullPagePath: "/content-generator",
    render: () => wrap(<AllInOneGenerator />) },
  { id: "content-calendar", label: "Content Calendar", group: "Content", icon: Calendar, fullPagePath: "/content-calendar",
    render: () => wrap(<ContentCalendarGenerator adminMode />) },
  { id: "playbook", label: "Playbook Creator", group: "Content", icon: BookOpen,
    render: () => wrap(<PlaybookCreator />) },
  { id: "social-content", label: "Social Content", group: "Content", icon: FileText,
    render: () => wrap(<SocialContentGenerator adminMode />) },
];

export const TOOL_BY_ID = Object.fromEntries(TOOL_REGISTRY.map(t => [t.id, t]));
