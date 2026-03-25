import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTrackEvent } from '@/hooks/useTrackEvent';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useToast } from '@/hooks/use-toast';
import { Send, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const SERVICE_OPTIONS = [
  'The Diagnostic — $4,500',
  'Foundation Build — $7,500/mo',
  'Growth Engine — $12,000/mo',
  'Full Operations — $18,500/mo',
  'Enterprise / Co-CEO — Custom',
  'Not sure yet',
];

export const ContactForm: React.FC = () => {
  const { toast } = useToast();
  const { trackEvent } = useTrackEvent();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: '',
    service_interest: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast({ title: 'Please fill in required fields', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from('contact_submissions').insert({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        company: form.company.trim() || null,
        message: form.message.trim(),
        service_interest: form.service_interest || null,
      });
      if (error) throw error;
      trackEvent('contact_form_submit', { service_interest: form.service_interest });
      setSubmitted(true);
      toast({ title: 'Message sent!', description: "We'll be in touch shortly." });
    } catch {
      toast({ title: 'Something went wrong', description: 'Please try again or call us directly.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <section className="py-20 px-4" id="contact-form">
        <div className="max-w-2xl mx-auto text-center glass p-12 rounded-2xl">
          <CheckCircle className="w-16 h-16 text-amber mx-auto mb-4" />
          <h3 className="text-3xl font-bold text-foreground font-display mb-3">We Got Your Message</h3>
          <p className="text-muted-foreground text-lg">Expect a response within 24 hours. If it's urgent, call us at <a href="tel:+13173762110" className="text-amber font-semibold">(317) 376-2110</a>.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 px-4" id="contact-form">
      <div className="max-w-2xl mx-auto">
        {/* Lead magnet nudge */}
        <div className="glass rounded-xl p-4 mb-8 text-center border border-primary/20">
          <p className="text-muted-foreground text-sm">
            Not ready to talk? <Link to="/assessment" className="text-primary font-semibold hover:underline">Take the free 2-minute AI Readiness Assessment first →</Link>
          </p>
        </div>

        <div className="text-center mb-10">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground font-display mb-4">
            Tell Me What's <span className="text-gradient-amber">Broken</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            No fluff. Tell me what's going on in your business and I'll tell you exactly what I'd do about it.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass p-8 rounded-2xl space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Name *</label>
              <Input name="name" value={form.name} onChange={handleChange} placeholder="Your name" required maxLength={100} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Email *</label>
              <Input name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@company.com" required maxLength={255} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Phone</label>
              <Input name="phone" value={form.phone} onChange={handleChange} placeholder="(555) 555-5555" maxLength={20} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Company</label>
              <Input name="company" value={form.company} onChange={handleChange} placeholder="Your company" maxLength={100} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">What are you interested in?</label>
            <select
              name="service_interest"
              value={form.service_interest}
              onChange={handleChange}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">Select a service (optional)</option>
              {SERVICE_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">What's going on? *</label>
            <textarea
              name="message"
              value={form.message}
              onChange={handleChange}
              placeholder="Tell me what's not working in your business — the more detail, the better my response."
              required
              maxLength={2000}
              rows={5}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            />
          </div>
          <Button type="submit" size="lg" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
            <Send className="w-5 h-5 mr-2" />
            {loading ? 'Sending...' : 'Send It — No Strings Attached'}
          </Button>
        </form>
      </div>
    </section>
  );
};
