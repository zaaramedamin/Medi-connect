import { Link } from 'react-router-dom';
import {
  ShieldCheck, CalendarCheck, Clock, Star, MapPin, Bell, Search, Stethoscope,
  ShoppingBag, MessagesSquare, Wallet, HeartPulse, ArrowRight, Check, X, Phone,
  BadgeCheck, Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BlurFade } from '@/components/ui/blur-fade';
import { AnimatedText } from '@/components/ui/animated-text';
import { NumberTicker } from '@/components/ui/number-ticker';
import { TestimonialCarousel } from '@/components/features/TestimonialCarousel';
import { useT } from '@/i18n';
import doctorCta from '@/assets/doctor-cta.svg';

const STATS = [
  { value: 500, suffix: '+', decimals: 0, label: 'Verified doctors' },
  { value: 10000, suffix: '+', decimals: 0, label: 'Patients served' },
  { value: 24, suffix: '', decimals: 0, label: 'Governorates covered' },
  { value: 4.9, suffix: '★', decimals: 1, label: 'Average rating' },
] as const;

const REASONS = [
  { icon: CalendarCheck, title: 'Book in seconds', text: 'See real-time availability and confirm instantly — no phone calls, no waiting on hold.' },
  { icon: ShieldCheck, title: 'Only verified doctors', text: 'Every doctor is vetted and onboarded by our team before they can appear in search.' },
  { icon: Star, title: 'Real patient reviews', text: 'Ratings come only from patients who actually completed a visit — never fake.' },
  { icon: Wallet, title: 'Transparent pricing', text: 'Consultation fees are shown up front, so you always know the cost before you book.' },
  { icon: MapPin, title: 'Care near you', text: 'Filter by city or use the live map to find the closest doctor across all 24 governorates.' },
  { icon: Bell, title: 'Never miss a visit', text: 'Automatic email confirmations and 24-hour and 2-hour reminders keep you on track.' },
] as const;

const OLD_WAY = [
  'Call during office hours and hope someone picks up',
  'Play phone-tag to find a free slot',
  'No idea about price until you arrive',
  'Forgotten appointments and missed visits',
  'Ask around to find a trusted specialist',
];

const NEW_WAY = [
  'Book online 24/7 in under a minute',
  'Pick from real-time open slots on a calendar',
  'See the consultation fee before you confirm',
  'Automatic reminders by email',
  'Browse verified doctors with real reviews',
];

const FAQS = [
  { q: 'Does it cost anything to use MediConnect?', a: 'No. Searching for doctors, booking appointments, and managing your visits is completely free for patients. You only pay the doctor’s consultation fee at your visit.' },
  { q: 'How do I know the doctors are real?', a: 'Doctors don’t sign themselves up. Our team verifies and onboards every doctor, and only those with an active membership appear in search results.' },
  { q: 'Can I cancel or reschedule?', a: 'Yes. You can cancel an upcoming appointment from your dashboard at any time, and free cancellation means no penalty.' },
  { q: 'What is the health shop?', a: 'Alongside appointments, you can order everyday parapharmacie essentials — thermometers, supplements, first-aid, baby care and more — delivered to your door.' },
  { q: 'Are you a doctor who wants to join?', a: 'We’d love to have you. Membership is by invitation and our team verifies every practice — reach out and we’ll get you set up.' },
];

export default function WhyMediConnect() {
  const t = useT();
  return (
    <div className="animate-fade-in">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-br from-primary/10 via-transparent to-accent/10" />
          <div className="absolute -top-32 -left-24 h-96 w-96 rounded-full bg-primary/20 blur-3xl animate-aurora" />
          <div className="absolute top-10 -right-28 h-[28rem] w-[28rem] rounded-full bg-accent/20 blur-3xl animate-aurora-slow" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] bg-[size:44px_44px] opacity-40 [mask-image:radial-gradient(ellipse_65%_60%_at_50%_0%,black_35%,transparent_100%)]" />
        </div>

        <div className="container relative grid items-center gap-12 py-16 md:py-24 lg:grid-cols-2">
          <div>
            <BlurFade>
              <span className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                <Sparkles className="h-3.5 w-3.5" /> Why MediConnect
              </span>
            </BlurFade>
            <BlurFade delay={0.05}>
              <h1 className="mb-5 text-4xl font-extrabold leading-[1.1] text-primary md:text-5xl xl:text-[3.4rem]">
                <span className="text-foreground">{t('Healthcare that finally')} </span>{t('respects your time')}
              </h1>
            </BlurFade>
            <BlurFade delay={0.1}>
              <p className="mb-8 max-w-lg text-lg text-muted-foreground">
                MediConnect brings verified doctors, instant online booking, and a health shop
                together in one calm, trustworthy place — so getting care never means waiting on hold again.
              </p>
            </BlurFade>
            <BlurFade delay={0.15}>
              <div className="flex flex-wrap gap-3">
                <Button size="lg" asChild>
                  <Link to="/"><Search className="mr-1.5 h-4 w-4" /> Find a doctor</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/register">Create a free account</Link>
                </Button>
              </div>
            </BlurFade>
            <BlurFade delay={0.2}>
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-accent" /> Verified doctors</span>
                <span className="flex items-center gap-1.5"><CalendarCheck className="h-4 w-4 text-accent" /> Instant confirmation</span>
                <span className="flex items-center gap-1.5"><Star className="h-4 w-4 text-accent" /> Free cancellation</span>
              </div>
            </BlurFade>
          </div>

          {/* Hero visual with floating aside cards */}
          <BlurFade delay={0.15} className="relative">
            <div className="relative mx-auto max-w-md">
              <img
                src="/why/hero.jpg"
                alt="A doctor completing a patient's appointment paperwork"
                className="w-full rounded-3xl border object-cover shadow-2xl shadow-primary/10"
              />
              <div className="absolute -left-4 top-8 hidden rounded-2xl border bg-card/95 p-3 shadow-lg backdrop-blur sm:block">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-accent">
                    <CalendarCheck className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold leading-none">Appointment confirmed</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">in under a minute</p>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-4 -right-3 hidden rounded-2xl border bg-card/95 p-3 shadow-lg backdrop-blur sm:block">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                  </span>
                  <div>
                    <p className="text-sm font-bold leading-none">4.9 / 5</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">from real patients</p>
                  </div>
                </div>
              </div>
            </div>
          </BlurFade>
        </div>
      </section>

      {/* ── Stats band ───────────────────────────────────────────────── */}
      <section className="bg-linear-to-br from-primary to-accent">
        <div className="container grid grid-cols-2 gap-8 py-12 md:grid-cols-4">
          {STATS.map(s => (
            <div key={s.label} className="text-center text-white">
              <p className="font-display text-3xl font-extrabold md:text-4xl">
                <NumberTicker value={s.value} suffix={s.suffix} decimalPlaces={s.decimals} />
              </p>
              <p className="mt-1 text-sm text-white/85">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Alternating feature rows ─────────────────────────────────── */}
      <FeatureRow
        image="/why/care.jpg"
        alt="A nurse measuring a patient's blood pressure"
        eyebrow="Built around you"
        title="Care that fits your life, not the other way around"
        text="Most people put off seeing a doctor because booking is a hassle. MediConnect removes the friction — browse open slots on a live calendar, confirm instantly, and get a reminder before every visit."
        points={['Book any time, day or night', 'Real-time availability — no double-booking', 'Email confirmation and 24h / 2h reminders']}
      />

      <FeatureRow
        reverse
        image="/why/team.jpg"
        alt="A team of verified doctors"
        eyebrow="Trust, by design"
        title="Only verified, vetted doctors — never a stranger"
        text="Doctors can't sign themselves up. Our team reviews and onboards every practitioner, and only doctors with an active membership appear in search. Ratings come exclusively from patients who completed a real visit."
        points={['Admin-verified onboarding', 'Reviews only from completed visits', 'Transparent, up-front pricing']}
      />

      {/* Shop row with a real product collage */}
      <section className="container py-16 md:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <BlurFade className="order-2 lg:order-1">
            <div className="grid grid-cols-2 gap-4">
              {[
                { src: '/products/thermometer.jpg', label: 'Devices' },
                { src: '/products/vitamins.jpg', label: 'Supplements' },
                { src: '/products/first-aid.jpg', label: 'First aid' },
                { src: '/products/sanitizer.jpg', label: 'Hygiene' },
              ].map((p, i) => (
                <div key={p.label} className={`overflow-hidden rounded-2xl border bg-card ${i % 2 ? 'translate-y-4' : ''}`}>
                  <img src={p.src} alt={p.label} loading="lazy" className="aspect-square w-full object-cover" />
                </div>
              ))}
            </div>
          </BlurFade>
          <BlurFade className="order-1 lg:order-2">
            <span className="mb-3 inline-block rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">More than appointments</span>
            <h2 className="mb-4 text-2xl font-bold md:text-3xl">Your whole health routine, in one place</h2>
            <p className="mb-6 max-w-lg text-muted-foreground">
              Beyond booking, MediConnect is where you restock everyday parapharmacie essentials and read
              trustworthy advice from real doctors — all under the same roof.
            </p>
            <ul className="mb-8 space-y-2.5">
              {[
                { icon: ShoppingBag, text: 'A health shop for devices, supplements, baby care and more' },
                { icon: MessagesSquare, text: 'Doctor insights, reports and practical advice' },
                { icon: HeartPulse, text: 'One account for appointments, orders and reviews' },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-2.5 text-sm">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {text}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-3">
              <Button asChild><Link to="/shop"><ShoppingBag className="mr-1.5 h-4 w-4" /> Visit the shop</Link></Button>
              <Button variant="outline" asChild><Link to="/community"><MessagesSquare className="mr-1.5 h-4 w-4" /> Read insights</Link></Button>
            </div>
          </BlurFade>
        </div>
      </section>

      {/* ── Reasons grid with sticky aside ───────────────────────────── */}
      <section className="border-y bg-muted/40">
        <div className="container grid gap-10 py-16 md:py-20 lg:grid-cols-[0.85fr_1.15fr]">
          <BlurFade>
            <div className="lg:sticky lg:top-24">
              <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <BadgeCheck className="h-3.5 w-3.5" /> Six reasons patients stay
              </span>
              <h2 className="mb-4 text-2xl font-bold md:text-3xl">Everything you need, nothing you don't</h2>
              <p className="mb-6 max-w-sm text-muted-foreground">
                We obsess over the small things that make healthcare feel effortless — so you can focus on feeling better.
              </p>
              <Button asChild><Link to="/">Find your doctor <ArrowRight className="ml-1.5 h-4 w-4" /></Link></Button>
            </div>
          </BlurFade>

          <div className="grid gap-4 sm:grid-cols-2">
            {REASONS.map(({ icon: Icon, title, text }, i) => (
              <BlurFade key={title} delay={0.05 * i} className="h-full">
                <div className="h-full rounded-2xl border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-md hover:shadow-primary/5">
                  <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mb-1 font-semibold">{title}</h3>
                  <p className="text-sm text-muted-foreground">{text}</p>
                </div>
              </BlurFade>
            ))}
          </div>
        </div>
      </section>

      {/* ── Old way vs MediConnect ───────────────────────────────────── */}
      <section className="container py-16 md:py-20">
        <BlurFade>
          <div className="mx-auto mb-10 max-w-xl text-center">
            <h2 className="mb-3 text-2xl font-bold md:text-3xl">The old way vs. MediConnect</h2>
            <p className="text-muted-foreground">The same appointment — a completely different experience.</p>
          </div>
        </BlurFade>
        <div className="grid gap-5 md:grid-cols-2">
          <BlurFade className="h-full">
            <div className="h-full rounded-2xl border bg-muted/40 p-6">
              <h3 className="mb-4 flex items-center gap-2 font-semibold text-muted-foreground">
                <Phone className="h-4 w-4" /> The old way
              </h3>
              <ul className="space-y-3">
                {OLD_WAY.map(item => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" /> {item}
                  </li>
                ))}
              </ul>
            </div>
          </BlurFade>
          <BlurFade delay={0.1} className="h-full">
            <div className="h-full rounded-2xl border-2 border-primary/30 bg-card p-6 shadow-lg shadow-primary/5">
              <h3 className="mb-4 flex items-center gap-2 font-semibold text-primary">
                <Stethoscope className="h-4 w-4" /> With MediConnect
              </h3>
              <ul className="space-y-3">
                {NEW_WAY.map(item => (
                  <li key={item} className="flex items-start gap-2.5 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> {item}
                  </li>
                ))}
              </ul>
            </div>
          </BlurFade>
        </div>
      </section>

      {/* ── For doctors band (the useful home for the old header link) ── */}
      <section id="for-doctors" className="border-y bg-secondary/40 scroll-mt-20">
        <div className="container grid items-center gap-10 py-16 md:py-20 lg:grid-cols-2">
          <BlurFade className="order-2 lg:order-1">
            <img src={doctorCta} alt="Doctor dashboard preview" className="mx-auto w-full max-w-md" draggable={false} />
          </BlurFade>
          <BlurFade className="order-1 lg:order-2">
            <span className="mb-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">For practitioners</span>
            <h2 className="mb-4 text-2xl font-bold md:text-3xl">Are you a doctor? Grow your practice</h2>
            <p className="mb-6 max-w-lg text-muted-foreground">
              Set your hours once and let patients book the slots you offer. Manage every appointment from a
              single dashboard, cut no-shows with automatic reminders, and reach patients across the country.
              Membership is by invitation — our team verifies every doctor before listing.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <a href="mailto:partners@mediconnect.tn">Partner with us <ArrowRight className="ml-1.5 h-4 w-4" /></a>
              </Button>
              <Button variant="outline" asChild><Link to="/login">Doctor sign in</Link></Button>
            </div>
          </BlurFade>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────── */}
      <section className="overflow-hidden py-16 md:py-20">
        <BlurFade>
          <h2 className="mb-10 text-center text-2xl font-bold md:text-3xl">Loved by patients and doctors</h2>
        </BlurFade>
        <TestimonialCarousel />
      </section>

      {/* ── FAQ (aside + list) ───────────────────────────────────────── */}
      <section className="border-t bg-muted/40">
        <div className="container grid gap-10 py-16 md:py-20 lg:grid-cols-[0.8fr_1.2fr]">
          <BlurFade>
            <div className="lg:sticky lg:top-24">
              <h2 className="mb-3 text-2xl font-bold md:text-3xl">Questions? We've got answers</h2>
              <p className="mb-6 max-w-sm text-muted-foreground">
                Everything you need to know before your first booking. Still curious? We're a message away.
              </p>
              <Button variant="outline" asChild>
                <a href="mailto:contact@mediconnect.tn"><Clock className="mr-1.5 h-4 w-4" /> Contact support</a>
              </Button>
            </div>
          </BlurFade>

          <div className="space-y-3">
            {FAQS.map(({ q, a }, i) => (
              <BlurFade key={q} delay={0.04 * i}>
                <details className="group rounded-2xl border bg-card p-5 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer items-center justify-between gap-3 font-semibold">
                    {q}
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
                  </summary>
                  <p className="mt-3 text-sm text-muted-foreground">{a}</p>
                </details>
              </BlurFade>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────── */}
      <section className="container py-16 md:py-20">
        <BlurFade>
          <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-primary to-accent px-6 py-14 text-center md:px-14">
            <div aria-hidden className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/10" />
            <div aria-hidden className="absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-white/10" />
            <h2 className="relative mb-4 text-2xl font-bold text-white md:text-4xl">Ready to feel the difference?</h2>
            <p className="relative mx-auto mb-8 max-w-md text-white/85">
              Join thousands of patients who book smarter. Create a free account and find your doctor today.
            </p>
            <div className="relative flex flex-wrap justify-center gap-3">
              <Button size="lg" variant="secondary" className="bg-white font-semibold text-primary hover:bg-white/90" asChild>
                <Link to="/register">Get started — it's free</Link>
              </Button>
              <Button size="lg" variant="outline" className="border-white/40 bg-transparent text-white hover:bg-white/10" asChild>
                <Link to="/">Browse doctors</Link>
              </Button>
            </div>
          </div>
        </BlurFade>
      </section>
    </div>
  );
}

function FeatureRow({
  image, alt, eyebrow, title, text, points, reverse,
}: {
  image: string; alt: string; eyebrow: string; title: string; text: string; points: string[]; reverse?: boolean;
}) {
  const t = useT();
  return (
    <section className="container py-16 md:py-20">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <BlurFade className={reverse ? 'order-2 lg:order-2' : 'order-2 lg:order-1'}>
          <img src={image} alt={alt} loading="lazy" className="w-full rounded-3xl border object-cover shadow-xl shadow-primary/5" />
        </BlurFade>
        <BlurFade className={reverse ? 'order-1 lg:order-1' : 'order-1 lg:order-2'}>
          <span className="mb-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{eyebrow}</span>
          <h2 className="mb-4 text-2xl font-bold md:text-3xl"><AnimatedText text={t(title)} /></h2>
          <p className="mb-6 max-w-lg text-muted-foreground">{text}</p>
          <ul className="space-y-2.5">
            {points.map(p => (
              <li key={p} className="flex items-start gap-2.5 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> {p}
              </li>
            ))}
          </ul>
        </BlurFade>
      </div>
    </section>
  );
}
