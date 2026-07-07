import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { UserCog, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { updateDoctorProfile } from '@/services/api';

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
      toast.success('Profile updated.');
    } catch (e) {
      toast.error((e as Error).message || 'Failed to update profile');
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
      toast.success('Password changed.');
    } catch (e) {
      toast.error((e as Error).message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="container max-w-2xl py-8">
      <h1 className="mb-1 text-2xl font-bold">Account settings</h1>
      <p className="mb-8 text-muted-foreground">Update your personal details and password.</p>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCog className="h-4 w-4 text-primary" /> Profile
            </CardTitle>
            <CardDescription>Your name is shown on bookings, reviews, and comments.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={profile.handleSubmit(saveProfile)} className="space-y-4" noValidate>
              <div className="space-y-1">
                <label htmlFor="name" className="text-sm font-medium">Full name</label>
                <Input id="name" {...profile.register('name')} placeholder="Your name" />
                {profile.formState.errors.name && (
                  <p className="text-xs text-destructive">{profile.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Email</label>
                <Input value={user?.email ?? ''} disabled className="text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Your email is your sign-in and can&apos;t be changed here.</p>
              </div>
              <Button type="submit" disabled={savingProfile}>
                {savingProfile ? 'Saving…' : 'Save profile'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4 text-primary" /> Change password
            </CardTitle>
            <CardDescription>Use at least 8 characters.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={password.handleSubmit(savePassword)} className="space-y-4" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="new-password" className="text-sm font-medium">New password</label>
                  <Input id="new-password" type="password" autoComplete="new-password" {...password.register('password')} />
                  {password.formState.errors.password && (
                    <p className="text-xs text-destructive">{password.formState.errors.password.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label htmlFor="confirm-password" className="text-sm font-medium">Confirm</label>
                  <Input id="confirm-password" type="password" autoComplete="new-password" {...password.register('confirm')} />
                  {password.formState.errors.confirm && (
                    <p className="text-xs text-destructive">{password.formState.errors.confirm.message}</p>
                  )}
                </div>
              </div>
              <Button type="submit" disabled={savingPassword}>
                {savingPassword ? 'Saving…' : 'Change password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
