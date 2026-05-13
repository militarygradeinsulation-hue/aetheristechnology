import React, { useEffect, useRef } from 'react';

interface MatrixRainProps {
  className?: string;
  color?: string;
  fontSize?: number;
  speed?: number;
  density?: number;
}

export const MatrixRain: React.FC<MatrixRainProps> = ({
  className = '',
  color = 'hsl(36 90% 55%)',
  fontSize = 14,
  speed = 1,
  density = 0.8,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const katakana =
      'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン' +
      '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ$#@%&*+-=<>[]{}|~';

    let animationFrameId = 0;
    let columns: number[] = [];
    let w = 0;
    let h = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      w = parent ? parent.clientWidth : window.innerWidth;
      h = parent ? parent.clientHeight : window.innerHeight;
      canvas.width = w;
      canvas.height = h;
      const colCount = Math.floor(w / fontSize);
      columns = Array(colCount)
        .fill(0)
        .map(() => Math.random() * h);
    };

    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      if (document.hidden) {
        animationFrameId = requestAnimationFrame(draw);
        return;
      }

      // Fade trail
      ctx.fillStyle = 'rgba(15, 23, 42, 0.08)';
      ctx.fillRect(0, 0, w, h);

      ctx.font = `${fontSize}px "JetBrains Mono", monospace`;

      for (let i = 0; i < columns.length; i++) {
        const text = katakana[Math.floor(Math.random() * katakana.length)];
        const x = i * fontSize;
        const y = columns[i];

        // Head character is bright amber
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.9 + Math.random() * 0.1;
        ctx.fillText(text, x, y);

        // Trail characters are dimmer
        for (let t = 1; t < 12; t++) {
          const trailY = y - t * fontSize;
          if (trailY < 0) break;
          const trailText = katakana[Math.floor(Math.random() * katakana.length)];
          const alpha = Math.max(0, (0.45 - t * 0.035) * density);
          ctx.fillStyle = color;
          ctx.globalAlpha = alpha;
          ctx.fillText(trailText, x, trailY);
        }

        ctx.globalAlpha = 1;

        if (y > h && Math.random() > 0.975) {
          columns[i] = 0;
        } else {
          columns[i] += fontSize * speed;
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [color, fontSize, speed, density]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      style={{ zIndex: 0 }}
    />
  );
};

export default MatrixRain;
