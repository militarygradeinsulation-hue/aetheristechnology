import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Search,
  ClipboardCheck,
  MessageSquareWarning,
  Scale,
  HelpCircle,
  ListChecks,
  PenLine,
  Phone as PhoneIcon,
  CalendarDays,
  Workflow,
  Lock,
  Unlock,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Tool = {
  title: string;
  blurb: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  tag: string;
};

const TOOLS: Tool[] = [
  { title: "Website Leak Scan", blurb: "Pulls your live site and flags conversion, trust, and follow-up leaks.", to: "/scan", icon: Search, tag: "Conversion" },
  { title: "Business Diagnostic", blurb: "20-question forensic snapshot of your revenue, ops, and follow-up systems.", to: "/business-diagnostic", icon: ClipboardCheck, tag: "Diagnostic" },
  { title: "Friction Vocabulary Audit", blurb: "Finds the exact words on your site silently killing trust.", to: "/friction-audit", icon: MessageSquareWarning, tag: "Messaging" },
  { title: "Brand Contradictions", blurb: "Spots where what you say and what you show don't match.", to: "/brand-contradictions", icon: Scale, tag: "Brand" },
  { title: "Strategic Questions", blurb: "The questions your team should already be able to answer — but can't.", to: "/strategic-questions", icon: HelpCircle, tag: "Strategy" },
  { title: "AI Implementation Checklist", blurb: "Where AI actually belongs in your business — and where it doesn't.", to: "/ai-checklist", icon: ListChecks, tag: "AI" },
  { title: "Content Generator", blurb: "Operator-voice posts and hooks from a single prompt.", to: "/content-generator", icon: PenLine, tag: "Content" },
  { title: "Sales Scripts", blurb: "Short, blunt scripts for cold, warm, and dead-lead revival.", to: "/sales-scripts", icon: PhoneIcon, tag: "Sales" },
  { title: "Content Calendar", blurb: "30-day publishing plan mapped to your offer and audience.", to: "/content-calendar", icon: CalendarDays, tag: "Marketing" },
  { title: "Follow-Up Plan", blurb: "Multi-touch sequence to stop letting warm leads die in your inbox.", to: "/follow-up-plan", icon: Workflow, tag: "Follow-up" },
  { title: "Nexus IQ — 5M Strategist", blurb: "Upload your architecture. The 5M IQ engine finds the fractures you missed.", to: "/nexus-iq", icon: Sparkles, tag: "Strategist" },
];

const UNLOCK_KEY = "aetheris.freeToolsUnlock.v1";

type Unlock = { email: string; phone: string; ts: number };

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

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const isPhone = (v: string) => v.replace(/\D/g, "").length >= 10;

export const HomeFreeTools: React.FC = () => {
  const [unlock, setUnlock] = useState<Unlock | null>(null);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setUnlock(loadUnlock());
  }, []);

  const isStaffPin = (v: string) => v.trim() === "9822";
  const valid = useMemo(
    () => isStaffPin(email) || isStaffPin(phone) || (isEmail(email) && isPhone(phone)),
    [email, phone]
  );

  // Staff PIN auto-unlocks the moment it's typed — no button click needed.
  useEffect(() => {
    if (unlock) return;
    if (isStaffPin(email) || isStaffPin(phone)) {
      const record: Unlock = { email: "staff@aetheris.technology", phone: "9822", ts: Date.now() };
      localStorage.setItem(UNLOCK_KEY, JSON.stringify(record));
      setUnlock(record);
      toast.success("Staff access — tools unlocked.");
    }
  }, [email, phone, unlock]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || submitting) return;
    // Staff bypass — PIN 9822 unlocks without lead capture.
    if (isStaffPin(email) || isStaffPin(phone)) {
      const record: Unlock = { email: "staff@aetheris.technology", phone: "9822", ts: Date.now() };
      localStorage.setItem(UNLOCK_KEY, JSON.stringify(record));
      setUnlock(record);
      toast.success("Staff access — tools unlocked.");
      return;
    }
    setSubmitting(true);
    try {
      const cleanEmail = email.trim().toLowerCase().slice(0, 255);
      const cleanPhone = phone.trim().slice(0, 40);
      const submissionId = crypto.randomUUID();
      const { error } = await supabase.from("contact_submissions").insert({
        id: submissionId,
        name: "Free Tools Unlock",
        email: cleanEmail,
        phone: cleanPhone,
        message: "Unlocked the free tools suite from the home page.",
        service_interest: "free-tools-unlock",
      });
      if (error) throw error;

      // Push admin notification so Joseph sees every new tool email immediately.
      supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "contact-notification",
          recipientEmail: cleanEmail,
          idempotencyKey: `free-tools-unlock-${submissionId}`,
          templateData: {
            name: "Free Tools Unlock",
            email: cleanEmail,
            phone: cleanPhone,
            company: null,
            message: "Unlocked the free tools suite from the home page.",
            service_interest: "free-tools-unlock",
          },
        },
      });

      const record: Unlock = { email: cleanEmail, phone: cleanPhone, ts: Date.now() };
      localStorage.setItem(UNLOCK_KEY, JSON.stringify(record));
      setUnlock(record);
      toast.success("Tools unlocked. They're free — go run them.");
    } catch (err) {
      console.error("free tools unlock failed", err);
      toast.error("Couldn't save your info. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      id="free-tools"
      className="mt-14 max-w-6xl mx-auto scroll-mt-24 animate-fade-in"
      style={{ animationDelay: "260ms", animationFillMode: "both" }}
    >
      <div className="relative rounded-sm border border-amber/30 bg-card/95 backdrop-blur-sm overflow-hidden shadow-[0_15px_40px_-15px_rgba(0,0,0,0.7)]">
        {/* Technical accent line */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber/40 to-transparent" />

        {/* Corner labels */}
        <div className="absolute top-2 left-3 sm:left-4">
          <span className="font-mono text-[8px] sm:text-[9px] uppercase tracking-[0.2em] text-muted-foreground/60">
            Section // 004-Tools
          </span>
        </div>
        <div className="absolute top-2 right-3 sm:right-4">
          <span className="font-mono text-[8px] sm:text-[9px] uppercase tracking-[0.2em] text-amber/60">
            Status: Ready
          </span>
        </div>

        <div className="p-5 sm:p-7 pt-11 sm:pt-12">
          {/* Header lockup */}
          <header className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="h-px w-8 bg-amber/60" />
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber">
                Free Tools · Email + Phone Unlocks Everything
              </span>
            </div>
            <h2 className="font-forensic text-2xl sm:text-3xl md:text-4xl font-light text-foreground leading-tight">
              Try the instruments.
              <span className="block italic text-amber mt-1">On the house.</span>
            </h2>
            <div className="flex items-start gap-3">
              <div className="w-px h-12 bg-amber/40 mt-1" />
              <p className="text-sm sm:text-base text-muted-foreground max-w-3xl leading-relaxed">
                Access a restricted slice of the forensic stack. These tools detect financial drift before it becomes a leak — and they're free.
              </p>
            </div>
          </header>

          {!unlock ? (
            <form
              onSubmit={handleUnlock}
              className="mt-8 sm:mt-10 rounded-sm border border-amber/20 bg-background/60 p-4 sm:p-5"
            >
              <div className="flex items-center gap-2 mb-4">
                <Lock className="w-3.5 h-3.5 text-amber" />
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber">
                  Unlock Access
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3">
                <div className="space-y-1.5">
                  <label className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground/80 ml-1">
                    Email Identification
                  </label>
                  <input
                    type="text"
                    inputMode="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="rounded-sm border border-border/60 bg-background/80 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-amber/60 transition-colors w-full"
                    autoComplete="email"
                    maxLength={255}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground/80 ml-1">
                    Secure Contact
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 555-5555"
                    className="rounded-sm border border-border/60 bg-background/80 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-amber/60 transition-colors w-full"
                    autoComplete="tel"
                    maxLength={40}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!valid || submitting}
                  className="relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-sm bg-amber text-background font-mono uppercase tracking-[0.15em] text-xs px-6 py-2.5 hover:bg-amber/90 disabled:opacity-50 disabled:cursor-not-allowed group self-end sm:mt-5"
                >
                  <span className="relative z-10">{submitting ? "Unlocking…" : "Unlock Access"}</span>
                  <div className="absolute inset-0 bg-background/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                </button>
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground/70 text-center sm:text-left">
                We use your email + phone so you can come back without losing your work — and so we can send the Leak Audit summary if you run the full diagnosis. No spam.
              </p>
            </form>
          ) : (
            <div className="mt-8 sm:mt-10 flex flex-wrap items-center gap-3 rounded-sm border border-amber/20 bg-amber/5 px-4 py-3">
              <Unlock className="w-4 h-4 text-amber" />
              <span className="font-mono text-[11px] uppercase tracking-widest text-amber">
                Unlocked for {unlock.email}
              </span>
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem(UNLOCK_KEY);
                  setUnlock(null);
                  setEmail("");
                  setPhone("");
                }}
                className="ml-auto text-[11px] text-muted-foreground hover:text-amber underline underline-offset-2"
              >
                Use a different email
              </button>
            </div>
          )}


        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {TOOLS.map((t) => {
            const Icon = t.icon;
            const locked = !unlock;
            const Card = (
              <div
                className={`relative h-full rounded-sm border p-4 transition-colors ${
                  locked
                    ? "border-border/60 bg-background/40 opacity-80"
                    : "border-amber/30 bg-background/60 hover:border-amber/60 hover:bg-amber/[0.04]"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 text-amber" />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-amber">{t.tag}</span>
                  {locked && <Lock className="w-3 h-3 text-muted-foreground ml-auto" />}
                </div>
                <div className="font-forensic text-base font-bold text-foreground leading-snug">{t.title}</div>
                <p className="mt-1 text-xs text-muted-foreground leading-snug">{t.blurb}</p>
                {!locked && (
                  <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider text-amber">
                    Open tool <ArrowRight className="w-3 h-3" />
                  </div>
                )}
              </div>
            );
            return locked ? (
              <button
                key={t.to}
                type="button"
                onClick={() => {
                  document.getElementById("free-tools")?.scrollIntoView({ behavior: "smooth" });
                  toast.message("Drop email + phone above to unlock all 10 tools — free.");
                }}
                className="text-left"
              >
                {Card}
              </button>
            ) : (
              <Link key={t.to} to={t.to} className="block">
                {Card}
              </Link>
            );
          })}
        </div>

        <div className="mt-6 rounded-sm border-l-2 border-crimson/70 bg-crimson/5 px-4 py-3">
          <p className="text-sm text-foreground/90 leading-relaxed">
            <span className="font-forensic font-bold text-foreground">The tools show you pieces. </span>
            <span className="text-muted-foreground">
              The <Link to="/diagnostic" className="text-amber underline underline-offset-2 hover:text-amber/80">Leak Audit</Link> connects them — it
              runs every instrument against your business at once, cross-references the signals, and tells you what's
              actually leaking, what it's costing, and what to fix first. That's the puzzle solved.
            </span>
          </p>
        </div>
      </div>
    </section>
  );
};

export default HomeFreeTools;
