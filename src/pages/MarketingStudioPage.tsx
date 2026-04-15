import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEOHead } from '@/components/SEOHead';

const MarketingStudioPage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead
        title="Free AI Marketing Studio | Aetheris AI"
        description="Create scroll-stopping marketing posts with our free AI-powered studio. No login required."
        path="/marketing-studio"
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
        <span className="text-sm font-semibold text-foreground">AI Marketing Studio</span>
        <span className="ml-auto text-xs bg-amber/20 text-amber px-2 py-0.5 rounded-full font-medium">Free Tool</span>
      </div>
      <iframe
        src="https://studio--hookai-m7nx0.us-central1.hosted.app/"
        className="flex-1 w-full border-0"
        title="AI Marketing Studio"
        allow="clipboard-write"
      />
    </div>
  );
};

export default MarketingStudioPage;
