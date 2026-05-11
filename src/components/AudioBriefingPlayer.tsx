import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, RotateCw, Gauge } from 'lucide-react';

interface Props {
  src: string;
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2];

const fmt = (s: number) => {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

export const AudioBriefingPlayer: React.FC<Props> = ({ src }) => {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const [rate, setRate] = useState(1);

  useEffect(() => {
    const a = ref.current;
    if (!a) return;
    const onTime = () => setCur(a.currentTime);
    const onMeta = () => setDur(a.duration);
    const onEnd = () => setPlaying(false);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('loadedmetadata', onMeta);
    a.addEventListener('durationchange', onMeta);
    a.addEventListener('ended', onEnd);
    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onPause);
    return () => {
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('loadedmetadata', onMeta);
      a.removeEventListener('durationchange', onMeta);
      a.removeEventListener('ended', onEnd);
      a.removeEventListener('play', onPlay);
      a.removeEventListener('pause', onPause);
    };
  }, []);

  const toggle = () => {
    const a = ref.current;
    if (!a) return;
    if (a.paused) a.play();
    else a.pause();
  };

  const skip = (delta: number) => {
    const a = ref.current;
    if (!a) return;
    a.currentTime = Math.max(0, Math.min((a.duration || 0), a.currentTime + delta));
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const a = ref.current;
    if (!a) return;
    a.currentTime = Number(e.target.value);
  };

  const cycleRate = () => {
    const idx = SPEEDS.indexOf(rate);
    const next = SPEEDS[(idx + 1) % SPEEDS.length];
    setRate(next);
    if (ref.current) ref.current.playbackRate = next;
  };

  return (
    <div className="w-full rounded-md border border-amber/30 bg-background/40 p-3">
      <audio ref={ref} src={src} preload="metadata">
        Your browser does not support the audio element.
      </audio>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => skip(-15)}
          aria-label="Back 15 seconds"
          className="h-9 w-9 rounded-sm border border-amber/30 text-amber hover:bg-amber/10 flex items-center justify-center transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? 'Pause' : 'Play'}
          className="h-10 w-10 rounded-sm bg-amber text-background hover:bg-amber/90 flex items-center justify-center transition-colors"
        >
          {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </button>
        <button
          type="button"
          onClick={() => skip(15)}
          aria-label="Forward 15 seconds"
          className="h-9 w-9 rounded-sm border border-amber/30 text-amber hover:bg-amber/10 flex items-center justify-center transition-colors"
        >
          <RotateCw className="w-4 h-4" />
        </button>

        <div className="flex-1 flex items-center gap-2 min-w-0">
          <span className="font-case text-[10px] text-muted-foreground tabular-nums w-10 text-right">
            {fmt(cur)}
          </span>
          <input
            type="range"
            min={0}
            max={dur || 0}
            step={0.1}
            value={cur}
            onChange={seek}
            aria-label="Seek"
            className="flex-1 h-1.5 accent-amber cursor-pointer"
          />
          <span className="font-case text-[10px] text-muted-foreground tabular-nums w-10">
            {fmt(dur)}
          </span>
        </div>

        <button
          type="button"
          onClick={cycleRate}
          aria-label="Playback speed"
          className="h-9 px-2 rounded-sm border border-amber/30 text-amber hover:bg-amber/10 flex items-center gap-1 font-case text-[11px] transition-colors"
        >
          <Gauge className="w-3.5 h-3.5" />
          {rate}x
        </button>
      </div>
    </div>
  );
};

export default AudioBriefingPlayer;
