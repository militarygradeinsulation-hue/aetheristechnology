import React, { useState } from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { RevealOnScroll } from '@/components/RevealOnScroll';
import { Download, FileText, BookOpen, TrendingUp, Shield, BarChart3, Video, Phone, Mail, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SEOHead } from '@/components/SEOHead';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PlaybookTopicBrowser } from '@/components/PlaybookTopicBrowser';
import { ParallaxTilt } from '@/components/ParallaxTilt';

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  TrendingUp,
  BookOpen,
  Video,
  FileText,
  Shield,
  BarChart3,
};

const ResourcesPage = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  const { data: playbooks, isLoading } = useQuery({
    queryKey: ['playbooks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('playbooks')
        .select('*')
        .order('published_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const existingTitles = (playbooks || []).map(p => p.title);

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Strategic Playbooks — AI & Marketing | Aetheris"
        description="Free playbooks on AI search, digital influence, short-form video, and leadership. Built from real consulting engagements."
        path="/resources"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "name": "Aetheris AI Strategic Playbooks",
          "description": "Free downloadable strategic frameworks for business leaders navigating AI-powered markets.",
          "url": "https://aetheris.technology/resources",
          "numberOfItems": playbooks?.length || 0,
          "itemListElement": (playbooks || []).map((r, i) => ({
            "@type": "ListItem",
            "position": i + 1,
            "name": r.title,
            "description": r.description
          }))
        }}
      />
      <Background />
      <div className="relative z-10">
        <Navbar onContactClick={() => setIsContactModalOpen(true)} />

        <section className="pt-32 pb-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <RevealOnScroll>
              <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4 font-display text-float">
                Strategic <span className="text-amber glow-text">Playbooks</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-4">
                The frameworks, data, and methodologies behind our Co-CEO consulting model. 
                Download them. Study them. Then call us when you realize you need help executing.
              </p>
              <p className="text-sm text-muted-foreground">
                Built from real engagements. Backed by 2026 market data. No fluff.
              </p>
            </RevealOnScroll>
          </div>
        </section>

        {/* Free Playbooks */}
        <section className="pb-16 px-4">
          <div className="max-w-6xl mx-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-amber" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(playbooks || []).map((resource, index) => {
                  const IconComp = ICON_MAP[resource.icon_name || 'FileText'] || FileText;
                  return (
                    <RevealOnScroll key={resource.id} delay={index * 0.1} variant="shimmer-in">
                      <ParallaxTilt intensity={0.6}>
                        <div className="glass glass-shine shimmer-border hover-lift p-8 rounded-2xl border border-border hover:border-amber/30 transition-all group h-full flex flex-col">
                          <div className="flex items-start gap-4 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/30 transition-colors animate-float-slow">
                              <IconComp className="w-6 h-6 text-amber" />
                            </div>
                            <div>
                              <h2 className="text-xl font-bold text-foreground font-display">{resource.title}</h2>
                              <p className="text-sm text-amber font-medium">{resource.subtitle}</p>
                            </div>
                          </div>
                          <p className="text-muted-foreground text-sm mb-4 flex-grow">{resource.description}</p>
                          <div className="flex flex-wrap gap-2 mb-5">
                            {(resource.tags || []).map((tag: string) => (
                              <span key={tag} className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">{tag}</span>
                            ))}
                          </div>
                          <a href={resource.file_url} download className="block">
                            <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2 cursor-glow">
                              <Download className="w-4 h-4" /> Download PDF
                            </Button>
                          </a>
                        </div>
                      </ParallaxTilt>
                    </RevealOnScroll>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* On-Demand Playbook Generator */}
        <PlaybookTopicBrowser existingTitles={existingTitles} />

        <section className="pb-24 px-4">
          <div className="max-w-4xl mx-auto">
            <RevealOnScroll>
              <div className="glass glass-shine shimmer-border hover-lift p-10 md:p-14 rounded-2xl border-2 border-amber/30 text-center relative overflow-hidden animate-glow-pulse">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber/10 rounded-full blur-3xl animate-float-slow" />
                <div className="relative z-10">
                  <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 font-display text-float">
                    Reading Won't Fix Your <span className="text-gradient-amber">Business</span>
                  </h2>
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                    These playbooks show you what's broken. The 14-Day Operational Systems Diagnostic shows you exactly where — and builds the systems to fix it.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <a href="tel:+13173762110">
                      <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground cursor-glow hover-lift">
                        <Phone className="mr-2 w-5 h-5" /> Call Now — (317) 376-2110
                      </Button>
                    </a>
                    <a href="mailto:aetheris.technology@outlook.com?subject=14-Day%20Diagnostic%20Inquiry">
                      <Button size="lg" variant="outline" className="glass-hover border-border hover-lift">
                        <Mail className="mr-2 w-5 h-5" /> Email to Start
                      </Button>
                    </a>
                    <a href="https://gamma.app/docs/The-14-Day-Operational-Systems-Diagnostic-e8i6rcv30d33m8s" target="_blank" rel="noopener noreferrer">
                      <Button size="lg" variant="outline" className="glass-hover border-amber/30 text-amber hover:bg-amber/10 hover-lift">
                        View the Diagnostic <ArrowRight className="ml-2 w-5 h-5" />
                      </Button>
                    </a>
                  </div>
                </div>
              </div>
            </RevealOnScroll>
          </div>
        </section>

        <Footer />
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
    </div>
  );
};

export default ResourcesPage;
