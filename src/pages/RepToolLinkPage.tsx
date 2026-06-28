import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SEOHead } from '@/components/SEOHead';
import { Background } from '@/components/Background';
import { supabase } from '@/integrations/supabase/client';
import {
  REP_TOOL_BY_SLUG,
  loadStoredToolLead,
  saveStoredToolLead,
} from '@/lib/repTools';
import { Loader2, Lock, Unlock, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

const RepToolLinkPage: React.FC = () => {
  const { repCode = '', toolSlug = '' } = useParams();
  const navigate = useNavigate();
  const tool = REP_TOOL_BY_SLUG[toolSlug];

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [forwarding, setForwarding] = useState(false);

  const valid = useMemo(() => email.trim() === "9822" || isEmail(email), [email]);

  const capture = async (lead: { email: string; name?: string; phone?: string; company?: string }) => {
    try {
      await supabase.functions.invoke('tool-lead-capture', {
        body: {
          ...lead,
          rep_code: repCode || null,
          tool_slug: toolSlug,
          tool_title: tool?.title || toolSlug,
          source: 'rep-share-link',
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        },
      });
    } catch (e) {
      console.warn('tool-lead-capture failed', e);
    }
  };

  // Auto-forward returning visitors.
  useEffect(() => {
    if (!tool) return;
    const stored = loadStoredToolLead();
    if (stored?.email) {
      setForwarding(true);
      // Persist rep_code so downstream attribution sticks.
      try {
        if (repCode) localStorage.setItem('aetheris_rep_code', repCode);
        // Mirror to the existing free-tools unlock so gated tools also open.
        localStorage.setItem('aetheris.freeToolsUnlock.v1', JSON.stringify({
          email: stored.email,
          phone: stored.phone || '',
          ts: Date.now(),
        }));
      } catch {}
      capture({ email: stored.email, name: stored.name, phone: stored.phone, company: stored.company })
        .finally(() => navigate(tool.path, { replace: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool, repCode, toolSlug]);

  if (!tool) {
    return (
      <div className="relative min-h-screen">
        <Background />
        <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
          <div className="max-w-md text-center">
            <h1 className="font-forensic text-2xl text-foreground mb-2">Unknown tool</h1>
            <p className="text-muted-foreground text-sm">This share link points to a tool that no longer exists.</p>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      // Staff bypass — PIN 9822 unlocks without lead capture.
      if (email.trim() === "9822") {
        try {
          if (repCode) localStorage.setItem('aetheris_rep_code', repCode);
          localStorage.setItem('aetheris.freeToolsUnlock.v1', JSON.stringify({
            email: 'staff@aetheris.technology',
            phone: '9822',
            ts: Date.now(),
          }));
        } catch {}
        toast.success('Staff access — loading your tool…');
        navigate(tool.path, { replace: true });
        return;
      }
      const cleanEmail = email.trim().toLowerCase().slice(0, 255);
      const cleanName = name.trim().slice(0, 120) || undefined;
      const cleanPhone = phone.trim().slice(0, 40) || undefined;
      const cleanCompany = company.trim().slice(0, 160) || undefined;

      await capture({ email: cleanEmail, name: cleanName, phone: cleanPhone, company: cleanCompany });

      saveStoredToolLead({
        email: cleanEmail,
        name: cleanName,
        phone: cleanPhone,
        company: cleanCompany,
        rep_code: repCode || undefined,
        ts: Date.now(),
      });
      try {
        if (repCode) localStorage.setItem('aetheris_rep_code', repCode);
        localStorage.setItem('aetheris.freeToolsUnlock.v1', JSON.stringify({
          email: cleanEmail,
          phone: cleanPhone || '',
          ts: Date.now(),
        }));
      } catch {}

      toast.success('Unlocked. Loading your tool…');
      navigate(tool.path, { replace: true });
    } catch (err) {
      console.error('tool unlock failed', err);
      toast.error("Couldn't save your info. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title={`${tool.title} | Aetheris AI`}
        description={tool.blurb}
        path={`/t/${repCode}/${toolSlug}`}
      />
      <Background />
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-16">
        <div className="w-full max-w-xl rounded-sm border-2 border-amber/40 bg-card/95 backdrop-blur-sm p-6 sm:p-8 shadow-[0_15px_40px_-15px_rgba(0,0,0,0.7)]">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-px w-8 bg-amber/60" />
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber">
              Shared by Operator · {repCode || 'Aetheris'}
            </span>
          </div>
          <h1 className="font-forensic text-2xl sm:text-3xl font-bold text-foreground leading-tight">
            {tool.title}
          </h1>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">{tool.blurb}</p>

          {forwarding ? (
            <div className="mt-6 flex items-center gap-2 text-amber font-mono text-xs uppercase tracking-widest">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading your tool…
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber" />
                <span className="font-mono text-[11px] uppercase tracking-widest text-amber">
                  Drop your email to open the tool
                </span>
              </div>
              <input
                type="text"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com  (or staff PIN)"
                className="w-full rounded-sm border border-amber/30 bg-background/80 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-amber"
                autoComplete="email"
                maxLength={255}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name (optional)"
                  className="rounded-sm border border-amber/20 bg-background/80 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-amber"
                  maxLength={120}
                />
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Company (optional)"
                  className="rounded-sm border border-amber/20 bg-background/80 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-amber"
                  maxLength={160}
                />
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone (optional)"
                className="w-full rounded-sm border border-amber/20 bg-background/80 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-amber"
                autoComplete="tel"
                maxLength={40}
              />
              <button
                type="submit"
                disabled={!valid || submitting}
                className="inline-flex items-center justify-center gap-2 rounded-sm bg-amber text-background font-mono uppercase tracking-wider text-xs px-5 py-2.5 hover:bg-amber/90 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
              >
                {submitting ? (<><Loader2 className="w-4 h-4 animate-spin" /> Unlocking…</>) : (<>Unlock & open <Unlock className="w-4 h-4" /> <ArrowRight className="w-4 h-4" /></>)}
              </button>
              <p className="text-[11px] text-muted-foreground">
                Your email is saved so next time you click this operator's link, the tool opens instantly. No spam.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default RepToolLinkPage;
