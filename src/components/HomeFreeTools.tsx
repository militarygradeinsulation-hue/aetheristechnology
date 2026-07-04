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

export const HomeFreeTools: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
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

  const body = (
    <>
          {/* Header lockup */}
          <header className="flex items-center justify-between gap-2">
            <h2 className="font-forensic text-[10px] sm:text-xs font-light text-foreground leading-tight">
              Free instruments. <span className="italic text-amber/80">On the house.</span>
            </h2>
            {!unlock && (
              <p className="hidden sm:block text-[9px] text-muted-foreground/70 leading-snug text-right">
                Unlock with email + phone.
              </p>
            )}
          </header>

          {/* Header lockup */}
          <header className="flex items-center justify-between gap-2">
            <h2 className="font-forensic text-[10px] sm:text-xs font-light text-foreground leading-tight">
              Free instruments. <span className="italic text-amber/80">On the house.</span>
            </h2>
            {!unlock && (
              <p className="hidden sm:block text-[9px] text-muted-foreground/70 leading-snug text-right">
                Unlock with email + phone.
              </p>
            )}
          </header>

          {!unlock ? (
            <form
              onSubmit={handleUnlock}
              className="mt-1.5 rounded-sm border border-amber/10 bg-background/50 p-1.5"
            >
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-1.5 items-end">
                <input
                  type="text"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="rounded-sm border border-border/60 bg-background/80 px-2 py-1 text-[10px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-amber/60 transition-colors w-full"
                  autoComplete="email"
                  maxLength={255}
                />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone"
                  className="rounded-sm border border-border/60 bg-background/80 px-2 py-1 text-[10px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-amber/60 transition-colors w-full"
                  autoComplete="tel"
                  maxLength={40}
                />
                <button
                  type="submit"
                  disabled={!valid || submitting}
                  className="inline-flex items-center justify-center rounded-sm bg-amber text-background font-mono uppercase tracking-[0.1em] text-[9px] px-2.5 py-1 hover:bg-amber/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "…" : "Unlock"}
                </button>
              </div>
              <p className="mt-1 text-[8px] text-muted-foreground/60">
                Unlock so you can return without losing work. No spam.
              </p>
            </form>
          ) : (
            <div className="mt-1.5 flex items-center gap-1.5 rounded-sm border border-amber/10 bg-amber/5 px-2 py-1">
              <Unlock className="w-2.5 h-2.5 text-amber" />
              <span className="font-mono text-[8px] uppercase tracking-widest text-amber truncate">
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
                className="ml-auto text-[9px] text-muted-foreground hover:text-amber underline underline-offset-2"
              >
                Switch
              </button>
            </div>
          )}

          <div className="mt-1.5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1">
            {TOOLS.map((t) => {
              const Icon = t.icon;
              const locked = !unlock;
              const Card = (
                <div
                  className={`relative h-full rounded-sm border px-1.5 py-1 transition-colors ${
                    locked
                      ? "border-border/60 bg-background/40 opacity-80"
                      : "border-amber/20 bg-background/50 hover:border-amber/50 hover:bg-amber/[0.04]"
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <Icon className="w-2.5 h-2.5 text-amber shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-forensic text-[9px] font-bold text-foreground leading-tight truncate">
                        {t.title}
                      </div>
                    </div>
                    {locked && <Lock className="w-2 h-2 text-muted-foreground shrink-0" />}
                    {!locked && <ArrowRight className="w-2 h-2 text-amber shrink-0" />}
                  </div>
                </div>
              );
              return locked ? (
                <button
                  key={t.to}
                  type="button"
                  onClick={() => {
                    document.getElementById("free-tools")?.scrollIntoView({ behavior: "smooth" });
                    toast.message("Unlock above to use the tools — free.");
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

          <div className="mt-1.5 text-[9px] text-muted-foreground/80 leading-snug">
            <span className="text-foreground/90 font-forensic">Pieces vs. puzzle.</span>{" "}
            The{" "}
            <Link to="/diagnostic" className="text-amber underline underline-offset-2 hover:text-amber/80">
              Leak Audit
            </Link>{" "}
            connects every signal.
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeFreeTools;
