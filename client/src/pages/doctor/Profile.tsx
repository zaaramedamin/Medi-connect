import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { MapPin, Clock, DollarSign, Calendar, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { StarRating } from '@/components/ui/star-rating';
import { BookingCalendar } from '@/components/features/BookingCalendar';
import { getDoctor, getDoctorReviews, bookAppointment } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { formatDate, formatTime } from '@/lib/utils';

export default function DoctorProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

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

  if (isLoading) return <div className="container py-16 flex justify-center"><span className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!doctor) return <div className="container py-16 text-center text-muted-foreground">Doctor not found.</div>;

  const initials = doctor.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const handleSlotSelect = (slot: string) => {
    if (!user) { navigate('/login'); return; }
    setSelectedSlot(slot);
    setConfirmOpen(true);
  };

  return (
    <div className="container py-8 max-w-4xl">
      {/* Profile header */}
      <div className="flex flex-col sm:flex-row gap-6 mb-8 p-6 rounded-xl border bg-card">
        <Avatar className="h-24 w-24 shrink-0">
          {doctor.photos_url && <AvatarImage src={doctor.photos_url} alt={doctor.name} />}
          <AvatarFallback className="text-2xl bg-primary/10 text-primary font-bold">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{doctor.name}</h1>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {doctor.specialty && <Badge variant="secondary">{doctor.specialty}</Badge>}
            <StarRating value={doctor.avg_rating ?? 0} count={doctor.review_count} size={16} />
          </div>
          <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
            {doctor.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{doctor.location}</span>}
            {doctor.avg_consultation_time && <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{doctor.avg_consultation_time} min</span>}
            {doctor.cost && <span className="flex items-center gap-1"><DollarSign className="h-4 w-4" />{doctor.cost} / visit</span>}
          </div>
          {doctor.description && <p className="mt-3 text-muted-foreground text-sm">{doctor.description}</p>}
        </div>
      </div>

      {/* Booking calendar */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="font-semibold text-lg flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-primary" />
          Book an appointment
        </h2>
        {doctor.working_hours_start ? (
          <BookingCalendar doctorId={id!} onSelectSlot={handleSlotSelect} />
        ) : (
          <p className="text-muted-foreground text-sm">This doctor hasn't set their schedule yet.</p>
        )}
      </div>

      {/* Reviews */}
      <div className="rounded-xl border bg-card p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Patient reviews
          </h2>
          {doctor.review_count ? (
            <StarRating value={doctor.avg_rating ?? 0} count={doctor.review_count} size={16} />
          ) : null}
        </div>

        {reviews && reviews.length > 0 ? (
          <ul className="space-y-4">
            {reviews.map(r => (
              <li key={r.id} className="border-b last:border-b-0 pb-4 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground text-xs font-bold">
                      {r.patient_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                    <span className="text-sm font-semibold">{r.patient_name}</span>
                  </div>
                  <StarRating value={r.rating} size={13} showValue={false} />
                </div>
                {r.comment && <p className="text-sm text-muted-foreground mt-2 pl-10">{r.comment}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">No reviews yet — be the first after your visit.</p>
        )}
      </div>

      {/* Booking confirmation dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm appointment</DialogTitle>
            <DialogDescription>Review the details before booking</DialogDescription>
          </DialogHeader>
          {selectedSlot && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 text-sm space-y-2">
                <p><span className="font-medium">Doctor:</span> {doctor.name}</p>
                <p><span className="font-medium">Date:</span> {formatDate(selectedSlot)}</p>
                <p><span className="font-medium">Time:</span> {formatTime(selectedSlot)}</p>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Payment method</p>
                <div className="flex gap-2">
                  {(['cash', 'online'] as const).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`flex-1 rounded-md border py-2 text-sm capitalize transition-colors ${paymentMethod === m ? 'border-primary bg-primary/5 text-primary font-medium' : 'text-muted-foreground hover:border-primary/50'}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {bookMutation.isError && (
                <p className="text-sm text-destructive">{(bookMutation.error as Error).message}</p>
              )}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setConfirmOpen(false)}>Cancel</Button>
                <Button className="flex-1" onClick={() => bookMutation.mutate()} disabled={bookMutation.isPending}>
                  {bookMutation.isPending ? 'Booking...' : 'Confirm booking'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
