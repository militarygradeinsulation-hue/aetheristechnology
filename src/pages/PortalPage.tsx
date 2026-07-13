import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Lock, Loader2, ArrowLeft, DollarSign, TrendingUp, Percent, Shield, Crown,
  Calculator, Wrench, MessageSquareCode, Building2, LogOut, Repeat, Users, Briefcase, Activity,
  X, Minimize2, Maximize2, Zap, Sparkles,
} from 'lucide-react';
import { WorkspaceTab } from '@/components/portal/WorkspaceTab';
import { RepImageStudio } from '@/components/portal/RepImageStudio';
import { RepCreationStudio } from '@/components/portal/RepCreationStudio';
import { REP_PRODUCTS, TIER_RATES, fmtUsd, repCentsForProduct } from '@/lib/repProducts';
import revenueForensicsBreakdown from '@/assets/revenue-forensics-breakdown.png';
import { FileText, Search, LayoutGrid } from 'lucide-react';
import { LeadsBoard } from '@/components/portal/LeadsBoard';
import { ForecastCenter } from '@/components/portal/ForecastCenter';
import { PortalPlaybook } from '@/components/portal/PortalPlaybook';
import { PostFromSourceGenerator } from '@/components/PostFromSourceGenerator';
import { PortalReplyComposer } from '@/components/portal/PortalReplyComposer';
import TeamMessageBoard from '@/components/team/TeamMessageBoard';
import { BookOpen, MessageSquare, GraduationCap, Palette, Film, PenSquare } from 'lucide-react';
import { TrainingPanel } from '@/components/portal/TrainingPanel';
import { OnboardingLibrary } from '@/components/portal/OnboardingLibrary';
import { PortalCareersPanel } from '@/components/portal/PortalCareersPanel';
import SharedWorkspace from '@/components/admin/SharedWorkspace';
import { InterviewsPanel } from '@/components/admin/InterviewsPanel';
import { InterviewBriefingPanel } from '@/components/portal/InterviewBriefingPanel';
import { WhosWorkingBar } from '@/components/portal/WhosWorkingBar';
import { NewsFeedPanel } from '@/components/portal/NewsFeedPanel';
import { Newspaper, ArrowDownToLine } from 'lucide-react';
import { CURRENT_EXTENSION_VERSION, getDownloadedExtensionVersion, markExtensionDownloaded } from '@/lib/extensionVersion';

import { EasyModeBar, EasyModeWrapper } from '@/components/EasyModeBar';

const CAREERS_ALLOWED_CODES = new Set(['963169']); // Braden Roberts
import { logPortalActivity } from '@/lib/portalLeads';
import { CommissionStructurePanel } from '@/components/admin/CommissionStructurePanel';
import { FlagshipCommissionPanel } from '@/components/portal/FlagshipCommissionPanel';
import { SalesCoachChat } from '@/components/portal/SalesCoachChat';
import { OutlookMailDrawer } from '@/components/portal/OutlookMailDrawer';
import { RepClockWidget } from '@/components/portal/RepClockWidget';
import { DailyHustleCard } from '@/components/portal/DailyHustleCard';
import { NewRepBlueprintCard } from '@/components/portal/NewRepBlueprintCard';
import { MotivationCard } from '@/components/portal/MotivationCard';
import { CompanyDailyTasksCard } from '@/components/portal/CompanyDailyTasksCard';
import { RepCalendarView } from '@/components/portal/RepCalendarView';
import { Sprint90View } from '@/components/portal/Sprint90View';
import { CalendarDays, Rocket } from 'lucide-react';
import { PartnerTimePanel } from '@/components/portal/PartnerTimePanel';
import { AndroidApkDownloadCard } from '@/components/portal/AndroidApkDownloadCard';
import { WhatsWrongDiagnostic } from '@/components/WhatsWrongDiagnostic';
import { WebsiteScanner } from '@/components/WebsiteScanner';
import { BusinessDiagnostic } from '@/components/BusinessDiagnostic';
import { ServicesPricing } from '@/components/ServicesPricing';
import { ShoppingCart } from 'lucide-react';
import { SalesScriptGenerator } from '@/components/SalesScriptGenerator';
import { FollowUpPlanGenerator } from '@/components/FollowUpPlanGenerator';
import { StrategicQuestionEngine } from '@/components/StrategicQuestionEngine';
import { BrandContradictionFinder } from '@/components/BrandContradictionFinder';
import { FrictionVocabularyAudit } from '@/components/FrictionVocabularyAudit';
import { AllInOneGenerator } from '@/components/AllInOneGenerator';
import { ScamCheckCard } from '@/components/admin/ScamCheckCard';
import { AiWritingDetectorCard } from '@/components/admin/AiWritingDetectorCard';
import { DetectiveModeStandalone } from '@/components/DetectiveModeStandalone';
import { ForensicScanAllPanel } from '@/components/ForensicScanAllPanel';
import { ExternalLink } from 'lucide-react';
import {
  getPortalProfile, setPortalSession, clearPortalSession,
  hasValidPortalSession, getPortalToken, type PortalProfile,
} from '@/lib/portalAuth';
import { hasValidAdminToken, getAdminToken } from '@/lib/adminAuth';
import ManageRepsPanel from '@/components/admin/ManageRepsPanel';
import { useUnreadTeamMessages } from '@/hooks/useUnreadTeamMessages';
import { toast as sonnerToast } from 'sonner';
import { PortalDocuments } from '@/components/portal/PortalDocuments';
import { IncentivePlan } from '@/components/portal/IncentivePlan';
import { Trophy } from 'lucide-react';
import { Linkedin } from 'lucide-react';
import { LinkedInSetupGuide } from '@/components/portal/LinkedInSetupGuide';
import { CompanyCalendarRepView } from '@/components/portal/CompanyCalendarRepView';
import { LanguageToggle } from '@/components/portal/LanguageToggle';
import { AdminCompanyCalendarPanel } from '@/components/admin/AdminCompanyCalendarPanel';
import PortalViewSelector, { type LayoutMode, type WidgetSize } from '@/components/portal/PortalViewSelector';
// Maximize2 imported above
import { OperatorIdentityBar } from '@/components/OperatorIdentityBar';
import { PortalCursorPicker } from '@/components/portal/PortalCursorPicker';
import TabColorToggle from '@/components/TabColorToggle';
import TabSizeSlider from '@/components/TabSizeSlider';
import { useTabSize, tabButtonStyle, tabIconSize } from '@/lib/tabSize';
import { useTabColorMode, getTabColorClasses } from '@/lib/portalTabColors';
import { usePortalCursor } from '@/lib/portalCursor';
import { REP_TOOL_TIPS } from '@/lib/repToolTips';
import { OutreachEmailCreator } from '@/components/OutreachEmailCreator';
import { BusinessPostAnalyst } from '@/components/portal/BusinessPostAnalyst';
import PartnerCoachTips from '@/components/portal/PartnerCoachTips';
import { PartnerOnboardingHub } from '@/components/portal/PartnerOnboardingHub';
import { Compass } from 'lucide-react';
import { IdeaRoom } from '@/components/portal/IdeaRoom';
import { Lightbulb } from 'lucide-react';
import { DialerPanel } from '@/components/portal/DialerPanel';
import { Phone as PhoneIcon } from 'lucide-react';


type Tab = 'overview' | 'calendar' | 'companycal' | 'commissions' | 'forecast' | 'leads' | 'playbook' | 'training' | 'onboarding' | 'team' | 'tools' | 'workspace' | 'sharedws' | 'interviews' | 'briefing' | 'documents' | 'coach' | 'company' | 'art' | 'video' | 'poststudio' | 'careers' | 'inbox' | 'news' | 'sprint' | 'incentives' | 'catalog' | 'linkedin' | 'workbench' | 'partnerhub' | 'ideas';
type ToolKey =
  | 'all-in-one'
  | 'business-post-analyst'
  | 'outreach-email'
  | 'golden-report'
  | 'leak-audit' | 'scan' | 'scam-check' | 'detective' | 'ai-detect' | 'business-diagnostic' | 'sales-scripts'
  | 'follow-up-plan' | 'strategic-questions' | 'brand-contradictions' | 'friction-audit';

const REP_TOOLS: { key: ToolKey; name: string; href: string; desc: string; external?: boolean }[] = [
  { key: 'golden-report',       name: 'Golden Report (Forensic Scan All)',   href: '#',                     desc: 'Drop a URL, get the full 14-chapter forensic case file with dollar-quantified leaks and a Smart PDF.' },
  { key: 'all-in-one',          name: 'All-In-One: Run Every Tool',          href: '#',                     desc: 'Drop a website URL, runs every prospect tool at once.' },
  { key: 'outreach-email',      name: 'Outreach Email Creator',              href: '#',                     desc: 'Bold, direct emails in the Aetheris voice. Paste, upload a screenshot, or describe the lead.' },
  { key: 'business-post-analyst', name: 'Business Post Analyst',               href: '#',                     desc: 'Analyze any LinkedIn/social post, instant prospect ammo.' },
  { key: 'leak-audit',          name: 'Free Leak Audit (give to prospects)', href: '/leak-audit',           desc: 'Send this URL. Their result is your wedge.' },
  { key: 'scan',                name: 'Website Scanner',                     href: '/scan',                 desc: 'Run a quick scan on a prospect site to break the ice.' },
  { key: 'scam-check',          name: 'Scam / Legit Forensics',              href: '#',                     desc: 'Investigate any site for scam signals. Live RDAP, redirects, SSL, page copy + cited forensic clues.' },
  { key: 'detective',           name: 'Detective Mode',                      href: '#',                     desc: 'Drop a site. Auto-runs scan, RDAP, scrape, enrichment, then writes the opener.' },
  { key: 'ai-detect',           name: 'AI Writing Detector',                 href: '#',                     desc: 'Compare up to 5 writing samples. Per-sample AI scores, repeated patterns, same-author analysis. Auto-saves to your library.' },
  { key: 'business-diagnostic', name: 'Business Diagnostic Quiz',            href: '/business-diagnostic',  desc: '20 questions, score, full PDF, perfect demo asset.' },
  { key: 'sales-scripts',       name: 'Sales Script Generator',              href: '/sales-scripts',        desc: 'Custom cold-call & email scripts in seconds.' },
  { key: 'follow-up-plan',      name: 'Follow-Up Plan',                      href: '/follow-up-plan',       desc: '7-touch sequences tuned to a specific prospect.' },
  { key: 'strategic-questions', name: 'Strategic Question Engine',           href: '/strategic-questions',  desc: 'Discovery-call questions to uncover real pain.' },
  { key: 'brand-contradictions',name: 'Brand Contradiction Finder',          href: '/brand-contradictions', desc: 'Show prospects what their brand is actually saying.' },
  { key: 'friction-audit',      name: 'Friction Vocabulary Audit',           href: '/friction-audit',       desc: 'Find the words on their site costing them deals.' },
];

const renderEmbeddedTool = (key: ToolKey, noop: () => void, profile: PortalProfile | null): React.ReactNode => {
  switch (key) {
    case 'business-post-analyst': return <BusinessPostAnalyst authMode="rep" token={getPortalToken()} />;
    case 'golden-report':        return <ForensicScanAllPanel />;
    case 'all-in-one':           return <AllInOneGenerator />;
    case 'outreach-email':       return <OutreachEmailCreator authMode="rep" token={getPortalToken()} defaultSenderName={profile?.rep_name} />;
    case 'leak-audit':           return <WhatsWrongDiagnostic />;
    case 'scan':                 return <WebsiteScanner onContactClick={noop} hideHeader staffUnlock />;
    case 'scam-check':           return <ScamCheckCard />;
    case 'detective':            return <DetectiveModeStandalone />;
    case 'ai-detect':            return <AiWritingDetectorCard repMode />;
    case 'business-diagnostic':  return <BusinessDiagnostic />;
    case 'sales-scripts':        return <SalesScriptGenerator adminMode />;
    case 'follow-up-plan':       return <FollowUpPlanGenerator adminMode />;
    case 'strategic-questions':  return <StrategicQuestionEngine adminMode />;
    case 'brand-contradictions': return <BrandContradictionFinder adminMode />;
    case 'friction-audit':       return <FrictionVocabularyAudit adminMode />;
  }
};

const PortalPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<PortalProfile | null>(() => getPortalProfile());
  const [tab, setTab] = useState<Tab>('overview');
  const [activeTool, setActiveTool] = useState<ToolKey | null>(null);
  const [restoredFor, setRestoredFor] = useState<string | null>(null);
  const [tabSearch, setTabSearch] = useState('');
  const [tabSearchOpen, setTabSearchOpen] = useState(false);
  const { mode: tabColorMode } = useTabColorMode();
  const { scale: tabScale } = useTabSize();
  const [wideMode, setWideMode] = useState<boolean>(() => {
    try { return localStorage.getItem('portal.wideMode.v1') === '1'; } catch { return false; }
  });
  const toggleWideMode = () => setWideMode(v => {
    const next = !v;
    try { localStorage.setItem('portal.wideMode.v1', next ? '1' : '0'); } catch {}
    return next;
  });
  // Tabs that benefit from a wider canvas (workspace boards, company portal, etc.)
  const WIDE_TABS = new Set<Tab>(['workspace','sharedws','company','briefing','interviews','careers','leads','forecast','documents','training','onboarding']);



  // Personalized view: tabs vs widget board, plus per-rep visible tabs and widget sizes.
  const ns = `portal.${profile?.code || 'anon'}`;
  const VISIBLE_KEY = `${ns}.visibleTabs.v1`;
  const LAYOUT_KEY = `${ns}.layout.v1`;
  const SIZES_KEY = `${ns}.widgetSizes.v1`;
  const ACTIVE_TAB_KEY = `${ns}.activeTab.v1`;
  const ACTIVE_TOOL_KEY = `${ns}.activeTool.v1`;

  // Restore the last-viewed tab + tool once profile is known (per rep code).
  useEffect(() => {
    if (!profile?.code || restoredFor === profile.code) return;
    try {
      const savedTab = localStorage.getItem(ACTIVE_TAB_KEY);
      if (savedTab) setTab(savedTab as Tab);
      const savedTool = localStorage.getItem(ACTIVE_TOOL_KEY);
      if (savedTool) setActiveTool(savedTool as ToolKey);
    } catch {}
    setRestoredFor(profile.code);
  }, [profile?.code, restoredFor, ACTIVE_TAB_KEY, ACTIVE_TOOL_KEY]);

  // Persist tab + tool whenever they change (after restore so we don't overwrite).
  useEffect(() => {
    if (!profile?.code || restoredFor !== profile.code) return;
    try { localStorage.setItem(ACTIVE_TAB_KEY, tab); } catch {}
  }, [tab, profile?.code, restoredFor, ACTIVE_TAB_KEY]);
  useEffect(() => {
    if (!profile?.code || restoredFor !== profile.code) return;
    try {
      if (activeTool) localStorage.setItem(ACTIVE_TOOL_KEY, activeTool);
      else localStorage.removeItem(ACTIVE_TOOL_KEY);
    } catch {}
  }, [activeTool, profile?.code, restoredFor, ACTIVE_TOOL_KEY]);

  const PORTAL_ALWAYS_INCLUDE_NEW = ['briefing', 'interviews', 'news', 'sprint', 'coach']; // newly added tabs auto-show; coach pinned so Braden never loses it
  const [visibleTabs, setVisibleTabsState] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(VISIBLE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const merged = [...parsed];
          for (const k of PORTAL_ALWAYS_INCLUDE_NEW) {
            if (!merged.includes(k)) merged.push(k);
          }
          return merged;
        }
      }
    } catch {}
    return [];
  });
  const setVisibleTabs = (t: string[]) => {
    setVisibleTabsState(t);
    try { localStorage.setItem(VISIBLE_KEY, JSON.stringify(t)); } catch {}
  };
  const [layout, setLayoutState] = useState<LayoutMode>(() => {
    try { return (localStorage.getItem(LAYOUT_KEY) as LayoutMode) || 'tabs'; } catch { return 'tabs'; }
  });
  const setLayout = (l: LayoutMode) => {
    setLayoutState(l);
    try { localStorage.setItem(LAYOUT_KEY, l); } catch {}
  };
  const TABS_COLLAPSED_KEY = 'portal.tabsCollapsed.v1';
  const [tabsCollapsed, setTabsCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(TABS_COLLAPSED_KEY) === '1'; } catch { return false; }
  });
  const toggleTabsCollapsed = () => {
    setTabsCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem(TABS_COLLAPSED_KEY, next ? '1' : '0'); } catch { /* noop */ }
      return next;
    });
  };
  const [widgetSizes, setWidgetSizesState] = useState<Record<string, WidgetSize>>(() => {
    try { return JSON.parse(localStorage.getItem(SIZES_KEY) || '{}'); } catch { return {}; }
  });
  const setWidgetSize = (key: string, size: WidgetSize) => {
    setWidgetSizesState(prev => {
      const next = { ...prev, [key]: size };
      try { localStorage.setItem(SIZES_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // Per-rep widget order + pinned set for full board customization.
  const ORDER_KEY = `${ns}.widgetOrder.v1`;
  const PINNED_KEY = `${ns}.widgetPinned.v1`;
  const TAB_ORDER_KEY = `${ns}.tabOrder.v1`;
  const [widgetOrder, setWidgetOrderState] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(ORDER_KEY) || '[]'); } catch { return []; }
  });
  const persistOrder = (next: string[]) => {
    setWidgetOrderState(next);
    try { localStorage.setItem(ORDER_KEY, JSON.stringify(next)); } catch {}
  };
  const [pinnedWidgets, setPinnedWidgetsState] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(PINNED_KEY) || '[]'); } catch { return []; }
  });
  const togglePinned = (id: string) => {
    setPinnedWidgetsState(prev => {
      const next = prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id];
      try { localStorage.setItem(PINNED_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const [tabOrder, setTabOrderState] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(TAB_ORDER_KEY) || '[]'); } catch { return []; }
  });
  const persistTabOrder = (next: string[]) => {
    setTabOrderState(next);
    try { localStorage.setItem(TAB_ORDER_KEY, JSON.stringify(next)); } catch {}
  };
  const [tabDragId, setTabDragId] = useState<string | null>(null);
  const reorderTabs = (sourceId: string, targetId: string, currentIds: string[]) => {
    if (sourceId === targetId) return;
    const base = tabOrder.length > 0
      ? [...tabOrder.filter(id => currentIds.includes(id)), ...currentIds.filter(id => !tabOrder.includes(id))]
      : currentIds.slice();
    const from = base.indexOf(sourceId);
    const to = base.indexOf(targetId);
    if (from < 0 || to < 0) return;
    base.splice(from, 1);
    base.splice(to, 0, sourceId);
    persistTabOrder(base);
  };
  const [dragId, setDragId] = useState<string | null>(null);
  const reorderWidgets = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    const current = sortedWidgetsRef.current.slice();
    const from = current.indexOf(sourceId);
    const to = current.indexOf(targetId);
    if (from < 0 || to < 0) return;
    current.splice(from, 1);
    current.splice(to, 0, sourceId);
    persistOrder(current);
  };
  const sortedWidgetsRef = React.useRef<string[]>([]);


  // Admin preview mode: if launched from the admin dashboard with ?adminPreview=1
  // and a valid admin token, mint a synthetic profile so admins can browse the
  // exact portal UX without a rep code.
  useEffect(() => {
    if (profile) return;
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('adminPreview') !== '1') return;
    if (!hasValidAdminToken()) return;
    const role: 'partner' | 'rep' = params.get('role') === 'rep' ? 'rep' : 'partner';
    const adminToken = getAdminToken() || '';
    // Reuse the admin token as a portal token surrogate so localStorage reads
    // still return something; backend endpoints that require a real portal
    // token will fall back to admin-token auth where supported.
    const syntheticToken = `${Date.now() + 1000 * 60 * 60}.${adminToken}`;
    const syntheticProfile: PortalProfile = {
      code: 'ADMIN',
      rep_name: 'Admin Preview',
      rep_email: null,
      commission_rate: 0.25,
      total_sales_cents: 0,
      total_commission_cents: 0,
      role,
    };
    setPortalSession(syntheticToken, syntheticProfile);
    setProfile(syntheticProfile);
  }, [profile]);

  // Deep-link support: /portal?tab=tools&tool=sales-scripts jumps directly to the tool,
  // no extra click on the Tools tab. Runs whenever the URL changes.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    const toolParam = params.get('tool');
    const VALID_TABS: Tab[] = ['overview','calendar','companycal','commissions','forecast','leads','playbook','training','onboarding','team','tools','workspace','sharedws','interviews','briefing','documents','coach','company','art','video','poststudio','careers','inbox','news','sprint','incentives','catalog','linkedin','ideas'];
    const VALID_TOOLS: ToolKey[] = ['all-in-one','business-post-analyst','outreach-email','golden-report','leak-audit','scan','scam-check','detective','ai-detect','business-diagnostic','sales-scripts','follow-up-plan','strategic-questions','brand-contradictions','friction-audit'];
    if (tabParam && (VALID_TABS as string[]).includes(tabParam)) {
      setTab(tabParam as Tab);
      if (tabParam === 'tools' && toolParam && (VALID_TOOLS as string[]).includes(toolParam)) {
        setActiveTool(toolParam as ToolKey);
      } else if (tabParam !== 'tools') {
        setActiveTool(null);
      }
    }
  }, [location.search]);


  useEffect(() => {
    if (hasValidPortalSession() && !profile) {
      const p = getPortalProfile();
      setProfile(p);
      const inAdminPreviewIframe =
        typeof window !== 'undefined' &&
        (new URLSearchParams(window.location.search).get('adminPreview') === '1' ||
          window.top !== window.self);
      if (p?.role === 'partner' && hasValidAdminToken() && !inAdminPreviewIframe) {
        navigate('/admin', { replace: true });
        return;
      }
      // Reps default to the new portal. Only stay on the legacy page if the
      // user explicitly toggled the classic style, or is an admin previewing.
      const wantsNew =
        new URLSearchParams(window.location.search).get('next') === 'new' ||
        (() => { try { return localStorage.getItem('aetheris.portalStyle') !== 'classic'; } catch { return true; } })();
      if (p?.role !== 'partner' && wantsNew && !inAdminPreviewIframe) {
        navigate('/portal', { replace: true });
      }
    }
  }, [profile, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Master admin PIN — full access, route straight into Admin Console.
      if (code.trim() === '9822') {
        const { data: adm, error: admErr } = await supabase.functions.invoke('admin-pin-login', {
          body: { pin: '9822' },
        });
        if (admErr || !adm?.ok || !adm?.token) {
          throw new Error(admErr?.message || adm?.error || 'Admin login failed');
        }
        const { setAdminToken } = await import('@/lib/adminAuth');
        setAdminToken(adm.token);
        toast({ title: 'Admin access granted' });
        navigate('/admin', { replace: true });
        return;
      }
      const { data, error } = await supabase.functions.invoke('rep-portal-login', {
        body: { code: code.trim() },
      });
      if (error || !data?.ok) {
        throw new Error(data?.error || error?.message || 'Invalid code');
      }

      setPortalSession(data.token, data.profile);
      setProfile(data.profile);
      // Fire-and-forget activity log; runs after token is in localStorage
      setTimeout(() => logPortalActivity('login'), 0);
      toast({ title: `Welcome${data.profile.rep_name ? `, ${data.profile.rep_name}` : ''}` });

      // Partners auto-promote to the Admin Console using their code as PIN.
      if (data.profile.role === 'partner') {
        try {
          const { data: adm } = await supabase.functions.invoke('admin-pin-login', {
            body: { pin: code.trim() },
          });
          if (adm?.ok && adm?.token) {
            const { setAdminToken } = await import('@/lib/adminAuth');
            setAdminToken(adm.token);
            navigate('/admin', { replace: true });
            return;
          }
        } catch (e) {
          console.warn('Partner admin auto-login failed:', e);
        }
      }

      // Reps land in the NEW portal by default. Admins previewing a rep code
      // via ?adminPreview=1 stay on the legacy page.
      const inAdminPreview =
        new URLSearchParams(window.location.search).get('adminPreview') === '1';
      if (data.profile.role !== 'partner' && !inAdminPreview) {
        navigate('/portal', { replace: true });
        return;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed.';
      toast({ title: 'Login failed', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearPortalSession();
    setProfile(null);
    setTab('overview');
    navigate('/portal');
  };

  // Hooks must run unconditionally, call before any early return.
  const { unread: unreadChat } = useUnreadTeamMessages(profile?.code || '', !!profile && tab === 'team');
  const { className: cursorClassName } = usePortalCursor();

  // Track whether THIS user has downloaded the current Chrome extension build.
  // If not, every portal user gets a direct download prompt instead of only a small partner/admin link.
  const [extDownloadedVersion, setExtDownloadedVersion] = useState<string | null>(() => getDownloadedExtensionVersion());
  useEffect(() => {
    const refresh = () => setExtDownloadedVersion(getDownloadedExtensionVersion());
    refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener('aetheris:extension-downloaded', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('aetheris:extension-downloaded', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);
  const extensionOutdated = extDownloadedVersion !== CURRENT_EXTENSION_VERSION;

  // Nag once per session per version when outdated.
  useEffect(() => {
    if (!profile?.code || !extensionOutdated) return;
    const flagKey = `aetheris.extensionNagShown.${profile.code}.${CURRENT_EXTENSION_VERSION}`;
    try {
      if (sessionStorage.getItem(flagKey)) return;
      sessionStorage.setItem(flagKey, '1');
    } catch { /* ignore */ }
    sonnerToast.error('Chrome extension download is ready', {
      description: `Download v${CURRENT_EXTENSION_VERSION} from the top of this portal, then reload it in Chrome.`,
      duration: 10000,
    });
  }, [extensionOutdated, profile?.code]);

  const downloadChromeExtension = async () => {
    try {
      const res = await fetch('/aetheris-extension.zip');
      if (!res.ok) throw new Error(`Download failed: ${res.status}`);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `aetheris-extension-${CURRENT_EXTENSION_VERSION}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
      markExtensionDownloaded();
      setExtDownloadedVersion(CURRENT_EXTENSION_VERSION);
      toast({ title: 'Chrome extension downloaded', description: 'Unzip it, open chrome://extensions, then Load unpacked.' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Try again.';
      toast({ title: 'Download failed', description: msg, variant: 'destructive' });
    }
  };

  // ============ LOGIN VIEW ============
  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 relative">
        <Link
          to="/"
          className="absolute top-4 left-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to website
        </Link>
        <div className="glass p-8 rounded-2xl max-w-sm w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-amber/20 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-amber" />
            </div>
            <h1 className="text-2xl font-bold text-foreground font-display">Rep / Partner Portal</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Enter your access code to view your tools, commissions, and AI Sales Coach.
            </p>
          </div>
          <form onSubmit={handleLogin} className="space-y-3">
            <Input
              type="password"
              inputMode="numeric"
              maxLength={12}
              placeholder="Access code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              required
              autoFocus
              autoComplete="one-time-code"
            />
            <Button type="submit" className="w-full bg-amber text-background hover:bg-amber/90" disabled={loading || code.length < 4}>
              {loading
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...</>
                : 'Unlock Portal'}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground text-center mt-6">
            Don't have a code?{' '}
            <Link to="/careers" className="text-amber hover:underline">Apply to become a rep</Link>
          </p>
        </div>
      </div>
    );
  }

  const isPartner = profile.role === 'partner';

  // Partner (Braden, non-admin) ALWAYS opens to the Partner Hub — never to admin/owner tabs.
  const isOwnerAdminEarly = hasValidAdminToken();
  useEffect(() => {
    if (isPartner && !isOwnerAdminEarly && profile?.code) {
      const savedTab = (() => { try { return localStorage.getItem(ACTIVE_TAB_KEY); } catch { return null; } })();
      const adminOnlyTabs = new Set(['jw-admin', 'workbench']);
      if (!savedTab || adminOnlyTabs.has(savedTab)) {
        setTab('partnerhub');
      }
    }
  }, [isPartner, isOwnerAdminEarly, profile?.code, ACTIVE_TAB_KEY]);


  // Partner (Braden) gets the simpler rep-style top-tab layout, no view selector / widget board.
  // Joseph is also a partner but as the owner/admin he keeps the full customization UI.
  const isOwnerAdmin = hasValidAdminToken();
  useEffect(() => {
    if (isPartner && !isOwnerAdmin && layout !== 'tabs') setLayout('tabs');
  }, [isPartner, isOwnerAdmin, layout]);

  const fmt = (cents: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

  // Toast pop when a new chat arrives while not viewing chat
  useEffect(() => {
    if (unreadChat > 0 && tab !== 'team') {
      sonnerToast(`${unreadChat} new team message${unreadChat === 1 ? '' : 's'}`, {
        description: 'Open the Team Chat tab to read.',
        action: { label: 'View', onClick: () => setTab('team') },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadChat]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode; iconCmp: React.ElementType; partnerOnly?: boolean; badge?: number; href?: string; adminOnly?: boolean; adminOrPartnerOnly?: boolean }[] = [
    { id: 'partnerhub', label: 'Partner Hub', icon: <Compass className="w-4 h-4" />, iconCmp: Compass, partnerOnly: true },
    { id: 'workbench' as Tab, label: 'Workbench', icon: <Wrench className="w-4 h-4" />, iconCmp: Wrench, adminOnly: true },
    { id: 'news', label: 'Aetheris News', icon: <Newspaper className="w-4 h-4" />, iconCmp: Newspaper },
    { id: 'coach', label: 'AI Sales Coach', icon: <MessageSquareCode className="w-4 h-4" />, iconCmp: MessageSquareCode },
    { id: 'art', label: 'Art Studio', icon: <Palette className="w-4 h-4" />, iconCmp: Palette },
    { id: 'video', label: 'Video Studio', icon: <Film className="w-4 h-4" />, iconCmp: Film, adminOrPartnerOnly: true },
    { id: 'poststudio', label: 'Post Studio', icon: <PenSquare className="w-4 h-4" />, iconCmp: PenSquare },
    { id: 'careers', label: 'Careers Admin', icon: <Briefcase className="w-4 h-4" />, iconCmp: Briefcase },
    { id: 'commissions', label: 'Commission Calculator', icon: <Calculator className="w-4 h-4" />, iconCmp: Calculator },
    { id: 'companycal', label: 'Company Calendar', icon: <CalendarDays className="w-4 h-4" />, iconCmp: CalendarDays },
    { id: 'company', label: 'Company Portal', icon: <Building2 className="w-4 h-4" />, iconCmp: Building2, partnerOnly: true },
    { id: 'documents', label: 'Documents', icon: <FileText className="w-4 h-4" />, iconCmp: FileText },
    { id: 'forecast', label: 'Forecast Center', icon: <Activity className="w-4 h-4" />, iconCmp: Activity },

    { id: 'briefing', label: 'Interview Briefing', icon: <BookOpen className="w-4 h-4" />, iconCmp: BookOpen },
    { id: 'interviews', label: 'Interviews', icon: <CalendarDays className="w-4 h-4" />, iconCmp: CalendarDays },
    { id: 'incentives', label: 'Incentive Plan', icon: <Trophy className="w-4 h-4" />, iconCmp: Trophy, adminOrPartnerOnly: true },
    { id: 'leads', label: 'Leads', icon: <Users className="w-4 h-4" />, iconCmp: Users },
    { id: 'calendar', label: 'My Calendar', icon: <CalendarDays className="w-4 h-4" />, iconCmp: CalendarDays },
    { id: 'tools', label: 'My Tools', icon: <Wrench className="w-4 h-4" />, iconCmp: Wrench },
    { id: 'catalog', label: 'Catalog & Pricing', icon: <ShoppingCart className="w-4 h-4" />, iconCmp: ShoppingCart },
    { id: 'onboarding', label: 'Aetheris Academy', icon: <GraduationCap className="w-4 h-4" />, iconCmp: GraduationCap },
    { id: 'overview', label: 'Overview', icon: <DollarSign className="w-4 h-4" />, iconCmp: DollarSign },
    { id: 'linkedin', label: 'Set Up LinkedIn', icon: <Linkedin className="w-4 h-4" />, iconCmp: Linkedin },
    { id: 'playbook', label: 'Playbook', icon: <BookOpen className="w-4 h-4" />, iconCmp: BookOpen, adminOrPartnerOnly: true },
    { id: 'sprint', label: '90-Day Sprint', icon: <Rocket className="w-4 h-4" />, iconCmp: Rocket, adminOrPartnerOnly: true },
    { id: 'sharedws', label: 'Shared with Joseph', icon: <Users className="w-4 h-4" />, iconCmp: Users },
    { id: 'team', label: 'Team Chat', icon: <MessageSquare className="w-4 h-4" />, iconCmp: MessageSquare, badge: unreadChat },
    { id: 'training', label: 'Team Training', icon: <GraduationCap className="w-4 h-4" />, iconCmp: GraduationCap },
    { id: 'workspace', label: 'Workspace', icon: <Briefcase className="w-4 h-4" />, iconCmp: Briefcase },
    { id: 'ideas', label: 'Idea Room', icon: <Lightbulb className="w-4 h-4" />, iconCmp: Lightbulb },
  ];

  const careersUnlocked = !!profile && CAREERS_ALLOWED_CODES.has(profile.code);
  const isAdmin = isOwnerAdmin;
  // Newly onboarded reps — locked out of advanced studios/docs until enabled.
  const NEW_REP_CODES = new Set<string>([
    '204871','315982','427193','538204','649315','750426','861537','972648','183759',
  ]);
  const LOCKED_FOR_NEW_REPS = new Set<Tab>(['video','poststudio','documents','incentives','playbook']);
  // Lock applies purely by rep code so admin/preview iframes also see the block.
  const isNewRep = !!profile && NEW_REP_CODES.has(profile.code);

  // "Shared with Joseph" / interviews / briefing are partner+admin-only collaboration spaces.
  // Reps must NEVER see them, regardless of saved visibleTabs config.
  const sharedWsUnlocked = (isPartner || isAdmin) && !!profile && CAREERS_ALLOWED_CODES.has(profile.code);
  const HIDDEN_FOR_REPS = new Set<Tab>(['sharedws', 'interviews', 'briefing']);
  const availableTabs = tabs.filter(t =>
    (!t.partnerOnly || isPartner)
    && (!t.adminOnly || isAdmin)
    && (!t.adminOrPartnerOnly || isAdmin || isPartner)
    && (t.id !== 'careers' || careersUnlocked)
    && (t.id !== 'sharedws' || sharedWsUnlocked)
    && (t.id !== 'interviews' || sharedWsUnlocked)
    && (t.id !== 'briefing' || sharedWsUnlocked)
    && (!HIDDEN_FOR_REPS.has(t.id as Tab) || isPartner || isAdmin)
  ).map(t => ({ ...t, locked: isNewRep && LOCKED_FOR_NEW_REPS.has(t.id as Tab) }));
  const allTabsForSelector = availableTabs.map(t => ({ key: t.id, label: t.label, icon: t.iconCmp }));
  const effectiveVisible = visibleTabs.length > 0
    ? visibleTabs.filter(k => availableTabs.some(t => t.id === k))
    : availableTabs.map(t => t.id);


  const renderTabBody = (key: Tab): React.ReactNode => {
    if (isNewRep && LOCKED_FOR_NEW_REPS.has(key)) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="font-display">🔒 Locked</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This tab isn't enabled for your portal yet. Ask your partner to unlock it when you're ready.
            </p>
          </CardContent>
        </Card>
      );
    }
    switch (key) {

      case 'overview':
        return (
          <div className="space-y-6">
            <NewRepBlueprintCard />
            <DailyHustleCard onViewSprint={() => { setTab('sprint'); setActiveTool(null); }} />
            <MotivationCard />
            <CompanyDailyTasksCard />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><DollarSign className="w-4 h-4" /> Total Sales</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{fmt(profile.total_sales_cents)}</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Commission Earned</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{fmt(profile.total_commission_cents)}</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Percent className="w-4 h-4" /> Commission Rate</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{(profile.commission_rate * 100).toFixed(0)}%</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Shield className="w-4 h-4" /> Code</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold font-mono text-amber">{profile.code}</p></CardContent></Card>
            </div>
            <FlagshipCommissionPanel audience={isPartner ? 'partner' : 'rep'} />
          </div>
        );
      case 'commissions': return (
        <div className="space-y-6">
          <FlagshipCommissionPanel audience={isPartner ? 'partner' : 'rep'} />
          <CommissionStructurePanel />
        </div>
      );
      case 'leads': return <LeadsBoard />;
      case 'forecast': return <ForecastCenter isPartner={isPartner} />;
      case 'tools':
        return !activeTool ? (
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Sales Tools</CardTitle>
              <p className="text-sm text-muted-foreground">Click any tool to use it free, right here inside the portal.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <AndroidApkDownloadCard />
              <div className="grid sm:grid-cols-2 gap-3">
                {REP_TOOLS.map((t) => {
                  const tip = REP_TOOL_TIPS[t.key];
                  return (
                  <div key={t.key} className="rounded-lg border border-border/50 bg-card/50 p-4 hover:border-amber/50 hover:bg-amber/5 transition-colors group">
                    {t.external ? (
                      <a href={t.href} target="_blank" rel="noopener noreferrer" className="w-full text-left block">
                        <div className="flex items-start gap-2"><Wrench className="w-4 h-4 text-amber mt-0.5 flex-shrink-0" /><div className="min-w-0"><p className="font-semibold text-foreground group-hover:text-amber transition-colors inline-flex items-center gap-1">{t.name} <ExternalLink className="w-3 h-3" /></p><p className="text-sm text-muted-foreground mt-1">{t.desc}</p></div></div>
                      </a>
                    ) : (
                      <button type="button" onClick={() => setActiveTool(t.key)} className="w-full text-left">
                        <div className="flex items-start gap-2"><Wrench className="w-4 h-4 text-amber mt-0.5 flex-shrink-0" /><div className="min-w-0"><p className="font-semibold text-foreground group-hover:text-amber transition-colors">{t.name}</p><p className="text-sm text-muted-foreground mt-1">{t.desc}</p></div></div>
                      </button>
                    )}
                    {tip && (
                      <div className="mt-3 pt-3 border-t border-amber/20 space-y-1.5">
                        <p className="text-[10px] font-mono uppercase tracking-wider text-amber/80">Use it for</p>
                        <p className="text-xs text-muted-foreground leading-snug">{tip.useFor}</p>
                        <p className="text-[10px] font-mono uppercase tracking-wider text-amber/80 pt-1">Pair with</p>
                        <p className="text-xs text-muted-foreground leading-snug">{tip.pairWith}</p>
                        {tip.proTip && <p className="text-[11px] text-amber/90 italic leading-snug pt-1">💡 {tip.proTip}</p>}
                      </div>
                    )}
                    {t.href !== '#' && (
                      <div className="mt-3 pt-3 border-t border-border/30 flex items-center justify-between gap-2">
                        <span className="text-xs font-mono text-amber/70 truncate">{t.href}</span>
                        <a href={t.href} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-amber inline-flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>{t.external ? 'Open' : 'Public page'} <ExternalLink className="w-3 h-3" /></a>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <Button variant="ghost" size="sm" onClick={() => setActiveTool(null)} className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-4 h-4 mr-1" /> Back to all tools</Button>
              {(() => {
                const href = REP_TOOLS.find(t => t.key === activeTool)?.href;
                return href && href !== '#' ? (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-amber inline-flex items-center gap-1">Open public page <ExternalLink className="w-3 h-3" /></a>
                ) : null;
              })()}
            </div>
            {activeTool && REP_TOOL_TIPS[activeTool] && (
              <div className="rounded-lg border border-amber/30 bg-amber/5 p-3 sm:p-4 space-y-2">
                <p className="text-[10px] font-mono uppercase tracking-wider text-amber">Rep Playbook for this tool</p>
                <div className="grid sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Use it for</p>
                    <p className="text-foreground/90 leading-snug">{REP_TOOL_TIPS[activeTool].useFor}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Pair with</p>
                    <p className="text-foreground/90 leading-snug">{REP_TOOL_TIPS[activeTool].pairWith}</p>
                  </div>
                </div>
                {REP_TOOL_TIPS[activeTool].proTip && (
                  <p className="text-xs text-amber/90 italic leading-snug pt-1 border-t border-amber/20">💡 {REP_TOOL_TIPS[activeTool].proTip}</p>
                )}
              </div>
            )}
            <div className="rounded-lg border border-border/50 bg-card/30 p-4 sm:p-6">{renderEmbeddedTool(activeTool, () => {}, profile)}</div>
          </div>
        );
      case 'calendar': return <RepCalendarView isAdmin={false} />;
      case 'companycal': return isPartner ? <AdminCompanyCalendarPanel /> : <CompanyCalendarRepView />;
      case 'briefing': return <InterviewBriefingPanel />;
      case 'playbook': return <PortalPlaybook />;
      case 'incentives': return <IncentivePlan />;
      case 'training': return <TrainingPanel repName={profile?.rep_name} />;
      case 'onboarding': return <OnboardingLibrary />;
      case 'team': return <TeamMessageBoard isAdmin={false} authorName={profile?.rep_name} />;
      case 'workspace': return <WorkspaceTab />;
      case 'ideas': return <IdeaRoom isAdmin={false} />;
      case 'sharedws': return <SharedWorkspace me="braden" />;
      case 'interviews': return <InterviewsPanel me="braden" />;
      case 'art': return <RepImageStudio />;
      case 'video': return <RepCreationStudio />;
      case 'poststudio': return (
        <div className="space-y-8">
          <PostFromSourceGenerator repMode />
          <PortalReplyComposer />
        </div>
      );
      case 'documents': return <PortalDocuments />;
      case 'news': return <NewsFeedPanel />;

      case 'sprint': return <Sprint90View />;
      case 'catalog': return <ServicesPricing />;
      case 'linkedin': return <LinkedInSetupGuide />;
      case 'careers': return <PortalCareersPanel />;
      case 'partnerhub': return <PartnerOnboardingHub onJump={(t) => setTab(t as Tab)} />;
      case 'coach': return <div className="max-w-3xl mx-auto"><SalesCoachChat embedded /></div>;
      case 'company':
        return isPartner ? (
          <div className="space-y-6">
            <ManageRepsPanel scope="partner" />
            <PartnerTimePanel />
            <ForecastCenter isPartner={isPartner} />
            <Card>
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2"><Building2 className="w-5 h-5 text-amber" /> Company Portal</CardTitle>
                <p className="text-sm text-muted-foreground">Ask the AI coach for live company stats. Switch to the <button className="text-amber underline" onClick={() => setTab('coach')}>Sales Coach tab</button>.</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2"><span className="text-amber font-mono">→</span> "Give me a company summary"</li>
                  <li className="flex items-start gap-2"><span className="text-amber font-mono">→</span> "List all reps and their numbers"</li>
                  <li className="flex items-start gap-2"><span className="text-amber font-mono">→</span> "Show recent leads from the last 30 days"</li>
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2"><Search className="w-5 h-5 text-amber" /><CardTitle className="font-display">Chaos Theory Forensics</CardTitle></div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-lg overflow-hidden border border-border/50 bg-card/50">
                  <img src={revenueForensicsBreakdown} alt="Chaos Theory Forensics breakdown" className="w-full h-auto" loading="lazy" />
                </div>
                <div className="rounded-lg border border-amber/30 bg-amber/5 p-4 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                  <div className="flex items-start gap-3 min-w-0">
                    <FileText className="w-5 h-5 text-amber flex-shrink-0 mt-0.5" />
                    <div className="min-w-0"><p className="font-semibold text-foreground">HubSpot Revenue Recovery Protocol</p></div>
                  </div>
                  <Button asChild className="bg-amber text-background hover:bg-amber/90 flex-shrink-0"><a href="/docs/HubSpot_Revenue_Recovery_Protocol.pdf" target="_blank" rel="noopener noreferrer">Open Protocol PDF</a></Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null;
      default: return null;
    }
  };

  const showTopAppBanner = profile.code === '963169' || profile.code === '482917';

  return (
    <div className={`min-h-screen bg-background ${cursorClassName}`}>
      {/* New Portal announcement — dismissible, sticky top */}
      {(() => {
        const [dismissed, setDismissed] = [
          typeof window !== 'undefined' && localStorage.getItem('aetheris.newPortalBannerDismissed') === '1',
          (v: boolean) => { try { localStorage.setItem('aetheris.newPortalBannerDismissed', v ? '1' : '0'); } catch {} },
        ] as const;
        if (dismissed) return null;
        return (
          <div className="w-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-black border-b-2 border-amber-600 shadow-lg">
            <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="w-5 h-5 flex-shrink-0 animate-pulse" />
                <p className="text-sm font-bold truncate">
                  ✨ NEW: Cleaner portal with short how-to's on every tool — your leads carry over automatically.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  asChild
                  size="sm"
                  className="bg-black text-amber-300 hover:bg-black/85 font-mono uppercase tracking-wider text-[11px] font-bold h-8"
                  onClick={() => { try { localStorage.setItem('aetheris.portalStyle', 'new'); } catch {} }}
                >
                  <Link to="/portal/new">
                    Try New Portal <span className="ml-1">→</span>
                  </Link>
                </Button>
                <button
                  type="button"
                  onClick={() => { setDismissed(true); window.location.reload(); }}
                  className="text-black/70 hover:text-black p-1"
                  aria-label="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      {showTopAppBanner && (
        <div className="w-full bg-amber text-background border-b border-amber/60">
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <ArrowDownToLine className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm font-semibold truncate">
                Aetheris App · v{CURRENT_EXTENSION_VERSION} {extensionOutdated ? '— new build ready' : '— installed'}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={downloadChromeExtension}
              className="bg-background text-amber hover:bg-background/90 font-bold h-8"
            >
              <ArrowDownToLine className="w-4 h-4 mr-1.5" />
              Download the App
            </Button>
          </div>
        </div>
      )}
      {/* Header */}
      <header className="border-b border-border/50 bg-card/40 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded bg-amber/20 flex items-center justify-center flex-shrink-0">
              {isPartner ? <Building2 className="w-4 h-4 text-amber" /> : <Shield className="w-4 h-4 text-amber" />}
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber leading-none">
                {isPartner ? 'Partner Portal' : 'Rep Portal'}
              </p>
              <p className="text-foreground font-display font-semibold truncate">
                {profile.rep_name || profile.code}
              </p>
            </div>
            <div className="hidden md:block ml-2 px-2 py-0.5 rounded border border-border/40 bg-background/40">
              <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground leading-none">Code</p>
              <p className="font-mono text-xs text-amber font-bold leading-tight">{profile.code}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="relative hidden md:block">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={tabSearch}
                onChange={(e) => { setTabSearch(e.target.value); setTabSearchOpen(true); }}
                onFocus={() => setTabSearchOpen(true)}
                onBlur={() => setTimeout(() => setTabSearchOpen(false), 150)}
                onKeyDown={(e) => {
                  const results = tabSearch.trim()
                    ? availableTabs.filter(t => t.label.toLowerCase().includes(tabSearch.toLowerCase()))
                    : [];
                  if (e.key === 'Enter' && results[0]) {
                    setTab(results[0].id); setActiveTool(null); setTabSearch(''); setTabSearchOpen(false);
                    if (layout !== 'tabs') setLayout('tabs');
                  }
                  if (e.key === 'Escape') { setTabSearch(''); setTabSearchOpen(false); }
                }}
                placeholder="Search tabs…"
                className="pl-8 pr-8 h-9 w-56"
              />
              {tabSearch && (
                <button
                  onClick={() => { setTabSearch(''); setTabSearchOpen(false); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
              {tabSearchOpen && tabSearch && (() => {
                const results = availableTabs.filter(t => t.label.toLowerCase().includes(tabSearch.toLowerCase()));
                return results.length > 0 ? (
                  <div className="absolute right-0 mt-1 w-64 max-h-80 overflow-y-auto rounded-md border border-border bg-popover shadow-lg z-50">
                    {results.map(t => (
                      <button
                        key={t.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setTabSearch(''); setTabSearchOpen(false);
                          if (t.id === 'workbench') { window.dispatchEvent(new Event('workbench:toggle')); return; }
                          setTab(t.id); setActiveTool(null);
                          if (layout !== 'tabs') setLayout('tabs');
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="absolute right-0 mt-1 w-64 rounded-md border border-border bg-popover shadow-lg z-50 px-3 py-2 text-sm text-muted-foreground">
                    No matching tabs
                  </div>
                );
              })()}
            </div>
            <RepClockWidget compact />
            <Button variant="outline" size="sm" onClick={() => { setTab('sprint'); setActiveTool(null); }} className="gap-1.5 border-amber/40 text-amber hover:bg-amber/10">
              <Rocket className="w-4 h-4" /> <span className="hidden sm:inline">90-Day Sprint</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setTab('coach'); setActiveTool(null); }} className="gap-1.5 hidden sm:inline-flex border-amber/40 text-amber hover:bg-amber/10">
              <MessageSquareCode className="w-4 h-4" /> Coach
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setTab('leads'); setActiveTool(null); }} className="gap-1.5 hidden lg:inline-flex border-amber/40 text-amber hover:bg-amber/10">
              <Users className="w-4 h-4" /> Leads
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={downloadChromeExtension}
              className={
                extensionOutdated
                  ? 'relative border-red-500/70 text-red-400 bg-red-500/10 hover:bg-red-500/20 animate-pulse'
                  : 'relative border-amber/40 text-amber hover:bg-amber/10'
              }
              title={
                extensionOutdated
                  ? `Download Chrome extension v${CURRENT_EXTENSION_VERSION}.`
                  : 'Download Chrome extension again'
              }
            >
              <ArrowDownToLine className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Chrome Extension</span>
              {extensionOutdated && (
                <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 leading-none">
                  Download
                </span>
              )}
            </Button>
            {isPartner && (
              <Button asChild variant="outline" size="sm" className="border-amber/40 text-amber hover:bg-amber/10">
                <Link to="/admin"><Shield className="w-4 h-4 mr-1" /> Admin</Link>
              </Button>
            )}
            <PortalCursorPicker />
            <LanguageToggle />
            <Button
              asChild
              size="sm"
              className="relative bg-amber-400 hover:bg-amber-300 text-black font-mono uppercase tracking-wider text-[11px] font-bold shadow-[0_0_20px_rgba(251,191,36,0.5)] hover:shadow-[0_0_28px_rgba(251,191,36,0.7)] animate-pulse"
              title="Try the new clean portal layout"
              onClick={() => { try { localStorage.setItem('aetheris.portalStyle', 'new'); } catch {} }}
            >
              <Link to="/portal/new">
                <Sparkles className="w-4 h-4 mr-1.5" />
                Try New Portal
                <span className="ml-1.5 text-[9px] bg-black/80 text-amber-300 px-1.5 py-0.5 rounded font-bold">NEW</span>
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
              <LogOut className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">Log out</span>
            </Button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 pb-2"><WhosWorkingBar /></div>
        {/* Tab nav (only in 'tabs' layout), admin-style amber pill buttons */}
        {layout === 'tabs' && (
          <div className="max-w-7xl mx-auto px-4 pb-3 pt-1">
            <div className="flex items-center justify-between gap-2 mb-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={toggleTabsCollapsed}
                className="text-xs text-muted-foreground hover:text-amber gap-1.5"
                title={tabsCollapsed ? 'Show tabs bar' : 'Hide tabs bar for more screen space'}
              >
                {tabsCollapsed
                  ? <><Maximize2 className="w-3.5 h-3.5" /> Show tabs</>
                  : <><Minimize2 className="w-3.5 h-3.5" /> Hide tabs</>}
              </Button>
              {tabsCollapsed && (
                <span className="text-xs font-mono uppercase tracking-wide text-amber/80 truncate">
                  {availableTabs.find(t => t.id === tab)?.label || tab}
                </span>
              )}
            </div>
            {!tabsCollapsed && (
              <div className="flex gap-2 flex-wrap">
                {availableTabs.filter(t => effectiveVisible.includes(t.id)).map((t) => {
                  const active = tab === t.id;
                  const Icon = t.iconCmp;
                  // Braden / partner Sales Coach highlight, glowing amber so it's always front-and-center
                   const isStevenInbox = false;

                   // Braden / partner Sales Coach highlight, glowing amber so it's always front-and-center
                   const isPartnerCoach = t.id === 'coach' && isPartner;
                   const locked = (t as any).locked as boolean | undefined;
                   return (
                     <Button
                       key={t.id}
                       id={`portal-tab-btn-${t.id}`}
                       type="button"
                       disabled={locked}
                       title={locked ? 'Locked — ask your partner to enable this tab for your portal.' : undefined}
                       onClick={() => {
                         if (locked) {
                           sonnerToast('This tab is locked for your portal', { description: 'Ask your partner to enable it when you are ready.' });
                           return;
                         }
                         if (t.href) { window.location.href = t.href; return; }
                         if (t.id === 'workbench') { window.dispatchEvent(new Event('workbench:toggle')); return; }
                         setTab(t.id);
                         setActiveTool(null);
                         logPortalActivity('tab_view', { tab: t.id });
                       }}
                       variant={active ? 'default' : 'outline'}
                       style={(isStevenInbox || isPartnerCoach) ? undefined : tabButtonStyle(tabScale)}
                       className={
                         locked
                           ? 'gap-2 whitespace-nowrap font-medium opacity-40 grayscale cursor-not-allowed border-dashed'
                           : isStevenInbox
                           ? `h-14 px-6 gap-2.5 whitespace-nowrap text-base font-bold uppercase tracking-wide rounded-xl shadow-[0_0_24px_rgba(56,189,248,0.45)] ring-2 ring-sky-400/60 transition-transform hover:scale-[1.03] ${
                               active
                                 ? 'bg-sky-500 text-white hover:bg-sky-500/90 border-sky-400'
                                 : 'bg-sky-500/15 border-sky-400 text-sky-300 hover:bg-sky-500/25 hover:text-sky-200'
                             }`
                           : isPartnerCoach
                           ? `h-14 px-6 gap-2.5 whitespace-nowrap text-base font-bold uppercase tracking-wide rounded-xl shadow-[0_0_28px_rgba(245,158,11,0.55)] ring-2 ring-amber-400/70 animate-pulse transition-transform hover:scale-[1.03] ${
                               active
                                 ? 'bg-amber-500 text-black hover:bg-amber-500/90 border-amber-400'
                                 : 'bg-amber-500/15 border-amber-400 text-amber-300 hover:bg-amber-500/25 hover:text-amber-200'
                             }`
                           : `gap-2 whitespace-nowrap font-medium ${getTabColorClasses(t.id, active, tabColorMode)}`
                       }
                     >
                       {(isStevenInbox || isPartnerCoach)
                         ? <Icon className="w-5 h-5" />
                         : <Icon style={{ width: tabIconSize(tabScale), height: tabIconSize(tabScale) }} />}
                       <span>{isStevenInbox ? "Steven's Inbox" : isPartnerCoach ? 'AI Sales Coach' : t.label}{locked ? ' 🔒' : ''}</span>
                      {t.badge && t.badge > 0 ? (
                        <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-crimson text-white text-[10px] font-bold animate-pulse">
                          {t.badge > 99 ? '99+' : t.badge}
                        </span>
                      ) : null}
                    </Button>
                  );

                })}
              </div>
            )}
          </div>
        )}

      </header>

      <main className={`${(wideMode || WIDE_TABS.has(tab)) ? 'max-w-none w-full' : 'max-w-7xl'} mx-auto px-4 py-6 space-y-6`}>
        {/* Always-on browser dialer */}
        <div className="rounded-xl border border-amber/30 bg-black/40 backdrop-blur-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <PhoneIcon className="w-4 h-4 text-amber" />
            <h2 className="font-mono text-[11px] uppercase tracking-[0.3em] text-amber">Browser Dialer</h2>
          </div>
          <DialerPanel />
        </div>

        <div className={`rounded-lg border px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${extensionOutdated ? 'border-red-500/60 bg-red-500/10' : 'border-amber/30 bg-amber/5'}`}>
          <div className="min-w-0">
            <p className="font-display font-bold text-foreground flex items-center gap-2">
              <ArrowDownToLine className={extensionOutdated ? 'w-4 h-4 text-red-400' : 'w-4 h-4 text-amber'} />
              Chrome Extension · v{CURRENT_EXTENSION_VERSION}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Download the ZIP here, unzip it, open <code className="text-amber">chrome://extensions</code>, enable Developer mode, then Load unpacked.
            </p>
          </div>
          <Button
            type="button"
            onClick={downloadChromeExtension}
            className={extensionOutdated ? 'bg-red-500 hover:bg-red-500/90 text-white shrink-0' : 'bg-amber text-background hover:bg-amber/90 shrink-0'}
          >
            <ArrowDownToLine className="w-4 h-4 mr-2" />
            {extensionOutdated ? 'Download Chrome Extension' : 'Download Again'}
          </Button>
        </div>
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleWideMode}
            className="h-8 gap-1.5 border-amber/40 text-amber hover:bg-amber/10"
            title={wideMode ? 'Switch to standard width' : 'Use the full screen width'}
          >
            {wideMode ? <><Minimize2 className="w-3.5 h-3.5" /> Standard width</> : <><Maximize2 className="w-3.5 h-3.5" /> Wider view</>}
          </Button>
        </div>

        <EasyModeBar tabKey="portal" className="w-full" />

        <OperatorIdentityBar />
        {/* View selector */}
        {(!isPartner || isAdmin) && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <PortalViewSelector
            storageNamespace={ns}
            allTabs={allTabsForSelector}
            visibleTabs={effectiveVisible}
            onChange={setVisibleTabs}
            layout={layout}
            onLayoutChange={setLayout}
            widgetSizes={widgetSizes}
            onWidgetSizeChange={setWidgetSize}
          />
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 border-amber/40 text-amber hover:bg-amber/10"
            onClick={() => {
              const OPTIMIZED_ORDER = ['leads', 'tools', 'coach', 'workspace', 'poststudio', 'art', 'video'];
              const availableIds = new Set(availableTabs.map(t => t.id));
              const order = OPTIMIZED_ORDER.filter(id => availableIds.has(id as Tab));
              setLayout('widgets');
              setVisibleTabs(order);
              persistOrder(order);
              setPinnedWidgetsState([]);
              try { localStorage.setItem(PINNED_KEY, JSON.stringify([])); } catch {}
              const sizeMap: Record<string, WidgetSize> = {
                leads: 2, tools: 2, coach: 2, workspace: 2, poststudio: 2, art: 2, video: 2,
              };
              setWidgetSizesState(prev => {
                const next = { ...prev };
                order.forEach(id => { next[id] = (sizeMap[id] || 2) as WidgetSize; });
                try { localStorage.setItem(SIZES_KEY, JSON.stringify(next)); } catch {}
                return next;
              });
              toast({ title: 'Optimized mode on', description: 'Half-width widgets side-by-side. Saved automatically.' });
            }}
            title="One-click optimized rep layout"
          >
            <Zap className="w-3.5 h-3.5" /> Optimized
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => {
              const allIds = availableTabs.map(t => t.id as string);
              setLayout('tabs');
              setVisibleTabs(allIds);
              persistOrder(allIds);
              toast({ title: 'Showing all tabs', description: `${allIds.length} tabs restored to full view.` });
            }}
            title="Reset to show every available tab"
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Show All
          </Button>
          <TabColorToggle />
          <TabSizeSlider />

          <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
            {effectiveVisible.length} / {availableTabs.length} · {layout === 'widgets' ? 'Widget board · drag headers to reorder · ☆ to pin · 1/4-4/4 to resize' : 'Tab view'}
          </span>
        </div>
        )}

        {layout === 'tabs' ? (
          <EasyModeWrapper tabKey={tab} showBar={false}>
            {isPartner && <PartnerCoachTips tabId={tab} />}
            {renderTabBody(tab)}
          </EasyModeWrapper>
        ) : (() => {
          const visibleWidgets = availableTabs.filter(t => effectiveVisible.includes(t.id));
          // Sort: pinned first (in pin-toggle order), then by saved order, then by default order.
          const orderIndex = (id: string) => {
            const i = widgetOrder.indexOf(id);
            return i === -1 ? 999 : i;
          };
          const sorted = visibleWidgets.slice().sort((a, b) => {
            const ap = pinnedWidgets.includes(a.id) ? 0 : 1;
            const bp = pinnedWidgets.includes(b.id) ? 0 : 1;
            if (ap !== bp) return ap - bp;
            return orderIndex(a.id) - orderIndex(b.id);
          });
          sortedWidgetsRef.current = sorted.map(s => s.id);
          return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {sorted.map((t) => {
              const size = widgetSizes[t.id] || 2;
              const colSpan =
                size === 1 ? 'lg:col-span-1 md:col-span-1'
                : size === 2 ? 'lg:col-span-2 md:col-span-2'
                : size === 3 ? 'lg:col-span-3 md:col-span-2'
                : 'lg:col-span-4 md:col-span-2';
              const Icon = t.iconCmp;
              const isPinned = pinnedWidgets.includes(t.id);
              const isDragging = dragId === t.id;
              return (
                <div
                  key={t.id}
                  draggable={!isPinned}
                  onDragStart={(e) => {
                    if (isPinned) { e.preventDefault(); return; }
                    setDragId(t.id);
                    e.dataTransfer.effectAllowed = 'move';
                    try { e.dataTransfer.setData('text/plain', t.id); } catch {}
                  }}
                  onDragEnd={() => setDragId(null)}
                  onDragOver={(e) => { if (dragId && dragId !== t.id) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const src = dragId || e.dataTransfer.getData('text/plain');
                    if (src) reorderWidgets(src, t.id);
                    setDragId(null);
                  }}
                  className={`${colSpan} glass rounded-xl border overflow-hidden flex flex-col transition-all ${
                    isDragging ? 'opacity-40 scale-[0.98]' : ''
                  } ${isPinned ? 'border-amber/60 ring-1 ring-amber/30' : 'border-border'}`}
                >
                  <div className={`flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-secondary/30 ${isPinned ? '' : 'cursor-grab active:cursor-grabbing'}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className="w-4 h-4 text-amber shrink-0" />
                      <span className="font-display font-bold text-sm text-foreground truncate">{t.label}</span>
                      {t.badge && t.badge > 0 ? (
                        <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-crimson text-white text-[10px] font-bold">
                          {t.badge > 99 ? '99+' : t.badge}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1">
                      {([1, 2, 3, 4] as const).map(s => (
                        <button
                          key={s}
                          onClick={() => setWidgetSize(t.id, s)}
                          className={`px-1.5 py-0.5 text-[10px] font-mono rounded border transition ${
                            size === s
                              ? 'bg-amber text-background border-amber'
                              : 'border-border text-muted-foreground hover:text-amber hover:border-amber/50'
                          }`}
                          title={`Resize to ${s}/4`}
                        >{s}/4</button>
                      ))}
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-6 w-6 ${isPinned ? 'text-amber' : ''}`}
                        title={isPinned ? 'Unpin (allow drag)' : 'Pin to top'}
                        onClick={() => togglePinned(t.id)}
                      >
                        <span className="text-xs">{isPinned ? '★' : '☆'}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        title="Open full"
                        onClick={() => { setLayout('tabs'); setTab(t.id); }}
                      >
                        <Maximize2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="p-3 max-h-[600px] overflow-y-auto">
                    <EasyModeWrapper tabKey={t.id} showBar={false}>
                      {isPartner && <PartnerCoachTips tabId={t.id} />}
                      {renderTabBody(t.id)}
                    </EasyModeWrapper>
                  </div>
                </div>
              );
            })}
          </div>
          );
        })()}

      </main>

      {/* Global floating Operator dock — live on every portal page/tab */}
      <SalesCoachChat />
      <OutlookMailDrawer />
    </div>

  );
};

export default PortalPage;
