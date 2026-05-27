import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, MapPin, Phone, Mail } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { CitedFactsBlock } from '@/components/seo/CitedFactsBlock';
import { LeakAuditHowToSchema } from '@/components/seo/LeakAuditHowToSchema';
import { INDIANAPOLIS_FACTS, LEAK_AUDIT_FAQS } from '@/components/seo/seoContent';
import { BuyerIntentFaq } from '@/components/seo/BuyerIntentFaq';

type LocationKey = 'indianapolis' | 'indiana';

interface LocationConfig {
  slug: LocationKey;
  geoName: string;
  fullName: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  intro: string;
  areaServed: string[];
}

const LOCATIONS: Record<LocationKey, LocationConfig> = {
  indianapolis: {
    slug: 'indianapolis',
    geoName: 'Indianapolis',
    fullName: 'Indianapolis, Indiana',
    metaTitle: 'Business Forensics in Indianapolis | Aetheris',
    metaDescription:
      'Indianapolis Business Forensics Operator. Find revenue leaks in your Indianapolis business. Free Leak Audit, $2,500 Forensic Diagnostic, $7,500 14-Day Operational Diagnostic.',
    h1: 'Business Forensics in Indianapolis',
    intro:
      'Aetheris is an Indianapolis-based Business Forensics Operator. We expose revenue leaks Indianapolis owners can\'t see from the inside — broken systems, dropped follow-ups, vocabulary friction, brand contradictions — then rebuild the broken systems causing them.',
    areaServed: ['Indianapolis', 'Carmel', 'Fishers', 'Noblesville', 'Greenwood', 'Zionsville', 'Westfield'],
  },
  indiana: {
    slug: 'indiana',
    geoName: 'Indiana',
    fullName: 'Indiana',
    metaTitle: 'Business Forensics Across Indiana | Aetheris',
    metaDescription:
      'Indiana Business Forensics Operator headquartered in Indianapolis. Revenue leak audits and operational diagnostics for businesses across Indianapolis, Fort Wayne, Bloomington, Evansville, and the entire state.',
    h1: 'Business Forensics Across Indiana',
    intro:
      'Aetheris is an Indiana Business Forensics Operator headquartered in Indianapolis. We serve owner-led businesses across the entire state — Indianapolis, Fort Wayne, Bloomington, Evansville, South Bend, Carmel — with the same forensic methodology used by clients nationwide.',
    areaServed: ['Indianapolis', 'Fort Wayne', 'Bloomington', 'Evansville', 'South Bend', 'Carmel', 'Fishers', 'Lafayette', 'Terre Haute'],
  },
};

const LocationPage: React.FC = () => {
  const params = useParams();
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/indianapolis';
  const key: LocationKey = pathname.includes('indiana') && !pathname.includes('indianapolis')
    ? 'indiana'
    : 'indianapolis';
  const config = LOCATIONS[key];
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  const pageUrl = `https://aetheris.technology/${config.slug}`;

  const localBusinessSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['LocalBusiness', 'ProfessionalService'],
        '@id': `${pageUrl}#localbusiness`,
        name: 'Aetheris — Business Forensics Operator',
        description: config.metaDescription,
        url: pageUrl,
        telephone: '+1-317-376-2110',
        email: 'hello@aetheris.technology',
        priceRange: '$0 - $25,000+',
        address: {
          '@type': 'PostalAddress',
          streetAddress: 'Downtown Indianapolis',
          addressLocality: 'Indianapolis',
          addressRegion: 'IN',
          postalCode: '46204',
          addressCountry: 'US',
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: 39.7684,
          longitude: -86.1581,
        },
        areaServed: config.areaServed.map((c) => ({ '@type': 'City', name: c })),
        openingHoursSpecification: [
          {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            opens: '08:00',
            closes: '18:00',
          },
        ],
        sameAs: [
          'https://www.linkedin.com/in/thejosephtoney',
          'https://aetheris.technology',
        ],
        founder: {
          '@type': 'Person',
          name: 'Joseph Toney',
          jobTitle: 'Business Forensics Operator',
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://aetheris.technology/' },
          { '@type': 'ListItem', position: 2, name: config.geoName, item: pageUrl },
        ],
      },
    ],
  };

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title={config.metaTitle}
        description={config.metaDescription}
        path={`/${config.slug}`}
        keywords={`business forensics ${config.geoName}, revenue leak audit ${config.geoName}, operational diagnostic ${config.geoName}, AI consultant ${config.geoName}, business consultant Indianapolis`}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: config.geoName, path: `/${config.slug}` },
        ]}
        jsonLd={localBusinessSchema}
      />
      <LeakAuditHowToSchema pageUrl={pageUrl} />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />

        <main className="pt-28 pb-16 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 font-case text-[10px] uppercase tracking-widest text-amber mb-4 px-3 py-1 border border-amber/30 rounded-sm">
              <MapPin className="w-3 h-3" />
              {config.fullName}
            </div>
            <h1 className="font-forensic text-4xl md:text-6xl font-bold text-foreground leading-[1.05] mb-6">
              {config.h1}
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl mb-8" data-speakable="true">
              {config.intro}
            </p>

            <div className="flex flex-wrap gap-3 mb-12">
              <Button asChild size="lg" className="bg-amber text-primary-foreground hover:bg-amber/90">
                <Link to="/leak-audit">
                  Run the free Leak Audit
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/diagnostic">Book the $2,500 Forensic Diagnostic</Link>
              </Button>
            </div>

            <section className="glass rounded-md border border-border/60 p-6 md:p-8 mb-8">
              <h2 className="font-forensic text-2xl md:text-3xl font-bold text-foreground mb-4">
                What an Aetheris engagement looks like in {config.geoName}
              </h2>
              <ol className="space-y-3 text-foreground/85 leading-relaxed">
                <li><strong className="text-amber">1. Free Leak Audit ($0).</strong> 14-question self-scan. PDF case file with an estimated annual leak in dollars.</li>
                <li><strong className="text-amber">2. Forensic Diagnostic ($2,500).</strong> Operator-led walk-through with Joseph Toney. Flagged leak list, prioritization, rebuild order. Fee applied 1:1 toward any engagement.</li>
                <li><strong className="text-amber">3. 14-Day Operational Diagnostic ($7,500).</strong> Full forensic breakdown of workflow inefficiencies, disconnected systems, and automation opportunities. Guaranteed.</li>
                <li><strong className="text-amber">4. Implementation Retainer ($15K/mo).</strong> 3-month minimum. We execute the prioritized fixes ourselves. Available only to Diagnostic clients.</li>
              </ol>
            </section>

            <section className="glass rounded-md border border-border/60 p-6 md:p-8">
              <h2 className="font-forensic text-2xl md:text-3xl font-bold text-foreground mb-4">
                {config.geoName} service area
              </h2>
              <p className="text-foreground/85 leading-relaxed mb-4">
                On-site forensic walk-throughs are available across {config.areaServed.slice(0, -1).join(', ')}, and {config.areaServed.slice(-1)}. Remote engagements are identical in deliverable and price.
              </p>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <a href="tel:+13173762110" className="inline-flex items-center gap-2 hover:text-amber">
                  <Phone className="w-4 h-4" /> (317) 376-2110
                </a>
                <a href="mailto:hello@aetheris.technology" className="inline-flex items-center gap-2 hover:text-amber">
                  <Mail className="w-4 h-4" /> hello@aetheris.technology
                </a>
              </div>
            </section>
          </div>

          <CitedFactsBlock
            heading={`${config.geoName} Forensic Facts`}
            facts={INDIANAPOLIS_FACTS}
            pageUrl={pageUrl}
          />

          <BuyerIntentFaq
            heading={`${config.geoName} Buyer Questions`}
            faqs={LEAK_AUDIT_FAQS.slice(0, 10)}
            pageUrl={pageUrl}
          />
        </main>
        <Footer />
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default LocationPage;
