import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, LogOut, Eye, EyeOff, Users, FileText, Linkedin, Lightbulb, ArrowLeft, Loader2, TrendingUp, BarChart3, Wrench, Megaphone, Phone, Calendar, Mail, Brain, AlertTriangle, ScanText, ChevronLeft, BookOpen, Library } from 'lucide-react';
import { SocialContentGenerator } from '@/components/SocialContentGenerator';
import { SalesScriptGenerator } from '@/components/SalesScriptGenerator';
import { ContentCalendarGenerator } from '@/components/ContentCalendarGenerator';
import { FollowUpPlanGenerator } from '@/components/FollowUpPlanGenerator';
import { StrategicQuestionEngine } from '@/components/StrategicQuestionEngine';
import { BrandContradictionFinder } from '@/components/BrandContradictionFinder';
import { FrictionVocabularyAudit } from '@/components/FrictionVocabularyAudit';
import { PlaybookCreator } from '@/components/PlaybookCreator';
import { AdminLibrary } from '@/components/AdminLibrary';
import { CampaignActivity } from '@/components/CampaignActivity';
import { CampaignControlCenter } from '@/components/admin/CampaignControlCenter';
import { SEOOptimizer } from '@/components/admin/SEOOptimizer';

type ToolKey = 'social' | 'sales' | 'calendar' | 'followup' | 'questions' | 'brand' | 'friction' | 'playbook';
type EventsSubTab = 'campaign' | 'site';

const ADMIN_TOOLS: { key: ToolKey; label: string; description: string; icon: React.ElementType }[] = [
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

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [events, setEvents] = useState<SiteEvent[]>([]);
  const [stats, setStats] = useState({ visitors: 0, pageViews: 0, linkedInClicks: 0, formSubmissions: 0 });
  const [activeTab, setActiveTab] = useState<'overview' | 'submissions' | 'events' | 'insights' | 'tools' | 'library' | 'seo'>('overview');
  const [activeTool, setActiveTool] = useState<ToolKey | null>(null);
  const [eventFilter, setEventFilter] = useState('');
  const [eventsSubTab, setEventsSubTab] = useState<EventsSubTab>('campaign');
  const [recommendations, setRecommendations] = useState('');
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [topPages, setTopPages] = useState<{ page: string; views: number }[]>([]);
  const [eventBreakdown, setEventBreakdown] = useState<{ type: string; count: number }[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [subRes, evtRes] = await Promise.all([
        supabase.from('contact_submissions').select('*').order('created_at', { ascending: false }),
        supabase.from('site_events').select('*').order('created_at', { ascending: false }).limit(1000),
      ]);

      const subs = (subRes.data || []) as ContactSubmission[];
      const evts = (evtRes.data || []) as SiteEvent[];

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
  }, [toast]);

  // Verify admin status via Supabase Auth + is_admin() RPC, then auto-refresh every 30s
  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    const verifyAndLoad = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) { navigate('/admin/login', { replace: true }); return; }

      const { data: isAdmin, error } = await supabase.rpc('is_admin', { _user_id: user.id });
      if (cancelled) return;
      if (error || isAdmin !== true) {
        await supabase.auth.signOut();
        navigate('/admin/login', { replace: true });
        return;
      }

      fetchData();
      interval = setInterval(fetchData, 30000);
    };

    verifyAndLoad();
    return () => { cancelled = true; if (interval) clearInterval(interval); };
  }, [navigate, fetchData]);

  const toggleRead = async (id: string, current: boolean) => {
    await supabase.from('contact_submissions').update({ is_read: !current }).eq('id', id);
    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, is_read: !current } : s));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login', { replace: true });
  };

  const fetchInsights = async () => {
    setLoadingInsights(true);
    try {
      // No body needed: server fetches analytics from DB to prevent client tampering
      const { data, error } = await supabase.functions.invoke('admin-insights', { body: {} });
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

  const filteredEvents = eventFilter
    ? events.filter(e => e.event_type.includes(eventFilter))
    : events;

  const statCards = [
    { label: 'Unique Visitors', value: stats.visitors, icon: Users, color: 'text-amber' },
    { label: 'Page Views', value: stats.pageViews, icon: Eye, color: 'text-amber' },
    { label: 'LinkedIn Clicks', value: stats.linkedInClicks, icon: Linkedin, color: 'text-amber' },
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
        {/* Tabs */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {(['overview', 'submissions', 'events', 'insights', 'tools', 'library', 'seo'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                if (tab === 'insights' && !recommendations) fetchInsights();
                if (tab !== 'tools') setActiveTool(null);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab ? 'bg-primary text-primary-foreground' : 'glass text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'overview' ? 'Overview' : tab === 'submissions' ? 'Leads' : tab === 'events' ? '📨 Campaign Powerhouse' : tab === 'insights' ? '🧠 AI Insights' : tab === 'tools' ? '🛠 My Tools' : tab === 'library' ? '📚 My Library' : '✨ SEO/AEO Auto-Optimizer'}
            </button>
          ))}
        </div>

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
          </div>
        )}

        {/* Submissions */}
        {activeTab === 'submissions' && (
          <div className="space-y-4">
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
                    <Button variant="ghost" size="icon" onClick={() => toggleRead(sub.id, sub.is_read)} title={sub.is_read ? 'Mark unread' : 'Mark read'}>
                      {sub.is_read ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              ))
            )}
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
                  {t === 'campaign' ? '📨 Campaign' : '🌐 Site Activity'}
                </button>
              ))}
            </div>

            {eventsSubTab === 'campaign' && <CampaignActivity />}

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
                      className="glass p-6 rounded-xl text-left hover:border-amber/40 border border-border transition-colors group"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-amber/10 flex items-center justify-center group-hover:bg-amber/20 transition-colors">
                          <tool.icon className="w-5 h-5 text-amber" />
                        </div>
                        <h3 className="font-bold text-foreground font-display text-base">{tool.label}</h3>
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
        {activeTab === 'library' && <AdminLibrary />}

        {/* SEO Auto-Optimizer */}
        {activeTab === 'seo' && <SEOOptimizer />}
      </div>
    </div>
  );
};

export default AdminDashboard;
