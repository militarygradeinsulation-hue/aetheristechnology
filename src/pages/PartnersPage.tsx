import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { ArrowRight, Mail, Phone } from 'lucide-react';
import {
  BOOK_MEETING_URL,
  CONTACT_EMAIL,
  CONTACT_EMAIL_HREF,
  CONTACT_PHONE,
  CONTACT_PHONE_HREF,
  RUN_AUDIT_URL,
} from '@/lib/links';

/**
 * Public partner program page.
 *
 * Only the terms supplied by Aetheris appear here: a tracked partner ID,
 * Aetheris performs the audit, and a 15% referral fee. No payout schedule,
 * tier ladder or contract term is implied, because none has been confirmed.
 */

const HOW: { n: string; title: string; body: string }[] = [
  {
    n: '01',
    title: 'You get a tracked partner ID',
    body: 'Every business you introduce is attributed to you automatically, so credit does not depend on anyone remembering the introduction.',
  },
  {
    n: '02',
    title: 'Aetheris performs the audit',
    body: 'We run the Revenue Leak Audit and deliver the Golden Report. You do not need to run the work or support the tooling.',
  },
  {
    n: '03',
    title: 'You earn a 15% referral fee',
    body: 'You earn a 15% referral fee when your tracked introduction becomes a paying client.',
  },
];

const BENEFITS: string[] = [
  'A concrete, evidence-backed first deliverable to open conversations with',
  'No delivery obligation, since Aetheris performs the audit',
  'Attribution handled by your tracked partner ID rather than by memory',
  'A Golden Report your client keeps, whether or not further work follows',
];

const PartnersPage: React.FC = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Aetheris Partner Program | Revenue Leak Audits for Your Clients"
        description="Consultants, fractional executives and service providers can introduce Aetheris through a tracked partner relationship. Aetheris performs the Revenue Leak Audit and pays a 15% referral fee when your introduction becomes a paying client."
        path="/partners"
        keywords="aetheris partner program, referral partner, consultant referral, revenue leak audit partner"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Partner Program', path: '/partners' },
        ]}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />

        <main className="pt-28 pb-20 px-4">
          <div className="max-w-4xl mx-auto space-y-16 md:space-y-20">
            <section aria-labelledby="partners-hero" className="max-w-3xl">
              <div className="font-case text-[10px] uppercase tracking-[0.3em] text-amber mb-4">
                Aetheris Partner Program
              </div>
              <h1
                id="partners-hero"
                className="font-forensic text-4xl sm:text-5xl md:text-6xl font-bold text-foreground leading-[1.05]"
              >
                Bring Revenue Leak Audits to your clients.
              </h1>
              <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-2xl">
                Consultants, fractional executives and service providers can introduce Aetheris through a tracked
                partner relationship. You make the introduction. Aetheris performs the audit and delivers the
                Golden Report.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Button
                  asChild
                  size="lg"
                  className="bg-amber text-primary-foreground hover:bg-amber/90 focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <a href={BOOK_MEETING_URL}>
                    Become a Partner
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </a>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <Link to={RUN_AUDIT_URL}>See the Audit First</Link>
                </Button>
              </div>
            </section>

            <section aria-labelledby="partners-how">
              <h2
                id="partners-how"
                className="font-forensic text-2xl sm:text-3xl font-bold text-foreground"
              >
                How the partnership works
              </h2>
              <ol className="mt-7 space-y-3">
                {HOW.map((s) => (
                  <li
                    key={s.n}
                    className="glass rounded-lg border border-border/60 p-5 flex gap-4 items-start"
                  >
                    <span className="font-case text-[11px] tracking-[0.2em] text-amber pt-1 shrink-0">
                      {s.n}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground">{s.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{s.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <section aria-labelledby="partners-benefits">
              <h2
                id="partners-benefits"
                className="font-forensic text-2xl sm:text-3xl font-bold text-foreground"
              >
                Why partners use it
              </h2>
              <ul className="mt-7 grid gap-3 sm:grid-cols-2">
                {BENEFITS.map((b) => (
                  <li
                    key={b}
                    className="glass rounded-lg border border-border/60 p-5 text-sm text-foreground/90 leading-relaxed flex gap-3"
                  >
                    <span className="text-amber shrink-0" aria-hidden>
                      &rsaquo;
                    </span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section
              aria-labelledby="partners-cta"
              className="glass rounded-lg border border-amber/30 p-6 md:p-10"
            >
              <h2
                id="partners-cta"
                className="font-forensic text-2xl sm:text-3xl font-bold text-foreground max-w-2xl leading-tight"
              >
                Ready to introduce your first client?
              </h2>
              <p className="mt-4 text-base text-muted-foreground leading-relaxed max-w-2xl">
                Book a short call and we will set up your tracked partner ID.
              </p>
              <Button
                asChild
                size="lg"
                className="mt-7 bg-amber text-primary-foreground hover:bg-amber/90 focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <a href={BOOK_MEETING_URL}>
                  Become a Partner
                  <ArrowRight className="ml-2 w-4 h-4" />
                </a>
              </Button>
              <div className="mt-7 pt-6 border-t border-border/50 flex flex-col sm:flex-row gap-4 sm:gap-8 text-sm">
                <a
                  href={CONTACT_EMAIL_HREF}
                  className="inline-flex items-center gap-2 text-muted-foreground hover:text-amber transition-colors focus-visible:ring-2 focus-visible:ring-amber rounded-sm"
                >
                  <Mail className="w-4 h-4" aria-hidden />
                  {CONTACT_EMAIL}
                </a>
                <a
                  href={CONTACT_PHONE_HREF}
                  className="inline-flex items-center gap-2 text-muted-foreground hover:text-amber transition-colors focus-visible:ring-2 focus-visible:ring-amber rounded-sm"
                >
                  <Phone className="w-4 h-4" aria-hidden />
                  {CONTACT_PHONE}
                </a>
              </div>
            </section>
          </div>
        </main>

        <Footer />
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default PartnersPage;
