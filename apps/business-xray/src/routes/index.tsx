import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SiteFooter, SiteHeader } from "@/components/site/SiteHeader";
import { ScoreBar } from "@/components/xray/FrictionMap";
import { SITE, TIERS } from "@/config/site";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aetheris Business X-Ray — find where your business may be losing money" },
      {
        name: "description",
        content: "A free, private 4-minute diagnostic from Aetheris Technology. See people, process and systems friction and what to investigate first.",
      },
      { property: "og:title", content: "Aetheris Business X-Ray" },
      { property: "og:description", content: "Find where your business may be losing money — and what to investigate first." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const DOES = [
  "Asks 13–18 plain questions about handoffs, approvals, enquiries, re-typing and tools",
  "Scores friction across People, Process and Systems",
  "Shows a conservative low / base / high range of possible annual opportunity",
  "Shows every assumption and lets you change it",
  "Names three things to investigate and the data that would prove them",
  "Gives you a printable report and a JSON copy you own",
];

const DOES_NOT = [
  "Audit your finances or replace an accountant",
  "Assess anyone's personality or performance",
  "Guarantee savings or revenue",
  "Upload, store or share your answers",
  "Recommend buying software before the problem is verified",
];

const FAQ = [
  { q: "Is this really free?", a: "Yes. The X-Ray runs entirely in your browser. There's no account, no email gate and nothing to cancel." },
  {
    q: "Where do my answers go?",
    a: "Nowhere. They live in this browser tab and disappear when you close or refresh it. Download the JSON if you want to keep a copy.",
  },
  {
    q: "How accurate are the dollar figures?",
    a: "They're estimates from your own rough numbers and our listed assumptions — a way to rank what to look at, not a measurement. That's why every figure is labelled Estimated and nothing is labelled Verified.",
  },
  {
    q: "What happens when I request a paid review?",
    a: "Your own email app opens with an editable draft. Nothing is purchased automatically. We reply to agree scope, timing and price before any work or payment.",
  },
  {
    q: "Will you try to sell me software?",
    a: "Our rule is verify first. Most fixes start with a process or handoff change using tools you already have. New tools are only suggested where the evidence supports them.",
  },
  { q: "Who is it for?", a: "Owners and managers of small and mid-sized teams who sense time and money leaking but can't yet say where." },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        {/* Hero */}
        <section className="hairline-grid border-b border-border">
          <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 sm:py-24 lg:grid-cols-[1.25fr_1fr] lg:items-end">
            <div>
              <p className="eyebrow text-copper-strong">{SITE.company} · Business X-Ray</p>
              <h1 className="mt-5 font-display text-5xl leading-[1.02] sm:text-7xl">
                Find where your business <em className="text-copper-strong">may</em> be losing money.
              </h1>
              <p className="mt-6 max-w-xl text-lg text-muted-foreground">
                …and what to investigate first. A private, 4-minute diagnostic of your people, processes and systems — with every assumption on the table.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link to="/xray" search={{}}>
                    Start the free X-Ray <ArrowRight />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/xray" search={{ demo: true }}>See a demo report</Link>
                </Button>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">No sign-up. Nothing uploaded. Demo uses a fictional business.</p>
            </div>

            {/* Specimen card */}
            <figure className="border border-border bg-paper p-6 shadow-sm" aria-label="Illustration of the report's friction map">
              <figcaption className="flex justify-between border-b border-foreground pb-3">
                <span className="eyebrow">Friction map</span>
                <span className="eyebrow text-muted-foreground">Illustration</span>
              </figcaption>
              <div className="mt-5 grid gap-5">
                {[
                  { k: "People", s: 72, b: "high" as const },
                  { k: "Process", s: 58, b: "moderate" as const },
                  { k: "Systems", s: 41, b: "moderate" as const },
                ].map((r) => (
                  <div key={r.k}>
                    <div className="mb-1.5 flex justify-between text-sm">
                      <span>{r.k}</span>
                      <span className="font-mono text-xs text-muted-foreground">{r.s}/100</span>
                    </div>
                    <ScoreBar score={r.s} band={r.b} />
                  </div>
                ))}
              </div>
              <div className="mt-6 border-t border-border pt-4">
                <p className="eyebrow text-muted-foreground">Investigate first</p>
                <p className="mt-2 font-display text-2xl leading-tight">Work is queuing for sign-off</p>
                <p className="mt-1 text-xs text-muted-foreground">Evidence: self-reported · Estimate: range shown · Verified: 0</p>
              </div>
            </figure>
          </div>
        </section>

        {/* Three lenses */}
        <section className="mx-auto max-w-6xl px-5 py-20">
          <p className="eyebrow text-muted-foreground">How it looks at your business</p>
          <h2 className="mt-3 max-w-2xl font-display text-4xl sm:text-5xl">Diagnose people, processes and systems. Verify before recommending tools.</h2>
          <div className="mt-12 grid gap-10 sm:grid-cols-3">
            {[
              { n: "01", t: "People", d: "Where work changes hands, waits for sign-off, or depends on someone chasing it." },
              { n: "02", t: "Process", d: "How fast enquiries get answered, how they're tracked, and how often mistakes cause rework." },
              { n: "03", t: "Systems", d: "How many tools you use, whether they share data, and how much gets typed twice." },
            ].map((x) => (
              <div key={x.n} className="border-t border-foreground pt-4">
                <p className="font-mono text-sm text-copper-strong">{x.n}</p>
                <h3 className="mt-2 font-display text-3xl">{x.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{x.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Does / does not */}
        <section className="bg-ink text-ink-foreground">
          <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 md:grid-cols-2">
            <div>
              <p className="eyebrow text-copper-soft">What it does</p>
              <ul className="mt-6 grid gap-4">
                {DOES.map((d) => (
                  <li key={d} className="flex gap-3 border-t border-ink-border pt-4">
                    <Check className="mt-0.5 size-4 shrink-0 text-copper-soft" />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="eyebrow text-ink-muted">What it does not do</p>
              <ul className="mt-6 grid gap-4">
                {DOES_NOT.map((d) => (
                  <li key={d} className="flex gap-3 border-t border-ink-border pt-4 text-ink-muted">
                    <Minus className="mt-0.5 size-4 shrink-0" />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Tiers */}
        <section className="mx-auto max-w-6xl px-5 py-20">
          <p className="eyebrow text-muted-foreground">Indicative service offerings</p>
          <h2 className="mt-3 font-display text-4xl sm:text-5xl">Start free. Verify if it matters.</h2>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            The Free X-Ray is automated. The paid tiers are delivered by a person at Aetheris Technology and are not sold automatically on this site — prices are
            indicative and scope is agreed by email first.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {TIERS.map((t, i) => (
              <article key={t.id} className={i === 0 ? "flex flex-col border border-foreground bg-paper p-6" : "flex flex-col border border-border bg-paper p-6"}>
                <p className="eyebrow text-copper-strong">{i === 0 ? "Automated" : "Manual service"}</p>
                <h3 className="mt-2 font-display text-3xl">{t.name}</h3>
                <p className="mt-1 font-mono text-2xl">
                  {t.price}
                  {i > 0 && <span className="ml-2 text-xs text-muted-foreground">indicative</span>}
                </p>
                <p className="mt-3 text-sm text-muted-foreground">{t.summary}</p>
                <ul className="mt-5 grid flex-1 gap-2 text-sm">
                  {t.includes.map((x) => (
                    <li key={x} className="flex gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-copper" />
                      {x}
                    </li>
                  ))}
                </ul>
                <p className="mt-5 border-t border-border pt-3 text-xs text-muted-foreground">{t.delivery}</p>
                <Button asChild className="mt-5" variant={i === 0 ? "default" : "outline"}>
                  {i === 0 ? <Link to="/xray" search={{}}>Start the free X-Ray</Link> : <Link to="/verify">Enquire by email</Link>}
                </Button>
              </article>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-border">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 md:grid-cols-[1fr_2fr]">
            <h2 className="font-display text-4xl">Questions</h2>
            <Accordion type="single" collapsible className="border-t border-border">
              {FAQ.map((f) => (
                <AccordionItem key={f.q} value={f.q}>
                  <AccordionTrigger className="text-left text-base">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="border-t border-border bg-copper-wash">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-5 py-16 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="max-w-xl font-display text-4xl">Four minutes to know what to look at first.</h2>
            <Button asChild size="lg">
              <Link to="/xray" search={{}}>
                Start the free X-Ray <ArrowRight />
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}