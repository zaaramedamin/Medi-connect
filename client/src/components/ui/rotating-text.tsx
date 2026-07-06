import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface RotatingTextProps {
  phrases: string[];
  className?: string;
  /** ms before typing starts. */
  startDelay?: number;
  /** ms per character while typing. */
  typeSpeed?: number;
  /** ms per character while deleting. */
  deleteSpeed?: number;
  /** ms to hold a completed phrase before deleting. */
  holdTime?: number;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Types a phrase out letter by letter, holds it, deletes it, then moves to the
 * next phrase — looping forever. Reserves the space of the longest phrase so
 * the surrounding layout never shifts as the text changes.
 */
export function RotatingText({
  phrases,
  className,
  startDelay = 0,
  typeSpeed = 65,
  deleteSpeed = 35,
  holdTime = 1700,
}: RotatingTextProps) {
  const [display, setDisplay] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // The phrase most likely to occupy the most space — used as an invisible sizer.
  const longest = useMemo(
    () => phrases.reduce((a, b) => (b.length > a.length ? b : a), ''),
    [phrases]
  );

  useEffect(() => {
    if (prefersReducedMotion()) {
      setDisplay(phrases[0] ?? '');
      return;
    }

    let phrase = 0;
    let char = 0;
    let deleting = false;

    const tick = () => {
      const current = phrases[phrase] ?? '';

      if (!deleting) {
        char += 1;
        setDisplay(current.slice(0, char));
        if (char === current.length) {
          timer.current = setTimeout(() => {
            deleting = true;
            tick();
          }, holdTime);
          return;
        }
        timer.current = setTimeout(tick, typeSpeed);
      } else {
        char -= 1;
        setDisplay(current.slice(0, char));
        if (char === 0) {
          deleting = false;
          phrase = (phrase + 1) % phrases.length;
          timer.current = setTimeout(tick, typeSpeed * 3);
          return;
        }
        timer.current = setTimeout(tick, deleteSpeed);
      }
    };

    timer.current = setTimeout(tick, startDelay);
    return () => clearTimeout(timer.current);
  }, [phrases, startDelay, typeSpeed, deleteSpeed, holdTime]);

  return (
    <span className={cn('relative block', className)}>
      {/* Invisible sizer reserves width + height for the longest phrase */}
      <span aria-hidden="true" className="invisible">{longest}</span>

      {/* Animated text overlaid on the reserved space — removed from flow */}
      <span aria-hidden="true" className="absolute inset-0">
        {display}
        <span className="inline-block w-[0.06em] -mb-[0.1em] h-[0.95em] translate-y-[0.12em] bg-current ml-[0.1em] rounded-full animate-blink" />
      </span>

      {/* Real text for screen readers */}
      <span className="sr-only">{phrases[0]}</span>
    </span>
  );
}
