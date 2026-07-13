import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import {
  MapPin, Clock, Calendar, MessageSquare, BadgeCheck, Phone, Mail, Globe,
  Award, Stethoscope, Building2, Languages, Star, Quote, CalendarCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { StarRating } from '@/components/ui/star-rating';
import { BlurFade } from '@/components/ui/blur-fade';
import { NumberTicker } from '@/components/ui/number-ticker';
import { BookingCalendar } from '@/components/features/BookingCalendar';
import { DoctorLocationMap } from '@/components/features/DoctorLocationMap';
import { getDoctor, getDoctorReviews, bookAppointment } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { useT } from '@/i18n';
import { formatDate, formatTime, cn } from '@/lib/utils';
import type { Doctor, ClinicPost, Review } from '@/types';

// ── Building blocks ──────────────────────────────────────────────────

function Section({ id, icon: Icon, title, action, children, className }: {
  id?: string;
  icon: React.ElementType;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn('scroll-mt-24 rounded-2xl border bg-card p-6', className)}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Icon className="h-5 w-5 text-primary" />
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function StatTile({ icon: Icon, value, label }: { icon: React.ElementType; value: React.ReactNode; label: string }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border bg-card p-4 text-center transition-colors hover:border-primary/40">
      <div aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-primary to-accent opacity-0 transition-opacity group-hover:opacity-100" />
      <Icon className="mx-auto mb-2 h-5 w-5 text-primary" />
      <p className="text-xl font-bold leading-none">{value}</p>
      <p className="mt-1.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function ContactRow({ icon: Icon, label, value, href }: {
  icon: React.ElementType;
  label: string;
  value: string;
  href?: string;
}) {
  const body = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs text-muted-foreground">{label}</span>
        <span className="block truncate text-sm font-medium">{value}</span>
      </span>
    </>
  );

  const className = 'group flex items-center gap-3 rounded-xl p-2 -mx-2 transition-colors hover:bg-muted/60';

  return href ? (
    <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className={className}>
      {body}
    </a>
  ) : (
    <div className={className}>{body}</div>
  );
}

/** One clinic post on the timeline. A post with no end year is still held. */
function ClinicPostRow({ post, isLast }: { post: ClinicPost; isLast: boolean }) {
  const t = useT();
  const current = post.end_year == null;

  const years = post.start_year
    ? `${post.start_year} — ${current ? t('present') : post.end_year}`
    : current
      ? t('present')
      : String(post.end_year ?? '');

  return (
    <li className="relative flex gap-4 pb-6 last:pb-0">
      {!isLast && <span aria-hidden className="absolute left-[7px] top-5 h-full w-px bg-border" />}
      <span
        aria-hidden
        className={cn(
          'relative z-10 mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-2',
          current ? 'border-primary bg-primary' : 'border-border bg-background'
        )}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold leading-tight">{post.role ?? t('Practitioner')}</p>
          {current && (
            <Badge variant="secondary" className="h-5 bg-primary/10 px-2 text-[10px] font-bold uppercase tracking-wide text-primary">
              {t('Current')}
            </Badge>
          )}
        </div>
        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Building2 className="h-3.5 w-3.5 shrink-0" />
          {post.clinic_name}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {[post.city, years].filter(Boolean).join(' · ')}
        </p>
      </div>
    </li>
  );
}

function ReviewRow({ review }: { review: Review }) {
  const initials = review.patient_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <li className="rounded-xl border bg-background p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
            {initials}
          </span>
          <span className="text-sm font-semibold">{review.patient_name}</span>
        </div>
        <StarRating value={review.rating} size={13} showValue={false} />
      </div>
      {review.comment && (
        <p className="mt-3 flex gap-2 text-sm leading-relaxed text-muted-foreground">
          <Quote className="h-3.5 w-3.5 shrink-0 rotate-180 text-primary/40" />
          {review.comment}
        </p>
      )}
    </li>
  );
}

// ── Hero ─────────────────────────────────────────────────────────────

function Hero({ doctor, onBook }: { doctor: Doctor; onBook: () => void }) {
  const t = useT();
  const initials = doctor.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const chips = [
    doctor.location && { icon: MapPin, text: doctor.location },
    doctor.years_experience != null && {
      icon: Award,
      text: t('{years} yrs experience', { years: doctor.years_experience }),
    },
    doctor.avg_consultation_time && { icon: Clock, text: `${doctor.avg_consultation_time} min` },
    doctor.languages?.length && { icon: Languages, text: doctor.languages.map(l => t(l)).join(', ') },
  ].filter(Boolean) as { icon: React.ElementType; text: string }[];

  return (
    <div className="relative mb-8">
      {/* Cover */}
      <div className="h-36 w-full bg-linear-to-br from-primary via-primary/80 to-accent sm:h-44">
        <div
          aria-hidden
          className="h-full w-full opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.35) 1px, transparent 0)',
            backgroundSize: '22px 22px',
          }}
        />
      </div>

      <div className="container max-w-6xl">
        <div className="-mt-16 flex flex-col gap-5 sm:-mt-14 sm:flex-row sm:items-end">
          <Avatar className="h-32 w-32 shrink-0 rounded-2xl border-4 border-background shadow-xl">
            {doctor.photos_url && <AvatarImage src={doctor.photos_url} alt={doctor.name} className="rounded-xl object-cover" />}
            <AvatarFallback className="rounded-xl bg-secondary text-3xl font-bold text-secondary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 pb-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold sm:text-3xl">{doctor.name}</h1>
              <BadgeCheck className="h-5 w-5 shrink-0 text-accent" aria-label={t('Verified doctor')} />
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              {doctor.specialty && (
                <Badge variant="secondary" className="font-semibold">{doctor.specialty}</Badge>
              )}
              <StarRating value={doctor.avg_rating ?? 0} count={doctor.review_count} size={15} />
            </div>

            {chips.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                {chips.map(({ icon: Icon, text }) => (
                  <span key={text} className="flex items-center gap-1.5">
                    <Icon className="h-4 w-4 shrink-0" />
                    {text}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap gap-2 pb-1">
            {doctor.phone && (
              <Button asChild variant="outline" size="sm">
                <a href={`tel:${doctor.phone}`}><Phone className="mr-1.5 h-4 w-4" />{t('Call')}</a>
              </Button>
            )}
            <Button size="sm" onClick={onBook}>
              <CalendarCheck className="mr-1.5 h-4 w-4" />
              {t('Book an appointment')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────

export default function DoctorProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const t = useT();

  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>('cash');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: doctor, isLoading } = useQuery({
    queryKey: ['doctor', id],
    queryFn: () => getDoctor(id!),
    enabled: !!id,
  });

  const { data: reviews } = useQuery({
    queryKey: ['doctor', id, 'reviews'],
    queryFn: () => getDoctorReviews(id!),
    enabled: !!id,
  });

  const bookMutation = useMutation({
    mutationFn: () => bookAppointment(id!, selectedSlot!, paymentMethod),
    onSuccess: () => {
      setConfirmOpen(false);
      navigate('/patient/dashboard');
    },
  });

  if (isLoading) {
    return (
      <div className="container flex justify-center py-16">
        <span className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }
  if (!doctor) {
    return <div className="container py-16 text-center text-muted-foreground">{t('Doctor not found.')}</div>;
  }

  const handleSlotSelect = (slot: string) => {
    if (!user) { navigate('/login'); return; }
    setSelectedSlot(slot);
    setConfirmOpen(true);
  };

  const scrollToBooking = () =>
    document.getElementById('book')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const clinics = doctor.clinics ?? [];
  const hasContact = Boolean(doctor.phone || doctor.email || doctor.website || doctor.address);

  return (
    <div className="pb-16">
      <Hero doctor={doctor} onBook={scrollToBooking} />

      <div className="container max-w-6xl space-y-8">
        {/* At a glance */}
        <BlurFade>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile
              icon={Award}
              value={
                doctor.years_experience != null
                  ? <NumberTicker value={doctor.years_experience} suffix="+" />
                  : '—'
              }
              label={t('Years of experience')}
            />
            <StatTile
              icon={Star}
              value={doctor.review_count ? <NumberTicker value={doctor.avg_rating ?? 0} decimalPlaces={1} /> : t('New')}
              label={t('Average rating')}
            />
            <StatTile
              icon={MessageSquare}
              value={<NumberTicker value={doctor.review_count ?? 0} />}
              label={t('Patient reviews')}
            />
            <StatTile
              icon={Stethoscope}
              value={doctor.cost != null ? `${doctor.cost} DT` : '—'}
              label={t('Per consultation')}
            />
          </div>
        </BlurFade>

        <div className="grid gap-8 lg:grid-cols-5">
          {/* Left — who they are, where they work, where they are */}
          <div className="space-y-8 lg:col-span-3">
            <BlurFade delay={0.05}>
              <Section icon={Stethoscope} title={t('About {name}', { name: doctor.name })}>
                {doctor.description ? (
                  <p className="whitespace-pre-line text-[15px] leading-relaxed text-muted-foreground">
                    {doctor.description}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("This doctor hasn't written an introduction yet.")}
                  </p>
                )}
              </Section>
            </BlurFade>

            <BlurFade delay={0.1}>
              <Section
                icon={Building2}
                title={t('Clinic posts')}
                action={
                  clinics.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {clinics.length === 1 ? t('1 post') : t('{count} posts', { count: clinics.length })}
                    </Badge>
                  )
                }
              >
                {clinics.length > 0 ? (
                  <ol className="space-y-0">
                    {clinics.map((post, i) => (
                      <ClinicPostRow key={post.id} post={post} isLast={i === clinics.length - 1} />
                    ))}
                  </ol>
                ) : (
                  <div className="flex items-start gap-3 rounded-xl border border-dashed bg-muted/30 p-4">
                    <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{t('Independent practice')}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {t('{name} does not currently hold a post at a clinic or hospital.', { name: doctor.name })}
                      </p>
                    </div>
                  </div>
                )}
              </Section>
            </BlurFade>

            <BlurFade delay={0.15}>
              <Section icon={MapPin} title={t('Practice location')}>
                <DoctorLocationMap
                  lat={doctor.lat}
                  lng={doctor.lng}
                  address={doctor.address}
                  location={doctor.location}
                  name={doctor.name}
                />
              </Section>
            </BlurFade>
          </div>

          {/* Right — how to reach them, how to book */}
          <div className="space-y-6 lg:col-span-2">
            <BlurFade delay={0.05}>
              <Section icon={Phone} title={t('Contact')}>
                {hasContact ? (
                  <div className="space-y-1">
                    {doctor.phone && (
                      <ContactRow icon={Phone} label={t('Phone')} value={doctor.phone} href={`tel:${doctor.phone}`} />
                    )}
                    {doctor.email && (
                      <ContactRow icon={Mail} label={t('Email')} value={doctor.email} href={`mailto:${doctor.email}`} />
                    )}
                    {doctor.website && (
                      <ContactRow
                        icon={Globe}
                        label={t('Website')}
                        value={doctor.website.replace(/^https?:\/\//, '')}
                        href={doctor.website}
                      />
                    )}
                    {doctor.address && (
                      <ContactRow icon={MapPin} label={t('Address')} value={doctor.address} />
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('No contact details shared.')}</p>
                )}

                {doctor.languages && doctor.languages.length > 0 && (
                  <div className="mt-5 border-t pt-4">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Languages className="h-3.5 w-3.5" />
                      {t('Languages spoken')}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {doctor.languages.map(lang => (
                        <Badge key={lang} variant="secondary" className="text-xs">{t(lang)}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </Section>
            </BlurFade>

            <BlurFade delay={0.1}>
              <Section id="book" icon={Calendar} title={t('Book an appointment')}>
                {doctor.working_hours_start ? (
                  <BookingCalendar doctorId={id!} onSelectSlot={handleSlotSelect} />
                ) : (
                  <p className="text-sm text-muted-foreground">{t("This doctor hasn't set their schedule yet.")}</p>
                )}
              </Section>
            </BlurFade>
          </div>
        </div>

        {/* Reviews */}
        <BlurFade delay={0.05}>
          <Section
            icon={MessageSquare}
            title={t('Patient reviews')}
            action={doctor.review_count ? <StarRating value={doctor.avg_rating ?? 0} count={doctor.review_count} size={15} /> : null}
          >
            {reviews && reviews.length > 0 ? (
              <ul className="grid gap-3 sm:grid-cols-2">
                {reviews.map(r => <ReviewRow key={r.id} review={r} />)}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{t('No reviews yet — be the first after your visit.')}</p>
            )}
          </Section>
        </BlurFade>
      </div>

      {/* Booking confirmation */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Confirm appointment')}</DialogTitle>
            <DialogDescription>{t('Review the details before booking')}</DialogDescription>
          </DialogHeader>
          {selectedSlot && (
            <div className="space-y-4">
              <div className="space-y-2 rounded-lg border p-4 text-sm">
                <p><span className="font-medium">{t('Doctor')}:</span> {doctor.name}</p>
                <p><span className="font-medium">{t('Date')}:</span> {formatDate(selectedSlot)}</p>
                <p><span className="font-medium">{t('Time')}:</span> {formatTime(selectedSlot)}</p>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">{t('Payment method')}</p>
                <div className="flex gap-2">
                  {(['cash', 'online'] as const).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={cn(
                        'flex-1 rounded-md border py-2 text-sm capitalize transition-colors',
                        paymentMethod === m
                          ? 'border-primary bg-primary/5 font-medium text-primary'
                          : 'text-muted-foreground hover:border-primary/50'
                      )}
                    >
                      {t(m)}
                    </button>
                  ))}
                </div>
              </div>

              {bookMutation.isError && (
                <p className="text-sm text-destructive">{(bookMutation.error as Error).message}</p>
              )}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setConfirmOpen(false)}>{t('Cancel')}</Button>
                <Button className="flex-1" onClick={() => bookMutation.mutate()} disabled={bookMutation.isPending}>
                  {bookMutation.isPending ? t('Booking...') : t('Confirm booking')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
