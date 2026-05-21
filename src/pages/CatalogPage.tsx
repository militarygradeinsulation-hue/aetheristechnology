import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { SEOHead } from '@/components/SEOHead';
import { ServicesPricing } from '@/components/ServicesPricing';
import { Button } from '@/components/ui/button';
import { INFOGRAPHICS } from '@/lib/infographics';

const CatalogPage: React.FC = () => {
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Premium Tech Suite, Tools, Packages & Monthly Plans | Aetheris"
        description="Browse the Aetheris Premium Tech Suite: one-time tools, monthly subscriptions, and mix-and-match bundles. Thumbnails, pricing, and instant checkout."
        path="/catalog"
        keywords="aetheris premium tech suite, business tools pricing, monthly subscription, mix and match, sales tools, CRM tools"
        breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Premium Tech Suite', path: '/catalog' }]}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setContactOpen(true)} />
        <main className="pt-28">
          <div className="px-4 max-w-3xl mx-auto mb-6">
            <div className="glass rounded-sm border border-amber/40 px-4 py-3 text-center">
              <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-1">
                Proprietary · Built In-House
              </div>
              <p className="text-sm text-foreground/90 leading-snug">
                All technology in this suite is <span className="text-amber font-semibold">proprietary and personally built in-house</span>. You won't see reskinned tools or fake AI agencies here.
              </p>
            </div>
          </div>
          <div className="px-4 max-w-5xl mx-auto text-center mb-8">
            <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">
              Showcase
            </div>
            <h1 className="font-forensic text-4xl md:text-6xl font-bold text-foreground leading-[1.05]">
              New Tech Launch <span className="text-amber">Showcase</span>
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mt-3 max-w-2xl mx-auto mb-6">
              Every new system our company builds gets displayed here. Live, working, and yours to try.
            </p>
            <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">
              Premium Tech Suite · One-time + Monthly
            </div>
            <h2 className="font-forensic text-3xl md:text-5xl font-bold text-foreground leading-[1.05]">
              Every tool, every package, every price.
            </h2>
            <p className="text-lg text-muted-foreground mt-4 max-w-2xl mx-auto">
              Buy à la carte, subscribe monthly and save 25–40%, or mix and match across categories. No login required.
            </p>
          </div>

          <ServicesPricing />

          {/* Resume Forensics teaser — moved from Home */}
          <section className="px-4 py-12">
            <div className="max-w-5xl mx-auto forensic-tile rounded-sm border border-amber/40 p-6 md:p-10">
              <div className="grid gap-6 md:gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] items-center">
                <div className="relative rounded-sm overflow-hidden border border-amber/20 bg-background/40 aspect-square">
                  <img src={INFOGRAPHICS.homeResumeForensics} alt="Resume under forensic light with fit-score gauge" width={1024} height={1024} loading="lazy" className="w-full h-full object-cover" />
                  <span className="absolute bottom-2 right-2 font-case text-[9px] uppercase tracking-widest text-amber/80 bg-background/70 px-2 py-0.5 rounded-sm border border-amber/20">Aetheris AI Studio</span>
                </div>
                <div>
                  <div className="font-case text-[10px] uppercase tracking-widest text-amber mb-2">
                    New · Live AI tool
                  </div>
                  <h2 className="font-forensic text-3xl md:text-4xl font-bold text-foreground mb-3">
                    Hire the wrong person and your business <span className="text-crimson">starts leaking</span>.
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    You know the feeling. The resume looks great, the interview goes fine, and six months later you're paying severance, re-posting the job, and explaining to your team why the seat is empty again. Every bad hire is a leak, salary, ramp time, lost deals, the customers they touched, the people who quit because of them.
                  </p>
                  <p className="text-muted-foreground mb-5">
                    Drop the resume in. We scan their actual work history against your actual company in 90 seconds and tell you, in plain English, whether this person will plug a leak or open a new one. <span className="text-amber font-semibold">$20 per scan.</span> Cheaper than one bad lunch interview.
                  </p>
                  <Button asChild size="lg" className="font-bold">
                    <Link to="/resume-forensics">
                      Run a resume now <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
      <ContactModal isOpen={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  );
};

export default CatalogPage;
