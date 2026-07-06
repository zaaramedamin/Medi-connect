import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, MapPin, Clock, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getMyAppointments, cancelAppointment } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { formatDate, formatTime } from '@/lib/utils';

const statusVariant: Record<string, 'success' | 'destructive' | 'secondary'> = {
  confirmed: 'success',
  cancelled: 'destructive',
  completed: 'secondary',
};

export default function PatientDashboard() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments', 'my'],
    queryFn: getMyAppointments,
  });

  const cancelMutation = useMutation({
    mutationFn: cancelAppointment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments', 'my'] }),
  });

  const userName = user?.user_metadata?.name ?? 'Patient';
  const upcoming = appointments?.filter(a => a.status === 'confirmed' && new Date(a.time_slot) > new Date());
  const past = appointments?.filter(a => a.status !== 'confirmed' || new Date(a.time_slot) <= new Date());

  return (
    <div className="container py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Hello, {userName}</h1>
        <p className="text-muted-foreground">Manage your appointments</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : !appointments?.length ? (
        <div className="text-center py-20">
          <CalendarDays className="h-14 w-14 mx-auto text-muted-foreground/40 mb-4" />
          <h2 className="text-xl font-semibold mb-2">No appointments yet</h2>
          <p className="text-muted-foreground mb-6">Find a doctor and book your first appointment.</p>
          <Button asChild><Link to="/"><Search className="h-4 w-4 mr-2" />Find a doctor</Link></Button>
        </div>
      ) : (
        <div className="space-y-8">
          {upcoming && upcoming.length > 0 && (
            <section>
              <h2 className="font-semibold text-lg mb-4">Upcoming</h2>
              <div className="space-y-4">
                {upcoming.map(apt => (
                  <AppointmentCard
                    key={apt.id}
                    appointment={apt}
                    onCancel={() => cancelMutation.mutate(apt.id)}
                    cancelling={cancelMutation.isPending}
                  />
                ))}
              </div>
            </section>
          )}
          {past && past.length > 0 && (
            <section>
              <h2 className="font-semibold text-lg mb-4 text-muted-foreground">Past</h2>
              <div className="space-y-4">
                {past.map(apt => <AppointmentCard key={apt.id} appointment={apt} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function AppointmentCard({ appointment: apt, onCancel, cancelling }: {
  appointment: ReturnType<typeof getMyAppointments> extends Promise<infer T> ? T extends (infer U)[] ? U : never : never;
  onCancel?: () => void;
  cancelling?: boolean;
}) {
  const doc = apt.doctors;
  const initials = doc?.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '??';

  return (
    <Card>
      <CardContent className="p-5 flex flex-col sm:flex-row gap-4">
        <Avatar className="h-14 w-14 shrink-0">
          {doc?.photos_url && <AvatarImage src={doc.photos_url} alt={doc.name} loading="lazy" />}
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <p className="font-semibold">{doc?.name ?? 'Unknown Doctor'}</p>
              {doc?.specialty && <p className="text-sm text-muted-foreground">{doc.specialty}</p>}
            </div>
            <Badge variant={statusVariant[apt.status] ?? 'outline'} className="shrink-0 capitalize">{apt.status}</Badge>
          </div>
          <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><CalendarDays className="h-4 w-4" />{formatDate(apt.time_slot)}</span>
            <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{formatTime(apt.time_slot)}</span>
            {doc?.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{doc.location}</span>}
          </div>
        </div>

        {onCancel && apt.status === 'confirmed' && (
          <Button variant="outline" size="sm" onClick={onCancel} disabled={cancelling} className="shrink-0 self-center">
            {cancelling ? 'Cancelling...' : 'Cancel'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
