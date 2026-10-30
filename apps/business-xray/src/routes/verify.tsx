import { useMemo, useRef, useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SiteFooter, SiteHeader } from "@/components/site/SiteHeader";
import { SITE, TIERS } from "@/config/site";
import {
  buildBackendEnquiry, buildEnquiryBody, submitBackendEnquiry,
  validateEnquiry, type EnquiryInput,
} from "@/lib/xray/enquiry";
import { computeAssessment } from "@/lib/xray/engine";
import { useXRay } from "@/lib/xray/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/verify")({
  head: () => ({
    meta: [
      { title: "Send a Business X-Ray Review Enquiry — Aetheris" },
      { name: "description", content: "Contact Aetheris directly from the website about a human-verified Business X-Ray review. Add your name, email, phone and profile links." },
      { property: "og:title", content: "Email Aetheris about a Verified Business X-Ray" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VerifyPage,
});

const serverConfig = {
  url: import.meta.env.VITE_AETHERIS_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || "",
  publishableKey: import.meta.env.VITE_AETHERIS_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
};

function VerifyPage() {
  const state = useXRay();
  const assessment = useMemo(
    () => (state.stage === "results" && state.assumptions ? computeAssessment(state.answers, state.assumptions) : null),
    [state.stage, state.answers, state.assumptions],
  );
  const [tier, setTier] = useState<EnquiryInput["tier"]>("verified");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [website, setWebsite] = useState("");
  const [business, setBusiness] = useState("");
  const [message, setMessage] = useState("");
  const [includeSummary, setIncludeSummary] = useState(false);
  const [consent, setConsent] = useState(false);
  const [trap, setTrap] = useState("");
  const [pending, setPending] = useState(false);
  const [delivered, setDelivered] = useState(false);
  const [error, setError] = useState("");
  const dedupe = useRef<string | null>(null);

  const input: EnquiryInput = {
    tier, name, email, phone, linkedin, website, business, message,
    summary: includeSummary ? assessment : null,
    demo: state.demo, consent,
  };
  const copy = buildEnquiryBody(input);
  const paid = TIERS.filter((t) => t.id !== "free");
  const mainWebsite = "https://aetheris.technology/business-xray/contact?service=" +
    (tier === "roadmap" ? "business_xray_roadmap" : tier === "verified" ? "business_xray_verified" : "business_xray_unsure");
  const directConfigured = Boolean(serverConfig.url && serverConfig.publishableKey);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending || delivered) return;
    if (trap.trim()) { setError("Your request could not be sent."); return; }
    const issue = validateEnquiry(input);
    if (issue) { setError(issue); return; }
    dedupe.current ??= crypto.randomUUID();
    setPending(true);
    setError("");
    try {
      const payload = buildBackendEnquiry(input, `xray-verified-${dedupe.current}`);
      await submitBackendEnquiry(payload, serverConfig);
      setDelivered(true);
    } catch {
      setError("The mail service did not confirm delivery. Try again, or use the contact form on Aetheris.Technology.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-12">
        <p className="eyebrow text-copper-strong">Business X-Ray / Personal contact</p>
        <h1 className="mt-3 font-display text-5xl leading-tight">Send an enquiry to Aetheris.</h1>
        <p className="mt-3 text-muted-foreground">
          Request a human-verified review and share your preferred contact details.
          This is an enquiry only; no purchase is made and no unverified losses are claimed.
        </p>
        {!directConfigured ? (
          <div className="mt-9 rounded-sm border border-border bg-paper p-7">
            <p className="text-sm text-muted-foreground">Email sending is managed by the existing Aetheris website. Continue there to enter your name, email, phone, LinkedIn and business URL, then press Send Email without opening a mail application.</p>
            <a href={mainWebsite} className="mt-5 inline-block rounded-sm bg-ink px-5 py-3 text-sm font-semibold text-ink-foreground">
              Open Aetheris direct email form
            </a>
          </div>
        ) : delivered ? (
          <div role="status" aria-live="polite" className="mt-9 rounded-sm border border-border p-8 text-center">
            <CheckCircle2 className="mx-auto mb-3 size-10 text-copper-strong" />
            <h2 className="font-display text-3xl">Your email was sent.</h2>
            <p className="mt-2 text-muted-foreground">The email service confirmed your enquiry. Aetheris can reply using {email}.</p>
          </div>
        ) : (
          <form className="mt-10 grid gap-7" onSubmit={submit}>
            <fieldset>
              <legend className="eyebrow mb-3 text-muted-foreground">What do you need?</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {[...paid.map((t) => ({ id: t.id as EnquiryInput["tier"], name: t.name, price: `${t.price} indicative` })), { id: "unsure" as const, name: "Not sure yet", price: "Advise me" }].map((t) => (
                  <label key={t.id} className={cn(
                    "cursor-pointer rounded-sm border border-input bg-paper p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                    "has-[:checked]:border-foreground has-[:checked]:bg-ink has-[:checked]:text-ink-foreground",
                  )}>
                    <input type="radio" name="tier" value={t.id} checked={tier === t.id} onChange={() => setTier(t.id)} className="sr-only" />
                    <span className="block font-medium">{t.name}</span>
                    <span className="eyebrow mt-1 block opacity-70">{t.price}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm">Your name *
                <input required minLength={2} value={name} onChange={(e) => setName(e.target.value)}
                  maxLength={100} autoComplete="name" className="h-11 rounded-sm border border-input bg-paper px-3 focus-ring" />
              </label>
              <label className="grid gap-1.5 text-sm">Email address *
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  maxLength={254} autoComplete="email" className="h-11 rounded-sm border border-input bg-paper px-3 focus-ring" />
              </label>
              <label className="grid gap-1.5 text-sm">Phone number (optional)
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                  maxLength={35} autoComplete="tel" className="h-11 rounded-sm border border-input bg-paper px-3 focus-ring" />
              </label>
              <label className="grid gap-1.5 text-sm">Business name (optional)
                <input value={business} onChange={(e) => setBusiness(e.target.value)}
                  maxLength={120} autoComplete="organization" className="h-11 rounded-sm border border-input bg-paper px-3 focus-ring" />
              </label>
              <label className="grid gap-1.5 text-sm">LinkedIn profile (optional)
                <input value={linkedin} onChange={(e) => setLinkedin(e.target.value)}
                  inputMode="url" maxLength={300} placeholder="linkedin.com/in/yourname"
                  className="h-11 rounded-sm border border-input bg-paper px-3 focus-ring" />
              </label>
              <label className="grid gap-1.5 text-sm">Website URL (optional)
                <input value={website} onChange={(e) => setWebsite(e.target.value)}
                  inputMode="url" maxLength={300} placeholder="yourcompany.com"
                  className="h-11 rounded-sm border border-input bg-paper px-3 focus-ring" />
              </label>
            </div>
            <label className="grid gap-1.5 text-sm">Anything we should know? (optional)
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)}
                maxLength={1000} rows={4} className="rounded-sm bg-paper" />
              <span className="text-xs text-muted-foreground">Do not include passwords, bank details, health information, or confidential staff records.</span>
            </label>
            {assessment && (
              <label className="flex items-start gap-3 text-sm">
                <input type="checkbox" checked={includeSummary} onChange={(e) => setIncludeSummary(e.target.checked)} className="mt-0.5 size-4 accent-copper" />
                <span>Include a short X-Ray summary (scores and estimated ranges only), marked {state.demo ? "DEMO, not verified" : "self-reported, not verified"}.</span>
              </label>
            )}
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-4 accent-copper" />
              <span>I agree Aetheris may use these contact details to reply to this enquiry. No marketing subscription or payment is authorized.</span>
            </label>
            <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
              <label htmlFor="xray-fax">Fax</label>
              <input id="xray-fax" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
            </div>
            <div>
              <p className="eyebrow mb-2 text-muted-foreground">Preview of your email to {SITE.enquiryEmail}</p>
              <pre className="max-h-52 overflow-auto whitespace-pre-wrap border border-border bg-muted p-4 font-mono text-xs">{copy}</pre>
            </div>
            {error && <p role="alert" className="rounded-sm border border-destructive/40 p-3 text-sm text-destructive">{error}</p>}
            <div className="flex flex-wrap items-center gap-4">
              <Button type="submit" size="lg" disabled={pending}>
                {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Mail className="mr-2 size-4" />}
                {pending ? "Sending..." : "Send Email"}
              </Button>
              <p className="text-xs text-muted-foreground">No mail app opens. Success appears only when the email service confirms delivery.</p>
            </div>
          </form>
        )}
        <div className="mt-10 text-sm text-muted-foreground">
          <Link to="/xray" search={{}} className="underline underline-offset-4">Return to the free X-Ray</Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
