import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useT } from '@/i18n';

const schema = z
  .object({
    password: z.string().min(8, 'At least 8 characters'),
    confirm: z.string(),
  })
  .refine(d => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] });
type FormData = z.infer<typeof schema>;

/**
 * Landing page for the Supabase recovery link. The link signs the user in with
 * a temporary session; from there they set a new password.
 */
export default function ResetPassword() {
  const navigate = useNavigate();
  const { user, loading } = useAuthStore();
  const t = useT();
  const [serverError, setServerError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Give supabase-js a moment to consume the recovery tokens in the URL hash.
  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 600);
    return () => window.clearTimeout(t);
  }, []);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async ({ password }: FormData) => {
    setServerError(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setServerError(error.message);
      return;
    }
    toast.success(t('Password updated — you are signed in.'));
    const role = useAuthStore.getState().role;
    navigate(role === 'admin' ? '/admin' : role === 'doctor' ? '/doctor/dashboard' : '/patient/dashboard');
  };

  const noSession = ready && !loading && !user;

  return (
    <div className="container flex min-h-[calc(100vh-8rem)] items-center justify-center py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-2 flex justify-center">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">{t('Choose a new password')}</CardTitle>
          <CardDescription>{t('Your account will use this password from now on.')}</CardDescription>
        </CardHeader>
        <CardContent>
          {noSession ? (
            <div className="py-4 text-center">
              <p className="text-sm text-muted-foreground">
                {t('This reset link is invalid or has expired. Request a fresh one and try again.')}
              </p>
              <Button variant="outline" className="mt-5" asChild>
                <Link to="/forgot-password">{t('Request a new link')}</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="space-y-1">
                <label htmlFor="password" className="text-sm font-medium">{t('New password')}</label>
                <Input id="password" type="password" placeholder="••••••••" autoComplete="new-password" {...register('password')} />
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>
              <div className="space-y-1">
                <label htmlFor="confirm" className="text-sm font-medium">{t('Confirm password')}</label>
                <Input id="confirm" type="password" placeholder="••••••••" autoComplete="new-password" {...register('confirm')} />
                {errors.confirm && <p className="text-xs text-destructive">{errors.confirm.message}</p>}
              </div>

              {serverError && (
                <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{serverError}</div>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? t('Saving…') : t('Set new password')}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
