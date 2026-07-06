import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export interface TypewriterSegment {
  text: string;
  /** Extra classes for this phrase (e.g. "text-primary"). */
  className?: string;
  /** Start this phrase on a new line. */
  newLine?: boolean;
}

interface TypewriterProps {
  segments: TypewriterSegment[];
  className?: string;
  /** ms to wait before the first word appears. */
  startDelay?: number;
  /** ms between each word being typed. */
  wordDelay?: number;
  /** Show the blinking caret. */
  caret?: boolean;
}

interface Word {
  text: string;
  className?: string;
  newLine: boolean;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Types text out word by word, like it is being written, with a blinking caret.
 * Each word rises and un-blurs as it lands.
 */
export function Typewriter({
  segments,
  className,
  startDelay = 200,
  wordDelay = 150,
  caret = true,
}: TypewriterProps) {
  const words = useMemo<Word[]>(() => {
    const out: Word[] = [];
    segments.forEach(seg => {
      seg.text.split(' ').forEach((w, i) => {
        out.push({ text: w, className: seg.className, newLine: i === 0 && !!seg.newLine });
      });
    });
    return out;
  }, [segments]);

  const fullText = useMemo(() => segments.map(s => s.text).join(' '), [segments]);

  const [count, setCount] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setCount(words.length);
      return;
    }

    setCount(0);
    let current = 0;

    const typeNext = () => {
      current += 1;
      setCount(current);
      if (current < words.length) {
        timer.current = setTimeout(typeNext, wordDelay);
      }
    };

    timer.current = setTimeout(typeNext, startDelay);
    return () => clearTimeout(timer.current);
  }, [words, startDelay, wordDelay]);

  const done = count >= words.length;

  return (
    <span className={cn('inline', className)}>
      {/* Full text for screen readers, without per-word animation noise */}
      <span className="sr-only">{fullText}</span>

      <span aria-hidden="true">
        {words.slice(0, count).map((word, i) => (
          <span key={i}>
            {word.newLine && <br />}
            <span className={cn('inline-block animate-word-in', word.className)}>{word.text}</span>
            {i < count - 1 && !words[i + 1]?.newLine ? ' ' : ''}
          </span>
        ))}
        {caret && (
          <span
            className={cn(
              'inline-block w-[0.06em] -mb-[0.1em] h-[0.95em] translate-y-[0.12em] bg-primary ml-[0.12em] rounded-full',
              done ? 'animate-blink' : 'opacity-100'
            )}
          />
        )}
      </span>
    </span>
  );
}
