import { Link } from 'react-router-dom';
import { MapPin, Clock, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import type { Doctor } from '@/types';

interface Props {
  doctor: Doctor;
}

export function DoctorCard({ doctor }: Props) {
  const initials = doctor.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <Card className="hover:shadow-md transition-shadow group">
      <CardContent className="p-5">
        <div className="flex items-start gap-4 mb-4">
          <Avatar className="h-14 w-14 shrink-0">
            {doctor.photos_url && <AvatarImage src={doctor.photos_url} alt={doctor.name} loading="lazy" />}
            <AvatarFallback className="text-lg bg-primary/10 text-primary">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base leading-tight truncate">{doctor.name}</h3>
            {doctor.specialty && (
              <Badge variant="secondary" className="mt-1 text-xs">{doctor.specialty}</Badge>
            )}
          </div>
        </div>

        {doctor.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{doctor.description}</p>
        )}

        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-4">
          {doctor.location && (
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{doctor.location}</span>
          )}
          {doctor.avg_consultation_time && (
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{doctor.avg_consultation_time} min</span>
          )}
          {doctor.cost && (
            <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{doctor.cost} / visit</span>
          )}
        </div>

        <Button asChild size="sm" className="w-full">
          <Link to={`/doctor/${doctor.id}`}>Book appointment</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
