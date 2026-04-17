import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEOHead } from '@/components/SEOHead';

const AIConsultantPage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead
        title="Free AI Business Consultant | Aetheris AI"
        description="AI-powered business consulting advice. Free AI strategy consulting tool, no login. AI consultant Indianapolis."
        path="/ai-consultant"
        keywords="AI consultant Indianapolis, AI strategy consulting, AI maturity assessment, free AI consultant, AI adoption roadmap, B2B AI consulting, technology consultant Indianapolis"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'AI Business Consultant', path: '/ai-consultant' },
        ]}
        faqs={[
          { question: 'What is the free AI Business Consultant tool?', answer: 'A free, no-login AI chat tool from Aetheris AI that gives you on-demand business consulting advice — strategy, AI use cases, operations — backed by our consulting framework.' },
          { question: 'Is the AI consultant really free?', answer: 'Yes. No login, no credit card. For deeper engagements, you can book Aetheris AI consulting (Rapid Evaluation $750, 14-Day Diagnostic $7,500, or Custom Implementation $25,000+).' },
          { question: 'How is this different from ChatGPT?', answer: 'It is fine-tuned for B2B AI consulting questions, runs against the Aetheris consulting framework, and links directly to actionable next steps with our team.' },
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
        <span className="text-sm font-semibold text-foreground">AI Business Consultant</span>
        <span className="ml-auto text-xs bg-amber/20 text-amber px-2 py-0.5 rounded-full font-medium">Free Tool</span>
      </div>
      <iframe
        src="https://studio--ctoguy-ai-consultant-bot.us-central1.hosted.app/"
        className="flex-1 w-full border-0"
        title="AI Business Consultant"
        allow="clipboard-write"
      />
    </div>
  );
};

export default AIConsultantPage;
