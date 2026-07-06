import { useRef } from 'react';
import { motion, useInView } from 'motion/react';

interface BlurFadeProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  yOffset?: number;
}

/** Fades content in with a blur + rise effect the first time it scrolls into view. */
export function BlurFade({ children, className, delay = 0, duration = 0.6, yOffset = 20 }: BlurFadeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: yOffset, filter: 'blur(8px)' }}
      animate={inView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : undefined}
      transition={{ delay, duration, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      {children}
    </motion.div>
  );
}
