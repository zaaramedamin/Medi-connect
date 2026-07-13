import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CheckboxChipProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  className?: string;
}

/**
 * A labelled checkbox rendered as a toggle chip — the shape used for the
 * chronic-conditions grid on a patient chart. Uses a native checkbox for
 * accessibility, visually hidden behind the chip.
 */
export function CheckboxChip({ checked, onChange, label, className }: CheckboxChipProps) {
  return (
    <label
      className={cn(
        'flex cursor-pointer select-none items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
        checked
          ? 'border-primary bg-primary/5 font-medium text-primary'
          : 'border-input text-muted-foreground hover:border-primary/40 hover:text-foreground',
        className
      )}
    >
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
      />
      <span
        aria-hidden
        className={cn(
          'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
          checked ? 'border-primary bg-primary text-primary-foreground' : 'border-input'
        )}
      >
        {checked && <Check className="h-3 w-3" />}
      </span>
      {label}
    </label>
  );
}
