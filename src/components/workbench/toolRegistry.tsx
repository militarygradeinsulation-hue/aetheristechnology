import React, { lazy, Suspense } from "react";
import {
  Mail, Globe, Sparkles, FileText, MessageSquare, Calendar, BookOpen,
  Target, Eye, Image as ImageIcon, AlertTriangle, Search, ScrollText,
  Film, Wand2, Zap, Languages,
} from "lucide-react";

import { getPortalToken, getPortalProfile } from "@/lib/portalAuth";
import { getAdminToken } from "@/lib/adminAuth";
import { supabase } from "@/integrations/supabase/client";

/** Prefer admin session if present, else fall back to rep/portal session. */
function activeAuth(): { mode: "admin" | "rep"; token: string } {
  const admin = getAdminToken();
  if (admin) return { mode: "admin", token: admin };
  return { mode: "rep", token: getPortalToken() || "" };
}

const bannerInvoke = async (body: Record<string, unknown>) => {
  const auth = activeAuth();
  if (auth.mode === "admin") {
    return supabase.functions.invoke("admin-image-studio", {
      body, headers: auth.token ? { "x-admin-token": auth.token } : {},
    });
  }
  return supabase.functions.invoke("portal-image-studio", {
    body, headers: auth.token ? { "x-portal-token": auth.token } : {},
  });
};

export type ToolGroup = "Outreach" | "Diagnostics" | "Content" | "Briefs";

export interface ToolDef {
  id: string;
  label: string;
  group: ToolGroup;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  /** HSL string like "210 90% 60%" used for accent (icon, border, badge). */
  accent: string;
  fullPagePath?: string;
  /** Renders the tool. Receives nothing; widgets must self-contain. */
  render: () => React.ReactNode;
}

/** Hue palette per tool — distinct enough to scan visually, still on-brand. */
export const GROUP_HUE: Record<ToolGroup, string> = {
  Outreach: "32 95% 60%",      // amber
  Diagnostics: "0 78% 62%",    // crimson
  Content: "260 85% 68%",      // violet
  Briefs: "190 85% 55%",       // cyan
};


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
const LinkedInCommentGenerator = lazy(() =>
  import("@/components/portal/LinkedInCommentGenerator").then(m => ({ default: m.LinkedInCommentGenerator })));

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

const ContentEngine = lazy(() =>
  import("@/components/admin/ContentEngine").then(m => ({ default: m.ContentEngine })));
const AdminImageStudio = lazy(() =>
  import("@/components/admin/AdminImageStudio").then(m => ({ default: m.AdminImageStudio })));
const AdminCreationStudio = lazy(() =>
  import("@/components/admin/AdminCreationStudio").then(m => ({ default: m.AdminCreationStudio })));
const RepImageStudio = lazy(() =>
  import("@/components/portal/RepImageStudio").then(m => ({ default: m.RepImageStudio })));
const EasyModeTool = lazy(() =>
  import("@/components/EasyModeTool").then(m => ({ default: m.EasyModeTool })));


const wrap = (node: React.ReactNode) => (
  <Suspense fallback={<div className="p-6 text-xs font-mono text-muted-foreground">Loading tool…</div>}>
    {node}
  </Suspense>
);

export const TOOL_REGISTRY: ToolDef[] = [
  // Outreach (warm hues)
  {
    id: "outreach-email", label: "Outreach Email", group: "Outreach", icon: Mail,
    accent: "32 95% 60%", fullPagePath: "/portal",
    render: () => {
      const auth = activeAuth();
      return wrap(
        <OutreachEmailCreator
          authMode={auth.mode}
          token={auth.token}
          defaultSenderName={auth.mode === "rep" ? getPortalProfile()?.rep_name : undefined}
        />
      );
    },
  },
  { id: "post-from-source", label: "Post From Source", group: "Outreach", icon: MessageSquare,
    accent: "22 90% 58%",
    render: () => {
      const isAdmin = !!getAdminToken();
      return wrap(<PostFromSourceGenerator adminMode={isAdmin} repMode={!isAdmin} />);
    } },
  { id: "linkedin-comment", label: "LinkedIn Comment Generator", group: "Outreach", icon: MessageSquare,
    accent: "200 85% 60%",
    render: () => wrap(<LinkedInCommentGenerator />) },
  { id: "linkedin-banner", label: "LinkedIn Banner", group: "Outreach", icon: ImageIcon,
    accent: "45 95% 60%",
    render: () => wrap(<LinkedInBannerCreator invoke={bannerInvoke} />) },
  { id: "sales-scripts", label: "Sales Script", group: "Outreach", icon: ScrollText, fullPagePath: "/sales-scripts",
    accent: "12 88% 60%",
    render: () => wrap(<SalesScriptGenerator adminMode />) },
  { id: "follow-up-plan", label: "Follow-Up Plan", group: "Outreach", icon: Target, fullPagePath: "/follow-up-plan",
    accent: "55 92% 58%",
    render: () => wrap(<FollowUpPlanGenerator adminMode />) },

  // Diagnostics (crimson/red spectrum)
  { id: "scan", label: "Website Scanner", group: "Diagnostics", icon: Globe, fullPagePath: "/portal",
    accent: "0 78% 62%",
    render: () => wrap(<WebsiteScanner onContactClick={() => {}} hideHeader staffUnlock />) },
  { id: "brand-contradictions", label: "Brand Contradictions", group: "Diagnostics", icon: AlertTriangle, fullPagePath: "/brand-contradictions",
    accent: "350 82% 60%",
    render: () => wrap(<BrandContradictionFinder adminMode />) },
  { id: "friction-audit", label: "Friction Vocabulary Audit", group: "Diagnostics", icon: Search, fullPagePath: "/friction-audit",
    accent: "8 80% 58%",
    render: () => wrap(<FrictionVocabularyAudit adminMode />) },
  { id: "strategic-questions", label: "Strategic Questions", group: "Diagnostics", icon: Sparkles, fullPagePath: "/strategic-questions",
    accent: "335 78% 62%",
    render: () => wrap(<StrategicQuestionEngine adminMode />) },
  { id: "detective", label: "Detective Mode", group: "Diagnostics", icon: Eye,
    accent: "320 70% 60%",
    render: () => wrap(<DetectiveModeStandalone />) },

  // Content (cool spectrum — violet/cyan/teal/green)
  { id: "all-in-one", label: "All-In-One Generator", group: "Content", icon: Sparkles, fullPagePath: "/content-generator",
    accent: "260 85% 68%",
    render: () => wrap(<AllInOneGenerator />) },
  { id: "content-calendar", label: "Content Calendar", group: "Content", icon: Calendar, fullPagePath: "/content-calendar",
    accent: "190 85% 55%",
    render: () => wrap(<ContentCalendarGenerator adminMode />) },
  { id: "playbook", label: "Playbook Creator", group: "Content", icon: BookOpen,
    accent: "165 70% 50%",
    render: () => wrap(<PlaybookCreator />) },
  { id: "social-content", label: "Social Content", group: "Content", icon: FileText,
    accent: "210 90% 62%",
    render: () => wrap(<SocialContentGenerator adminMode />) },
  { id: "content-engine", label: "Content Engine", group: "Content", icon: Zap, fullPagePath: "/admin",
    accent: "280 80% 65%",
    render: () => wrap(<ContentEngine />) },
  { id: "admin-image-studio", label: "Image Studio (Admin)", group: "Content", icon: Wand2, fullPagePath: "/admin",
    accent: "295 75% 62%",
    render: () => wrap(<AdminImageStudio />) },
  { id: "rep-image-studio", label: "Image Studio (Rep)", group: "Content", icon: ImageIcon, fullPagePath: "/portal",
    accent: "175 78% 50%",
    render: () => wrap(getAdminToken() ? <AdminImageStudio /> : <RepImageStudio />) },
  { id: "creation-studio", label: "Video & Voiceover Studio", group: "Content", icon: Film, fullPagePath: "/admin",
    accent: "230 85% 68%",
    render: () => wrap(<AdminCreationStudio />) },
  { id: "easy-mode", label: "Easy Mode Translator", group: "Content", icon: Languages,
    accent: "145 65% 52%",
    render: () => wrap(<EasyModeTool />) },
];



export const TOOL_BY_ID = Object.fromEntries(TOOL_REGISTRY.map(t => [t.id, t]));
