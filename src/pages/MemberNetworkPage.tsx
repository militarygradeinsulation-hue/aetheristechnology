import { SEOHead } from "@/components/SEOHead";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Link } from "react-router-dom";
import { Users, Shield, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const HOW_IT_WORKS = [
  {
    step: 1,
    title: "Complete your profile",
    description: "Share context about your business, industry, and what you bring to a relationship.",
  },
  {
    step: 2,
    title: "Set your private goals",
    description: "Define what you are looking for. Goals are private until both sides consent to an introduction.",
  },
  {
    step: 3,
    title: "Submit your introduction ask",
    description: "Describe who you are and the kind of connection you are seeking. This is your standing ask.",
  },
  {
    step: 4,
    title: "Receive introductions with consent",
    description: "Introductions happen only when context aligns and both parties agree. No cold outreach.",
  },
];

export default function MemberNetworkPage() {
  return (
    <>
      <SEOHead
        title="Aetheris Member Network — Business Connections Built on Context"
        description="A private network where established business owners connect with context and mutual consent. No cold outreach. No unsolicited contact."
        path="/network"
      />
      <Navbar onContactClick={() => {}} />
      <main className="min-h-screen bg-background text-foreground">
        {/* ── Hero (AC-1) ──────────────────────────────────────────────── */}
        <section className="relative pt-28 pb-20 px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Users className="w-4 h-4" />
              Member Network
            </div>

            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6 leading-tight">
              A network built on context,<br className="hidden sm:block" /> not coincidence.
            </h1>

            <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-4 leading-relaxed">
              The Aetheris Member Network connects established businesses to one
              another — with context about who they are and mutual consent before
              any introduction is made.
            </p>

            <p className="text-sm text-muted-foreground max-w-lg mx-auto mb-8">
              This is an early-access network. Membership is applied for, not
              automatic. The quality of connections depends on the fit between
              members, not on any platform guarantee.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" asChild>
                <Link to="/signup">
                  Apply for membership <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/login">Sign in</Link>
              </Button>
            </div>
          </div>

          {/* Demo flow — clearly labeled */}
          <div className="max-w-xl mx-auto mt-16">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
              Example connection flow (demo)
            </p>
            <div className="rounded-2xl border border-border bg-card/60 backdrop-blur p-6 text-left opacity-80 pointer-events-none select-none" aria-hidden="true">
              <div className="space-y-3">
                {["Profile reviewed", "Goals aligned", "Ask matched", "Introduction sent"].map((label, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-foreground/70">{label}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-muted-foreground">This is a demo illustration only — not a live preview.</p>
            </div>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────────────── */}
        <section className="py-20 px-4 bg-muted/30">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-12">How the network works</h2>
            <ol className="space-y-8">
              {HOW_IT_WORKS.map((item) => (
                <li key={item.step} className="flex gap-4">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">
                    {item.step}
                  </span>
                  <div>
                    <h3 className="font-semibold mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Trust bar ────────────────────────────────────────────────── */}
        <section className="py-16 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <Shield className="w-8 h-8 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-3">Consent before contact</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              No member's information is shared with another without both parties
              agreeing to the introduction first. There are no automated
              connection requests, no cold-outreach features, and no integrations
              that share your data with outside platforms without your explicit
              approval.
            </p>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────── */}
        <section className="py-20 px-4 border-t border-border">
          <div className="max-w-lg mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to apply?</h2>
            <p className="text-muted-foreground mb-8">
              Applications are reviewed individually. If your business is a fit
              you will receive next steps.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" asChild>
                <Link to="/signup">
                  Apply for membership <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
              <Button size="lg" variant="ghost" asChild>
                <Link to="/login">Already a member? Sign in</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
