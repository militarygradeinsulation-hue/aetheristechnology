import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion, MotionValue } from 'framer-motion';

interface ParallaxTiltProps {
  children: React.ReactNode;
  className?: string;
  /** How aggressive the parallax drift is. 0 = none, 1 = default, 2 = pronounced */
  intensity?: number;
}

/**
 * ParallaxTilt — wraps a tile and applies a subtle scroll-driven Y translate
 * + rotateX so it appears to "hover" as the user scrolls past.
 * Respects prefers-reduced-motion.
 */
export const ParallaxTilt: React.FC<ParallaxTiltProps> = ({
  children,
  className = '',
  intensity = 1,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const yRange = 24 * intensity;
  const rotRange = 4 * intensity;

  const y: MotionValue<number> = useTransform(scrollYProgress, [0, 0.5, 1], [yRange, 0, -yRange]);
  const rotateX: MotionValue<number> = useTransform(scrollYProgress, [0, 0.5, 1], [rotRange, 0, -rotRange]);

  if (reduced) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      style={{ y, rotateX, transformPerspective: 1200, transformStyle: 'preserve-3d' }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default ParallaxTilt;
