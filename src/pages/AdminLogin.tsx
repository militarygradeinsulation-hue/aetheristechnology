import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { PortalLoginFrame, PORTAL_LOGIN_INPUT_CLASS, PORTAL_LOGIN_BUTTON_CLASS } from '@/components/portal/PortalLoginFrame';
import { supabase } from '@/integrations/supabase/client';
import { setAdminToken, clearAdminToken, setOwnerToken } from '@/lib/adminAuth';
import { clearPortalSession } from '@/lib/portalAuth';


const AdminLogin: React.FC = () => {
  const [pin, setPin] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // SECURITY: Always require a fresh PIN on this page. Never auto-redirect
  // based on a stored token, that would let anyone who can reach this URL
  // bypass authentication. Also wipe any stale rep/partner session so the
  // login boundary is clean.
  useEffect(() => {
    clearAdminToken();
    clearPortalSession();
    try { supabase.auth.signOut(); } catch { /* noop */ }
  }, []);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-pin-login', { body: { pin } });
      if (error || !data?.ok || !data?.token) {
        throw new Error(data?.error || error?.message || 'Invalid PIN');
      }
      setAdminToken(data.token);
      setOwnerToken(typeof data.owner_token === 'string' ? data.owner_token : null);
      navigate('/admin', { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'PIN login failed.';
      toast({ title: 'PIN login failed', description: msg, variant: 'destructive' });
    } finally {
      setPinLoading(false);
    }
  };

  return (
    <PortalLoginFrame title="Admin Access" description="Enter your PIN to continue.">
      <form onSubmit={handlePinSubmit} className="space-y-4">
        <Input
          type="password"
          inputMode="numeric"
          placeholder="PIN"
          aria-label="Administrator PIN"
          className={PORTAL_LOGIN_INPUT_CLASS}
          value={pin}
          onChange={e => setPin(e.target.value)}
          required
          autoComplete="one-time-code"
          autoFocus
        />
        <Button type="submit" className={PORTAL_LOGIN_BUTTON_CLASS} disabled={pinLoading}>
          {pinLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...</> : 'Unlock with PIN'}
        </Button>
      </form>
    </PortalLoginFrame>
  );
};

export default AdminLogin;
