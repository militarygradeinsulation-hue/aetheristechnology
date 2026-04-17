import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Lock, Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const AdminLogin: React.FC = () => {
  const [pin, setPin] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id;
      if (!userId || cancelled) return;
      const { data: isAdmin } = await supabase.rpc('is_admin', { _user_id: userId });
      if (!cancelled && isAdmin === true) navigate('/admin', { replace: true });
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-pin-login', { body: { pin } });
      if (error || !data?.ok) throw new Error(data?.error || error?.message || 'Invalid PIN');

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.session?.access_token,
        refresh_token: data.session?.refresh_token,
      });
      if (sessionError) throw sessionError;

      navigate('/admin', { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'PIN login failed.';
      toast({ title: 'PIN login failed', description: msg, variant: 'destructive' });
    } finally {
      setPinLoading(false);
    }
  };

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
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-amber" />
          </div>
          <h1 className="text-2xl font-bold text-foreground font-display">Admin Access</h1>
          <p className="text-muted-foreground text-sm mt-1">Sign in with PIN or admin account</p>
        </div>

        <form onSubmit={handlePinSubmit} className="space-y-3 mb-6">
          <Input
            type="password"
            inputMode="numeric"
            placeholder="PIN"
            value={pin}
            onChange={e => setPin(e.target.value)}
            required
            autoComplete="one-time-code"
          />
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={pinLoading}>
            {pinLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...</> : 'Unlock with PIN'}
          </Button>
        </form>

        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
          <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">or sign in</span></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <Button type="submit" variant="outline" className="w-full" disabled={loading}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...</> : 'Sign In'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
