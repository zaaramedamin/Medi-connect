import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

/**
 * Reveals a heading word-by-word (blur + rise + fade) as it scrolls into view.
 * Falls back to plain text under prefers-reduced-motion via motion's own guard,
 * and keeps the full string available to screen readers.
 */
export function AnimatedText({
  text,
  className,
  delay = 0,
  once = true,
}: {
  text: string;
  className?: string;
  delay?: number;
  once?: boolean;
}) {
  const words = text.split(' ');
  return (
    <span className={cn('inline', className)} aria-label={text}>
      {words.map((word, i) => (
        <span key={`${word}-${i}`} className="inline-block" aria-hidden>
          <motion.span
            className="inline-block will-change-[transform,filter]"
            initial={{ y: '0.5em', opacity: 0, filter: 'blur(6px)' }}
            whileInView={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
            viewport={{ once, margin: '-8% 0px' }}
            transition={{ duration: 0.5, delay: delay + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
          >
            {word}
          </motion.span>
          {i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </span>
  );
}
