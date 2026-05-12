import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, Pause, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props {
  text: string;
  label?: string;
  voiceId?: string;
  size?: 'sm' | 'icon';
  variant?: 'outline' | 'ghost' | 'default';
  className?: string;
}

const cache = new Map<string, string>(); // text → blob url

const TTS_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/tts-elevenlabs`;

export const ReadAloudButton: React.FC<Props> = ({
  text, label, voiceId, size = 'sm', variant = 'outline', className,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, []);

  const handle = async () => {
    if (!text || !text.trim()) return;
    if (audioRef.current && playing) {
      audioRef.current.pause();
      setPlaying(false);
      return;
    }
    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
      setPlaying(true);
      return;
    }

    setLoading(true);
    try {
      const key = `${voiceId || 'default'}|${text}`;
      let url = cache.get(key);
      if (!url) {
        const r = await fetch(TTS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voiceId }),
        });
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j.error || `TTS failed (${r.status})`);
        }
        const blob = await r.blob();
        url = URL.createObjectURL(blob);
        cache.set(key, url);
      }
      const audio = new Audio(url);
      audio.onended = () => setPlaying(false);
      audio.onpause = () => setPlaying(false);
      audio.onplay = () => setPlaying(true);
      audioRef.current = audio;
      await audio.play();
    } catch (e) {
      toast({ title: 'Read-aloud failed', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const Icon = loading ? Loader2 : playing ? Pause : Volume2;
  return (
    <Button
      type="button"
      size={size === 'icon' ? 'icon' : 'sm'}
      variant={variant}
      onClick={(e) => { e.stopPropagation(); handle(); }}
      disabled={loading || !text?.trim()}
      className={className}
      title={playing ? 'Pause' : 'Read aloud'}
    >
      <Icon className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''} ${size !== 'icon' ? 'mr-1' : ''}`} />
      {size !== 'icon' && (label || (playing ? 'Pause' : 'Listen'))}
    </Button>
  );
};

export default ReadAloudButton;
