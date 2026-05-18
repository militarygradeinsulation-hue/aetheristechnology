import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, MapPin, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface LiveEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  notes: string | null;
  image_url: string | null;
  signup_url: string | null;
}

export const UpcomingEvents: React.FC = () => {
  const { toast } = useToast();
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [signupFor, setSignupFor] = useState<LiveEvent | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('events' as any)
        .select('*')
        .eq('is_published', true)
        .gte('starts_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('display_order', { ascending: true })
        .order('starts_at', { ascending: true })
        .limit(6);
      setEvents((data as any) || []);
      setLoading(false);
    })();
  }, []);

  const submitSignup = async () => {
    if (!signupFor) return;
    if (!form.name.trim() || !form.email.trim()) {
      toast({ title: 'Name and email required', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('event_signups' as any).insert({
      event_id: signupFor.id,
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim() || null,
      company: form.company.trim() || null,
      notes: form.notes.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: 'Signup failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: "You're signed up!", description: `We'll send details for ${signupFor.title}.` });
    setSignupFor(null);
    setForm({ name: '', email: '', phone: '', company: '', notes: '' });
  };

  if (loading || events.length === 0) return null;

  return (
    <section className="px-4 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">
            Upcoming · Live with the operator
          </div>
          <h2 className="font-forensic text-3xl md:text-4xl font-bold text-foreground">
            Webinars, live meetings & <span className="text-amber">working sessions</span>
          </h2>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
            Reserve your spot. Limited seats, these are working sessions, not webinars-as-marketing.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((e) => {
            const start = new Date(e.starts_at);
            const end = e.ends_at ? new Date(e.ends_at) : null;
            return (
              <article key={e.id} className="forensic-tile rounded-sm border border-border/60 overflow-hidden flex flex-col">
                {e.image_url && (
                  <img src={e.image_url} alt={e.title} className="w-full h-40 object-cover border-b border-border/60" loading="lazy" />
                )}
                <div className="p-5 flex-1 flex flex-col">
                  <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">{e.event_type}</div>
                  <h3 className="font-forensic text-xl font-bold text-foreground mb-2">{e.title}</h3>
                  <div className="space-y-1.5 text-xs text-muted-foreground mb-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-amber shrink-0" />
                      <span>{start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-amber shrink-0" />
                      <span>
                        {start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                        {end ? ` – ${end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}` : ''}
                      </span>
                    </div>
                    {e.location && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-amber shrink-0 mt-0.5" />
                        <span className="break-words">{e.location}</span>
                      </div>
                    )}
                  </div>
                  {e.description && <p className="text-sm text-foreground/80 mb-4 line-clamp-3">{e.description}</p>}
                  <div className="mt-auto">
                    {e.signup_url ? (
                      <a href={e.signup_url} target="_blank" rel="noopener noreferrer">
                        <Button className="w-full bg-amber hover:bg-amber/90 text-primary-foreground font-bold">Sign up</Button>
                      </a>
                    ) : (
                      <Button onClick={() => setSignupFor(e)} className="w-full bg-amber hover:bg-amber/90 text-primary-foreground font-bold">
                        Sign up
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {signupFor && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-amber/40 rounded-sm max-w-md w-full p-6 my-8">
            <div className="flex items-start justify-between gap-2 mb-4">
              <div>
                <div className="font-case text-[10px] uppercase tracking-widest text-amber">Reserve your spot</div>
                <h3 className="font-forensic text-xl font-bold text-foreground">{signupFor.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(signupFor.starts_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setSignupFor(null)}><X className="w-4 h-4" /></Button>
            </div>
            {signupFor.notes && (
              <div className="mb-4 p-3 border border-border/60 rounded-sm text-xs text-foreground/80 bg-background/50">
                {signupFor.notes}
              </div>
            )}
            <div className="space-y-3">
              <div>
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={100} />
              </div>
              <div>
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={255} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={30} />
                </div>
                <div>
                  <Label>Company</Label>
                  <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} maxLength={100} />
                </div>
              </div>
              <div>
                <Label>Anything we should know?</Label>
                <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={500} />
              </div>
              <Button onClick={submitSignup} disabled={submitting} className="w-full bg-amber hover:bg-amber/90 text-primary-foreground font-bold">
                {submitting ? 'Reserving…' : 'Reserve my spot'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default UpcomingEvents;
