import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Lock, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signIn } = useAuth();

  // If already signed in, check admin status and route accordingly
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
      await signIn(email, password);

      // Verify admin status server-side via SECURITY DEFINER function
      const { data: { user: signedInUser } } = await supabase.auth.getUser();
      if (!signedInUser) throw new Error('Sign-in did not produce a session.');

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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="glass p-8 rounded-2xl max-w-sm w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-amber" />
          </div>
          <h1 className="text-2xl font-bold text-foreground font-display">Admin Access</h1>
          <p className="text-muted-foreground text-sm mt-1">Sign in with your admin account</p>
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
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...</> : 'Unlock'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
