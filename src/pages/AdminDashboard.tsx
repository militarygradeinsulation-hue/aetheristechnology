import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, LogOut, Eye, EyeOff, Users, FileText, Linkedin, Lightbulb, ArrowLeft, Loader2, TrendingUp, BarChart3 } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'submissions' | 'events' | 'insights'>('overview');
  const [eventFilter, setEventFilter] = useState('');
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

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const isAuth = sessionStorage.getItem('admin_authenticated') === 'true';
    if (!isAuth) { navigate('/admin/login', { replace: true }); return; }
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [navigate, fetchData]);

  const toggleRead = async (id: string, current: boolean) => {
    await supabase.from('contact_submissions').update({ is_read: !current }).eq('id', id);
    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, is_read: !current } : s));
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_authenticated');
    navigate('/admin/login', { replace: true });
  };

  const fetchInsights = async () => {
    setLoadingInsights(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-insights', {
        body: {
          stats,
          topPages,
          recentLeads: submissions.slice(0, 5).map(s => ({
            name: s.name, company: s.company, service_interest: s.service_interest, created_at: s.created_at,
          })),
          eventBreakdown,
        },
      });
      if (error) throw error;
      if (data?.error) {
        toast({ title: 'AI Error', description: data.error, variant: 'destructive' });
      } else {
        setRecommendations(data.recommendations);
      }
    } catch (err: any) {
      toast({ title: 'Failed to get insights', description: err.message, variant: 'destructive' });
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
          {(['overview', 'submissions', 'events', 'insights'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                if (tab === 'insights' && !recommendations) fetchInsights();
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab ? 'bg-primary text-primary-foreground' : 'glass text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'overview' ? 'Overview' : tab === 'submissions' ? 'Leads' : tab === 'events' ? 'Activity Log' : '🧠 AI Insights'}
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

        {/* Events */}
        {activeTab === 'events' && (
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
      </div>
    </div>
  );
};

export default AdminDashboard;
