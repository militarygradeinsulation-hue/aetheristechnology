import React, { useRef, useState } from 'react';
import { Play } from 'lucide-react';

interface Props {
  videoSrc: string;
  posterSrc: string;
  alt: string;
  /** Tailwind sizing classes for the wrapper button. */
  className?: string;
  /** Set true for a perfect circle (e.g. logo). Default rounded card. */
  circle?: boolean;
}

/**
 * Click the poster image to play the video with sound. Click again (or wait
 * for it to end) and it returns to the poster thumbnail. Falls back to muted
 * autoplay only if the browser blocks unmuted playback.
 */
export const ClickToPlayVideo: React.FC<Props> = ({
  videoSrc,
  posterSrc,
  alt,
  className = '',
  circle = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.muted = false;
      v.volume = 1;
      v.play()
        .then(() => setPlaying(true))
        .catch(() => {
          v.muted = true;
          v.play().then(() => setPlaying(true)).catch(() => {});
        });
    } else {
      v.pause();
      v.currentTime = 0;
      setPlaying(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={playing ? 'Pause video' : 'Play video'}
      className={`group relative overflow-hidden shadow-2xl focus:outline-none focus:ring-2 focus:ring-amber ${
        circle ? 'rounded-full' : 'rounded-xl'
      } ${className}`}
    >
      <img
        src={posterSrc}
        alt={alt}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
          playing ? 'opacity-0' : 'opacity-100'
        }`}
        loading="eager"
      />
      <video
        ref={videoRef}
        src={videoSrc}
        playsInline
        onEnded={() => {
          setPlaying(false);
          if (videoRef.current) videoRef.current.currentTime = 0;
        }}
        onPause={() => setPlaying(false)}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
          playing ? 'opacity-100' : 'opacity-0'
        }`}
      />
      {!playing && (
        <span className="absolute inset-0 flex items-center justify-center bg-background/0 group-hover:bg-background/30 transition-colors">
          <span className="rounded-full bg-amber/90 text-background p-5 shadow-xl group-hover:scale-110 transition-transform">
            <Play className="w-8 h-8 fill-current" />
          </span>
        </span>
      )}
    </button>
  );
};
