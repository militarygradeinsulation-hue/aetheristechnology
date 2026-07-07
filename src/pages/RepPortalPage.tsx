import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Loader2, DollarSign, TrendingUp, Percent, Shield, Repeat, Download, Chrome, AlertCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { REP_PRODUCTS, TIER_RATES, fmtUsd, repCentsForProduct } from '@/lib/repProducts';
import { EasyModeWrapper } from '@/components/EasyModeBar';
import { AndroidApkDownloadCard } from '@/components/portal/AndroidApkDownloadCard';
import { setPortalSession, type PortalProfile } from '@/lib/portalAuth';
import { useFeatureFlag } from '@/lib/portalFeatureFlags';
import { HomeFreeTrialArsenal } from '@/components/HomeFreeTrialArsenal';
import { LeadsBoard } from '@/components/portal/LeadsBoard';
import { RepToolLinks } from '@/components/portal/RepToolLinks';
import {
  CURRENT_EXTENSION_VERSION,
  getDownloadedExtensionVersion,
  markExtensionDownloaded,
  isExtensionOutdated,
} from '@/lib/extensionVersion';
import { useEffect } from 'react';

interface RepData {
  rep_name: string;
  code: string;
  commission_rate: number;
  total_sales_cents: number;
  total_commission_cents: number;
  is_active: boolean;
  certification_id?: string | null;
  certification_image_url?: string | null;
  certification_issued_at?: string | null;
  certification_valid_until?: string | null;
}

const RepPortalPage: React.FC = () => {
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [repData, setRepData] = useState<RepData | null>(null);
  const [extVersion, setExtVersion] = useState<string | null>(() => getDownloadedExtensionVersion());
  const { toast } = useToast();
  const instrumentsFlag = useFeatureFlag('instruments_tab', true);
  const leadsFlag = useFeatureFlag('leads_board', true);
  const operatorFlag = useFeatureFlag('operator_console', true);

  useEffect(() => {
    const refresh = () => setExtVersion(getDownloadedExtensionVersion());
    window.addEventListener('aetheris:extension-downloaded', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('aetheris:extension-downloaded', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const extOutdated = isExtensionOutdated();

  const downloadExtension = async () => {
    try {
      const res = await fetch('/aetheris-extension.zip');
      if (!res.ok) throw new Error(`Download failed: ${res.status}`);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `aetheris-extension-${CURRENT_EXTENSION_VERSION}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
      markExtensionDownloaded();
      toast({ title: 'Extension downloaded', description: `v${CURRENT_EXTENSION_VERSION} ready. Unzip and load it in chrome://extensions.` });
    } catch (e: any) {
      toast({ title: 'Download failed', description: e?.message || 'Try again.', variant: 'destructive' });
    }
  };


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('rep-portal-login', {
        body: { code: code.trim() },
      });
      if (error || !data?.ok || !data?.profile) {
        toast({ title: 'Invalid credentials', description: 'Code is invalid or inactive.', variant: 'destructive' });
        return;
      }
      const profile = data.profile;
      if ((profile.rep_email || '').toLowerCase() !== email.trim().toLowerCase()) {
        toast({ title: 'Invalid credentials', description: 'Code or email does not match.', variant: 'destructive' });
        return;
      }
      // Persist a portal session so LeadsBoard + other portal tools work
      // when the flag-gated tabs are on.
      if (data.token) {
        setPortalSession(data.token, profile as PortalProfile);
      }
      setRepData({
        rep_name: profile.rep_name,
        code: profile.code,
        commission_rate: Number(profile.commission_rate),
        total_sales_cents: profile.total_sales_cents,
        total_commission_cents: profile.total_commission_cents,
        is_active: true,
        certification_id: (profile as any).certification_id ?? null,
        certification_image_url: (profile as any).certification_image_url ?? null,
        certification_issued_at: (profile as any).certification_issued_at ?? null,
        certification_valid_until: (profile as any).certification_valid_until ?? null,
      });
    } catch {
      toast({ title: 'Error', description: 'Something went wrong. Try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fmt = (cents: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

  if (repData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 relative">
      <Button variant="ghost" size="sm" className="absolute top-4 left-4" onClick={() => setRepData(null)}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Log out
        </Button>
        <EasyModeWrapper tabKey="rep-portal">
          <div className="max-w-3xl w-full space-y-6 py-16">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground font-display">
                {repData.rep_name || 'Rep'} Dashboard
              </h1>
              <p className="text-muted-foreground text-sm mt-1">Code: {repData.code}</p>
            </div>

            {/* TOOLS — Chrome extension + Android APK (TOP for fast access) */}
            <Card className={extOutdated ? 'border-red-500/60' : undefined}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-display">
                  <Chrome className="w-5 h-5 text-primary" /> Aetheris Operator — Chrome Extension
                  {extOutdated && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-red-500/15 text-red-500 text-xs px-2 py-0.5 font-semibold">
                      <AlertCircle className="w-3 h-3" /> Update available
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="text-muted-foreground">Latest version:</span>
                  <span className="font-semibold text-foreground">v{CURRENT_EXTENSION_VERSION}</span>
                  {extVersion && (
                    <>
                      <span className="text-muted-foreground">· You have:</span>
                      <span className={`font-semibold ${extOutdated ? 'text-red-500' : 'text-primary'}`}>v{extVersion}</span>
                    </>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Scanner, AI Operator chat, LinkedIn drafter, Golden Report, recordings — all live in your Chrome side panel.
                  Recordings auto-save to your history and the lead they belong to.
                </p>
                <Button onClick={downloadExtension} className={extOutdated ? 'bg-red-500 hover:bg-red-600 text-white' : undefined}>
                  <Download className="w-4 h-4 mr-2" />
                  {extOutdated ? 'Download update' : 'Download extension (.zip)'}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Unzip → open <code className="text-amber">chrome://extensions</code> → enable Developer mode → click <strong>Load unpacked</strong> → select the folder.
                </p>
              </CardContent>
            </Card>

            <AndroidApkDownloadCard />

            <RepToolLinks repCode={repData.code} />

            {leadsFlag.enabled && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-display">Your Leads</CardTitle>
                </CardHeader>
                <CardContent>
                  <LeadsBoard />
                </CardContent>
              </Card>
            )}

            {instrumentsFlag.enabled && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-display">Instruments — Free forensic tools</CardTitle>
                </CardHeader>
                <CardContent>
                  <HomeFreeTrialArsenal />
                </CardContent>
              </Card>
            )}

            {operatorFlag.enabled && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-display">Operator Console</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>The full operator cockpit — scans, agents, contradictions, friction audit, growth signals — is live in the web app.</p>
                  <Button asChild size="sm"><Link to="/app/operator">Open Operator Console</Link></Button>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <DollarSign className="w-4 h-4" /> Total Sales
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{fmt(repData.total_sales_cents)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> Commission Earned
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{fmt(repData.total_commission_cents)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Percent className="w-4 h-4" /> Commission Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{(repData.commission_rate * 100).toFixed(0)}%</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Shield className="w-4 h-4" /> Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-primary">Active</p>
                </CardContent>
              </Card>
            </div>





            {/* COMMISSION STRUCTURE */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-display">
                  <DollarSign className="w-5 h-5 text-primary" /> Your Commission Structure
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <p className="text-foreground font-medium">
                    You earn <span className="text-primary font-bold">{(repData.commission_rate * 100).toFixed(0)}%</span> of every sale tied to your code, including recurring monthly invoices for as long as the client stays subscribed.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Paid within 7 days of the client's payment clearing. No tiers. No caps. No clawbacks on completed work.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Client Price</TableHead>
                        <TableHead className="text-right">Your Cut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {REP_PRODUCTS.map((p) => (
                        <TableRow key={p.name} className={p.highlight ? 'bg-primary/5' : undefined}>
                          <TableCell className={p.highlight ? 'font-semibold text-foreground' : 'text-foreground'}>
                            {p.name}
                            {p.recurring && (
                              <span className="ml-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <Repeat className="w-3 h-3" /> recurring
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {fmtUsd(p.priceCents)}{p.recurring ? '/mo' : ''}
                          </TableCell>
                          <TableCell className={`text-right font-semibold ${p.highlight ? 'text-primary' : 'text-foreground'}`}>
                            {fmtUsd(repCentsForProduct(p))}{p.recurring ? '/mo' : ''}
                            <span className="ml-1 text-xs text-muted-foreground">(T{p.tier} · {Math.round(TIER_RATES[p.tier].rep * 100)}%)</span>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell className="text-foreground">Monthly Subscriptions</TableCell>
                        <TableCell className="text-right text-muted-foreground">varies</TableCell>
                        <TableCell className="text-right font-semibold text-primary">
                          20-30% of every invoice (by tier)
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <div>
                  <h3 className="font-display text-lg font-semibold text-foreground mb-3">Realistic Monthly Earnings</h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {[
                      { label: 'Light month', detail: '5 small unlocks + 1 Snapshot', total: '~$40' },
                      { label: 'Solid month', detail: '3 Snapshots + 2 Blueprints + 1 Website Eval', total: '~$164' },
                      { label: 'Strong month', detail: '1 Diagnostic + 2 Snapshots + 1 Fractional active case', total: '$910 + $590/mo recurring' },
                      { label: 'Heavy month', detail: '2 Diagnostics + 1 Fractional active case', total: '$1,170 + $590/mo recurring' },
                    ].map((row) => (
                      <div key={row.label} className="rounded-lg border border-border/50 bg-card/50 p-3">
                        <p className="text-sm text-muted-foreground">{row.label}</p>
                        <p className="text-foreground text-sm mt-1">{row.detail}</p>
                        <p className="text-primary font-semibold mt-1">{row.total}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border/50">
                  <p>• Tracked automatically when the client uses your 6-digit code at checkout. Visible live in this dashboard.</p>
                  <p>• Paid via your chosen payout channel (PayPal, ACH, or Stripe Connect).</p>
                  <p>• Recurring products keep paying for as long as the client stays subscribed.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </EasyModeWrapper>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative">
      <Link
        to="/"
        className="absolute top-4 left-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to website
      </Link>
      <div className="glass p-8 rounded-2xl max-w-sm w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground font-display">Rep Portal</h1>
          <p className="text-muted-foreground text-sm mt-1">Enter your code and email to view your stats</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-3">
          <Input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="6-digit Rep Code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            required
            autoFocus
          />
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...</> : 'View Dashboard'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default RepPortalPage;
