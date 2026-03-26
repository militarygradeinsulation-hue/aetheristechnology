import React, { useState } from 'react';
import { Background } from '@/components/Background';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { RevealOnScroll } from '@/components/RevealOnScroll';
import { Download, FileText, BookOpen, TrendingUp, Shield, BarChart3, Video, Phone, Mail, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SEOHead } from '@/components/SEOHead';

const RESOURCES = [
  {
    title: "The 2026 Digital Influence Playbook",
    subtitle: "Navigating the AI-Discovery Frontier",
    description: "The complete strategic framework for dominating AI-powered search, mastering Generative Engine Optimization (GEO), and building a recommendation-first brand strategy. Includes the Hub-and-Spoke execution model and No-Call Sales System.",
    icon: TrendingUp,
    file: "/resources/The_2026_Digital_Influence_Playbook.pdf",
    tags: ["GEO", "AI Search", "Social Selling"],
  },
  {
    title: "The 2026 Strategic Leadership Manifesto",
    subtitle: "The Jobsian Pivot for the AI-Driven B2B Era",
    description: "How to apply Steve Jobs' principles of radical focus, brutal simplification, and product-led growth to survive the AI-recommendation economy. Includes the Strategic Elimination Framework and GEO Performance Dashboard.",
    icon: BookOpen,
    file: "/resources/The_2026_Strategic_Leadership_Manifesto.pdf",
    tags: ["Leadership", "Product-Led Growth", "Strategy"],
  },
  {
    title: "The 2026 Short-Form Video Primer",
    subtitle: "A Masterclass in Vertical Content Strategy",
    description: "Platform-by-platform breakdown of YouTube Shorts (200B daily views), TikTok (95 min/day usage), and Instagram Reels (30.81% reach rate). Includes the Hub-and-Spoke production model and weekly publishing schedule.",
    icon: Video,
    file: "/resources/The_2026_Short-Form_Video_Primer.pdf",
    tags: ["Video Strategy", "YouTube Shorts", "TikTok"],
  },
  {
    title: "Strategic Briefing: Evolution of Influence",
    subtitle: "Leadership and Brand Discovery in the AI Era",
    description: "Executive overview of the AI-led paradigm shift in search, the decline of traditional discovery (34% B2B traffic drop), short-form video strategy, and the product-led growth model exemplified by Tesla's $0 ad spend.",
    icon: FileText,
    file: "/resources/Strategic_Briefing_The_Evolution_of_Influence_Leadership_and_Brand_Discovery.pdf",
    tags: ["Executive Brief", "AI Disruption", "Brand Strategy"],
  },
  {
    title: "The Authority Factor",
    subtitle: "Earned Media in AI Search Rankings",
    description: "Why earned media accounts for 89% of all AI search citations, how LLM partnerships with media outlets affect your visibility, and why 32% of CMOs are increasing PR budgets specifically for AI optimization.",
    icon: Shield,
    file: "/resources/The_Authority_Factor_Earned_Media.pdf",
    tags: ["Earned Media", "AI Citations", "PR Strategy"],
  },
  {
    title: "Key Metrics for AI Search Performance",
    subtitle: "Measuring Your Brand in the AI Era",
    description: "The three critical KPIs every business must track: AI Visibility Score, Citation Share, and Share of AI Voice. 33% of B2B tech CMOs now report these metrics directly to their CEOs.",
    icon: BarChart3,
    file: "/resources/Key_Metrics_for_AI_Search_Performance.pdf",
    tags: ["KPIs", "AI Metrics", "Performance"],
  },
];

const ResourcesPage = () => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  return (
    <div className="relative min-h-screen">
      <SEOHead
        title="Strategic Playbooks — AI, Marketing & Leadership Frameworks"
        description="Download free strategic playbooks on AI search optimization, digital influence, short-form video strategy, and leadership frameworks. Built from real consulting engagements and 2026 market data."
        path="/resources"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "name": "Aetheris AI Strategic Playbooks",
          "description": "Free downloadable strategic frameworks for business leaders navigating AI-powered markets.",
          "url": "https://aetheris.technology/resources",
          "numberOfItems": RESOURCES.length,
          "itemListElement": RESOURCES.map((r, i) => ({
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
              <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4 font-display">
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

        <section className="pb-16 px-4">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
            {RESOURCES.map((resource, index) => (
              <RevealOnScroll key={resource.title} delay={index * 0.1}>
                <div className="glass p-8 rounded-2xl border border-border hover:border-amber/30 transition-all group h-full flex flex-col">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/30 transition-colors">
                      <resource.icon className="w-6 h-6 text-amber" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-foreground font-display">{resource.title}</h2>
                      <p className="text-sm text-amber font-medium">{resource.subtitle}</p>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm mb-4 flex-grow">{resource.description}</p>
                  <div className="flex flex-wrap gap-2 mb-5">
                    {resource.tags.map(tag => (
                      <span key={tag} className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">{tag}</span>
                    ))}
                  </div>
                  <a href={resource.file} download className="block">
                    <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                      <Download className="w-4 h-4" /> Download PDF
                    </Button>
                  </a>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </section>

        <section className="pb-24 px-4">
          <div className="max-w-4xl mx-auto">
            <RevealOnScroll>
              <div className="glass p-10 md:p-14 rounded-2xl border-2 border-amber/30 text-center relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber/10 rounded-full blur-3xl" />
                <div className="relative z-10">
                  <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 font-display">
                    Reading Won't Fix Your <span className="text-gradient-amber">Business</span>
                  </h2>
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                    These playbooks show you what's broken. The 14-Day Operational Systems Diagnostic shows you exactly where — and builds the systems to fix it.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <a href="tel:+13173762110">
                      <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                        <Phone className="mr-2 w-5 h-5" /> Call Now — (317) 376-2110
                      </Button>
                    </a>
                    <a href="mailto:aetheris.technology@outlook.com?subject=14-Day%20Diagnostic%20Inquiry">
                      <Button size="lg" variant="outline" className="glass-hover border-border">
                        <Mail className="mr-2 w-5 h-5" /> Email to Start
                      </Button>
                    </a>
                    <a href="https://gamma.app/docs/The-14-Day-Operational-Systems-Diagnostic-e8i6rcv30d33m8s" target="_blank" rel="noopener noreferrer">
                      <Button size="lg" variant="outline" className="glass-hover border-amber/30 text-amber hover:bg-amber/10">
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
