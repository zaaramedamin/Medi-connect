import { motion, useScroll, useSpring } from 'motion/react';

/** Thin gradient bar at the very top of the page that fills as you scroll. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 220, damping: 40, restDelta: 0.001 });

  return (
    <motion.div
      aria-hidden
      className="fixed inset-x-0 top-0 z-50 h-[3px] origin-left bg-linear-to-r from-primary via-accent to-primary"
      style={{ scaleX }}
    />
  );
}
