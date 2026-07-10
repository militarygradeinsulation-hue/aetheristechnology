import React, { useEffect, useMemo, useState } from "react";
import { Background } from "@/components/Background";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ContactModal } from "@/components/ContactModal";
import { SEOHead } from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ExternalLink, Lock, Unlock, Sparkles } from "lucide-react";

const TOOL_URL = "https://nexus-iq-5m-business-strategist-352627143115.us-west1.run.app";
const UNLOCK_KEY = "aetheris.nexusIqUnlock.v1";

type Unlock = { email: string; phone: string; name?: string; company?: string; ts: number };

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const isPhone = (v: string) => v.replace(/\D/g, "").length >= 10;

const loadUnlock = (): Unlock | null => {
  try {
    const raw = localStorage.getItem(UNLOCK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Unlock;
    if (!parsed?.email || !parsed?.phone) return null;
    return parsed;
  } catch {
    return null;
  }
};

const NexusIQPage: React.FC = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [unlock, setUnlock] = useState<Unlock | null>({ email: "public@aetheris.technology", phone: "", ts: Date.now() });
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setUnlock(loadUnlock());
  }, []);

  const valid = useMemo(() => isEmail(email) && isPhone(phone), [email, phone]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      const cleanEmail = email.trim().toLowerCase().slice(0, 255);
      const cleanPhone = phone.trim().slice(0, 40);
      const cleanName = name.trim().slice(0, 120) || "Nexus IQ User";
      const cleanCompany = company.trim().slice(0, 200);
      const submissionId = crypto.randomUUID();

      const { error } = await supabase.from("contact_submissions").insert({
        id: submissionId,
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        company: cleanCompany || null,
        message: "Unlocked the Nexus IQ 5M Business Strategist from the free tools.",
        service_interest: "nexus-iq-strategist",
      });
      if (error) throw error;

      // Push admin notification — every Nexus IQ unlock becomes a tracked lead.
      supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "contact-notification",
          recipientEmail: cleanEmail,
          idempotencyKey: `nexus-iq-${submissionId}`,
          templateData: {
            name: cleanName,
            email: cleanEmail,
            phone: cleanPhone,
            company: cleanCompany || null,
            message: "Unlocked the Nexus IQ 5M Business Strategist from the free tools.",
            service_interest: "nexus-iq-strategist",
          },
        },
      });

      const record: Unlock = { email: cleanEmail, phone: cleanPhone, name: cleanName, company: cleanCompany, ts: Date.now() };
      localStorage.setItem(UNLOCK_KEY, JSON.stringify(record));
      setUnlock(record);
      toast.success("Unlocked. Nexus IQ is loading below.");
    } catch (err) {
      console.error("nexus-iq unlock failed", err);
      toast.error("Couldn't save your info. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Nexus IQ — 5M Business Strategist | Aetheris"
        description="Upload your business architecture and let the 5M IQ engine surface the fractures you missed. Free to use — Aetheris operator-led leak audit available next."
        path="/nexus-iq"
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />
        <main className="pt-24 pb-16 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-amber" />
              <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-amber">
                Nexus IQ · 5M Business Strategist
              </span>
            </div>
            <h1 className="font-forensic text-3xl md:text-5xl font-bold text-foreground leading-tight">
              Solve <span className="text-amber italic">anything.</span>
            </h1>
            <p className="mt-3 text-base md:text-lg text-muted-foreground max-w-2xl">
              Upload your architecture. The 5M IQ engine finds the fractures you missed.
              Free to use — drop your email and phone so we can send your follow-up audit.
            </p>

            {!unlock ? (
              <form
                onSubmit={handleUnlock}
                className="mt-8 rounded-sm border-2 border-amber/40 bg-card/95 backdrop-blur-sm p-5 sm:p-7 shadow-[0_15px_40px_-15px_rgba(0,0,0,0.7)]"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Lock className="w-4 h-4 text-amber" />
                  <span className="font-mono text-[11px] uppercase tracking-widest text-amber">
                    Email + phone unlocks Nexus IQ
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="rounded-sm border border-amber/30 bg-background/80 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-amber"
                    autoComplete="name"
                    maxLength={120}
                  />
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Company (optional)"
                    className="rounded-sm border border-amber/30 bg-background/80 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-amber"
                    autoComplete="organization"
                    maxLength={200}
                  />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="rounded-sm border border-amber/30 bg-background/80 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-amber"
                    autoComplete="email"
                    maxLength={255}
                  />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 555-5555"
                    className="rounded-sm border border-amber/30 bg-background/80 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-amber"
                    autoComplete="tel"
                    maxLength={40}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!valid || submitting}
                  className="mt-4 inline-flex items-center justify-center gap-2 rounded-sm bg-amber text-background font-mono uppercase tracking-wider text-xs px-6 py-3 hover:bg-amber/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Unlocking…" : (<>Unlock Nexus IQ <Unlock className="w-4 h-4" /></>)}
                </button>
                <p className="mt-3 text-[11px] text-muted-foreground">
                  We use your email + phone to send your Leak Audit summary and stay in touch about the
                  strategist's output. No spam.
                </p>
              </form>
            ) : (
              <>
                <div className="mt-6 flex flex-wrap items-center gap-3 rounded-sm border border-amber/30 bg-amber/5 px-4 py-3">
                  <Unlock className="w-4 h-4 text-amber" />
                  <span className="font-mono text-[11px] uppercase tracking-widest text-amber">
                    Unlocked for {unlock.email}
                  </span>
                  <a
                    href={TOOL_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider text-amber hover:text-amber/80"
                  >
                    Open in new tab <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="mt-4 rounded-sm border border-border/60 bg-background/40 overflow-hidden">
                  <iframe
                    src={TOOL_URL}
                    title="Nexus IQ — 5M Business Strategist"
                    className="w-full"
                    style={{ height: "80vh", minHeight: 640, border: 0 }}
                    allow="clipboard-read; clipboard-write"
                  />
                </div>
              </>
            )}
          </div>
        </main>
        <Footer />
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default NexusIQPage;
