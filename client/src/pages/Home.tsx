import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search, Star, ShieldCheck, CalendarCheck, BadgeCheck, ArrowRight,
  Stethoscope, HeartPulse, Brain, Baby, Bone, Eye, Smile, Ear,
  SlidersHorizontal, X, List, Map as MapIcon, LocateFixed,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BlurFade } from '@/components/ui/blur-fade';
import { NumberTicker } from '@/components/ui/number-ticker';
import { Typewriter } from '@/components/ui/typewriter';
import { RotatingText } from '@/components/ui/rotating-text';
import { AnimatedText } from '@/components/ui/animated-text';
import { HeroBackdrop } from '@/components/ui/hero-backdrop';
import { Parallax } from '@/components/ui/parallax';
import { DoctorCard } from '@/components/features/DoctorCard';
import { DoctorMap } from '@/components/features/DoctorMap';
import { HealthProducts } from '@/components/features/HealthProducts';
import { TestimonialCarousel } from '@/components/features/TestimonialCarousel';
import { ArticleCard } from '@/components/features/ArticleCard';
import { searchDoctors, getArticles } from '@/services/api';
import { useDebounce } from '@/hooks/useDebounce';
import { haversineKm, cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import heroIllustration from '@/assets/hero-illustration.svg';
import doctorCta from '@/assets/doctor-cta.svg';

const SPECIALTIES = [
  { icon: Stethoscope, label: 'General Medicine' },
  { icon: HeartPulse, label: 'Cardiology' },
  { icon: Brain, label: 'Neurology' },
  { icon: Baby, label: 'Pediatrics' },
  { icon: Bone, label: 'Orthopedics' },
  { icon: Eye, label: 'Ophthalmology' },
  { icon: Smile, label: 'Dentistry' },
  { icon: Ear, label: 'ENT' },
] as const;

const ALL_SPECIALTIES = [
  'General Medicine', 'Cardiology', 'Neurology', 'Pediatrics', 'Orthopedics',
  'Ophthalmology', 'Dentistry', 'ENT', 'Dermatology', 'Gynecology', 'Psychiatry',
  'Endocrinology', 'Urology', 'Gastroenterology', 'Pulmonology', 'Rheumatology',
] as const;

// The 24 governorates of Tunisia
const CITIES = [
  'Tunis', 'Ariana', 'Ben Arous', 'Manouba', 'Nabeul', 'Zaghouan',
  'Bizerte', 'Béja', 'Jendouba', 'Le Kef', 'Siliana', 'Sousse',
  'Monastir', 'Mahdia', 'Kairouan', 'Kasserine', 'Sidi Bouzid', 'Sfax',
  'Gabès', 'Medenine', 'Tataouine', 'Gafsa', 'Tozeur', 'Kébili',
] as const;

const SELECT_CLASS =
  'h-10 rounded-xl border bg-card px-3 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer';

type SortMode = 'relevance' | 'rating' | 'price-asc' | 'price-desc' | 'nearest';

const STEPS = [
  { step: '01', title: 'Search', desc: 'Find doctors by name, specialty, or location — results appear as you type.' },
  { step: '02', title: 'Pick a slot', desc: 'Browse real-time availability on the calendar and choose the time that suits you.' },
  { step: '03', title: 'Get confirmed', desc: 'Receive an instant email confirmation with all your appointment details.' },
] as const;

export default function Home() {
  const [query, setQuery] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [city, setCity] = useState('');
  const [sort, setSort] = useState<SortMode>('relevance');
  const [view, setView] = useState<'list' | 'map'>('list');
  const [browseAll, setBrowseAll] = useState(false);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const debouncedQuery = useDebounce(query, 350);

  const hasFilters = specialty !== '' || city !== '';
  const showResults = debouncedQuery.length >= 1 || hasFilters || browseAll;

  const locateMe = () => {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSort('nearest');
      },
      () => setGeoError('Could not get your location. Please allow location access.')
    );
  };

  const { data: doctors, isLoading } = useQuery({
    queryKey: ['doctors', 'search', debouncedQuery, specialty, city],
    queryFn: () => searchDoctors(debouncedQuery, { specialty, location: city }),
    enabled: showResults,
  });

  // Default landing list: the highest-rated doctors
  const { data: allDoctors, isLoading: topLoading } = useQuery({
    queryKey: ['doctors', 'top'],
    queryFn: () => searchDoctors(''),
  });

  const topRated = useMemo(
    () =>
      [...(allDoctors ?? [])]
        .sort((a, b) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0))
        .slice(0, 6),
    [allDoctors]
  );

  // Latest doctor articles for the home "insights" section (hidden until seeded)
  const { data: latestArticles } = useQuery({
    queryKey: ['articles', 'home'],
    queryFn: () => getArticles(),
  });
  const insights = (latestArticles ?? []).slice(0, 3);

  const sortedDoctors = useMemo(() => {
    if (!doctors || sort === 'relevance') return doctors;
    const dist = (d: (typeof doctors)[number]) =>
      userLoc && d.lat != null && d.lng != null
        ? haversineKm(userLoc, { lat: d.lat, lng: d.lng })
        : Infinity;
    return [...doctors].sort((a, b) => {
      if (sort === 'rating') return (b.avg_rating ?? 0) - (a.avg_rating ?? 0);
      if (sort === 'nearest') return dist(a) - dist(b);
      if (sort === 'price-asc') return (a.cost ?? Infinity) - (b.cost ?? Infinity);
      return (b.cost ?? -Infinity) - (a.cost ?? -Infinity);
    });
  }, [doctors, sort, userLoc]);

  const clearFilters = () => {
    setQuery('');
    setSpecialty('');
    setCity('');
    setSort('relevance');
    setBrowseAll(false);
  };

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Layered background: gradient wash, aurora blobs, grid */}
        <div aria-hidden className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-br from-primary/10 via-transparent to-accent/10" />
          <div className="absolute -top-32 -left-24 h-96 w-96 rounded-full bg-primary/20 blur-3xl animate-aurora" />
          <div className="absolute top-16 -right-28 h-[28rem] w-[28rem] rounded-full bg-accent/20 blur-3xl animate-aurora-slow" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] bg-[size:44px_44px] opacity-40 [mask-image:radial-gradient(ellipse_65%_65%_at_50%_0%,black_35%,transparent_100%)]" />
        </div>

        <div className="container relative grid lg:grid-cols-2 gap-12 items-center py-16 md:py-24">
          <div>
            <BlurFade>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary text-secondary-foreground px-3 py-1 text-xs font-semibold mb-5">
                <BadgeCheck className="h-3.5 w-3.5" />
                Trusted by patients across the country
              </span>
            </BlurFade>
            <h1 className="text-4xl md:text-5xl xl:text-[3.4rem] font-extrabold leading-[1.1] mb-5 min-h-[2.4em]">
              <Typewriter
                segments={[{ text: 'Healthcare at your fingertips.' }]}
                startDelay={250}
                wordDelay={240}
                caret={false}
              />
              <RotatingText
                className="text-primary"
                startDelay={1500}
                phrases={[
                  'Book a doctor in seconds.',
                  'Find the right specialist.',
                  'Care that fits your day.',
                  'No calls, no waiting rooms.',
                ]}
              />
            </h1>
            <BlurFade delay={1.7}>
              <p className="text-lg text-muted-foreground mb-8 max-w-lg">
                Search verified doctors, see their real-time availability, and confirm your visit instantly — no phone calls needed.
              </p>
            </BlurFade>

            <BlurFade delay={1.85}>
              <div className="relative max-w-xl">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  className="pl-12 pr-4 h-14 text-base rounded-2xl border-2 bg-card shadow-lg shadow-primary/5 focus-visible:ring-2 transition-shadow focus:shadow-xl focus:shadow-primary/10"
                  placeholder="Condition, specialty, doctor name, or city..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  aria-label="Search doctors"
                />
              </div>
            </BlurFade>

            <BlurFade delay={2}>
              <div className="flex flex-wrap gap-x-6 gap-y-2 mt-6 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-accent" />Verified doctors</span>
                <span className="flex items-center gap-1.5"><CalendarCheck className="h-4 w-4 text-accent" />Instant confirmation</span>
                <span className="flex items-center gap-1.5"><Star className="h-4 w-4 text-accent" />Free cancellation</span>
              </div>
            </BlurFade>
          </div>

          <BlurFade delay={0.25} className="hidden lg:block">
            <Parallax offset={36}>
              <img
                src={heroIllustration}
                alt="Doctor profile with appointment calendar and instant confirmation"
                className="w-full max-w-xl mx-auto animate-float"
                draggable={false}
              />
            </Parallax>
          </BlurFade>
        </div>
      </section>

      {/* Search results */}
      {showResults ? (
        <section className="container py-10 min-h-[24rem]">
          {/* Filter bar */}
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground mr-1">
              <SlidersHorizontal className="h-4 w-4" /> Filters
            </span>
            <select value={specialty} onChange={e => setSpecialty(e.target.value)} className={SELECT_CLASS} aria-label="Filter by specialty">
              <option value="">All specialties</option>
              {ALL_SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={city} onChange={e => setCity(e.target.value)} className={SELECT_CLASS} aria-label="Filter by city">
              <option value="">All cities</option>
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={sort} onChange={e => setSort(e.target.value as SortMode)} className={SELECT_CLASS} aria-label="Sort results">
              <option value="relevance">Sort: Relevance</option>
              <option value="rating">Top rated</option>
              <option value="nearest">Nearest to me</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
            </select>
            <Button variant="outline" size="sm" onClick={locateMe} className="h-10 rounded-xl">
              <LocateFixed className="h-4 w-4 mr-1" /> Near me
            </Button>
            {(hasFilters || query || browseAll) && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                <X className="h-4 w-4 mr-1" /> Clear
              </Button>
            )}

            {/* List / Map toggle */}
            <div className="ml-auto inline-flex rounded-xl border bg-card p-0.5">
              {([['list', List, 'List'], ['map', MapIcon, 'Map']] as const).map(([mode, Icon, label]) => (
                <button
                  key={mode}
                  onClick={() => setView(mode)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                    view === mode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>
          </div>

          {geoError && <p className="text-sm text-destructive mb-4">{geoError}</p>}

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-56 rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : sortedDoctors && sortedDoctors.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground mb-5">
                {sortedDoctors.length} doctor{sortedDoctors.length !== 1 ? 's' : ''} found
                {debouncedQuery ? ` for “${debouncedQuery}”` : ''}
                {specialty ? ` · ${specialty}` : ''}
                {city ? ` · ${city}` : ''}
                {sort === 'nearest' && userLoc ? ' · nearest first' : ''}
              </p>
              {view === 'map' ? (
                <DoctorMap doctors={sortedDoctors} userLocation={userLoc} className="h-[560px]" />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sortedDoctors.map(doctor => <DoctorCard key={doctor.id} doctor={doctor} />)}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium text-foreground">No doctors found</p>
              <p className="text-sm mt-1">Try a different name, specialty, or location.</p>
            </div>
          )}
        </section>
      ) : (
        <>
          {/* Top-rated doctors */}
          <section className="container pt-14 pb-4">
            <BlurFade>
              <div className="flex items-end justify-between mb-8">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold mb-1"><AnimatedText text="Top-rated doctors" /></h2>
                  <p className="text-muted-foreground text-sm">The highest-rated doctors on MediConnect right now.</p>
                </div>
                <button
                  onClick={() => setBrowseAll(true)}
                  className="hidden sm:inline text-sm font-semibold text-primary hover:underline"
                >
                  Browse all →
                </button>
              </div>
            </BlurFade>

            {topLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => <div key={i} className="h-56 rounded-2xl bg-muted animate-pulse" />)}
              </div>
            ) : topRated.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {topRated.map((d, i) => (
                  <BlurFade key={d.id} delay={0.06 * i} className="h-full">
                    <DoctorCard doctor={d} />
                  </BlurFade>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No doctors available yet.</p>
            )}
          </section>

          {/* Specialties */}
          <section className="container py-14">
            <BlurFade>
              <div className="flex items-end justify-between mb-8">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold mb-1"><AnimatedText text="Browse by specialty" /></h2>
                  <p className="text-muted-foreground text-sm">Tap a specialty to see available doctors.</p>
                </div>
              </div>
            </BlurFade>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
              {SPECIALTIES.map(({ icon: Icon, label }, i) => (
                <BlurFade key={label} delay={0.05 * i}>
                  <button
                    onClick={() => { setQuery(''); setSpecialty(label); }}
                    className="group flex w-full items-center gap-3 rounded-2xl border bg-card p-4 text-left transition-all hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-sm font-semibold">{label}</span>
                  </button>
                </BlurFade>
              ))}
            </div>
          </section>

          {/* How it works */}
          <section id="how-it-works" className="bg-muted/50 py-16 scroll-mt-20">
            <div className="container">
              <BlurFade>
                <div className="text-center max-w-xl mx-auto mb-12">
                  <h2 className="text-2xl md:text-3xl font-bold mb-3"><AnimatedText text="Book a visit in three steps" /></h2>
                  <p className="text-muted-foreground">From search to confirmation in less than a minute.</p>
                </div>
              </BlurFade>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {STEPS.map(({ step, title, desc }, i) => (
                  <BlurFade key={step} delay={0.12 * i}>
                    <div className="relative h-full rounded-2xl border bg-card p-7">
                      <span className="font-display text-5xl font-extrabold text-primary/15 absolute top-5 right-6 select-none">{step}</span>
                      <h3 className="font-bold text-lg mb-2">{title}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
                    </div>
                  </BlurFade>
                ))}
              </div>
            </div>
          </section>

          {/* For doctors */}
          <section id="for-doctors" className="container py-20 scroll-mt-20">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <BlurFade className="order-2 lg:order-1" delay={0.1}>
                <img
                  src={doctorCta}
                  alt="Doctor dashboard with weekly schedule and patient statistics"
                  className="w-full max-w-md mx-auto"
                  draggable={false}
                />
              </BlurFade>
              <BlurFade className="order-1 lg:order-2">
                <span className="inline-block rounded-full bg-accent/10 text-accent px-3 py-1 text-xs font-semibold mb-4">
                  For practitioners
                </span>
                <h2 className="text-2xl md:text-3xl font-bold mb-4"><AnimatedText text="Grow your practice with MediConnect" /></h2>
                <p className="text-muted-foreground mb-8 max-w-lg">
                  Set your working hours once — patients book only the slots you offer. Block time off in one click and keep every appointment in a single dashboard. Membership is by invitation — our team verifies every doctor before listing.
                </p>
                <div className="grid grid-cols-3 gap-4 mb-8 max-w-md">
                  {[
                    { value: 500, suffix: '+', decimals: 0, label: 'Doctors' },
                    { value: 10000, suffix: '+', decimals: 0, label: 'Patients' },
                    { value: 4.9, suffix: '★', decimals: 1, label: 'Avg rating' },
                  ].map(s => (
                    <div key={s.label} className="rounded-2xl border bg-card p-4 text-center">
                      <p className="text-2xl font-bold text-primary font-display">
                        <NumberTicker value={s.value} suffix={s.suffix} decimalPlaces={s.decimals} />
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
                <Button size="lg" asChild>
                  <a href="mailto:partners@mediconnect.tn">Partner with us <ArrowRight className="h-4 w-4 ml-1.5" /></a>
                </Button>
              </BlurFade>
            </div>
          </section>

          {/* Health products shop */}
          <HealthProducts />

          {/* Doctor insights & advice */}
          {insights.length > 0 && (
            <section className="container py-16">
              <BlurFade>
                <div className="mb-8 flex items-end justify-between gap-4">
                  <div>
                    <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      <Stethoscope className="h-3.5 w-3.5" /> Health insights
                    </span>
                    <h2 className="mb-1 text-2xl font-bold md:text-3xl"><AnimatedText text="From our doctors — reports & advice" /></h2>
                    <p className="text-sm text-muted-foreground">Trusted guidance and public updates, written by the doctors on MediConnect.</p>
                  </div>
                  <Link to="/community" className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline sm:inline-flex">
                    Read the community <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </BlurFade>
              <div className="grid gap-6 md:grid-cols-3">
                {insights.map((a, i) => (
                  <BlurFade key={a.id} delay={0.06 * i} className="h-full">
                    <ArticleCard article={a} />
                  </BlurFade>
                ))}
              </div>
            </section>
          )}

          {/* Testimonials */}
          <section className="bg-muted/50 py-16 overflow-hidden">
            <BlurFade>
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-12"><AnimatedText text="Loved by patients and doctors" /></h2>
            </BlurFade>
            <TestimonialCarousel />
          </section>

          {/* Final CTA — real photo background as an on-brand duotone */}
          <section className="container py-20">
            <BlurFade>
            <div className="relative overflow-hidden rounded-3xl px-6 py-16 md:px-14 md:py-20 text-center">
              <HeroBackdrop image="/backgrounds/cta.jpg" rounded />
              <div aria-hidden className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/10" />
              <div aria-hidden className="absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-white/10" />
              <h2 className="relative text-2xl md:text-4xl font-bold text-white mb-4">
                <AnimatedText text="Ready for your next appointment?" />
              </h2>
              <p className="relative text-white/85 max-w-md mx-auto mb-8">
                Create a free account and book your first visit today. Your data stays encrypted and is never sold.
              </p>
              <Button
                size="lg"
                variant="secondary"
                className="relative bg-white text-primary hover:bg-white/90 font-semibold"
                asChild
              >
                <Link to="/register">Get started — it's free</Link>
              </Button>
            </div>
            </BlurFade>
          </section>
        </>
      )}
    </div>
  );
}
