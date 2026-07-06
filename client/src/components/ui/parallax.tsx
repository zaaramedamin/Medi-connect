import { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'motion/react';

interface ParallaxProps {
  children: React.ReactNode;
  className?: string;
  /** Total vertical drift in px as the element crosses the viewport. */
  offset?: number;
}

/** Moves its children slightly against the scroll direction for depth. */
export function Parallax({ children, className, offset = 48 }: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const raw = useTransform(scrollYProgress, [0, 1], [offset, -offset]);
  const y = useSpring(raw, { stiffness: 120, damping: 30 });

  return (
    <motion.div ref={ref} style={{ y }} className={className}>
      {children}
    </motion.div>
  );
}
