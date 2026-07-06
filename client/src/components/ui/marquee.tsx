import { cn } from '@/lib/utils';

interface MarqueeProps {
  children: React.ReactNode;
  className?: string;
  reverse?: boolean;
  pauseOnHover?: boolean;
  /** How many copies of the content to render for a seamless loop. */
  repeat?: number;
}

/** Infinite horizontal scroll strip. Duration/gap tunable via --duration / --gap. */
export function Marquee({ children, className, reverse = false, pauseOnHover = true, repeat = 3 }: MarqueeProps) {
  return (
    <div
      className={cn(
        'group flex overflow-hidden [--duration:45s] [--gap:1.25rem] gap-[var(--gap)]',
        className
      )}
    >
      {Array.from({ length: repeat }).map((_, i) => (
        <div
          key={i}
          aria-hidden={i > 0}
          className={cn(
            'flex shrink-0 items-stretch justify-around gap-[var(--gap)] animate-marquee',
            reverse && '[animation-direction:reverse]',
            pauseOnHover && 'group-hover:[animation-play-state:paused]'
          )}
        >
          {children}
        </div>
      ))}
    </div>
  );
}
