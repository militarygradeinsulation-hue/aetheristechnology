import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, AlertTriangle, AlertCircle, Info, Lock, Globe, FileDown, ArrowRight, Zap, DollarSign, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useTrackEvent } from '@/hooks/useTrackEvent';
import { generatePreviewPdf, type FullReport } from '@/lib/generateScanReport';
import { useAuth } from '@/contexts/AuthContext';
import { StripeEmbeddedCheckout } from '@/components/StripeEmbeddedCheckout';
import { saveToolRun } from '@/lib/toolSaveHelper';
import { isPortalSession } from '@/lib/portalWorkspace';
import { hasValidAdminToken } from '@/lib/adminAuth';

interface Gap {
  category: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  annualCost?: string;
  recommendedFix?: string;
  projectedROI?: string;
}

interface ScanResult extends FullReport {
  gaps: Gap[];
}

const severityConfig = {
  critical: { icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/30', pulse: true },
  warning: { icon: AlertCircle, color: 'text-amber', bg: 'bg-amber/10', border: 'border-amber/30', pulse: false },
  info: { icon: Info, color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border', pulse: false },
};

const SCAN_PHASES = [
  { label: 'Scraping website...', target: 30 },
  { label: 'Analyzing SEO structure...', target: 50 },
  { label: 'Evaluating messaging & CTAs...', target: 70 },
  { label: 'Calculating revenue leaks...', target: 90 },
  { label: 'Generating diagnostic report...', target: 98 },
];

const ScoreGauge = ({ score, grade }: { score: number; grade?: string }) => {
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
        {grade && <span className="text-xs font-semibold text-primary">{grade}</span>}
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
};

const GapCard = ({ gap, index, onFixClick, isLocked }: { gap: Gap; index: number; onFixClick: () => void; isLocked?: boolean }) => {
  const config = severityConfig[gap.severity];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`p-4 rounded-lg border ${config.border} ${config.bg} relative`}
    >
      <div className="flex items-start gap-3">
        <div className="relative">
          <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${config.color}`} />
          {config.pulse && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-destructive rounded-full animate-pulse" />
          )}
        </div>
        <div className="min-w-0 flex-1">
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
          {gap.annualCost && (
            <div className="mt-2 flex flex-wrap gap-3 text-xs">
              <span className="text-destructive font-bold flex items-center gap-1">
                <DollarSign className="w-3 h-3" /> Est. Leak: {gap.annualCost}
              </span>
              {gap.projectedROI && <span className="text-primary font-medium">ROI: {gap.projectedROI}</span>}
            </div>
          )}
        </div>
        <button
          onClick={onFixClick}
          className="shrink-0 px-3 py-1.5 rounded-md bg-destructive/15 hover:bg-destructive/25 border border-destructive/30 text-destructive text-xs font-semibold transition-colors flex items-center gap-1"
        >
          <Zap className="w-3 h-3" />
          {isLocked ? 'Unlock Fix' : 'Fix This'}
        </button>
      </div>
    </motion.div>
  );
};

const ScanProgressBar = ({ phase }: { phase: number }) => {
  const [progress, setProgress] = useState(0);
  const currentPhase = SCAN_PHASES[Math.min(phase, SCAN_PHASES.length - 1)];

  useEffect(() => {
    const target = currentPhase.target;
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= target) { clearInterval(timer); return target; }
        return prev + 1;
      });
    }, 80);
    return () => clearInterval(timer);
  }, [phase, currentPhase.target]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="text-center py-12 max-w-md mx-auto"
    >
      <Progress value={progress} className="h-3 mb-4" />
      <p className="text-lg font-semibold text-foreground mb-1">Analyzing {progress}%</p>
      <p className="text-sm text-muted-foreground">{currentPhase.label}</p>
    </motion.div>
  );
};

const RevenueBanner = ({ gaps }: { gaps: Gap[] }) => {
  const costs = gaps
    .map(g => g.annualCost)
    .filter(Boolean)
    .map(c => parseInt(c!.replace(/[^0-9]/g, ''), 10))
    .filter(n => !isNaN(n));
  if (costs.length === 0) return null;
  const total = costs.reduce((a, b) => a + b, 0);
  const low = Math.round(total * 0.8);
  const high = Math.round(total * 1.3);
  const fmt = (n: number) => '$' + n.toLocaleString();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-center mb-6"
    >
      <p className="text-sm text-destructive font-medium mb-1">Estimated Annual Revenue Leaks</p>
      <p className="text-2xl font-bold text-destructive">{fmt(low)} – {fmt(high)}</p>
    </motion.div>
  );
};

const VISIBLE_GAPS = 2;

const tierCards = [
  {
    name: 'Full Report',
    price: '$49',
    priceId: 'scan_full_report_once',
    tier: 'full_report',
    features: ['All gaps unlocked', 'Revenue leak estimates', 'Strategic roadmap', 'ROI projections', 'Competitive brief PDF'],
    highlight: false,
  },
  {
    name: 'Strategy Blueprint',
    price: '$299',
    priceId: 'scan_strategy_blueprint_once',
    tier: 'strategy_blueprint',
    features: ['Everything in Full Report', 'CRM implementation plan', 'System blueprint', 'Content calendar', 'Fix-it action items + specs'],
    highlight: true,
  },
];

export const WebsiteScanner = ({ onContactClick, hideHeader = false, staffUnlock = false }: { onContactClick: () => void; hideHeader?: boolean; staffUnlock?: boolean }) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [scanPhase, setScanPhase] = useState(0);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState('');
  const [checkoutPriceId, setCheckoutPriceId] = useState<string | null>(null);
  const [purchasedTier, setPurchasedTier] = useState<string | null>(null);
  const { trackEvent } = useTrackEvent();
  const { user } = useAuth();

  // Check for existing purchase when result loads
  const checkPurchase = useCallback(async (scanUrl: string) => {
    if (!user) return;
    // We don't have scan_id on client in this flow, but we can check by user
    const { data } = await supabase
      .from('scan_purchases')
      .select('tier')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);
    if (data && data.length > 0) {
      setPurchasedTier(data[0].tier);
    }
  }, [user]);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);
    setError('');
    setResult(null);
    setScanPhase(0);
    setPurchasedTier(null);
    trackEvent('website_scan_started', { url: url.trim() });

    // Animate phases
    const phaseInterval = setInterval(() => {
      setScanPhase(prev => {
        if (prev >= SCAN_PHASES.length - 1) { clearInterval(phaseInterval); return prev; }
        return prev + 1;
      });
    }, 4000);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('scan-website', {
        body: { url: url.trim() },
      });

      clearInterval(phaseInterval);

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      setResult(data);
      trackEvent('website_scan_completed', { url: url.trim(), score: data.score });
      checkPurchase(url.trim());
    } catch (err) {
      clearInterval(phaseInterval);
      const msg = err instanceof Error ? err.message : 'Scan failed. Please try again.';
      setError(msg);
      trackEvent('website_scan_error', { url: url.trim(), error: msg });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPreview = () => {
    if (!result) return;
    generatePreviewPdf(result);
    trackEvent('scan_preview_downloaded', { url: url.trim(), score: result.score });
  };

  const handleFixClick = (isVisible: boolean) => {
    if (purchasedTier) {
      onContactClick();
    } else {
      // Scroll to tier overlay
      document.getElementById('scan-tier-overlay')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleTierSelect = (priceId: string) => {
    if (!user) {
      window.location.href = `/login?redirect=${encodeURIComponent('/scan')}`;
      return;
    }
    setCheckoutPriceId(priceId);
  };

  const isUnlocked = staffUnlock || !!purchasedTier;

  return (
    <section className={hideHeader ? "py-6 px-4" : "py-20 px-4"}>
      <div className="max-w-3xl mx-auto">
        {!hideHeader && (
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              Scan Your Website for <span className="text-primary">Hidden Gaps</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Enter your URL and our AI will analyze your site for SEO issues, weak CTAs, messaging gaps, and missed conversion opportunities — in under 30 seconds.
            </p>
          </div>
        )}

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
            <Search className="w-4 h-4 mr-1" />
            {isLoading ? 'Scanning...' : 'Scan'}
          </Button>
        </form>

        {error && (
          <div className="text-center text-destructive text-sm mb-6">{error}</div>
        )}

        {/* Checkout Modal */}
        <AnimatePresence>
          {checkoutPriceId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
            >
              <div className="bg-card border border-border rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto relative">
                <button
                  onClick={() => setCheckoutPriceId(null)}
                  className="absolute top-3 right-3 text-muted-foreground hover:text-foreground text-lg"
                >
                  ✕
                </button>
                <h3 className="text-xl font-bold text-foreground mb-4">Complete Purchase</h3>
                <StripeEmbeddedCheckout
                  priceId={checkoutPriceId}
                  customerEmail={user?.email || undefined}
                  returnUrl={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}&type=scan_report&scan_url=${encodeURIComponent(url)}`}
                  metadata={{
                    scan_type: 'report',
                    scan_url: url,
                    user_id: user?.id || '',
                    tier: tierCards.find(t => t.priceId === checkoutPriceId)?.tier || '',
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading Progress Bar */}
        <AnimatePresence>
          {isLoading && <ScanProgressBar phase={scanPhase} />}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Score */}
              <div className="text-center mb-6">
                <p className="text-sm text-muted-foreground mb-2">Your Digital Health Score</p>
                <ScoreGauge score={result.score} grade={result.grade} />
              </div>

              {/* Revenue Leak Banner */}
              <RevenueBanner gaps={result.gaps} />

              {/* Visible gaps */}
              <div className="space-y-3">
                {result.gaps.slice(0, isUnlocked ? result.gaps.length : VISIBLE_GAPS).map((gap, i) => (
                  <GapCard
                    key={i}
                    gap={gap}
                    index={i}
                    onFixClick={() => handleFixClick(i < VISIBLE_GAPS)}
                    isLocked={!isUnlocked && i >= VISIBLE_GAPS}
                  />
                ))}
              </div>

              {/* Download preview link */}
              <div className="text-center mt-4">
                <button
                  onClick={handleDownloadPreview}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  Download Preview PDF
                </button>
              </div>

              {/* Gated section with tiered pricing */}
              {!isUnlocked && result.gaps.length > VISIBLE_GAPS && (
                <div className="relative mt-6" id="scan-tier-overlay">
                  {/* Blurred background gaps */}
                  <div className="space-y-3 pointer-events-none select-none blur-[8px] opacity-25" aria-hidden="true">
                    {result.gaps.slice(VISIBLE_GAPS, VISIBLE_GAPS + 4).map((gap, i) => (
                      <GapCard
                        key={i + VISIBLE_GAPS}
                        gap={gap}
                        index={i + VISIBLE_GAPS}
                        onFixClick={() => {}}
                      />
                    ))}
                  </div>

                  {/* Full overlay */}
                  <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/95 to-background flex flex-col items-center justify-center px-6 py-10">
                    <Lock className="w-8 h-8 text-primary mb-3" />
                    <h3 className="text-xl font-bold text-foreground mb-1 text-center">
                      Unlock the Full Report for {result.companyName || 'Your Business'}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
                      We found {result.gaps.length - VISIBLE_GAPS} more issues. Unlock the full diagnostic with revenue estimates and a strategic roadmap.
                    </p>

                    {/* Tier Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg mb-6">
                      {tierCards.map((tier) => (
                        <div
                          key={tier.name}
                          className={`rounded-xl border p-5 flex flex-col ${
                            tier.highlight
                              ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                              : 'border-border bg-card/80 backdrop-blur-sm'
                          }`}
                        >
                          {tier.highlight && (
                            <span className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">Most Popular</span>
                          )}
                          <p className="text-lg font-bold text-foreground">{tier.name}</p>
                          <p className="text-2xl font-bold text-foreground mt-1">{tier.price}</p>
                          <ul className="mt-3 mb-4 space-y-1.5 flex-1">
                            {tier.features.map((f, i) => (
                              <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                <CheckCircle className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                                {f}
                              </li>
                            ))}
                          </ul>
                          <Button
                            onClick={() => handleTierSelect(tier.priceId)}
                            className={tier.highlight ? 'bg-primary hover:bg-primary/90 text-primary-foreground' : ''}
                            variant={tier.highlight ? 'default' : 'outline'}
                            size="sm"
                          >
                            <ArrowRight className="w-4 h-4 mr-1" />
                            Get {tier.name}
                          </Button>
                        </div>
                      ))}
                    </div>

                    <p className="text-xs italic text-muted-foreground text-center max-w-sm">
                      "I didn't ask for your business. This is free. I find problems. I show the math. If you want them fixed — that's when I go to work."
                    </p>
                  </div>
                </div>
              )}

              {/* Post-unlock: Fix This For Me CTA */}
              {isUnlocked && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 p-6 rounded-xl border-2 border-primary/30 bg-primary/5 text-center"
                >
                  <h3 className="text-lg font-bold text-foreground mb-2">Ready to Fix Everything?</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    You've seen what's broken. Let us build the systems to fix it.
                  </p>
                  <Button onClick={onContactClick} size="lg" className="gap-2">
                    <Zap className="w-4 h-4" /> Fix This For Me
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};
