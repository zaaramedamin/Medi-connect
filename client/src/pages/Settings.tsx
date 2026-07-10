import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { UserCog, KeyRound, HeartPulse } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useT } from '@/i18n';
import { updateDoctorProfile, getMyProfile, updateMyProfile } from '@/services/api';

const SELECT_CLASS =
  'h-10 w-full rounded-lg border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

const profileDetailsSchema = z.object({
  phone: z.string().max(50).optional(),
  date_of_birth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other', '']).optional(),
  city: z.string().max(100).optional(),
  address: z.string().max(300).optional(),
  blood_type: z.string().max(3).optional(),
  allergies: z.string().max(500).optional(),
  emergency_contact: z.string().max(150).optional(),
});
type ProfileDetailsForm = z.infer<typeof profileDetailsSchema>;

const profileSchema = z.object({
  name: z.string().min(2, 'Name is required').max(100),
});
type ProfileForm = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    password: z.string().min(8, 'At least 8 characters'),
    confirm: z.string(),
  })
  .refine(d => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] });
type PasswordForm = z.infer<typeof passwordSchema>;

export default function Settings() {
  const { user, role, setSession } = useAuthStore();
  const t = useT();
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const profile = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: (user?.user_metadata?.name as string) ?? '' },
  });

  const password = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  const saveProfile = async ({ name }: ProfileForm) => {
    setSavingProfile(true);
    try {
      const { error } = await supabase.auth.updateUser({ data: { name } });
      if (error) throw new Error(error.message);

      // Doctors also carry their name on the public profile row
      if (role === 'doctor') await updateDoctorProfile({ name });

      // Refresh the local session so the header/dashboard show the new name
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      toast.success(t('Profile updated.'));
    } catch (e) {
      toast.error((e as Error).message || t('Failed to update profile'));
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async ({ password: newPassword }: PasswordForm) => {
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw new Error(error.message);
      password.reset();
      toast.success(t('Password changed.'));
    } catch (e) {
      toast.error((e as Error).message || t('Failed to change password'));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="container max-w-2xl py-8">
      <h1 className="mb-1 text-2xl font-bold">{t('Account settings')}</h1>
      <p className="mb-8 text-muted-foreground">{t('Update your personal details and password.')}</p>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCog className="h-4 w-4 text-primary" /> {t('Profile')}
            </CardTitle>
            <CardDescription>{t('Your name is shown on bookings, reviews, and comments.')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={profile.handleSubmit(saveProfile)} className="space-y-4" noValidate>
              <div className="space-y-1">
                <label htmlFor="name" className="text-sm font-medium">{t('Full name')}</label>
                <Input id="name" {...profile.register('name')} placeholder={t('Your name')} />
                {profile.formState.errors.name && (
                  <p className="text-xs text-destructive">{t(profile.formState.errors.name.message ?? '')}</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">{t('Email')}</label>
                <Input value={user?.email ?? ''} disabled className="text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{t('Your email is your sign-in and can’t be changed here.')}</p>
              </div>
              <Button type="submit" disabled={savingProfile}>
                {savingProfile ? t('Saving…') : t('Save profile')}
              </Button>
            </form>
          </CardContent>
        </Card>

        <ProfileDetailsCard />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4 text-primary" /> {t('Change password')}
            </CardTitle>
            <CardDescription>{t('Use at least 8 characters.')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={password.handleSubmit(savePassword)} className="space-y-4" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="new-password" className="text-sm font-medium">{t('New password')}</label>
                  <Input id="new-password" type="password" autoComplete="new-password" {...password.register('password')} />
                  {password.formState.errors.password && (
                    <p className="text-xs text-destructive">{t(password.formState.errors.password.message ?? '')}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label htmlFor="confirm-password" className="text-sm font-medium">{t('Confirm')}</label>
                  <Input id="confirm-password" type="password" autoComplete="new-password" {...password.register('confirm')} />
                  {password.formState.errors.confirm && (
                    <p className="text-xs text-destructive">{t(password.formState.errors.confirm.message ?? '')}</p>
                  )}
                </div>
              </div>
              <Button type="submit" disabled={savingPassword}>
                {savingPassword ? t('Saving…') : t('Change password')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ProfileDetailsCard() {
  const t = useT();
  const queryClient = useQueryClient();
  const { data: profile } = useQuery({ queryKey: ['profile', 'me'], queryFn: getMyProfile });

  const { register, handleSubmit, reset } = useForm<ProfileDetailsForm>({
    resolver: zodResolver(profileDetailsSchema),
  });

  // Populate the form once the saved profile arrives
  useEffect(() => {
    if (profile) {
      reset({
        phone: profile.phone ?? '',
        date_of_birth: profile.date_of_birth ?? '',
        gender: (profile.gender ?? '') as ProfileDetailsForm['gender'],
        city: profile.city ?? '',
        address: profile.address ?? '',
        blood_type: profile.blood_type ?? '',
        allergies: profile.allergies ?? '',
        emergency_contact: profile.emergency_contact ?? '',
      });
    }
  }, [profile, reset]);

  const mutation = useMutation({
    mutationFn: (data: ProfileDetailsForm) => updateMyProfile({ ...data, gender: data.gender || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
      toast.success(t('Details saved.'));
    },
    onError: (e: Error) => toast.error(e.message || t('Failed to save details')),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <HeartPulse className="h-4 w-4 text-primary" /> {t('Contact & medical details')}
        </CardTitle>
        <CardDescription>{t('Optional — helps doctors prepare for your visit. Only you can see this.')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(data => mutation.mutate(data))} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Labeled label={t('Phone')}><Input {...register('phone')} placeholder="+216 …" /></Labeled>
            <Labeled label={t('Date of birth')}><Input type="date" {...register('date_of_birth')} /></Labeled>
            <Labeled label={t('Gender')}>
              <select className={SELECT_CLASS} {...register('gender')}>
                <option value="">{t('Prefer not to say')}</option>
                <option value="female">{t('Female')}</option>
                <option value="male">{t('Male')}</option>
                <option value="other">{t('Other')}</option>
              </select>
            </Labeled>
            <Labeled label={t('Blood type')}>
              <select className={SELECT_CLASS} {...register('blood_type')}>
                <option value="">{t('Unknown')}</option>
                {BLOOD_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </Labeled>
            <Labeled label={t('City')}><Input {...register('city')} placeholder="Tunis" /></Labeled>
            <Labeled label={t('Emergency contact')}><Input {...register('emergency_contact')} placeholder={t('Name · phone')} /></Labeled>
          </div>
          <Labeled label={t('Address')}><Input {...register('address')} placeholder={t('Street, city')} /></Labeled>
          <Labeled label={t('Allergies & notes')}>
            <textarea
              {...register('allergies')}
              rows={3}
              maxLength={500}
              placeholder={t('Allergies, chronic conditions, medication…')}
              className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </Labeled>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? t('Saving…') : t('Save details')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}
