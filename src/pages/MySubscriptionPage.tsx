import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Package, ThumbsUp, ThumbsDown, Settings, Clock, Sparkles, ChevronDown, ChevronUp, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function MySubscriptionPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [expandedDelivery, setExpandedDelivery] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState<any>({});

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login');
      return;
    }
    loadData();
  }, [user, authLoading]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    const [subsRes, delsRes, profsRes] = await Promise.all([
      supabase.from('subscriptions').select('*').eq('user_id', user.id).in('status', ['active', 'trialing', 'canceled']),
      supabase.from('subscription_deliveries').select('*').eq('user_id', user.id).order('delivery_date', { ascending: false }).limit(20),
      supabase.from('subscriber_profiles').select('*').eq('user_id', user.id),
    ]);

    setSubscriptions((subsRes.data as any[]) || []);
    setDeliveries((delsRes.data as any[]) || []);
    setProfiles((profsRes.data as any[]) || []);

    // Load feedback for deliveries
    const delIds = (delsRes.data || []).map((d: any) => d.id);
    if (delIds.length > 0) {
      const { data: fb } = await supabase.from('subscriber_feedback').select('*').eq('user_id', user.id).in('delivery_id', delIds);
      const map: Record<string, any> = {};
      (fb || []).forEach((f: any) => { map[f.delivery_id] = f; });
      setFeedbackMap(map);
    }

    setLoading(false);
  };

  const submitFeedback = async (deliveryId: string, rating: number, notes?: string) => {
    if (!user) return;
    const { error } = await supabase.from('subscriber_feedback').insert({
      delivery_id: deliveryId,
      user_id: user.id,
      rating,
      notes: notes || null,
    } as any);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Feedback submitted', description: 'Your AI consultant will use this to improve next month.' });
      loadData();
    }
  };

  const updateProfile = async (profileId: string) => {
    const { error } = await supabase.from('subscriber_profiles').update({
      business_name: profileForm.business_name,
      industry: profileForm.industry,
      target_audience: profileForm.target_audience,
      tone_preference: profileForm.tone_preference,
      goals: profileForm.goals,
      website_url: profileForm.website_url,
      notes: profileForm.notes,
    } as any).eq('id', profileId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Profile updated', description: 'Your next delivery will reflect these changes.' });
      setEditingProfile(null);
      loadData();
    }
  };

  if (authLoading || loading) {
    return (
      <>
        <Navbar onContactClick={() => {}} />
        <main className="min-h-screen bg-background pt-24 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading your subscriptions...</div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <SEOHead title="My Subscription | Aetheris" description="Manage your AI consultant subscription, view deliveries, and provide feedback." path="/my-subscription" />
      <Navbar onContactClick={() => {}} />
      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Sparkles className="w-7 h-7 text-primary" />
              My AI Consultant
            </h1>
            <p className="text-muted-foreground mt-1">Your personalized deliveries, feedback, and settings.</p>
          </div>

          {/* Active Subscriptions */}
          {subscriptions.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">No active subscriptions</h2>
              <p className="text-muted-foreground mb-4">Subscribe to a monthly plan to get personalized AI-powered deliveries.</p>
              <Button onClick={() => navigate('/services')}>Browse Solutions</Button>
            </div>
          ) : (
            <div className="space-y-4 mb-10">
              {subscriptions.map((sub: any) => (
                <div key={sub.id} className="bg-card border border-border rounded-xl p-5 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-block w-2 h-2 rounded-full ${sub.status === 'active' || sub.status === 'trialing' ? 'bg-green-500' : 'bg-amber-500'}`} />
                      <span className="font-medium text-foreground">{sub.price_id?.replace(/_/g, ' ').replace(/monthly/i, '').trim()}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {sub.status === 'canceled' ? `Access until ${new Date(sub.current_period_end).toLocaleDateString()}` : `Renews ${new Date(sub.current_period_end).toLocaleDateString()}`}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${sub.status === 'active' ? 'bg-green-500/10 text-green-400' : sub.status === 'trialing' ? 'bg-blue-500/10 text-blue-400' : 'bg-amber-500/10 text-amber-400'}`}>
                    {sub.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Deliveries */}
          {deliveries.length > 0 && (
            <div className="mb-10">
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" /> Past Deliveries
              </h2>
              <div className="space-y-3">
                {deliveries.map((del: any) => {
                  const output = del.output_data || {};
                  const isExpanded = expandedDelivery === del.id;
                  const existingFb = feedbackMap[del.id];

                  return (
                    <div key={del.id} className="bg-card border border-border rounded-xl overflow-hidden">
                      <button onClick={() => setExpandedDelivery(isExpanded ? null : del.id)}
                        className="w-full p-5 flex items-center justify-between text-left hover:bg-accent/5 transition-colors">
                        <div>
                          <h3 className="font-medium text-foreground">{output.title || del.delivery_type}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{new Date(del.delivery_date).toLocaleDateString()} · {del.delivery_type.replace(/_/g, ' ')}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          {existingFb && (
                            <span className="text-lg">{existingFb.rating > 0 ? '👍' : '👎'}</span>
                          )}
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-5 pb-5 border-t border-border pt-4">
                          {output.summary && (
                            <p className="text-sm text-muted-foreground mb-4 italic">{output.summary}</p>
                          )}
                          <div className="prose prose-invert prose-sm max-w-none mb-4">
                            <ReactMarkdown>{output.content || 'No content available.'}</ReactMarkdown>
                          </div>
                          {output.changes_from_last_month && (
                            <div className="bg-accent/10 rounded-lg p-3 mb-4">
                              <p className="text-xs font-medium text-primary mb-1">Changes from last month</p>
                              <p className="text-sm text-muted-foreground">{output.changes_from_last_month}</p>
                            </div>
                          )}

                          {/* Feedback */}
                          {!existingFb ? (
                            <div className="flex items-center gap-3 pt-2 border-t border-border mt-4">
                              <span className="text-sm text-muted-foreground">Rate this delivery:</span>
                              <Button size="sm" variant="outline" onClick={() => submitFeedback(del.id, 1)}>
                                <ThumbsUp className="w-4 h-4 mr-1" /> Helpful
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => submitFeedback(del.id, -1)}>
                                <ThumbsDown className="w-4 h-4 mr-1" /> Needs work
                              </Button>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground pt-2 border-t border-border mt-4">
                              You rated this {existingFb.rating > 0 ? '👍 Helpful' : '👎 Needs work'}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Profiles */}
          {profiles.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" /> My Business Profile
              </h2>
              {profiles.map((prof: any) => (
                <div key={prof.id} className="bg-card border border-border rounded-xl p-5">
                  {editingProfile === prof.id ? (
                    <div className="space-y-3">
                      <div>
                        <Label className="text-foreground">Business Name</Label>
                        <Input value={profileForm.business_name || ''} onChange={e => setProfileForm((p: any) => ({ ...p, business_name: e.target.value }))} className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-foreground">Industry</Label>
                        <Input value={profileForm.industry || ''} onChange={e => setProfileForm((p: any) => ({ ...p, industry: e.target.value }))} className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-foreground">Target Audience</Label>
                        <Textarea value={profileForm.target_audience || ''} onChange={e => setProfileForm((p: any) => ({ ...p, target_audience: e.target.value }))} className="mt-1" rows={2} />
                      </div>
                      <div>
                        <Label className="text-foreground">Tone</Label>
                        <Input value={profileForm.tone_preference || ''} onChange={e => setProfileForm((p: any) => ({ ...p, tone_preference: e.target.value }))} className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-foreground">Notes</Label>
                        <Textarea value={profileForm.notes || ''} onChange={e => setProfileForm((p: any) => ({ ...p, notes: e.target.value }))} className="mt-1" rows={2} />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => updateProfile(prof.id)}>Save</Button>
                        <Button variant="outline" onClick={() => setEditingProfile(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><span className="text-muted-foreground">Business:</span> <span className="text-foreground ml-1">{prof.business_name || ', '}</span></div>
                        <div><span className="text-muted-foreground">Industry:</span> <span className="text-foreground ml-1">{prof.industry || ', '}</span></div>
                        <div><span className="text-muted-foreground">Tone:</span> <span className="text-foreground ml-1">{prof.tone_preference || ', '}</span></div>
                        <div><span className="text-muted-foreground">Website:</span> <span className="text-foreground ml-1">{prof.website_url || ', '}</span></div>
                      </div>
                      {prof.goals?.length > 0 && (
                        <div className="mt-3 text-sm">
                          <span className="text-muted-foreground">Goals:</span>
                          <ul className="list-disc list-inside text-foreground mt-1">
                            {prof.goals.map((g: string, i: number) => <li key={i}>{g}</li>)}
                          </ul>
                        </div>
                      )}
                      <Button variant="outline" size="sm" className="mt-4" onClick={() => {
                        setProfileForm(prof);
                        setEditingProfile(prof.id);
                      }}>
                        <Settings className="w-3 h-3 mr-1" /> Edit Profile
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
