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
          <CustomViewSelector allTabs={ALL_TAB_DEFS} visibleTabs={visibleTabs} onChange={setVisibleTabs} />
          <span className="text-xs text-muted-foreground">{visibleTabs.length} of {ALL_TAB_DEFS.length} tabs shown</span>
        </div>
        <div className="flex gap-2 mb-8 flex-wrap">
          {ALL_TAB_DEFS.filter(t => visibleTabs.includes(t.key)).map(({ key: tab, label }) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab as typeof activeTab);
                if (tab === 'insights' && !recommendations) fetchInsights();
                if (tab === 'outlook' && postingSchedule.length === 0) fetchSchedule();
                if (tab !== 'tools') setActiveTool(null);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab ? 'bg-primary text-primary-foreground' : 'glass text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'workspace' && <SharedWorkspace me="admin" onUnreadChange={setUnreadNotifs} />}
        {activeTab === 'imagestudio' && <AdminImageStudio />}
        {activeTab === 'documents' && <AdminDocumentsPanel />}

        {/* Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {statCards.map(card => (
                <div key={card.label} className="glass p-6 rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <card.icon className={`w-5 h-5 ${card.color}`} />
                    <span className="text-sm text-muted-foreground">{card.label}</span>
                  </div>
                  <div className="text-4xl font-bold text-foreground font-display">{card.value}</div>
                </div>
              ))}
              <div className="glass p-6 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <TrendingUp className="w-5 h-5 text-amber" />
                  <span className="text-sm text-muted-foreground">Conversion Rate</span>
                </div>
                <div className="text-4xl font-bold text-foreground font-display">{conversionRate}%</div>
              </div>
            </div>

            {/* Top Pages */}
            {topPages.length > 0 && (
              <div className="glass p-6 rounded-xl">
                <h3 className="text-lg font-bold text-foreground font-display mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-amber" /> Top Pages
                </h3>
                <div className="space-y-2">
                  {topPages.map(p => (
                    <div key={p.page} className="flex items-center justify-between text-sm">
                      <span className="text-foreground font-mono">{p.page}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber rounded-full"
                            style={{ width: `${Math.min(100, (p.views / (topPages[0]?.views || 1)) * 100)}%` }}
                          />
                        </div>
                        <span className="text-muted-foreground w-12 text-right">{p.views}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Event Breakdown */}
            {eventBreakdown.length > 0 && (
              <div className="glass p-6 rounded-xl">
                <h3 className="text-lg font-bold text-foreground font-display mb-4">Event Breakdown</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {eventBreakdown.map(e => (
                    <div key={e.type} className="bg-secondary/50 p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold text-foreground font-display">{e.count}</div>
                      <div className="text-xs text-muted-foreground font-mono mt-1">{e.type}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Manage Reps (codes hidden by default) */}
            <ManageRepsPanel scope="admin" />

            {/* Rep Performance (read-only sales totals) */}
            <RepPerformancePanel />

            {/* Lead Scraper → Rep Pool */}
            <LeadPipelinePanel />

            {/* Lead Browser: scan + assign to rep */}
            <AdminLeadBrowser />

            {/* Careers Test reviewer */}
            <AdminCareersTest />

            {/* Rep Activity (logins / claims / touches) */}
            <RepActivityPanel />
          </div>
        )}

        {/* Submissions */}
        {activeTab === 'submissions' && (
          <div className="space-y-6">
            {/* Full lead list with scan + assign */}
            <AdminLeadBrowser />

            <div className="space-y-4">
            <h3 className="font-display text-lg text-foreground">Form Submissions</h3>
            {submissions.length === 0 ? (
              <div className="glass p-12 rounded-xl text-center text-muted-foreground">No submissions yet.</div>
            ) : (
              submissions.map(sub => (
                <div key={sub.id} className={`glass p-6 rounded-xl border-l-4 ${sub.is_read ? 'border-l-border' : 'border-l-amber'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap mb-2">
                        <span className="font-bold text-foreground">{sub.name}</span>
                        {sub.company && <span className="text-sm text-muted-foreground">@ {sub.company}</span>}
                        {!sub.is_read && <span className="text-xs bg-amber/20 text-amber px-2 py-0.5 rounded-full font-semibold">NEW</span>}
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-3">
                        <a href={`mailto:${sub.email}`} className="hover:text-amber">{sub.email}</a>
                        {sub.phone && <a href={`tel:${sub.phone}`} className="hover:text-amber">{sub.phone}</a>}
                        {sub.service_interest && <span className="text-amber/80">{sub.service_interest}</span>}
                      </div>
                      <p className="text-foreground text-sm whitespace-pre-wrap">{sub.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">{new Date(sub.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => toggleRead(sub.id, sub.is_read)} title={sub.is_read ? 'Mark unread' : 'Mark read'}>
                        {sub.is_read ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteSubmission(sub.id)} title="Delete submission">
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
            </div>
          </div>
        )}

        {/* Events / Campaign */}
        {activeTab === 'events' && (
          <div>
            <div className="flex gap-2 mb-6">
              {(['campaign', 'site'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setEventsSubTab(t)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    eventsSubTab === t ? 'bg-primary text-primary-foreground' : 'glass text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t === 'campaign' ? '📨 Powerhouse' : '🌐 Site Activity'}
                </button>
              ))}
            </div>

            {eventsSubTab === 'campaign' && <CampaignControlCenter />}

            {eventsSubTab === 'site' && (
              <div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {['', 'page_view', 'linkedin_click', 'click', 'contact_form_submit'].map(f => (
                    <button
                      key={f}
                      onClick={() => setEventFilter(f)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        eventFilter === f ? 'bg-primary text-primary-foreground' : 'glass text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {f || 'All'}
                    </button>
                  ))}
                </div>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {filteredEvents.length === 0 ? (
                    <div className="glass p-12 rounded-xl text-center text-muted-foreground">No events yet.</div>
                  ) : (
                    filteredEvents.map(evt => (
                      <div key={evt.id} className="glass px-4 py-3 rounded-lg flex items-center gap-4 text-sm">
                        <span className={`px-2 py-0.5 rounded text-xs font-mono ${
                          evt.event_type === 'linkedin_click' ? 'bg-blue-500/20 text-blue-400' :
                          evt.event_type === 'page_view' ? 'bg-green-500/20 text-green-400' :
                          evt.event_type === 'contact_form_submit' ? 'bg-amber/20 text-amber' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {evt.event_type}
                        </span>
                        <span className="text-muted-foreground flex-1 truncate">
                          {JSON.stringify(evt.event_data)}
                        </span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(evt.created_at).toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI Insights */}
        {activeTab === 'insights' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground font-display flex items-center gap-2">
                <Lightbulb className="w-6 h-6 text-amber" /> AI Growth Recommendations
              </h2>
              <Button onClick={fetchInsights} disabled={loadingInsights} variant="outline" size="sm">
                {loadingInsights ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                Refresh Insights
              </Button>
            </div>

            {loadingInsights ? (
              <div className="glass p-12 rounded-xl text-center">
                <Loader2 className="w-8 h-8 animate-spin text-amber mx-auto mb-4" />
                <p className="text-muted-foreground">Analyzing your data and generating recommendations...</p>
              </div>
            ) : recommendations ? (
              <div className="glass p-8 rounded-xl">
                <div className="prose prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                  {recommendations}
                </div>
              </div>
            ) : (
              <div className="glass p-12 rounded-xl text-center text-muted-foreground">
                Click "Refresh Insights" to generate AI-powered recommendations.
              </div>
            )}
          </div>
        )}

        {/* My Tools */}
        {activeTab === 'tools' && (
          <div className="space-y-6">
            {!activeTool ? (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <Wrench className="w-6 h-6 text-amber" />
                  <h2 className="text-2xl font-bold text-foreground font-display">My Tools</h2>
                  <span className="text-xs text-muted-foreground ml-2">Full access — no paywall</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ADMIN_TOOLS.map(tool => (
                    <button
                      key={tool.key}
                      onClick={() => setActiveTool(tool.key)}
                      className={`glass p-6 rounded-xl text-left border transition-colors group ${
                        tool.featured
                          ? 'border-amber/60 hover:border-amber bg-amber/5 sm:col-span-2 lg:col-span-3'
                          : 'border-border hover:border-amber/40'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                          tool.featured ? 'bg-amber/20 group-hover:bg-amber/30' : 'bg-amber/10 group-hover:bg-amber/20'
                        }`}>
                          <tool.icon className="w-5 h-5 text-amber" />
                        </div>
                        <h3 className="font-bold text-foreground font-display text-base">{tool.label}</h3>
                        {tool.featured && (
                          <span className="ml-auto text-[10px] font-bold uppercase text-background bg-amber px-2 py-0.5 rounded">New</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{tool.description}</p>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => setActiveTool(null)}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back to Tools
                </Button>
                {activeTool === 'allinone' && <AllInOneGenerator />}
                {activeTool === 'social' && <SocialContentGenerator adminMode />}
                {activeTool === 'sales' && <SalesScriptGenerator adminMode />}
                {activeTool === 'calendar' && <ContentCalendarGenerator adminMode />}
                {activeTool === 'followup' && <FollowUpPlanGenerator adminMode />}
                {activeTool === 'questions' && <StrategicQuestionEngine adminMode />}
                {activeTool === 'brand' && <BrandContradictionFinder adminMode />}
                {activeTool === 'friction' && <FrictionVocabularyAudit adminMode />}
                {activeTool === 'playbook' && <PlaybookCreator />}
              </>
            )}
          </div>
        )}

        {/* My Library */}
        {activeTab === 'systems' && <AdminForensicsSystemsPanel />}

        {activeTab === 'library' && <ContentCalendar viewMode={libraryViewMode} onViewModeChange={setLibraryViewMode} />}

        {/* Content Engine */}
        {activeTab === 'engine' && <ContentEngine />}

        {/* CRM */}
        {activeTab === 'crm' && <AdminCrm />}

        {activeTab === 'commissions' && <CommissionStructurePanel />}

        {/* Forecast Center */}
        {activeTab === 'forecast' && <ForecastSettingsPanel />}

        {/* Company Portal Preview */}
        {activeTab === 'portal' && <CompanyPortalPreview />}

        {/* Rep Playbook (schedule, plays library, quotas, idea of day) */}
        {activeTab === 'playbook' && <RepPlaybookPanel />}

        {activeTab === 'training' && <AdminTrainingPanel />}
        {activeTab === 'calendars' && <AdminRepCalendarPanel />}
        {activeTab === 'companycal' && <AdminCompanyCalendarPanel />}
        {activeTab === 'sales' && <SalesCrmPanel />}

        {/* Team Messages (admin can edit/delete/pin) */}
        {activeTab === 'team' && <TeamMessageBoard isAdmin authorName="Admin" />}
        {activeTab === 'news' && <AdminNewsPanel />}

        {/* SEO Auto-Optimizer */}
        {activeTab === 'seo' && <SEOOptimizer />}


        {/* Outlook Sync + Posting Schedule */}
        {activeTab === 'outlook' && (
          <div className="space-y-8">
            {/* Sync Button */}
            <div className="glass p-6 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-foreground font-display flex items-center gap-2">
                    <Send className="w-5 h-5 text-amber" /> Sync Content to Outlook
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Pushes all published blogs and playbooks as draft emails in your Outlook mailbox for your AI to pull and post to social media.
                  </p>
                </div>
                <Button onClick={handleOutlookSync} disabled={syncingOutlook} size="lg">
                  {syncingOutlook ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  {syncingOutlook ? 'Syncing...' : 'Sync Now'}
                </Button>
              </div>

              {syncResults && (
                <div className="space-y-2 mt-4">
                  <p className="text-sm font-medium text-foreground">
                    ✅ {syncResults.filter(r => r.status === 'synced').length} synced · 
                    ⚠️ {syncResults.filter(r => r.status.startsWith('error')).length} errors · 
                    📦 {syncResults.length} total
                  </p>
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {syncResults.map((r, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className={`px-2 py-0.5 rounded text-xs font-mono ${
                          r.status === 'synced' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {r.type}
                        </span>
                        <span className="text-foreground truncate flex-1">{r.title}</span>
                        <span className={`text-xs ${r.status === 'synced' ? 'text-green-400' : 'text-red-400'}`}>{r.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Posting Schedule */}
            <div className="glass p-6 rounded-xl">
              <h2 className="text-xl font-bold text-foreground font-display flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-amber" /> LinkedIn Posting Schedule
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Weekly content framework based on the LinkedIn Growth Strategy. Your secondary AI should follow this calendar when pulling drafts.
              </p>

              {postingSchedule.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">Loading schedule...</div>
              ) : (
                <div className="space-y-3">
                  {postingSchedule
                    .sort((a, b) => a.day_of_week - b.day_of_week)
                    .map(slot => (
                      <div key={slot.id} className="flex items-center gap-4 bg-secondary/30 p-4 rounded-lg">
                        <div className="w-12 h-12 rounded-lg bg-amber/10 flex items-center justify-center">
                          <span className="text-amber font-bold font-mono text-sm">{slot.day_name}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-foreground">{slot.content_type}</div>
                          <div className="text-sm text-muted-foreground">{slot.strategic_goal}</div>
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">{slot.post_time?.slice(0, 5) || '09:00'}</div>
                        {slot.notes && (
                          <div className="text-xs text-muted-foreground max-w-48 truncate" title={slot.notes}>{slot.notes}</div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <AdminAssistant />
    </div>
  );
};

export default AdminDashboard;
