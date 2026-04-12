import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type Status = 'loading' | 'valid' | 'already' | 'invalid' | 'success' | 'error';

const UnsubscribePage = () => {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }
    fetch(`${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${token}`, {
      headers: { apikey: SUPABASE_KEY },
    })
      .then(r => r.json())
      .then(d => {
        if (d.valid === false && d.reason === 'already_unsubscribed') setStatus('already');
        else if (d.valid) setStatus('valid');
        else setStatus('invalid');
      })
      .catch(() => setStatus('invalid'));
  }, [token]);

  const handleConfirm = async () => {
    const { data } = await supabase.functions.invoke('handle-email-unsubscribe', { body: { token } });
    if (data?.success) setStatus('success');
    else if (data?.reason === 'already_unsubscribed') setStatus('already');
    else setStatus('error');
  };

  const messages: Record<Status, { title: string; desc: string }> = {
    loading: { title: 'Loading...', desc: 'Validating your request.' },
    valid: { title: 'Unsubscribe', desc: 'Click below to unsubscribe from future emails.' },
    already: { title: 'Already Unsubscribed', desc: "You've already been unsubscribed." },
    invalid: { title: 'Invalid Link', desc: 'This unsubscribe link is invalid or expired.' },
    success: { title: 'Unsubscribed', desc: "You won't receive any more emails from us." },
    error: { title: 'Error', desc: 'Something went wrong. Please try again.' },
  };

  const m = messages[status];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">{m.title}</h1>
          <p className="text-muted-foreground">{m.desc}</p>
          {status === 'valid' && (
            <Button onClick={handleConfirm} variant="destructive" size="lg">
              Confirm Unsubscribe
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UnsubscribePage;
