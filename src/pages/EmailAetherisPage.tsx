import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, Mail, Send } from "lucide-react";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  CONTACT_INTERESTS,
  buildDirectEmailPayload,
  confirmedByMailService,
  parseContactInterest,
  validateDirectEmail,
  type ContactInterest,
  type DirectEmailInput,
} from "@/lib/aetherisDirectEmail";

const blank = (interest: ContactInterest): DirectEmailInput => ({
  name: "",
  email: "",
  phone: "",
  linkedin: "",
  website: "",
  company: "",
  message: "",
  interest,
  contactConsent: false,
});

const fieldStyle = "space-y-1.5";
const labelStyle = "block text-sm font-medium text-foreground";
const inputStyle = "h-11 bg-background border-border";

export default function EmailAetherisPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const initialInterest = parseContactInterest(searchParams.get("service"));
  const [input, setInput] = useState<DirectEmailInput>(() => blank(initialInterest));
  const [honeypot, setHoneypot] = useState("");
  const [pending, setPending] = useState(false);
  const [delivered, setDelivered] = useState(false);
  const [error, setError] = useState("");
  const dedupe = useRef<string | null>(null);

  // Optional one-time company-name handoff from the on-device free X-Ray.
  // No scan answers, financial figures, or personal data are transmitted here.
  useEffect(() => {
    if (location.pathname !== "/business-xray/contact") return;
    try {
      const saved = sessionStorage.getItem("aetheris-xray-contact-prefill");
      if (!saved) return;
      sessionStorage.removeItem("aetheris-xray-contact-prefill");
      const parsed = JSON.parse(saved);
      if (typeof parsed.company === "string" && parsed.company.trim()) {
        setInput((prior) => ({ ...prior, company: parsed.company.trim().slice(0, 120) }));
      }
    } catch {
      // Browser may disable session storage; the form works without it.
    }
  }, [location.pathname]);

  const change = (field: keyof DirectEmailInput, value: string | boolean) => {
    setInput((prior) => ({ ...prior, [field]: value }));
    setError("");
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending || delivered) return;
    if (honeypot.trim()) {
      setError("Your request could not be sent. Please contact Aetheris directly.");
      return;
    }
    const reason = validateDirectEmail(input);
    if (reason) {
      setError(reason);
      return;
    }
    dedupe.current ??= crypto.randomUUID();
    setPending(true);
    setError("");
    try {
      const payload = buildDirectEmailPayload(input, `xray-contact-${dedupe.current}`);
      // Reuse the existing server-side sender and its fixed Aetheris inbox.
      // Do not write the enquiry to a public table or trust a client redirect.
      const { data, error: sendError } = await supabase.functions.invoke(
        "notify-contact-submission",
        { body: payload },
      );
      if (!confirmedByMailService(data, sendError)) {
        throw new Error("The Aetheris mail service has not confirmed delivery.");
      }
      setDelivered(true);
    } catch {
      setError("Your email could not be confirmed as sent. Please try again. You can also contact aetheris.technology@outlook.com.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title="Send Aetheris an Email"
        description="Send a direct enquiry to Aetheris Technology without opening an email application. Share your contact details and business question securely."
        path={location.pathname === "/business-xray/contact" ? "/business-xray/contact" : "/email"}
      />
      <main className="mx-auto w-full max-w-3xl px-5 pb-16 pt-10 sm:pt-16">
        <Link to="/" className="text-sm font-semibold tracking-wide text-amber hover:underline">
          Aetheris.Technology
        </Link>

        {delivered ? (
          <section className="mt-12 rounded-2xl border border-amber/30 bg-card p-8 text-center" role="status" aria-live="polite">
            <CheckCircle2 className="mx-auto mb-4 size-12 text-amber" aria-hidden="true" />
            <h1 className="text-3xl font-bold">Your email was sent.</h1>
            <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
              The Aetheris email service confirmed your enquiry. We have your contact details and can respond to {input.email.trim()}.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">Your enquiry is not a purchase, appointment, or verified audit.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-4">
              <Link className="rounded-md border border-amber/40 px-4 py-2 text-amber hover:bg-amber/10" to="/">Aetheris home</Link>
              <a className="rounded-md border border-border px-4 py-2 hover:bg-card" href="/business-xray/index.html">Free Business X-Ray</a>
            </div>
          </section>
        ) : (
          <>
            <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-amber">Contact Aetheris</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Send an email directly.</h1>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              Add your details, tell us what you need, and press <strong className="text-foreground">Send Email</strong>.
              We send it to Aetheris from this page. You do not need to open your own email app or create an account.
            </p>

            <form onSubmit={submit} className="mt-9 space-y-6 rounded-2xl border border-border bg-card/40 p-5 sm:p-8">
              <div className={fieldStyle}>
                <label className={labelStyle} htmlFor="aetheris-contact-interest">What are you contacting us about?</label>
                <select
                  id="aetheris-contact-interest"
                  value={input.interest}
                  onChange={(e) => change("interest", e.target.value)}
                  className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
                >
                  {Object.entries(CONTACT_INTERESTS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className={fieldStyle}>
                  <label htmlFor="aetheris-contact-name" className={labelStyle}>Full name <span className="text-amber">*</span></label>
                  <Input id="aetheris-contact-name" name="name" autoComplete="name" required maxLength={100} minLength={2}
                    placeholder="Your name" value={input.name} onChange={(e) => change("name", e.target.value)} className={inputStyle} />
                </div>
                <div className={fieldStyle}>
                  <label htmlFor="aetheris-contact-email" className={labelStyle}>Email address <span className="text-amber">*</span></label>
                  <Input id="aetheris-contact-email" name="email" type="email" autoComplete="email" required maxLength={254}
                    placeholder="you@company.com" value={input.email} onChange={(e) => change("email", e.target.value)} className={inputStyle} />
                </div>
                <div className={fieldStyle}>
                  <label htmlFor="aetheris-contact-phone" className={labelStyle}>Phone number <span className="text-muted-foreground">(optional)</span></label>
                  <Input id="aetheris-contact-phone" name="phone" type="tel" autoComplete="tel" maxLength={35}
                    placeholder="(555) 555-5555" value={input.phone} onChange={(e) => change("phone", e.target.value)} className={inputStyle} />
                </div>
                <div className={fieldStyle}>
                  <label htmlFor="aetheris-contact-company" className={labelStyle}>Business name <span className="text-muted-foreground">(optional)</span></label>
                  <Input id="aetheris-contact-company" name="company" autoComplete="organization" maxLength={120}
                    placeholder="Your company" value={input.company} onChange={(e) => change("company", e.target.value)} className={inputStyle} />
                </div>
                <div className={fieldStyle}>
                  <label htmlFor="aetheris-contact-linkedin" className={labelStyle}>LinkedIn profile <span className="text-muted-foreground">(optional)</span></label>
                  <Input id="aetheris-contact-linkedin" name="linkedin" type="text" inputMode="url" maxLength={300}
                    placeholder="https://www.linkedin.com/in/yourname" value={input.linkedin} onChange={(e) => change("linkedin", e.target.value)} className={inputStyle} />
                  <p className="text-xs text-muted-foreground">A personal profile or company page works.</p>
                </div>
                <div className={fieldStyle}>
                  <label htmlFor="aetheris-contact-website" className={labelStyle}>Website URL <span className="text-muted-foreground">(optional)</span></label>
                  <Input id="aetheris-contact-website" name="website" type="text" inputMode="url" maxLength={300}
                    placeholder="https://yourcompany.com" value={input.website} onChange={(e) => change("website", e.target.value)} className={inputStyle} />
                </div>
              </div>

              <div className={fieldStyle}>
                <label htmlFor="aetheris-contact-message" className={labelStyle}>Message <span className="text-muted-foreground">(optional)</span></label>
                <textarea
                  id="aetheris-contact-message" name="message" rows={5} maxLength={1400}
                  className="w-full resize-y rounded-md border border-border bg-background p-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="What's happening in your business, and what would you like to discuss?"
                  value={input.message} onChange={(e) => change("message", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Do not include passwords, financial account details, staff medical information, or confidential records.</p>
              </div>

              {/* Basic bot trap. Provider-side rate limits remain authoritative. */}
              <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
                <label htmlFor="aetheris-contact-fax">Fax number</label>
                <input tabIndex={-1} autoComplete="off" id="aetheris-contact-fax"
                  value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
              </div>

              <label className="flex items-start gap-3 text-sm text-muted-foreground">
                <input type="checkbox" required className="mt-1 size-4 accent-amber"
                  checked={input.contactConsent} onChange={(e) => change("contactConsent", e.target.checked)} />
                <span>I agree that Aetheris.Technology may use these details to respond to my enquiry. This does not subscribe me to promotional email or authorize a payment.</span>
              </label>

              {error && <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button type="submit" size="lg" disabled={pending} className="min-w-48">
                  {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}
                  {pending ? "Sending..." : "Send Email"}
                </Button>
                <span className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="size-3.5" /> Sent to Aetheris, not from your personal email account.</span>
              </div>
            </form>
            <p className="mt-6 text-xs text-muted-foreground">
              The existing Aetheris mail service handles delivery. We do not call a request sent until it returns a successful confirmation.
            </p>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
