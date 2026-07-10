// Browser-based dialer for reps. Uses Twilio Voice SDK to place calls worldwide
// through the account's Twilio number. Gated by portal HMAC token.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Device, Call } from '@twilio/voice-sdk';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getPortalToken } from '@/lib/portalAuth';
import { Phone, PhoneOff, MicOff, Mic, Loader2, Delete } from 'lucide-react';

const FN = (name: string) =>
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`;

const DIGITS = ['1','2','3','4','5','6','7','8','9','*','0','#'];

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export const DialerPanel: React.FC = () => {
  const { toast } = useToast();
  const [device, setDevice] = useState<Device | null>(null);
  const [ready, setReady] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [number, setNumber] = useState('+1');
  const [notes, setNotes] = useState('');
  const [call, setCall] = useState<Call | null>(null);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'in-call'>('idle');
  const [muted, setMuted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(0);
  const tickRef = useRef<number | null>(null);
  const currentToRef = useRef<string>('');

  const initDevice = useCallback(async () => {
    setInitializing(true);
    try {
      const portalToken = getPortalToken();
      if (!portalToken) throw new Error('Not signed in to the portal');
      const res = await fetch(FN('twilio-voice-token'), {
        method: 'POST',
        headers: { 'x-portal-token': portalToken, 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Token fetch failed: ${res.status} ${txt.slice(0, 200)}`);
      }
      const { token } = await res.json();
      const dev = new Device(token, {
        logLevel: 'warn',
        codecPreferences: ['opus' as any, 'pcmu' as any],
      });
      dev.on('registered', () => setReady(true));
      dev.on('error', (err) => {
        console.error('Twilio Device error:', err);
        toast({ title: 'Dialer error', description: err?.message || 'Unknown error', variant: 'destructive' });
      });
      await dev.register();
      setDevice(dev);
    } catch (e: any) {
      toast({ title: 'Could not start dialer', description: e?.message || String(e), variant: 'destructive' });
    } finally {
      setInitializing(false);
    }
  }, [toast]);

  useEffect(() => {
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
      device?.destroy();
    };
  }, [device]);

  const startTimer = () => {
    startRef.current = Date.now();
    setElapsed(0);
    tickRef.current = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
  };
  const stopTimer = () => {
    if (tickRef.current) { window.clearInterval(tickRef.current); tickRef.current = null; }
  };

  const logCall = useCallback(async (to: string, durationSec: number, finalStatus: string) => {
    try {
      const portalToken = getPortalToken();
      if (!portalToken) return;
      await fetch(FN('twilio-call-log'), {
        method: 'POST',
        headers: { 'x-portal-token': portalToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_number: to,
          duration_seconds: durationSec,
          status: finalStatus,
          notes,
        }),
      });
    } catch (e) { console.error('call log failed', e); }
  }, [notes]);

  const placeCall = useCallback(async () => {
    if (!device) return;
    const to = number.trim();
    if (!/^\+[1-9]\d{6,15}$/.test(to)) {
      toast({ title: 'Invalid number', description: 'Use E.164 format, e.g. +14155550123', variant: 'destructive' });
      return;
    }
    setStatus('connecting');
    currentToRef.current = to;
    try {
      const c = await device.connect({ params: { To: to } });
      setCall(c);
      c.on('accept', () => { setStatus('in-call'); startTimer(); });
      c.on('disconnect', () => {
        stopTimer();
        const dur = Math.floor((Date.now() - startRef.current) / 1000);
        logCall(currentToRef.current, dur, 'completed');
        setCall(null); setStatus('idle'); setMuted(false);
        toast({ title: 'Call ended', description: `${formatDuration(dur)} — logged to HubSpot` });
      });
      c.on('cancel', () => { stopTimer(); setCall(null); setStatus('idle'); });
      c.on('error', (err) => {
        console.error('call error', err);
        stopTimer(); setCall(null); setStatus('idle');
        toast({ title: 'Call failed', description: err?.message || 'Unknown', variant: 'destructive' });
      });
    } catch (e: any) {
      setStatus('idle');
      toast({ title: 'Could not place call', description: e?.message || String(e), variant: 'destructive' });
    }
  }, [device, number, toast, logCall]);

  const hangup = () => { call?.disconnect(); };
  const toggleMute = () => { if (call) { const n = !muted; call.mute(n); setMuted(n); } };
  const sendDigit = (d: string) => {
    if (call && status === 'in-call') { call.sendDigits(d); return; }
    setNumber((prev) => prev + d);
  };
  const backspace = () => setNumber((p) => p.slice(0, -1) || '+');

  return (
    <div className="space-y-6">
      {!ready && (
        <Card className="bg-black/40 border-amber-400/25">
          <CardContent className="p-6 text-center space-y-4">
            <Phone className="w-10 h-10 mx-auto text-amber-400" />
            <div>
              <h3 className="text-lg font-semibold text-amber-100">Browser dialer</h3>
              <p className="text-sm text-amber-100/60 mt-1">
                Call any number worldwide from your laptop. Your browser will ask for mic permission.
              </p>
            </div>
            <Button onClick={initDevice} disabled={initializing} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
              {initializing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Starting…</> : 'Start dialer'}
            </Button>
          </CardContent>
        </Card>
      )}

      {ready && (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Dial pad */}
          <Card className="bg-black/40 border-amber-400/25">
            <CardContent className="p-6 space-y-4">
              <div>
                <Label className="text-xs uppercase tracking-wider text-amber-100/70">Number (E.164)</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    placeholder="+14155550123"
                    className="font-mono text-lg bg-black/60 border-amber-400/30 text-amber-50"
                    disabled={status !== 'idle'}
                  />
                  <Button variant="outline" size="icon" onClick={backspace} disabled={status !== 'idle'}>
                    <Delete className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {DIGITS.map((d) => (
                  <Button
                    key={d}
                    variant="outline"
                    onClick={() => sendDigit(d)}
                    className="h-14 text-xl font-mono bg-black/40 border-amber-400/20 hover:bg-amber-400/10 text-amber-50"
                  >
                    {d}
                  </Button>
                ))}
              </div>

              {status === 'idle' ? (
                <Button onClick={placeCall} className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-semibold">
                  <Phone className="w-5 h-5 mr-2" /> Call
                </Button>
              ) : (
                <div className="space-y-2">
                  <div className="text-center text-amber-100">
                    {status === 'connecting' ? 'Connecting…' : `On call — ${formatDuration(elapsed)}`}
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={toggleMute} variant="outline" className="flex-1" disabled={status !== 'in-call'}>
                      {muted ? <><MicOff className="w-4 h-4 mr-2" />Muted</> : <><Mic className="w-4 h-4 mr-2" />Mute</>}
                    </Button>
                    <Button onClick={hangup} className="flex-1 bg-red-600 hover:bg-red-700 text-white">
                      <PhoneOff className="w-4 h-4 mr-2" /> Hang up
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="bg-black/40 border-amber-400/25">
            <CardContent className="p-6 space-y-3">
              <Label className="text-xs uppercase tracking-wider text-amber-100/70">Call notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What did you learn? Objections? Next steps? — Saved to HubSpot when the call ends."
                className="min-h-[220px] bg-black/60 border-amber-400/30 text-amber-50"
              />
              <p className="text-[11px] text-amber-100/50">
                On hangup, notes + duration are attached to the matching HubSpot contact (by phone) as a Call engagement, and logged to your rep activity.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default DialerPanel;
