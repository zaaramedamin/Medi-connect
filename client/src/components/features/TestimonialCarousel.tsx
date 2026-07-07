import { useEffect, useRef } from 'react';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';

const TESTIMONIALS = [
  { name: 'Sarra B.', role: 'Patient', quote: 'Booked a cardiologist in under a minute. The confirmation email arrived instantly — no phone calls, no waiting.' },
  { name: 'Dr. Karim H.', role: 'Cardiologist', quote: 'My schedule fills itself. Blocking time off and managing bookings takes seconds from the dashboard.' },
  { name: 'Mohamed A.', role: 'Patient', quote: 'The calendar shows exactly which slots are free, so there is never any back-and-forth. Simple and reliable.' },
  { name: 'Dr. Leila T.', role: 'Pediatrician', quote: 'Parents book night and day without calling my assistant. My no-show rate dropped since the email reminders.' },
  { name: 'Aya R.', role: 'Patient', quote: 'I found a dermatologist in my city, compared prices, and booked — all during my lunch break.' },
  { name: 'Dr. Walid M.', role: 'Psychiatrist', quote: 'The 45-minute slot setting fits my sessions perfectly. Patients see only the times I actually offer.' },
] as const;

const CARD_STEP = 336; // card width (20rem) + gap

/** Testimonial strip that scrolls continuously and can be nudged with arrow buttons. */
export function TestimonialCarousel() {
  const scroller = useRef<HTMLDivElement>(null);
  const paused = useRef(false);
  const resumeTimer = useRef<number | undefined>(undefined);

  // Continuous auto-scroll via rAF; loops seamlessly over the duplicated list.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    let raf = 0;
    const step = () => {
      if (!paused.current) {
        el.scrollLeft += 0.4;
        const half = el.scrollWidth / 2;
        if (el.scrollLeft >= half) el.scrollLeft -= half;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  const nudge = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    paused.current = true;
    el.scrollBy({ left: dir * CARD_STEP, behavior: 'smooth' });
    // Keep the loop valid if a nudge crosses a boundary
    const half = el.scrollWidth / 2;
    if (el.scrollLeft < 0) el.scrollLeft += half;
    window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => {
      paused.current = false;
    }, 1400);
  };

  const ArrowButton = ({ dir, label }: { dir: 1 | -1; label: string }) => (
    <button
      onClick={() => nudge(dir)}
      aria-label={label}
      className={`absolute top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border bg-card text-foreground shadow-md transition-colors hover:border-primary/40 hover:text-primary sm:flex ${
        dir === -1 ? 'left-2 md:left-6' : 'right-2 md:right-6'
      }`}
    >
      {dir === -1 ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
    </button>
  );

  return (
    <div className="relative">
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-linear-to-r from-background to-transparent md:w-32" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-linear-to-l from-background to-transparent md:w-32" />

      <ArrowButton dir={-1} label="Previous testimonials" />
      <ArrowButton dir={1} label="Next testimonials" />

      <div
        ref={scroller}
        onMouseEnter={() => (paused.current = true)}
        onMouseLeave={() => (paused.current = false)}
        className="flex gap-5 overflow-x-auto px-5 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
          <figure key={i} className="flex w-[20rem] shrink-0 flex-col rounded-2xl border bg-card p-6 md:w-[24rem]">
            <div className="mb-4 flex gap-0.5" aria-label="5 out of 5 stars">
              {[...Array(5)].map((_, s) => (
                <Star key={s} className="h-4 w-4 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <blockquote className="flex-1 text-sm leading-relaxed">“{t.quote}”</blockquote>
            <figcaption className="mt-5 flex items-center gap-3 border-t pt-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
                {t.name.split(' ').map(n => n[0]).join('')}
              </span>
              <div>
                <p className="text-sm font-semibold leading-none">{t.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t.role}</p>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
