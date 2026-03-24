import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Lock } from 'lucide-react';

const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // If already logged in as admin, redirect
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase.from('admin_users').select('id').eq('user_id', session.user.id).maybeSingle();
        if (data) navigate('/admin', { replace: true });
      }
    };
    check();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
        if (error) throw error;
        toast({ title: 'Check your email', description: 'Verify your email then come back to log in.' });
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Check admin
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No session');
        const { data } = await supabase.from('admin_users').select('id').eq('user_id', session.user.id).maybeSingle();
        if (!data) {
          await supabase.auth.signOut();
          toast({ title: 'Access Denied', description: 'You are not an admin.', variant: 'destructive' });
          return;
        }
        navigate('/admin', { replace: true });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Something went wrong', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="glass p-8 rounded-2xl max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-amber" />
          </div>
          <h1 className="text-2xl font-bold text-foreground font-display">Admin Access</h1>
          <p className="text-muted-foreground text-sm mt-1">Authorized personnel only</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Email</label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Password</label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          </div>
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
            {loading ? 'Please wait...' : isSignUp ? 'Sign Up' : 'Log In'}
          </Button>
        </form>
        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="text-xs text-muted-foreground hover:text-foreground mt-4 block text-center w-full"
        >
          {isSignUp ? 'Already have an account? Log in' : 'First time? Create account'}
        </button>
      </div>
    </div>
  );
};

export default AdminLogin;
