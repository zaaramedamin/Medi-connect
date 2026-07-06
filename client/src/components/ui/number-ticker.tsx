import { useEffect, useRef } from 'react';
import { useInView, useMotionValue, useSpring } from 'motion/react';

interface NumberTickerProps {
  value: number;
  suffix?: string;
  decimalPlaces?: number;
  className?: string;
}

/** Counts up from 0 to `value` with a spring when it enters the viewport. */
export function NumberTicker({ value, suffix = '', decimalPlaces = 0, className }: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { damping: 40, stiffness: 120 });
  const inView = useInView(ref, { once: true, margin: '-40px' });

  useEffect(() => {
    if (inView) motionValue.set(value);
  }, [inView, value, motionValue]);

  useEffect(
    () =>
      springValue.on('change', latest => {
        if (ref.current) {
          ref.current.textContent =
            Intl.NumberFormat('en-US', {
              minimumFractionDigits: decimalPlaces,
              maximumFractionDigits: decimalPlaces,
            }).format(Number(latest.toFixed(decimalPlaces))) + suffix;
        }
      }),
    [springValue, decimalPlaces, suffix]
  );

  return (
    <span ref={ref} className={className}>
      0{suffix}
    </span>
  );
}
