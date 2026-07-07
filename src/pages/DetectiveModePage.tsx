import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileSearch } from 'lucide-react';
import { DetectiveModeStandalone } from '@/components/DetectiveModeStandalone';

const DetectiveModePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Detective Mode | Aetheris Business Forensics</title>
        <meta
          name="description"
          content="Run a forensic detective sweep on any business — website scan, RDAP, enrichment, and leak analysis in one operator console."
        />
        <link rel="canonical" href="https://aetheris.technology/detective" />
      </Helmet>

      <header className="border-b border-border/60 bg-card/40 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Aetheris
          </Link>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-amber-400/80">
            <FileSearch className="w-4 h-4" />
            Detective Mode
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-serif text-3xl md:text-5xl leading-tight mb-3">
            Detective Mode
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Drop in any website. Aetheris pulls the scan, RDAP, scrape, and
            enrichment — then builds a forensic case file you can act on.
          </p>
        </div>
        <DetectiveModeStandalone />
      </main>
    </div>
  );
};

export default DetectiveModePage;
