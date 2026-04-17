import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEOHead } from '@/components/SEOHead';

const SalesCompassPage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead
        title="Free AI Sales Compass | Aetheris AI"
        description="AI sales automation and workflow guidance to sharpen strategy and close more deals. Free tool, no login."
        path="/sales-compass"
        keywords="AI sales automation, workflow automation, AI sales agents, conversational AI, sales AI consultant, B2B AI consulting, sales process automation"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Sales Compass', path: '/sales-compass' },
        ]}
        faqs={[
          { question: 'What is the AI Sales Compass?', answer: 'A free Aetheris AI tool that produces sales strategy, workflow automation recommendations, and AI agent playbooks tailored to your sales motion.' },
          { question: 'How does AI improve B2B sales?', answer: 'AI compresses prospecting and follow-up via lead-scoring agents, auto-personalized outbound, conversational qualification, and CRM hygiene automation — letting reps spend more time closing.' },
          { question: 'Is the Sales Compass really free?', answer: 'Yes. No login, no credit card. For full sales operations rebuilds we offer Rapid Evaluation ($750), 14-Day Diagnostic ($7,500), or Custom Implementation ($25,000+).' },
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
        <span className="text-sm font-semibold text-foreground">Sales Compass</span>
        <span className="ml-auto text-xs bg-amber/20 text-amber px-2 py-0.5 rounded-full font-medium">Free Tool</span>
      </div>
      <iframe
        src="https://studio--salescompass-cfpf9.us-central1.hosted.app/"
        className="flex-1 w-full border-0"
        title="Sales Compass"
        allow="clipboard-write"
      />
    </div>
  );
};

export default SalesCompassPage;
