import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { UserPlus, Trash2, ShieldCheck, ShieldOff, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { getAdminDoctors, createDoctor, setDoctorSubscription, deleteDoctor } from '@/services/api';
import { formatDate } from '@/lib/utils';

const newDoctorSchema = z.object({
  name: z.string().min(2, 'Name is required').max(100),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters'),
  specialty: z.string().max(100).optional(),
  location: z.string().max(200).optional(),
  cost: z.coerce.number().min(0).optional(),
});
type NewDoctorForm = z.input<typeof newDoctorSchema>;
type NewDoctorParsed = z.output<typeof newDoctorSchema>;

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: doctors, isLoading } = useQuery({
    queryKey: ['admin', 'doctors'],
    queryFn: getAdminDoctors,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'doctors'] });

  const createMutation = useMutation({
    mutationFn: createDoctor,
    onSuccess: () => { invalidate(); setAddOpen(false); reset(); },
    onError: (e: Error) => setFormError(e.message),
  });

  const subMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'activate' | 'deactivate' }) =>
      setDoctorSubscription(id, action),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDoctor,
    onSuccess: invalidate,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<NewDoctorForm, unknown, NewDoctorParsed>({
    resolver: zodResolver(newDoctorSchema),
  });

  const onSubmit = (data: NewDoctorParsed) => {
    setFormError(null);
    createMutation.mutate({ ...data, activate: true });
  };

  const activeCount = doctors?.filter(d => d.subscription_status === 'active').length ?? 0;

  return (
    <div className="container py-8 max-w-5xl">
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" /> Admin Dashboard
          </h1>
          <p className="text-muted-foreground">
            {doctors?.length ?? 0} doctors · {activeCount} active subscriptions
          </p>
        </div>
        <Button onClick={() => { setFormError(null); setAddOpen(true); }}>
          <UserPlus className="h-4 w-4 mr-1.5" /> Onboard doctor
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : (
        <Card>
          <CardHeader><CardTitle className="text-base">Doctors</CardTitle></CardHeader>
          <CardContent className="divide-y p-0">
            {doctors?.map(doc => {
              const initials = doc.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
              const active = doc.subscription_status === 'active';
              return (
                <div key={doc.id} className="flex items-center gap-4 p-4 flex-wrap">
                  <Avatar className="h-11 w-11 shrink-0">
                    {doc.photos_url && <AvatarImage src={doc.photos_url} alt={doc.name} />}
                    <AvatarFallback className="bg-secondary text-secondary-foreground text-sm font-bold">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{doc.name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {doc.specialty ?? 'No specialty'}{doc.location ? ` · ${doc.location}` : ''}
                    </p>
                  </div>

                  <div className="text-right mr-2">
                    <Badge variant={active ? 'success' : 'secondary'} className="capitalize">{doc.subscription_status}</Badge>
                    {doc.subscription_expires && (
                      <p className="text-xs text-muted-foreground mt-1">until {formatDate(doc.subscription_expires)}</p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {active ? (
                      <Button
                        variant="outline" size="sm"
                        onClick={() => subMutation.mutate({ id: doc.id, action: 'deactivate' })}
                        disabled={subMutation.isPending}
                      >
                        <ShieldOff className="h-4 w-4 mr-1" /> Deactivate
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => subMutation.mutate({ id: doc.id, action: 'activate' })}
                        disabled={subMutation.isPending}
                      >
                        <ShieldCheck className="h-4 w-4 mr-1" /> Activate
                      </Button>
                    )}
                    <Button
                      variant="ghost" size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => { if (confirm(`Delete ${doc.name}? This cannot be undone.`)) deleteMutation.mutate(doc.id); }}
                      disabled={deleteMutation.isPending}
                      aria-label={`Delete ${doc.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
            {doctors?.length === 0 && (
              <p className="p-8 text-center text-muted-foreground text-sm">No doctors yet. Onboard your first one.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Onboard doctor dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Stethoscope className="h-5 w-5 text-primary" /> Onboard a doctor</DialogTitle>
            <DialogDescription>Creates a login account and an active 1-year subscription.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Full name" error={errors.name?.message}><Input {...register('name')} placeholder="Dr. Jane Smith" /></Field>
              <Field label="Specialty" error={errors.specialty?.message}><Input {...register('specialty')} placeholder="Cardiology" /></Field>
            </div>
            <Field label="Email" error={errors.email?.message}><Input type="email" {...register('email')} placeholder="doctor@clinic.tn" /></Field>
            <Field label="Temporary password" error={errors.password?.message}><Input type="text" {...register('password')} placeholder="Min 8 characters" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="City" error={errors.location?.message}><Input {...register('location')} placeholder="Tunis" /></Field>
              <Field label="Cost (DT)" error={errors.cost?.message}><Input type="number" {...register('cost')} placeholder="60" /></Field>
            </div>

            {formError && <p className="text-sm text-destructive">{formError}</p>}

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create doctor'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
