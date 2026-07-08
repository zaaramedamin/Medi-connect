import { cn } from '@/lib/utils';

/**
 * Turns a real photo into an on-brand hero background: the image is
 * desaturated and multiplied with the fixed medical blue→teal gradient
 * (a duotone that stays on-theme in both light and dark mode), then a
 * scrim keeps white text readable. A slow Ken-Burns drift adds life.
 */
export function HeroBackdrop({ image, className, rounded }: { image: string; className?: string; rounded?: boolean }) {
  return (
    <div aria-hidden className={cn('absolute inset-0 isolate overflow-hidden', rounded && 'rounded-3xl', className)}>
      <img
        src={image}
        alt=""
        className="h-full w-full object-cover grayscale animate-bg-drift motion-reduce:animate-none"
      />
      {/* Brand duotone tint (fixed colors so it never shifts with the theme) */}
      <div className="absolute inset-0 mix-blend-multiply bg-[linear-gradient(135deg,#0b74c4,#1c9c8b)]" />
      {/* Readability scrim for white text */}
      <div className="absolute inset-0 bg-black/25" />
      <div className="absolute inset-0 bg-linear-to-t from-black/35 via-transparent to-black/10" />
    </div>
  );
}
