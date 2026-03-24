import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, LogOut, Eye, EyeOff, Users, MousePointerClick, FileText, Linkedin } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'submissions' | 'events'>('overview');
  const [eventFilter, setEventFilter] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [subRes, evtRes] = await Promise.all([
        supabase.from('contact_submissions').select('*').order('created_at', { ascending: false }),
        supabase.from('site_events').select('*').order('created_at', { ascending: false }).limit(500),
      ]);

      const subs = (subRes.data || []) as ContactSubmission[];
      const evts = (evtRes.data || []) as SiteEvent[];

      setSubmissions(subs);
      setEvents(evts);

      const uniqueSessions = new Set(evts.map(e => e.session_id)).size;
      const pageViews = evts.filter(e => e.event_type === 'page_view').length;
      const linkedInClicks = evts.filter(e => e.event_type === 'linkedin_click').length;

      setStats({ visitors: uniqueSessions, pageViews, linkedInClicks, formSubmissions: subs.length });
    } catch {
      toast({ title: 'Failed to load data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const isAuth = sessionStorage.getItem('admin_authenticated') === 'true';
    if (!isAuth) { navigate('/admin/login', { replace: true }); return; }
    fetchData();
  }, [navigate, fetchData]);

  const toggleRead = async (id: string, current: boolean) => {
    await supabase.from('contact_submissions').update({ is_read: !current }).eq('id', id);
    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, is_read: !current } : s));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login', { replace: true });
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground font-display">Aetheris Admin</h1>
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
        <div className="flex gap-2 mb-8">
          {(['overview', 'submissions', 'events'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab ? 'bg-primary text-primary-foreground' : 'glass text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'overview' ? 'Overview' : tab === 'submissions' ? 'Leads' : 'Activity Log'}
            </button>
          ))}
        </div>

        {/* Overview */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map(card => (
              <div key={card.label} className="glass p-6 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                  <span className="text-sm text-muted-foreground">{card.label}</span>
                </div>
                <div className="text-4xl font-bold text-foreground font-display">{card.value}</div>
              </div>
            ))}
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
      </div>
    </div>
  );
};

export default AdminDashboard;
