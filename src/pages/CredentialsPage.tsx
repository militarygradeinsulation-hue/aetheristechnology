import React, { useState } from 'react';
import { Download, ArrowRight } from 'lucide-react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { generateCredentialsPdf } from '@/lib/generateCredentialsPdf';

const BLOCKS: { label: string; body: string }[] = [
  {
    label: 'Background',
    body: '20 years building revenue systems for manufacturers. Marine Corps veteran. Former Director of Strategy at a $25M aerospace firm with SpaceX accounts.',
  },
  {
    label: 'Prior operator roles',
    body: 'Director of Strategy, $25M aerospace contract manufacturer. Revenue operations, CRM implementation, and sales-process rebuild for specialty manufacturing across construction, aerospace, and equipment categories.',
  },
  {
    label: 'Education',
    body: 'B.A. in Psychology and Communication. M.S. in Business Marketing. Foundation in human behavior, persuasion, and the marketing systems that move B2B revenue.',
  },
  {
    label: 'Certifications',
    body: 'Vibe Coding, Semrush (L5: Diamond, sourced from Lovable). Gemini 3 (AI Synthesis), Google. AI for Business, Harvard edX AI for Business Systems. AI Engineer, IBM AI Engineering. HubSpot Certification, HubSpot. Biomedical & Health Science Researchers, CITI Program (Credential ID 76234047). Google Analytics Individual Qualification, Google Operations Center. Marketing & Analytics, Google Digital Academy (Skillshop).',
  },
  {
    label: 'Company',
    body: 'Aetheris. Headquartered in Indianapolis, Indiana. US-wide engagements remote and on-site. Intellectual property held by CTOguy.ai.',
  },
  {
    label: 'Business continuity',
    body: 'Sales calls run by Joseph Toney. Active engagements delivered jointly with operating partner. Client files, contracts, and credentials live in a documented, partner-accessible system. Continuity contact and escalation path provided to every retained client.',
  },
];

const CredentialsPage: React.FC = () => {
  const [contactOpen, setContactOpen] = useState(false);
  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Credentials, Joseph Toney, Aetheris Operator"
        description="20 years building revenue systems for manufacturers. Marine Corps veteran. Former Director of Strategy at a $25M aerospace firm."
        path="/credentials"
        keywords="Joseph Toney, Aetheris operator, manufacturing revenue consultant, Indianapolis"
        breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Credentials', path: '/credentials' }]}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setContactOpen(true)} />
        <main className="px-4 pt-28 pb-16">
          <div className="max-w-3xl mx-auto">
            <div className="mb-10">
              <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-3">
                Credentials · Aetheris
              </div>
              <h1 className="font-forensic text-4xl md:text-5xl font-bold text-foreground leading-tight">
                Joseph Toney, Operator.
              </h1>
              <p className="text-lg text-muted-foreground mt-4">
                Background, certifications, prior operator roles, and the business-continuity plan procurement teams ask for.
              </p>
              <div className="flex flex-wrap gap-3 mt-6">
                <Button onClick={() => generateCredentialsPdf()} className="bg-amber hover:bg-amber/90 text-primary-foreground font-bold">
                  <Download className="w-4 h-4 mr-2" />
                  Download as PDF
                </Button>
                <a
                  href="https://meetings-na2.hubspot.com/jtoney/joseph-toney-business-signal-analyst"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" className="glass-hover border-amber/40 text-amber">
                    Book a 15-min call <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </a>
              </div>
            </div>

            <div className="space-y-6">
              {BLOCKS.map((b) => (
                <section key={b.label} className="forensic-tile rounded-sm border border-border/60 p-6 md:p-7">
                  <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">{b.label}</div>
                  <p className="text-foreground/85 leading-relaxed">{b.body}</p>
                </section>
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
      <ContactModal isOpen={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  );
};

export default CredentialsPage;
