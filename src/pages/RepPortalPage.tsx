import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Loader2, DollarSign, TrendingUp, Percent, Shield } from 'lucide-react';

interface RepData {
  rep_name: string;
  code: string;
  commission_rate: number;
  total_sales_cents: number;
  total_commission_cents: number;
  is_active: boolean;
}

const RepPortalPage: React.FC = () => {
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [repData, setRepData] = useState<RepData | null>(null);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rep_codes')
        .select('rep_name, code, commission_rate, total_sales_cents, total_commission_cents, is_active, rep_email')
        .eq('code', code.trim())
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      if (!data || data.rep_email?.toLowerCase() !== email.trim().toLowerCase()) {
        toast({ title: 'Invalid credentials', description: 'Code or email does not match.', variant: 'destructive' });
        return;
      }

      setRepData({
        rep_name: data.rep_name,
        code: data.code,
        commission_rate: Number(data.commission_rate),
        total_sales_cents: data.total_sales_cents,
        total_commission_cents: data.total_commission_cents,
        is_active: data.is_active,
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
        <div className="max-w-lg w-full space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground font-display">
              {repData.rep_name || 'Rep'} Dashboard
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Code: {repData.code}</p>
          </div>

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
        </div>
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
