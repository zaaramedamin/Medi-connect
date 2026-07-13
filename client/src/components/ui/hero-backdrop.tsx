import { cn } from '@/lib/utils';

interface HeroBackdropProps {
  image: string;
  className?: string;
  rounded?: boolean;
  /**
   * Strength of the brand tint, 0–1. Kept low so the photograph still reads as a
   * photograph — at full strength the blue swallows it. Raise it per-page if a
   * particular image needs more help.
   */
  tint?: number;
}

/**
 * Turns a real photo into an on-brand hero background. The image keeps most of
 * its own colour and gets a light wash of the medical blue→teal gradient (fixed
 * colours, so it never shifts with the theme). The black scrim — not the tint —
 * is what keeps white text readable. A slow Ken-Burns drift adds life.
 */
export function HeroBackdrop({ image, className, rounded, tint = 0.35 }: HeroBackdropProps) {
  return (
    <div aria-hidden className={cn('absolute inset-0 isolate overflow-hidden', rounded && 'rounded-3xl', className)}>
      <img
        src={image}
        alt=""
        className="h-full w-full object-cover grayscale-35 animate-bg-drift motion-reduce:animate-none"
      />
      {/* Brand wash */}
      <div
        className="absolute inset-0 mix-blend-multiply bg-[linear-gradient(135deg,#0b74c4,#1c9c8b)]"
        style={{ opacity: tint }}
      />
      {/* Readability scrim for white text. Carries the contrast the tint used to. */}
      <div className="absolute inset-0 bg-black/35" />
      <div className="absolute inset-0 bg-linear-to-t from-black/45 via-transparent to-black/15" />
    </div>
  );
}
