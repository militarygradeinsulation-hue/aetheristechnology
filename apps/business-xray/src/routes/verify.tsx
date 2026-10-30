import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SiteFooter, SiteHeader } from "@/components/site/SiteHeader";
import { SITE, TIERS } from "@/config/site";
import { buildEnquiryBody, buildMailto, type EnquiryInput } from "@/lib/xray/enquiry";
import { computeAssessment } from "@/lib/xray/engine";
import { useXRay } from "@/lib/xray/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/verify")({
  head: () => ({
    meta: [
      { title: "Request a Verified Review — Aetheris Business X-Ray" },
      { name: "description", content: "Ask Aetheris Technology to check your X-Ray findings against your real records. Opens an email draft — no automated purchase." },
      { property: "og:title", content: "Request a Verified Review — Aetheris Business X-Ray" },
      { property: "og:description", content: "A person checks your top findings against your records before recommending anything." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VerifyPage,
});

function VerifyPage() {
  const state = useXRay();
  const assessment = useMemo(
    () => (state.stage === "results" && state.assumptions ? computeAssessment(state.answers, state.assumptions) : null),
    [state.stage, state.answers, state.assumptions],
  );
  const [tier, setTier] = useState<EnquiryInput["tier"]>("verified");
  const [name, setName] = useState("");
  const [business, setBusiness] = useState("");
  const [message, setMessage] = useState("");
  const [includeSummary, setIncludeSummary] = useState(true);

  const input: EnquiryInput = {
    to: SITE.enquiryEmail,
    tier,
    name,
    business,
    message,
    summary: includeSummary ? assessment : null,
    demo: state.demo,
  };
  const body = buildEnquiryBody(input);
  const paid = TIERS.filter((t) => t.id !== "free");

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-12">
        <p className="eyebrow text-copper-strong">Optional service enquiry</p>
        <h1 className="mt-3 font-display text-5xl leading-tight">Request a verified review</h1>
        <p className="mt-3 text-muted-foreground">
          This opens a draft email in your own mail app for you to edit and send. It is <strong className="text-foreground">not an automated purchase</strong>:
          nothing is submitted from this page, no payment is taken, and scope and price are confirmed with you by email before any work starts.
        </p>

        <form
          className="mt-10 grid gap-8"
          onSubmit={(e) => {
            e.preventDefault();
            window.location.href = buildMailto(input);
          }}
        >
          <fieldset>
            <legend className="eyebrow mb-3 text-muted-foreground">Service</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {[...paid.map((t) => ({ id: t.id as EnquiryInput["tier"], name: t.name, price: `${t.price} indicative` })), { id: "unsure" as const, name: "Not sure yet", price: "Advise me" }].map(
                (t) => (
                  <label
                    key={t.id}
                    className={cn(
                      "cursor-pointer rounded-sm border border-input bg-paper p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                      "has-[:checked]:border-foreground has-[:checked]:bg-ink has-[:checked]:text-ink-foreground",
                    )}
                  >
                    <input type="radio" name="tier" value={t.id} checked={tier === t.id} onChange={() => setTier(t.id)} className="sr-only" />
                    <span className="block font-medium">{t.name}</span>
                    <span className="eyebrow mt-1 block opacity-70">{t.price}</span>
                  </label>
                ),
              )}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm">
              Business name <span className="text-xs text-muted-foreground">Optional</span>
              <input value={business} onChange={(e) => setBusiness(e.target.value)} maxLength={120} className="h-11 rounded-sm border border-input bg-paper px-3 focus-ring" />
            </label>
            <label className="grid gap-1.5 text-sm">
              Your name <span className="text-xs text-muted-foreground">Optional</span>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className="h-11 rounded-sm border border-input bg-paper px-3 focus-ring" />
            </label>
          </div>

          <label className="grid gap-1.5 text-sm">
            Anything we should know?
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} rows={4} className="rounded-sm bg-paper" />
            <span className="text-xs text-muted-foreground">Please don't include staff names, health details, passwords or bank/card numbers.</span>
          </label>

          {assessment ? (
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" checked={includeSummary} onChange={(e) => setIncludeSummary(e.target.checked)} className="mt-0.5 size-4 accent-copper" />
              <span>
                Include a short X-Ray summary (scores, ranges and finding titles only){state.demo && " — note: this is the fictional demo report"}.
              </span>
            </label>
          ) : (
            <p className="text-sm text-muted-foreground">
              Tip: <Link to="/xray" search={{}} className="underline underline-offset-4">run the free X-Ray</Link> first and its summary can be added to this email.
            </p>
          )}

          <div>
            <p className="eyebrow mb-2 text-muted-foreground">Email preview · to {SITE.enquiryEmail}</p>
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap border border-border bg-muted p-4 font-mono text-xs">{body}</pre>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Button type="submit" size="lg">
              <Mail /> Open email draft
            </Button>
            <p className="text-xs text-muted-foreground">Nothing is sent until you press send in your own email app.</p>
          </div>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}