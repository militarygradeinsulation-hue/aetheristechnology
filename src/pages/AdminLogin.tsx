import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Lock, Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { hasValidAdminToken, setAdminToken } from '@/lib/adminAuth';

const AdminLogin: React.FC = () => {
  const [pin, setPin] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Synchronous redirect if a valid PIN token already exists.
  useEffect(() => {
    if (hasValidAdminToken()) navigate('/admin', { replace: true });
  }, [navigate]);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-pin-login', { body: { pin } });
      if (error || !data?.ok || !data?.token) {
        throw new Error(data?.error || error?.message || 'Invalid PIN');
      }
      setAdminToken(data.token);
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
          <p className="text-muted-foreground text-sm mt-1">Enter your PIN to continue</p>
        </div>

        <form onSubmit={handlePinSubmit} className="space-y-3">
          <Input
            type="password"
            inputMode="numeric"
            placeholder="PIN"
            value={pin}
            onChange={e => setPin(e.target.value)}
            required
            autoComplete="one-time-code"
            autoFocus
          />
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={pinLoading}>
            {pinLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...</> : 'Unlock with PIN'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
