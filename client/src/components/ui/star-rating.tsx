import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  /** Rating value 0–5. */
  value?: number;
  /** Number of reviews to show in parentheses. */
  count?: number;
  /** Star size in px. */
  size?: number;
  /** Show the numeric value / "New" label. */
  showValue?: boolean;
  className?: string;
}

/** Read-only 5-star rating with optional numeric value and review count. */
export function StarRating({ value = 0, count, size = 15, showValue = true, className }: StarRatingProps) {
  const rounded = Math.round(value);
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className="inline-flex" aria-label={`${value} out of 5 stars`}>
        {[0, 1, 2, 3, 4].map(i => (
          <Star
            key={i}
            style={{ width: size, height: size }}
            className={cn('shrink-0', i < rounded ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-muted-foreground/35')}
          />
        ))}
      </span>
      {showValue && (
        value > 0
          ? <span className="text-xs font-semibold text-foreground">{value.toFixed(1)}</span>
          : <span className="text-xs text-muted-foreground">New</span>
      )}
      {count != null && count > 0 && <span className="text-xs text-muted-foreground">({count})</span>}
    </span>
  );
}

interface StarInputProps {
  value: number;
  onChange: (value: number) => void;
  size?: number;
}

/** Interactive 5-star picker for submitting a review. */
export function StarInput({ value, onChange, size = 28 }: StarInputProps) {
  const [hover, setHover] = useState(0);
  const active = hover || value;

  return (
    <div className="inline-flex gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          className="transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          <Star
            style={{ width: size, height: size }}
            className={cn(n <= active ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-muted-foreground/40')}
          />
        </button>
      ))}
    </div>
  );
}
