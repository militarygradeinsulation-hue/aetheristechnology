import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Zap } from 'lucide-react';
import { Button } from './ui/button';

export const BlogMidCTA: React.FC = () => (
  <div className="my-12 glass rounded-2xl p-6 md:p-8 border border-primary/20 text-center">
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-3">
      <Zap className="w-4 h-4" /> Free Assessment
    </div>
    <h3 className="text-xl md:text-2xl font-bold text-foreground font-display mb-2">
      How AI-Ready Is Your Business?
    </h3>
    <p className="text-muted-foreground mb-5 max-w-lg mx-auto">
      Take the free 2-minute assessment and get an instant score with actionable recommendations.
    </p>
    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
      <Link to="/assessment">
        <Button className="bg-primary hover:bg-primary/90">
          Get Your Free Score <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </Link>
      <Link to="/contact">
        <Button variant="outline">Book a Diagnostic</Button>
      </Link>
    </div>
  </div>
);
