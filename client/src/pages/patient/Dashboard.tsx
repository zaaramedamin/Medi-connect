import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, MapPin, Clock, Search, Star, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { StarInput } from '@/components/ui/star-rating';
import { getMyAppointments, cancelAppointment, createReview, getMyOrders } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { formatDT } from '@/data/products';
import { formatDate, formatTime } from '@/lib/utils';

const statusVariant: Record<string, 'success' | 'destructive' | 'secondary'> = {
  confirmed: 'success',
  cancelled: 'destructive',
  completed: 'secondary',
};

const orderStatusVariant: Record<string, 'success' | 'destructive' | 'secondary'> = {
  placed: 'secondary',
  delivered: 'success',
  cancelled: 'destructive',
};

export default function PatientDashboard() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments', 'my'],
    queryFn: getMyAppointments,
  });

  const { data: orders } = useQuery({
    queryKey: ['orders', 'my'],
    queryFn: getMyOrders,
  });

  const cancelMutation = useMutation({
    mutationFn: cancelAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', 'my'] });
      toast.success('Appointment cancelled.');
    },
    onError: (e: Error) => toast.error(e.message || 'Could not cancel the appointment'),
  });

  const userName = user?.user_metadata?.name ?? 'Patient';
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const userInitials = userName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const upcoming = appointments?.filter(a => a.status === 'confirmed' && new Date(a.time_slot) > new Date());
  const past = appointments?.filter(a => a.status !== 'confirmed' || new Date(a.time_slot) <= new Date());

  return (
    <div className="container py-8 max-w-4xl">
      <div className="mb-8 flex items-center gap-4">
        <Avatar className="h-14 w-14 ring-2 ring-secondary">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={userName} />}
          <AvatarFallback className="bg-secondary text-secondary-foreground font-bold">{userInitials}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold">Hello, {userName}</h1>
          <p className="text-muted-foreground">Manage your appointments</p>
        </div>
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

      {/* Shop orders */}
      {orders && orders.length > 0 && (
        <section className="mt-10">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" /> My orders
          </h2>
          <Card>
            <CardContent className="divide-y p-0">
              {orders.map(o => (
                <div key={o.id} className="flex flex-wrap items-center gap-4 p-4">
                  <div className="flex -space-x-2">
                    {o.items.slice(0, 3).map(item => (
                      <img
                        key={item.id}
                        src={item.image ?? '/products/thermometer.jpg'}
                        alt=""
                        className="h-10 w-10 rounded-lg border-2 border-background object-cover"
                        loading="lazy"
                      />
                    ))}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{o.reference}</p>
                    <p className="text-sm text-muted-foreground">
                      {o.items.reduce((n, i) => n + i.quantity, 0)} item{o.items.length !== 1 ? 's' : ''} · {formatDate(o.created_at)}
                    </p>
                  </div>
                  <span className="font-bold text-primary">{formatDT(o.total)}</span>
                  <Badge variant={orderStatusVariant[o.status] ?? 'secondary'} className="capitalize">{o.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
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

  const queryClient = useQueryClient();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const reviewMutation = useMutation({
    mutationFn: () => createReview(doc!.id, rating, comment),
    onSuccess: () => {
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ['doctor', doc?.id, 'reviews'] });
      setTimeout(() => setReviewOpen(false), 1200);
    },
  });

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

        {apt.status === 'completed' && doc && (
          <Button variant="outline" size="sm" onClick={() => setReviewOpen(true)} className="shrink-0 self-center">
            <Star className="h-4 w-4 mr-1.5" />Leave a review
          </Button>
        )}
      </CardContent>

      {/* Review dialog */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review {doc?.name}</DialogTitle>
            <DialogDescription>Share your experience to help other patients.</DialogDescription>
          </DialogHeader>

          {submitted ? (
            <p className="py-6 text-center text-sm font-medium text-accent">Thanks — your review was submitted!</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-2">
                <StarInput value={rating} onChange={setRating} />
                <span className="text-xs text-muted-foreground">{rating > 0 ? `${rating} / 5` : 'Tap to rate'}</span>
              </div>

              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="What was your experience like? (optional)"
                rows={4}
                maxLength={1000}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />

              {reviewMutation.isError && (
                <p className="text-sm text-destructive">{(reviewMutation.error as Error).message}</p>
              )}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setReviewOpen(false)}>Cancel</Button>
                <Button
                  className="flex-1"
                  onClick={() => reviewMutation.mutate()}
                  disabled={rating === 0 || reviewMutation.isPending}
                >
                  {reviewMutation.isPending ? 'Submitting...' : 'Submit review'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
