import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Lock, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<{ id: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ? { id: data.user.id } : null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (!user) return;
      const { data, error } = await supabase.rpc('is_admin', { _user_id: user.id });
      if (cancelled) return;
      if (!error && data === true) {
        navigate('/admin', { replace: true });
      }
    };
    check();
    return () => { cancelled = true; };
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + '/admin/login' },
        });
        if (signUpError) throw signInError;
      }

      const { data: { user: signedInUser } } = await supabase.auth.getUser();
      if (!signedInUser) {
        toast({ title: 'Check your email', description: 'Confirm your email, then sign in again.' });
        return;
      }

      await supabase.rpc('promote_if_first_admin', { _user_id: signedInUser.id });

      const { data: isAdmin, error: rpcError } = await supabase.rpc('is_admin', { _user_id: signedInUser.id });
      if (rpcError) throw rpcError;

      if (isAdmin === true) {
        navigate('/admin', { replace: true });
      } else {
        await supabase.auth.signOut();
        toast({ title: 'Access Denied', description: 'This account does not have admin privileges.', variant: 'destructive' });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign-in failed.';
      toast({ title: 'Sign-in failed', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-pin-login', { body: { pin } });
      if (error || !data?.ok) throw new Error(data?.error || error?.message || 'Invalid PIN');

      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (signInErr) throw signInErr;

      navigate('/admin', { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'PIN login failed.';
      toast({ title: 'PIN login failed', description: msg, variant: 'destructive' });
    } finally {
      setPinLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
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
