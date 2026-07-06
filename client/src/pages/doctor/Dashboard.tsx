import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useRef } from 'react';
import { User, CalendarDays, Save, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getDoctorAppointments, updateDoctorProfile, uploadPhoto, deleteDoctorAccount } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { formatDate, formatTime, cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

const profileSchema = z.object({
  name: z.string().min(2).max(100),
  specialty: z.string().max(100).optional(),
  location: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  cost: z.coerce.number().min(0).optional(),
  phone: z.string().optional(),
  working_hours_start: z.string().optional(),
  working_hours_end: z.string().optional(),
  avg_consultation_time: z.coerce.number().int().min(10).max(240).optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

type Tab = 'profile' | 'appointments';

export default function DoctorDashboard() {
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('profile');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: appointments, isLoading: aptsLoading } = useQuery({
    queryKey: ['appointments', 'doctor'],
    queryFn: getDoctorAppointments,
  });

  const profileMutation = useMutation({
    mutationFn: async (data: ProfileForm) => {
      let photos_url: string | undefined;
      if (photoFile) {
        const result = await uploadPhoto(photoFile);
        photos_url = result.url;
      }
      return updateDoctorProfile({ ...data, ...(photos_url ? { photos_url } : {}) });
    },
    onSuccess: () => {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      queryClient.invalidateQueries({ queryKey: ['doctor'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDoctorAccount,
    onSuccess: async () => { await signOut(); navigate('/'); },
  });

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.user_metadata?.name ?? '' },
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleDelete = () => {
    if (confirm('Delete your account permanently? This cannot be undone.')) {
      deleteMutation.mutate();
    }
  };

  const initials = (user?.user_metadata?.name as string ?? 'D').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="container py-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Doctor Dashboard</h1>
        <p className="text-muted-foreground">Manage your profile and appointments</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b mb-6">
        {(['profile', 'appointments'] as Tab[]).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors capitalize',
              tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {t === 'appointments' ? `Appointments (${appointments?.length ?? 0})` : 'Profile'}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <form onSubmit={handleSubmit(d => profileMutation.mutate(d))} className="space-y-6">
          {/* Photo */}
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <Avatar className="h-20 w-20">
                {photoPreview
                  ? <img src={photoPreview} className="h-full w-full rounded-full object-cover" alt="Preview" />
                  : <AvatarFallback className="text-2xl bg-primary/10 text-primary font-bold">{initials}</AvatarFallback>
                }
              </Avatar>
              <div>
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />Change photo
                </Button>
                <p className="text-xs text-muted-foreground mt-1">JPEG, PNG, or WebP — max 5 MB</p>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoChange} />
              </div>
            </CardContent>
          </Card>

          {/* Profile fields */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />Personal info</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Full name" error={errors.name?.message}><Input {...register('name')} /></Field>
              <Field label="Phone" error={errors.phone?.message}><Input {...register('phone')} type="tel" /></Field>
              <Field label="Specialty" error={errors.specialty?.message}><Input {...register('specialty')} /></Field>
              <Field label="Location" error={errors.location?.message}><Input {...register('location')} /></Field>
              <Field label="Consultation cost ($)" error={errors.cost?.message}><Input {...register('cost')} type="number" min="0" /></Field>
              <Field label="Session duration (min)" error={errors.avg_consultation_time?.message}><Input {...register('avg_consultation_time')} type="number" min="10" max="240" /></Field>
              <Field label="Working hours start" error={errors.working_hours_start?.message}><Input {...register('working_hours_start')} type="time" /></Field>
              <Field label="Working hours end" error={errors.working_hours_end?.message}><Input {...register('working_hours_end')} type="time" /></Field>
              <div className="sm:col-span-2">
                <Field label="About you" error={errors.description?.message}>
                  <textarea
                    {...register('description')}
                    rows={4}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                    placeholder="Describe your experience, specialties, approach..."
                  />
                </Field>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={profileMutation.isPending || (!isDirty && !photoFile)}>
              <Save className="h-4 w-4 mr-2" />{profileMutation.isPending ? 'Saving...' : 'Save changes'}
            </Button>
            {saveSuccess && <span className="text-sm text-green-600 font-medium">Saved!</span>}
          </div>

          {/* Danger zone */}
          <Card className="border-destructive/30">
            <CardHeader><CardTitle className="text-destructive text-base">Danger zone</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">Permanently delete your account and all appointments. This cannot be reversed.</p>
              <Button type="button" variant="destructive" size="sm" onClick={handleDelete} disabled={deleteMutation.isPending}>
                <Trash2 className="h-4 w-4 mr-2" />{deleteMutation.isPending ? 'Deleting...' : 'Delete account'}
              </Button>
            </CardContent>
          </Card>
        </form>
      )}

      {tab === 'appointments' && (
        <div>
          {aptsLoading ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}</div>
          ) : !appointments?.length ? (
            <div className="text-center py-16 text-muted-foreground">
              <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No upcoming appointments</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>{['Patient', 'Date', 'Time', 'Payment', 'Status'].map(h => <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y">
                  {appointments.map(apt => (
                    <tr key={apt.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium">{apt.patient_name}</p>
                        <p className="text-xs text-muted-foreground">{apt.patient_email}</p>
                      </td>
                      <td className="px-4 py-3">{formatDate(apt.time_slot)}</td>
                      <td className="px-4 py-3">{formatTime(apt.time_slot)}</td>
                      <td className="px-4 py-3 capitalize">{apt.payment_method}</td>
                      <td className="px-4 py-3"><Badge variant={apt.status === 'confirmed' ? 'success' : 'secondary'} className="capitalize">{apt.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
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
