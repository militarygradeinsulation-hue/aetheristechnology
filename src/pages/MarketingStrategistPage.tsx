import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEOHead } from '@/components/SEOHead';

const MarketingStrategistPage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead
        title="Free AI Marketing Strategist | Aetheris AI"
        description="Get AI-powered marketing strategy recommendations for your business. Free tool — no login required."
        path="/marketing-strategist"
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
        <span className="text-sm font-semibold text-foreground">AI Marketing Strategist</span>
        <span className="ml-auto text-xs bg-amber/20 text-amber px-2 py-0.5 rounded-full font-medium">Free Tool</span>
      </div>
      <iframe
        src="https://studio--olsen-ai-marketing-navigator.us-central1.hosted.app/strategist"
        className="flex-1 w-full border-0"
        title="AI Marketing Strategist"
        allow="clipboard-write"
      />
    </div>
  );
};

export default MarketingStrategistPage;
