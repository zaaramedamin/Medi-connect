import { Link } from 'react-router-dom';
import { MapPin, Clock, BadgeCheck, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { TiltCard } from '@/components/ui/tilt-card';
import { StarRating } from '@/components/ui/star-rating';
import { useT } from '@/i18n';
import type { Doctor } from '@/types';

interface Props {
  doctor: Doctor;
}

export function DoctorCard({ doctor }: Props) {
  const t = useT();
  const initials = doctor.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <TiltCard className="h-full">
    <Card className="group h-full overflow-hidden rounded-2xl transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
      <div aria-hidden className="h-1.5 bg-linear-to-r from-primary to-accent opacity-0 group-hover:opacity-100 transition-opacity" />
      <CardContent className="p-5">
        <div className="flex items-start gap-4 mb-4">
          <Avatar className="h-16 w-16 shrink-0 ring-2 ring-secondary">
            {doctor.photos_url && <AvatarImage src={doctor.photos_url} alt={doctor.name} loading="lazy" />}
            <AvatarFallback className="text-lg font-bold bg-secondary text-secondary-foreground">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-base leading-tight truncate">{doctor.name}</h3>
              <BadgeCheck className="h-4 w-4 shrink-0 text-accent" aria-label="Verified doctor" />
            </div>
            {doctor.specialty && (
              <Badge variant="secondary" className="mt-1.5 text-xs font-semibold">{doctor.specialty}</Badge>
            )}
            <div className="mt-1.5">
              <StarRating value={doctor.avg_rating ?? 0} count={doctor.review_count} size={14} />
            </div>
          </div>
        </div>

        {doctor.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">{doctor.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground mb-5">
          {doctor.location && (
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{doctor.location}</span>
          )}
          {doctor.avg_consultation_time && (
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{doctor.avg_consultation_time} min</span>
          )}
          {doctor.cost != null && (
            <span className="ml-auto text-sm font-bold text-foreground">
              {doctor.cost} <span className="text-xs font-medium text-muted-foreground">{t('DT / visit')}</span>
            </span>
          )}
        </div>

        <Button asChild size="sm" className="w-full group/btn">
          <Link to={`/doctor/${doctor.id}`}>
            {t('View profile & book')}
            <ArrowRight className="h-4 w-4 ml-1 transition-transform group-hover/btn:translate-x-0.5" />
          </Link>
        </Button>
      </CardContent>
    </Card>
    </TiltCard>
  );
}
