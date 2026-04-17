import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEOHead } from '@/components/SEOHead';

const MarketingStrategistPage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead
        title="Free AI Marketing Strategist | Aetheris AI"
        description="AI marketing automation and conversational AI strategy. Free tool — no login. Indianapolis-based AI consulting."
        path="/marketing-strategist"
        keywords="AI marketing automation, conversational AI, AI marketing strategist, marketing workflow automation, AI for marketing, performance optimization, AI consultant Indianapolis"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Marketing Strategist', path: '/marketing-strategist' },
        ]}
        faqs={[
          { question: 'What is the AI Marketing Strategist?', answer: 'A free AI tool from Aetheris AI that generates marketing automation and conversational AI strategy tailored to your business — no login required.' },
          { question: 'Can AI really build my marketing strategy?', answer: 'AI can produce a strong first-draft strategy in minutes — channel mix, messaging, automation, content calendar. For execution and ongoing optimization, our team can implement it end-to-end.' },
          { question: 'What is conversational AI for marketing?', answer: 'Conversational AI uses LLMs to power chatbots, voice agents, and inbound triage that qualify leads, answer questions, and book meetings 24/7 — replacing manual SDR work.' },
        ]}
      />
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Aetheris AI
        </Link>
        <span className="text-muted-foreground/50">|</span>
        <span className="text-sm font-semibold text-foreground">Marketing Hub</span>
        <span className="ml-auto text-xs bg-amber/20 text-amber px-2 py-0.5 rounded-full font-medium">Free Tool</span>
      </div>
      <iframe
        src="https://studio--olsen-ai-marketing-navigator.us-central1.hosted.app/strategist"
        className="flex-1 w-full border-0"
        title="Marketing Hub"
        allow="clipboard-write"
      />
    </div>
  );
};

export default MarketingStrategistPage;
