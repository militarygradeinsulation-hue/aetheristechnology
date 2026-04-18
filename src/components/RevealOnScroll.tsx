import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

type RevealVariant = 'fade-up' | 'float' | 'shimmer-in' | 'scale-glow';

interface RevealOnScrollProps {
  children: React.ReactNode;
  delay?: number;
  variant?: RevealVariant;
  /** When true, treats children as a list and staggers each direct child */
  stagger?: boolean;
  className?: string;
}

const VARIANTS: Record<RevealVariant, { initial: any; animate: any; transition?: any }> = {
  'fade-up': {
    initial: { opacity: 0, y: 50 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 },
  },
  float: {
    initial: { opacity: 0, y: 30, filter: 'blur(4px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
  },
  'shimmer-in': {
    initial: { opacity: 0, y: 20, filter: 'blur(8px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] },
  },
  'scale-glow': {
    initial: { opacity: 0, scale: 0.94 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
};

export const RevealOnScroll: React.FC<RevealOnScrollProps> = ({
  children,
  delay = 0,
  variant = 'fade-up',
  stagger = false,
  className,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // If already in viewport on mount, reveal immediately (handles above-the-fold content)
    const rect = node.getBoundingClientRect();
    const inView = rect.top < window.innerHeight && rect.bottom > 0;
    if (inView) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(node);
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -10% 0px' }
    );
    observer.observe(node);
    return () => observer.unobserve(node);
  }, []);

  // Safety net: if something prevents the observer from firing, force-reveal after 1s
  useEffect(() => {
    if (isVisible) return;
    const t = setTimeout(() => setIsVisible(true), 1000);
    return () => clearTimeout(t);
  }, [isVisible]);

  const v = VARIANTS[variant];

  if (reduced) {
    return <div ref={ref} className={className}>{children}</div>;
  }

  if (stagger) {
    return (
      <motion.div
        ref={ref}
        initial="hidden"
        animate={isVisible ? 'visible' : 'hidden'}
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.08, delayChildren: delay } },
        }}
        className={className}
      >
        {React.Children.map(children, (child, i) => (
          <motion.div
            key={i}
            variants={{
              hidden: v.initial,
              visible: { ...v.animate, transition: v.transition },
            }}
          >
            {child}
          </motion.div>
        ))}
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={ref}
      initial={v.initial}
      animate={isVisible ? v.animate : v.initial}
      transition={{ ...v.transition, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
};
