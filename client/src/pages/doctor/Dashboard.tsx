import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useRef, useEffect } from 'react';
import { User, CalendarDays, Save, Trash2, Upload, CheckCircle2, Building2, Plus, X, Contact, FolderOpenDot, FileText, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getDoctor, getDoctorAppointments, updateDoctorProfile, uploadPhoto, deleteDoctorAccount, completeAppointment, getMyPatients } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { useT } from '@/i18n';
import { cn, formatDate, formatTime, initialsOf } from '@/lib/utils';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useConfirm } from '@/components/ui/confirm-dialog';
import type { Doctor } from '@/types';

// A blank year input means "not set", not year zero.
const optionalYear = z.preprocess(
  v => (v === '' || v === null || v === undefined ? null : Number(v)),
  z.number().int().min(1950).max(2100).nullable()
);

const clinicSchema = z.object({
  clinic_name: z.string().trim().min(1).max(120),
  role: z.string().trim().max(120).optional(),
  city: z.string().trim().max(80).optional(),
  start_year: optionalYear,
  end_year: optionalYear,
});

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
  email: z.string().trim().email().or(z.literal('')).optional(),
  website: z.string().trim().url().or(z.literal('')).optional(),
  address: z.string().trim().max(300).optional(),
  years_experience: z.preprocess(
    v => (v === '' || v === null || v === undefined ? null : Number(v)),
    z.number().int().min(0).max(70).nullable()
  ),
  /** Comma-separated in the form; sent to the API as an array. */
  languages: z.string().max(200).optional(),
  clinics: z.array(clinicSchema).max(20),
});

type ProfileFormInput = z.input<typeof profileSchema>;
type ProfileForm = z.output<typeof profileSchema>;

/** Map the saved profile onto the form's shape. */
function toFormValues(d: Doctor): ProfileFormInput {
  return {
    name: d.name ?? '',
    specialty: d.specialty ?? '',
    location: d.location ?? '',
    description: d.description ?? '',
    cost: d.cost ?? undefined,
    phone: d.phone ?? '',
    working_hours_start: d.working_hours_start?.slice(0, 5) ?? '',
    working_hours_end: d.working_hours_end?.slice(0, 5) ?? '',
    avg_consultation_time: d.avg_consultation_time ?? undefined,
    email: d.email ?? '',
    website: d.website ?? '',
    address: d.address ?? '',
    years_experience: d.years_experience ?? null,
    languages: (d.languages ?? []).join(', '),
    clinics: (d.clinics ?? []).map(c => ({
      clinic_name: c.clinic_name,
      role: c.role ?? '',
      city: c.city ?? '',
      start_year: c.start_year,
      end_year: c.end_year,
    })),
  };
}

type Tab = 'profile' | 'appointments' | 'patients';

const TABS: { value: Tab; label: string }[] = [
  { value: 'profile', label: 'Profile' },
  { value: 'appointments', label: 'Appointments' },
  { value: 'patients', label: 'Patients' },
];

export default function DoctorDashboard() {
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const t = useT();
  const askConfirm = useConfirm();
  const [tab, setTab] = useState<Tab>('profile');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: appointments, isLoading: aptsLoading } = useQuery({
    queryKey: ['appointments', 'doctor'],
    queryFn: getDoctorAppointments,
  });

  // The doctor's own saved profile. Without this the form would start blank and
  // a save would overwrite every untouched field with an empty string.
  const { data: profile } = useQuery({
    queryKey: ['doctor', user?.id],
    queryFn: () => getDoctor(user!.id),
    enabled: !!user?.id,
  });

  const completeMutation = useMutation({
    mutationFn: completeAppointment,
    onSuccess: () => {
      toast.success(t('Appointment marked as completed.'));
      queryClient.invalidateQueries({ queryKey: ['appointments', 'doctor'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // There is no "un-complete", so check before flipping the wrong row.
  const confirmComplete = async (id: number, patient: string) => {
    const ok = await askConfirm({
      title: t('Mark this appointment as completed?'),
      detail: patient,
      description: t('The patient will be able to leave a review. This cannot be undone.'),
      confirmLabel: t('Mark completed'),
    });
    if (ok) completeMutation.mutate(id);
  };

  const profileMutation = useMutation({
    mutationFn: async (data: ProfileForm) => {
      let photos_url: string | undefined;
      if (photoFile) {
        const result = await uploadPhoto(photoFile);
        photos_url = result.url;
      }
      const { languages, clinics, ...rest } = data;
      return updateDoctorProfile({
        ...rest,
        languages: languages ? languages.split(',').map(l => l.trim()).filter(Boolean) : [],
        clinics: clinics.map(c => ({
          clinic_name: c.clinic_name,
          role: c.role || null,
          city: c.city || null,
          start_year: c.start_year,
          end_year: c.end_year,
        })),
        ...(photos_url ? { photos_url } : {}),
      });
    },
    onSuccess: () => {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      toast.success(t('Profile saved.'));
      queryClient.invalidateQueries({ queryKey: ['doctor'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDoctorAccount,
    onSuccess: async () => {
      toast.success(t('Your account has been deleted.'));
      await signOut();
      navigate('/');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { register, handleSubmit, control, reset, formState: { errors, isDirty } } = useForm<ProfileFormInput, unknown, ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.user_metadata?.name ?? '', years_experience: null, clinics: [] },
  });

  const { fields: clinicFields, append: addClinic, remove: removeClinic } = useFieldArray({
    control,
    name: 'clinics',
  });

  // Fill the form once the saved profile arrives.
  useEffect(() => {
    if (profile) reset(toFormValues(profile));
  }, [profile, reset]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  // The single most destructive action in the app — it takes the account, the
  // profile and every appointment with it. Worth the extra friction of typing.
  const handleDelete = async () => {
    const ok = await askConfirm({
      title: t('Delete your account permanently?'),
      description: t('Your profile, your schedule and every appointment booked with you are erased. This cannot be undone.'),
      variant: 'destructive',
      requireTyped: 'DELETE',
      confirmLabel: t('Delete my account'),
    });
    if (ok) deleteMutation.mutate();
  };

  const initials = initialsOf(user?.user_metadata?.name as string | undefined);

  return (
    <div className="container py-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t('Doctor Dashboard')}</h1>
        <p className="text-muted-foreground">{t('Manage your profile and appointments')}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b mb-6">
        {TABS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === value ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {value === 'appointments' ? `${t('Appointments')} (${appointments?.length ?? 0})` : t(label)}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <form onSubmit={handleSubmit(d => profileMutation.mutate(d))} className="space-y-6">
          {/* Photo */}
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <Avatar className="h-20 w-20 ring-2 ring-secondary">
                {photoPreview
                  ? <img src={photoPreview} className="h-full w-full rounded-full object-cover" alt="Preview" />
                  : user?.user_metadata?.avatar_url
                    ? <img src={user.user_metadata.avatar_url} className="h-full w-full rounded-full object-cover" alt="Profile" />
                    : <AvatarFallback className="text-2xl bg-secondary text-secondary-foreground font-bold">{initials}</AvatarFallback>
                }
              </Avatar>
              <div>
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />{t('Change photo')}
                </Button>
                <p className="text-xs text-muted-foreground mt-1">{t('JPEG, PNG, or WebP — max 5 MB')}</p>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoChange} />
              </div>
            </CardContent>
          </Card>

          {/* Profile fields */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />{t('Personal info')}</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t('Full name')} error={errors.name?.message}><Input {...register('name')} /></Field>
              <Field label={t('Phone')} error={errors.phone?.message}><Input {...register('phone')} type="tel" /></Field>
              <Field label={t('Specialty')} error={errors.specialty?.message}><Input {...register('specialty')} /></Field>
              <Field label={t('Location')} error={errors.location?.message}><Input {...register('location')} /></Field>
              <Field label={t('Years of experience')} error={errors.years_experience?.message}><Input {...register('years_experience')} type="number" min="0" max="70" /></Field>
              <Field label={t('Consultation cost ($)')} error={errors.cost?.message}><Input {...register('cost')} type="number" min="0" /></Field>
              <Field label={t('Session duration (min)')} error={errors.avg_consultation_time?.message}><Input {...register('avg_consultation_time')} type="number" min="10" max="240" /></Field>
              <Field label={t('Working hours start')} error={errors.working_hours_start?.message}><Input {...register('working_hours_start')} type="time" /></Field>
              <Field label={t('Working hours end')} error={errors.working_hours_end?.message}><Input {...register('working_hours_end')} type="time" /></Field>
              <div className="sm:col-span-2">
                <Field label={t('About you')} error={errors.description?.message}>
                  <textarea
                    {...register('description')}
                    rows={5}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
                    placeholder={t('Describe your experience, specialties, approach...')}
                  />
                </Field>
                <p className="mt-1 text-xs text-muted-foreground">{t('This is the summary patients read on your public profile.')}</p>
              </div>
            </CardContent>
          </Card>

          {/* Public contact details */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Contact className="h-5 w-5" />{t('Public contact details')}</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t('Public email')} error={errors.email?.message}><Input {...register('email')} type="email" placeholder="contact@cabinet.tn" /></Field>
              <Field label={t('Website')} error={errors.website?.message}><Input {...register('website')} type="url" placeholder="https://…" /></Field>
              <div className="sm:col-span-2">
                <Field label={t('Practice address')} error={errors.address?.message}>
                  <Input {...register('address')} placeholder={t('Street, building — shown under the map')} />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label={t('Languages spoken')} error={errors.languages?.message}>
                  <Input {...register('languages')} placeholder="Arabic, French, English" />
                </Field>
                <p className="mt-1 text-xs text-muted-foreground">{t('Separate with commas.')}</p>
              </div>
              <p className="text-xs text-muted-foreground sm:col-span-2">
                {t('These appear on your public profile. Your login email is never shown.')}
              </p>
            </CardContent>
          </Card>

          {/* Clinic posts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />{t('Clinic posts')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t('Positions you hold, or held, at a clinic or hospital. Leave the end year empty for a post you still hold. No posts means your profile shows "Independent practice".')}
              </p>

              {clinicFields.map((field, i) => (
                <div key={field.id} className="relative rounded-xl border bg-muted/20 p-4">
                  <button
                    type="button"
                    onClick={() => removeClinic(i)}
                    className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    aria-label={t('Remove this post')}
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label={t('Clinic or hospital')} error={errors.clinics?.[i]?.clinic_name?.message}>
                      <Input {...register(`clinics.${i}.clinic_name`)} placeholder="Clinique El Amen" />
                    </Field>
                    <Field label={t('Your role')} error={errors.clinics?.[i]?.role?.message}>
                      <Input {...register(`clinics.${i}.role`)} placeholder={t('Head of Cardiology')} />
                    </Field>
                    <Field label={t('City')} error={errors.clinics?.[i]?.city?.message}>
                      <Input {...register(`clinics.${i}.city`)} placeholder="Tunis" />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label={t('From')} error={errors.clinics?.[i]?.start_year?.message}>
                        <Input {...register(`clinics.${i}.start_year`)} type="number" min="1950" max="2100" placeholder="2018" />
                      </Field>
                      <Field label={t('To')} error={errors.clinics?.[i]?.end_year?.message}>
                        <Input {...register(`clinics.${i}.end_year`)} type="number" min="1950" max="2100" placeholder={t('Present')} />
                      </Field>
                    </div>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addClinic({ clinic_name: '', role: '', city: '', start_year: null, end_year: null })}
              >
                <Plus className="mr-2 h-4 w-4" />{t('Add a clinic post')}
              </Button>
            </CardContent>
          </Card>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={profileMutation.isPending || (!isDirty && !photoFile)}>
              <Save className="h-4 w-4 mr-2" />{profileMutation.isPending ? t('Saving...') : t('Save changes')}
            </Button>
            {saveSuccess && <span className="text-sm text-green-600 font-medium">{t('Saved!')}</span>}
          </div>

          {/* Danger zone */}
          <Card className="border-destructive/30">
            <CardHeader><CardTitle className="text-destructive text-base">{t('Danger zone')}</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{t('Permanently delete your account and all appointments. This cannot be reversed.')}</p>
              <Button type="button" variant="destructive" size="sm" onClick={handleDelete} disabled={deleteMutation.isPending}>
                <Trash2 className="h-4 w-4 mr-2" />{deleteMutation.isPending ? t('Deleting...') : t('Delete account')}
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
              <p>{t('No appointments yet')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>{['Patient', 'Date', 'Time', 'Payment', 'Status', ''].map((h, i) => <th key={i} className="px-4 py-3 text-left font-medium text-muted-foreground">{h ? t(h) : ''}</th>)}</tr>
                </thead>
                <tbody className="divide-y">
                  {appointments.map(apt => {
                    const isPast = new Date(apt.time_slot) < new Date();
                    const canComplete = apt.status === 'confirmed' && isPast;
                    return (
                      <tr key={apt.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium">{apt.patient_name}</p>
                          <p className="text-xs text-muted-foreground">{apt.patient_email}</p>
                        </td>
                        <td className="px-4 py-3">{formatDate(apt.time_slot)}</td>
                        <td className="px-4 py-3">{formatTime(apt.time_slot)}</td>
                        <td className="px-4 py-3 capitalize">{t(apt.payment_method)}</td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={apt.status === 'confirmed' ? 'success' : apt.status === 'cancelled' ? 'destructive' : 'secondary'}
                            className="capitalize"
                          >
                            {t(apt.status)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            {canComplete && (
                              <Button
                                size="sm" variant="outline"
                                onClick={() => confirmComplete(apt.id, apt.patient_name)}
                                disabled={completeMutation.isPending}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1.5" /> {t('Mark completed')}
                              </Button>
                            )}
                            <Button asChild size="sm" variant="ghost">
                              <Link to={`/records/patient/${apt.user_id}`}>
                                <FolderOpenDot className="h-4 w-4 mr-1.5" /> {t('Open file')}
                              </Link>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'patients' && <PatientsTab />}
    </div>
  );
}

function PatientsTab() {
  const t = useT();
  const { data: patients, isLoading } = useQuery({ queryKey: ['records', 'patients'], queryFn: getMyPatients });

  if (isLoading) {
    return <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}</div>;
  }
  if (!patients?.length) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        <FolderOpenDot className="mx-auto mb-4 h-12 w-12 opacity-30" />
        <p>{t('No patients yet — records appear once a patient books with you.')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="mb-3 text-sm text-muted-foreground">
        {t('The clinical file for each patient you have seen. Only you and the patient can read it.')}
      </p>
      {patients.map(p => (
        <Link
          key={p.id}
          to={`/records/patient/${p.id}`}
          className="flex items-center gap-4 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground">
            {initialsOf(p.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium">{p.name}</p>
            <p className="truncate text-xs text-muted-foreground">{p.email}</p>
          </div>
          <div className="hidden text-right text-xs text-muted-foreground sm:block">
            <p className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" />{p.visits} {t(p.visits !== 1 ? 'visits' : 'visit')}</p>
            <p>{t('Last')}: {formatDate(p.last_visit)}</p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        </Link>
      ))}
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
