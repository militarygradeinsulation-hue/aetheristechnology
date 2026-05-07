import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, LogOut, Eye, EyeOff, Users, FileText, Lightbulb, ArrowLeft, Loader2, TrendingUp, BarChart3, Wrench, Megaphone, Phone, Calendar, Mail, Brain, AlertTriangle, ScanText, ChevronLeft, BookOpen, Library, Sparkles, Database, Send, Clock, Trash2, Search, X, Handshake, Image as ImageIcon, FileBox, Inbox, FlaskConical, MessageSquare, Newspaper, GraduationCap, CalendarDays, CalendarClock, BookMarked, DollarSign, Building2, Zap, Briefcase, ArrowDownToLine, Activity, BarChart, LayoutGrid, Maximize2, Minimize2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { SocialContentGenerator } from '@/components/SocialContentGenerator';
import { SalesScriptGenerator } from '@/components/SalesScriptGenerator';
import { ContentCalendarGenerator } from '@/components/ContentCalendarGenerator';
import { FollowUpPlanGenerator } from '@/components/FollowUpPlanGenerator';
import { StrategicQuestionEngine } from '@/components/StrategicQuestionEngine';
import { BrandContradictionFinder } from '@/components/BrandContradictionFinder';
import { FrictionVocabularyAudit } from '@/components/FrictionVocabularyAudit';
import { PlaybookCreator } from '@/components/PlaybookCreator';
import { AllInOneGenerator } from '@/components/AllInOneGenerator';
import { AdminLibrary } from '@/components/AdminLibrary';
import { ContentCalendar, type ViewMode } from '@/components/admin/ContentCalendar';
import { ContentEngine } from '@/components/admin/ContentEngine';
import { AdminCrm } from '@/components/crm/AdminCrm';
import { CampaignControlCenter } from '@/components/admin/CampaignControlCenter';
import { SEOOptimizer } from '@/components/admin/SEOOptimizer';
import { getAdminToken, hasValidAdminToken, clearAdminToken } from '@/lib/adminAuth';
import { AdminAssistant } from '@/components/admin/AdminAssistant';
import { CommissionStructurePanel } from '@/components/admin/CommissionStructurePanel';
import { LeadPipelinePanel } from '@/components/admin/LeadPipelinePanel';
import { AdminLeadBrowser } from '@/components/admin/AdminLeadBrowser';
import { AdminCareersTest } from '@/components/admin/AdminCareersTest';
import { RepActivityPanel } from '@/components/admin/RepActivityPanel';
import { ForecastSettingsPanel } from '@/components/admin/ForecastSettingsPanel';
import { CompanyPortalPreview } from '@/components/admin/CompanyPortalPreview';
import ManageRepsPanel from '@/components/admin/ManageRepsPanel';
import { RepPlaybookPanel } from '@/components/admin/RepPlaybookPanel';
import { AdminTrainingPanel } from '@/components/admin/AdminTrainingPanel';
import { AdminRepCalendarPanel } from '@/components/admin/AdminRepCalendarPanel';
import SalesCrmPanel from '@/components/admin/SalesCrmPanel';

import TeamMessageBoard from '@/components/team/TeamMessageBoard';
import AdminNewsPanel from '@/components/admin/AdminNewsPanel';
import { AdminForensicsSystemsPanel } from '@/components/admin/AdminForensicsSystemsPanel';
import SharedWorkspace from '@/components/admin/SharedWorkspace';
import NotificationBell from '@/components/admin/NotificationBell';
import CustomViewSelector from '@/components/admin/CustomViewSelector';
import { AdminImageStudio } from '@/components/admin/AdminImageStudio';
import { AdminDocumentsPanel } from '@/components/admin/AdminDocumentsPanel';
import { AdminCompanyCalendarPanel } from '@/components/admin/AdminCompanyCalendarPanel';

type ToolKey = 'allinone' | 'social' | 'sales' | 'calendar' | 'followup' | 'questions' | 'brand' | 'friction' | 'playbook';
type EventsSubTab = 'campaign' | 'site';

const ADMIN_TOOLS: { key: ToolKey; label: string; description: string; icon: React.ElementType; featured?: boolean }[] = [
  { key: 'allinone', label: 'All-In-One: Run Every Tool', description: 'Drop in a website URL and run every tool at once. Each result auto-saves to your library.', icon: Sparkles, featured: true },
  { key: 'social', label: 'Social Content Generator', description: 'LinkedIn, Facebook, and ad hooks scraped from any URL.', icon: Megaphone },
  { key: 'sales', label: 'Sales Script Generator', description: 'Call scripts, objection handlers, follow-up templates.', icon: Phone },
  { key: 'calendar', label: '30-Day Content Calendar', description: '30 days of platform-specific posts with hooks and timing.', icon: Calendar },
  { key: 'followup', label: 'Follow-Up System Plan', description: '14-day multi-channel cadence with templates.', icon: Mail },
  { key: 'questions', label: 'Strategic Question Engine', description: 'Critical questions across 8 business categories.', icon: Brain },
  { key: 'brand', label: 'Brand Contradiction Finder', description: 'Find gaps between brand promise and execution.', icon: AlertTriangle },
  { key: 'friction', label: 'Friction Vocabulary Audit', description: 'Flag weak copy, suggest stronger replacements.', icon: ScanText },
  { key: 'playbook', label: 'Playbook Creator', description: 'Generate a 4–5k word strategic playbook PDF saved to your library.', icon: BookOpen },
];

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  message: string;
  service_interest: string | null;
  is_read: boolean;
  created_at: string;
}

interface SiteEvent {
  id: string;
  event_type: string;
  event_data: Record<string, unknown>;
  session_id: string;
  created_at: string;
}

function RepPerformancePanel() {
  const [repCodes, setRepCodes] = useState<{ id: string; code: string; rep_name: string; rep_email: string | null; commission_rate: number; is_active: boolean; total_sales_cents: number; total_commission_cents: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('rep_codes').select('*').order('total_sales_cents', { ascending: false }).then(({ data }) => {
      if (data) setRepCodes(data as any);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="glass p-6 rounded-xl text-center text-muted-foreground">Loading rep data…</div>;
  if (repCodes.length === 0) return null;

  const fmt = (cents: number) => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  return (
    <div className="glass p-6 rounded-xl">
      <h3 className="text-lg font-bold text-foreground font-display mb-4 flex items-center gap-2">
        <Users className="w-5 h-5 text-amber" /> Rep Performance
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="pb-2 pr-4">Code</th>
              <th className="pb-2 pr-4">Rep</th>
              <th className="pb-2 pr-4">Rate</th>
              <th className="pb-2 pr-4">Total Sales</th>
              <th className="pb-2 pr-4">Commission Owed</th>
              <th className="pb-2">Active</th>
            </tr>
          </thead>
          <tbody>
            {repCodes.map(r => (
              <tr key={r.id} className="border-b border-border/50">
                <td className="py-2 pr-4 font-mono text-amber">{r.code}</td>
                <td className="py-2 pr-4 text-foreground">{r.rep_name || '—'}</td>
                <td className="py-2 pr-4 text-muted-foreground">{(r.commission_rate * 100).toFixed(0)}%</td>
                <td className="py-2 pr-4 text-foreground font-medium">{fmt(r.total_sales_cents)}</td>
                <td className="py-2 pr-4 text-amber font-medium">{fmt(r.total_commission_cents)}</td>
                <td className="py-2">{r.is_active ? '✅' : '❌'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [events, setEvents] = useState<SiteEvent[]>([]);
  const [stats, setStats] = useState({ visitors: 0, pageViews: 0, linkedInClicks: 0, formSubmissions: 0 });
  const [activeTab, setActiveTab] = useState<'overview' | 'submissions' | 'events' | 'insights' | 'tools' | 'library' | 'crm' | 'sales' | 'seo' | 'outlook' | 'engine' | 'commissions' | 'forecast' | 'portal' | 'playbook' | 'team' | 'training' | 'calendars' | 'companycal' | 'news' | 'systems' | 'workspace' | 'imagestudio' | 'documents'>('workspace');
  const ALL_TAB_DEFS: { key: string; label: string; icon: React.ElementType }[] = [
    { key: 'workspace', label: 'Workspace', icon: Handshake },
    { key: 'insights', label: 'AI Insights', icon: Brain },
    { key: 'sales', label: 'Sales & Customers', icon: DollarSign },
    { key: 'events', label: 'Campaign', icon: Megaphone },
    { key: 'commissions', label: 'Commissions', icon: BarChart },
    { key: 'portal', label: 'Company Portal', icon: Building2 },
    { key: 'engine', label: 'Content Engine', icon: Zap },
    { key: 'crm', label: 'CRM', icon: Briefcase },
    { key: 'forecast', label: 'Forecast', icon: TrendingUp },
    { key: 'submissions', label: 'Leads', icon: Inbox },
    { key: 'library', label: 'Library', icon: Library },
    { key: 'tools', label: 'Tools', icon: Wrench },
    { key: 'systems', label: 'Forensics', icon: FlaskConical },
    { key: 'imagestudio', label: 'Image Studio', icon: ImageIcon },
    { key: 'documents', label: 'Documents', icon: FileBox },
    { key: 'outlook', label: 'Outlook Sync', icon: Send },
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'playbook', label: 'Rep Playbook', icon: BookMarked },
    { key: 'training', label: 'Training', icon: GraduationCap },
    { key: 'calendars', label: 'Rep Calendars', icon: CalendarDays },
    { key: 'companycal', label: 'Company Calendar', icon: CalendarClock },
    { key: 'seo', label: 'SEO/AEO', icon: Sparkles },
    { key: 'team', label: 'Team Messages', icon: MessageSquare },
    { key: 'news', label: 'News', icon: Newspaper },
  ];
  const VISIBLE_TABS_KEY = 'admin.visibleTabs.v1';
  const [visibleTabs, setVisibleTabsState] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(VISIBLE_TABS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return ALL_TAB_DEFS.map(t => t.key);
  });
  const setVisibleTabs = useCallback((tabs: string[]) => {
    setVisibleTabsState(tabs);
    try { localStorage.setItem(VISIBLE_TABS_KEY, JSON.stringify(tabs)); } catch {}
  }, []);
  // Layout: 'tabs' = classic tab switcher, 'widgets' = all visible tabs as resizable cards on one page
  const LAYOUT_KEY = 'admin.layout.v1';
  const SIZES_KEY = 'admin.widgetSizes.v1';
  const [layout, setLayoutState] = useState<'tabs' | 'widgets'>(() => {
    try { return (localStorage.getItem(LAYOUT_KEY) as 'tabs' | 'widgets') || 'tabs'; } catch { return 'tabs'; }
  });
  const setLayout = useCallback((l: 'tabs' | 'widgets') => {
    setLayoutState(l);
    try { localStorage.setItem(LAYOUT_KEY, l); } catch {}
  }, []);
  const [widgetSizes, setWidgetSizesState] = useState<Record<string, 1 | 2 | 3 | 4>>(() => {
    try { return JSON.parse(localStorage.getItem(SIZES_KEY) || '{}'); } catch { return {}; }
  });
  const setWidgetSize = useCallback((key: string, size: 1 | 2 | 3 | 4) => {
    setWidgetSizesState(prev => {
      const next = { ...prev, [key]: size };
      try { localStorage.setItem(SIZES_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [tabSearch, setTabSearch] = useState('');
  const [tabSearchOpen, setTabSearchOpen] = useState(false);
  const tabSearchResults = tabSearch.trim()
    ? ALL_TAB_DEFS.filter(t => t.label.toLowerCase().includes(tabSearch.toLowerCase()))
    : [];
  const jumpToTab = (key: string) => {
    if (!visibleTabs.includes(key)) setVisibleTabs([...visibleTabs, key]);
    setActiveTab(key as typeof activeTab);
    setTabSearch('');
    setTabSearchOpen(false);
    if (key === 'insights' && !recommendations) fetchInsights();
    if (key === 'outlook' && postingSchedule.length === 0) fetchSchedule();
    if (key !== 'tools') setActiveTool(null);
  };
  const [syncingOutlook, setSyncingOutlook] = useState(false);
  const [syncResults, setSyncResults] = useState<{ type: string; title: string; status: string }[] | null>(null);
  const [postingSchedule, setPostingSchedule] = useState<{ id: string; day_of_week: number; day_name: string; content_type: string; strategic_goal: string; post_time: string; notes: string | null }[]>([]);
  const [activeTool, setActiveTool] = useState<ToolKey | null>(null);
  const [eventFilter, setEventFilter] = useState('');
  const [eventsSubTab, setEventsSubTab] = useState<EventsSubTab>('campaign');
  const [recommendations, setRecommendations] = useState('');
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [topPages, setTopPages] = useState<{ page: string; views: number }[]>([]);
  const [eventBreakdown, setEventBreakdown] = useState<{ type: string; count: number }[]>([]);
  const [libraryViewMode, setLibraryViewMode] = useState<ViewMode>('calendar');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = getAdminToken();
      if (!token) { navigate('/admin/login', { replace: true }); return; }

      const { data, error } = await supabase.functions.invoke('admin-data', {
        body: { action: 'dashboard' },
        headers: { 'x-admin-token': token },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const subs = (data?.submissions || []) as ContactSubmission[];
      const evts = (data?.events || []) as SiteEvent[];

      setSubmissions(subs);
      setEvents(evts);

      const uniqueSessions = new Set(evts.map(e => e.session_id)).size;
      const pageViews = evts.filter(e => e.event_type === 'page_view').length;
      const linkedInClicks = evts.filter(e => e.event_type === 'linkedin_click').length;

      setStats({ visitors: uniqueSessions, pageViews, linkedInClicks, formSubmissions: subs.length });

      // Compute top pages
      const pageCounts: Record<string, number> = {};
      evts.filter(e => e.event_type === 'page_view').forEach(e => {
        const page = (e.event_data as any)?.page || 'unknown';
        pageCounts[page] = (pageCounts[page] || 0) + 1;
      });
      const sorted = Object.entries(pageCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([page, views]) => ({ page, views }));
      setTopPages(sorted);

      // Event breakdown
      const typeCounts: Record<string, number> = {};
      evts.forEach(e => { typeCounts[e.event_type] = (typeCounts[e.event_type] || 0) + 1; });
      setEventBreakdown(Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).map(([type, count]) => ({ type, count })));
    } catch {
      toast({ title: 'Failed to load data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast, navigate]);

  // Synchronous PIN-token gate. Renders dashboard immediately and loads data in the background.
  useEffect(() => {
    if (!hasValidAdminToken()) {
      navigate('/admin/login', { replace: true });
      return;
    }
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [navigate, fetchData]);

  const toggleRead = async (id: string, current: boolean) => {
    const token = getAdminToken();
    if (!token) return;
    await supabase.functions.invoke('admin-data', {
      body: { action: 'toggle_read', id, is_read: !current },
      headers: { 'x-admin-token': token },
    });
    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, is_read: !current } : s));
  };

  const deleteSubmission = async (id: string) => {
    if (!confirm('Delete this submission? This cannot be undone.')) return;
    const token = getAdminToken();
    if (!token) return;
    const { data, error } = await supabase.functions.invoke('admin-data', {
      body: { action: 'delete_submission', id },
      headers: { 'x-admin-token': token },
    });
    if (error || (data as any)?.error) {
      toast({ title: 'Delete failed', description: error?.message || (data as any)?.error || 'Unknown error', variant: 'destructive' });
      return;
    }
    setSubmissions(prev => prev.filter(s => s.id !== id));
    toast({ title: 'Submission deleted' });
  };

  const handleLogout = async () => {
    clearAdminToken();
    try { await supabase.auth.signOut(); } catch { /* ignore */ }
    navigate('/admin/login', { replace: true });
  };

  const fetchInsights = async () => {
    setLoadingInsights(true);
    try {
      const token = getAdminToken();
      if (!token) { navigate('/admin/login', { replace: true }); return; }
      const { data, error } = await supabase.functions.invoke('admin-insights', {
        body: {},
        headers: { 'x-admin-token': token },
      });
      if (error) throw error;
      if (data?.error) {
        toast({ title: 'AI Error', description: data.error, variant: 'destructive' });
      } else {
        setRecommendations(data.recommendations);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast({ title: 'Failed to get insights', description: msg, variant: 'destructive' });
    } finally {
      setLoadingInsights(false);
    }
  };

  const fetchSchedule = async () => {
    const { data } = await supabase
      .from('content_posting_schedule')
      .select('*')
      .order('day_of_week');
    if (data) setPostingSchedule(data as any);
  };

  const handleOutlookSync = async () => {
    setSyncingOutlook(true);
    setSyncResults(null);
    try {
      const token = getAdminToken();
      if (!token) { navigate('/admin/login', { replace: true }); return; }
      const { data, error } = await supabase.functions.invoke('sync-content-to-outlook', {
        headers: { 'x-admin-token': token },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSyncResults(data.results || []);
      toast({ title: 'Sync Complete', description: data.message });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast({ title: 'Sync Failed', description: msg, variant: 'destructive' });
    } finally {
      setSyncingOutlook(false);
    }
  };

  const filteredEvents = eventFilter
    ? events.filter(e => e.event_type.includes(eventFilter))
    : events;

  const statCards = [
    { label: 'Unique Visitors', value: stats.visitors, icon: Users, color: 'text-amber' },
    { label: 'Page Views', value: stats.pageViews, icon: Eye, color: 'text-amber' },
    
    { label: 'Form Submissions', value: stats.formSubmissions, icon: FileText, color: 'text-amber' },
  ];

  const conversionRate = stats.visitors > 0 ? ((stats.formSubmissions / stats.visitors) * 100).toFixed(1) : '0';

  // Lazy fetchers when a tab/widget becomes visible
  const ensureTabData = useCallback((key: string) => {
    if (key === 'insights' && !recommendations) fetchInsights();
    if (key === 'outlook' && postingSchedule.length === 0) fetchSchedule();
  }, [recommendations, postingSchedule.length, fetchInsights, fetchSchedule]);

  // Render the body for a single tab key (used by both tabs and widgets layouts)
  const renderTabBody = (key: string): React.ReactNode => {
    switch (key) {
      case 'workspace': return <SharedWorkspace me="admin" onUnreadChange={setUnreadNotifs} />;
      case 'imagestudio': return <AdminImageStudio />;
      case 'documents': return <AdminDocumentsPanel />;
      case 'systems': return <AdminForensicsSystemsPanel />;
      case 'library': return <ContentCalendar viewMode={libraryViewMode} onViewModeChange={setLibraryViewMode} />;
      case 'engine': return <ContentEngine />;
      case 'crm': return <AdminCrm />;
      case 'commissions': return <CommissionStructurePanel />;
      case 'forecast': return <ForecastSettingsPanel />;
      case 'portal': return <CompanyPortalPreview />;
      case 'playbook': return <RepPlaybookPanel />;
      case 'training': return <AdminTrainingPanel />;
      case 'calendars': return <AdminRepCalendarPanel />;
      case 'companycal': return <AdminCompanyCalendarPanel />;
      case 'sales': return <SalesCrmPanel />;
      case 'team': return <TeamMessageBoard isAdmin authorName="Admin" />;
      case 'news': return <AdminNewsPanel />;
      case 'seo': return <SEOOptimizer />;
      case 'overview': return <OverviewBody statCards={statCards} conversionRate={conversionRate} topPages={topPages} eventBreakdown={eventBreakdown} />;
      case 'submissions': return <SubmissionsBody submissions={submissions} toggleRead={toggleRead} deleteSubmission={deleteSubmission} />;
      case 'events': return <EventsBody eventsSubTab={eventsSubTab} setEventsSubTab={setEventsSubTab} eventFilter={eventFilter} setEventFilter={setEventFilter} filteredEvents={filteredEvents} />;
      case 'insights': return <InsightsBody recommendations={recommendations} loadingInsights={loadingInsights} fetchInsights={fetchInsights} />;
      case 'tools': return <ToolsBody activeTool={activeTool} setActiveTool={setActiveTool} />;
      case 'outlook': return <OutlookBody syncingOutlook={syncingOutlook} syncResults={syncResults} postingSchedule={postingSchedule} handleOutlookSync={handleOutlookSync} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="icon" title="Back to site">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-foreground font-display">Aetheris Admin</h1>
            <span className="text-xs text-muted-foreground hidden sm:inline">Auto-refreshes every 30s</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative hidden md:block">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={tabSearch}
                onChange={(e) => { setTabSearch(e.target.value); setTabSearchOpen(true); }}
                onFocus={() => setTabSearchOpen(true)}
                onBlur={() => setTimeout(() => setTabSearchOpen(false), 150)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && tabSearchResults[0]) jumpToTab(tabSearchResults[0].key);
                  if (e.key === 'Escape') { setTabSearch(''); setTabSearchOpen(false); }
                }}
                placeholder="Search tabs…"
                className="pl-8 pr-8 h-9 w-64"
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
              {tabSearchOpen && tabSearchResults.length > 0 && (
                <div className="absolute right-0 mt-1 w-72 max-h-80 overflow-y-auto rounded-md border border-border bg-popover shadow-lg z-50">
                  {tabSearchResults.map(t => (
                    <button
                      key={t.key}
                      onMouseDown={(e) => { e.preventDefault(); jumpToTab(t.key); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
              {tabSearchOpen && tabSearch && tabSearchResults.length === 0 && (
                <div className="absolute right-0 mt-1 w-72 rounded-md border border-border bg-popover shadow-lg z-50 px-3 py-2 text-sm text-muted-foreground">
                  No matching tabs
                </div>
              )}
            </div>
            <NotificationBell me="admin" onCountChange={setUnreadNotifs} />
            <Link to="/app/dashboard">
              <Button variant="outline" size="sm" title="Open HubSpot revenue recovery dashboard">
                <Database className="w-4 h-4 mr-1 text-primary" /> HubSpot Hub
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-1" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* View selector + Tabs */}
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <CustomViewSelector
            allTabs={ALL_TAB_DEFS}
            visibleTabs={visibleTabs}
            onChange={setVisibleTabs}
            layout={layout}
            onLayoutChange={setLayout}
            widgetSizes={widgetSizes}
            onWidgetSizeChange={setWidgetSize}
          />
          <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
            {visibleTabs.length} / {ALL_TAB_DEFS.length} · {layout === 'widgets' ? 'Widget board' : 'Tab view'}
          </span>
        </div>

        {layout === 'tabs' ? (
          <>
            <div className="flex gap-1.5 mb-8 flex-wrap">
              {ALL_TAB_DEFS.filter(t => visibleTabs.includes(t.key)).map(({ key: tab, label, icon: Icon }) => {
                const active = activeTab === tab;
                return (
                  <Button
                    key={tab}
                    variant={active ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setActiveTab(tab as typeof activeTab);
                      ensureTabData(tab);
                      if (tab !== 'tools') setActiveTool(null);
                    }}
                    className={`h-8 ${active ? 'bg-amber text-background hover:bg-amber/90 border-amber' : 'border-border hover:border-amber/50 hover:text-amber'}`}
                  >
                    <Icon className="w-3.5 h-3.5 mr-1.5" />
                    <span className="text-xs font-medium">{label}</span>
                  </Button>
                );
              })}
            </div>

            {renderTabBody(activeTab)}
          </>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {ALL_TAB_DEFS.filter(t => visibleTabs.includes(t.key)).map(({ key: tab, label, icon: Icon }) => {
              const size = widgetSizes[tab] || 2;
              const colSpan =
                size === 1 ? 'lg:col-span-1 md:col-span-1'
                : size === 2 ? 'lg:col-span-2 md:col-span-2'
                : size === 3 ? 'lg:col-span-3 md:col-span-2'
                : 'lg:col-span-4 md:col-span-2';
              return (
                <div
                  key={tab}
                  className={`${colSpan} glass rounded-xl border border-border overflow-hidden flex flex-col`}
                >
                  <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-secondary/30">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className="w-4 h-4 text-amber shrink-0" />
                      <span className="font-display font-bold text-sm text-foreground truncate">{label}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {([1, 2, 3, 4] as const).map(s => (
                        <button
                          key={s}
                          onClick={() => setWidgetSize(tab, s)}
                          className={`px-1.5 py-0.5 text-[10px] font-mono rounded border transition ${
                            size === s
                              ? 'bg-amber text-background border-amber'
                              : 'border-border text-muted-foreground hover:text-amber hover:border-amber/50'
                          }`}
                          title={`Resize to ${s}/4 width`}
                        >
                          {s}/4
                        </button>
                      ))}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        title="Open full"
                        onClick={() => { setLayout('tabs'); setActiveTab(tab as typeof activeTab); ensureTabData(tab); }}
                      >
                        <Maximize2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="p-3 max-h-[600px] overflow-y-auto">
                    {renderTabBody(tab)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <AdminAssistant />
    </div>
  );
};

export default AdminDashboard;
