import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, AlertTriangle, AlertCircle, Info, Lock, Globe, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useTrackEvent } from '@/hooks/useTrackEvent';

interface Gap {
  category: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
}

interface ScanResult {
  score: number;
  gaps: Gap[];
}

const severityConfig = {
  critical: { icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/30' },
  warning: { icon: AlertCircle, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/30' },
  info: { icon: Info, color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border' },
};

const ScoreGauge = ({ score }: { score: number }) => {
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? 'hsl(142, 76%, 36%)' : score >= 40 ? 'hsl(var(--primary))' : 'hsl(var(--destructive))';

  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="54" fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
        <motion.circle
          cx="60" cy="60" r="54" fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round" strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-3xl font-bold text-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {score}
        </motion.span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
};

const GapCard = ({ gap, index }: { gap: Gap; index: number }) => {
  const config = severityConfig[gap.severity];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`p-4 rounded-lg border ${config.border} ${config.bg}`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${config.color}`} />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {gap.category}
            </span>
            <span className={`text-xs font-semibold uppercase ${config.color}`}>
              {gap.severity}
            </span>
          </div>
          <h4 className="font-semibold text-foreground mt-1">{gap.title}</h4>
          <p className="text-sm text-muted-foreground mt-1">{gap.description}</p>
        </div>
      </div>
    </motion.div>
  );
};

export const WebsiteScanner = ({ onContactClick }: { onContactClick: () => void }) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState('');
  const { trackEvent } = useTrackEvent();

  const VISIBLE_GAPS = 2;

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);
    setError('');
    setResult(null);
    trackEvent('website_scan_started', { url: url.trim() });

    try {
      const { data, error: fnError } = await supabase.functions.invoke('scan-website', {
        body: { url: url.trim() },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      setResult(data);
      trackEvent('website_scan_completed', { url: url.trim(), score: data.score });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Scan failed. Please try again.';
      setError(msg);
      trackEvent('website_scan_error', { url: url.trim(), error: msg });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="py-20 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Scan Your Website for <span className="text-primary">Hidden Gaps</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Enter your URL and our AI will analyze your site for SEO issues, weak CTAs, messaging gaps, and missed conversion opportunities — in under 30 seconds.
          </p>
        </div>

        <form onSubmit={handleScan} className="flex gap-3 max-w-lg mx-auto mb-8">
          <div className="relative flex-1">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="yourwebsite.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="pl-9"
              disabled={isLoading}
            />
          </div>
          <Button type="submit" disabled={isLoading || !url.trim()}>
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            {isLoading ? 'Scanning...' : 'Scan'}
          </Button>
        </form>

        {error && (
          <div className="text-center text-destructive text-sm mb-6">{error}</div>
        )}

        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12"
            >
              <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Scraping & analyzing your website...</p>
              <p className="text-xs text-muted-foreground mt-1">This usually takes 15-30 seconds</p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="text-center mb-8">
                <p className="text-sm text-muted-foreground mb-2">Your Digital Health Score</p>
                <ScoreGauge score={result.score} />
              </div>

              <div className="relative">
                {/* Visible gaps */}
                <div className="space-y-3">
                  {result.gaps.slice(0, VISIBLE_GAPS).map((gap, i) => (
                    <GapCard key={i} gap={gap} index={i} />
                  ))}
                </div>

                {/* Gated gaps with fade */}
                {result.gaps.length > VISIBLE_GAPS && (
                  <div className="relative mt-3">
                    <div className="space-y-3 pointer-events-none select-none blur-[2px]" aria-hidden="true">
                      {result.gaps.slice(VISIBLE_GAPS).map((gap, i) => (
                        <GapCard key={i + VISIBLE_GAPS} gap={gap} index={i + VISIBLE_GAPS} />
                      ))}
                    </div>

                    {/* Gradient overlay — heavier fade */}
                    <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/90 to-background flex flex-col items-center justify-end pb-8">
                      <Lock className="w-8 h-8 text-primary mb-3" />
                      <h3 className="text-lg font-semibold text-foreground mb-1">
                        {result.gaps.length - VISIBLE_GAPS} more findings hidden
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
                        Contact us to unlock your full report with actionable recommendations.
                      </p>
                      <Button onClick={onContactClick} size="lg">
                        Unlock Your Full Report
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};
