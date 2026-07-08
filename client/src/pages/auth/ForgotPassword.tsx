import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { KeyRound, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { AuthShell } from '@/components/layout/AuthShell';
import { useT } from '@/i18n';

const schema = z.object({
  email: z.string().email('Invalid email address'),
});
type FormData = z.infer<typeof schema>;

export default function ForgotPassword() {
  const t = useT();
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async ({ email }: FormData) => {
    setServerError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      setServerError(error.message);
      return;
    }
    setSent(true);
  };

  return (
    <AuthShell>
      <Card className="w-full max-w-md border-0 shadow-none">
        <CardHeader className="text-center">
          <div className="mb-2 flex justify-center">
            <KeyRound className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">{t('Reset your password')}</CardTitle>
          <CardDescription>
            {t("Enter your account email and we'll send you a reset link.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="py-4 text-center">
              <MailCheck className="mx-auto mb-3 h-10 w-10 text-accent" />
              <p className="font-semibold">{t('Check your inbox')}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('If an account exists for that email, a password reset link is on its way. The link opens a page where you can choose a new password.')}
              </p>
              <Button variant="outline" className="mt-5" asChild>
                <Link to="/login">{t('Back to sign in')}</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="space-y-1">
                <label htmlFor="email" className="text-sm font-medium">{t('Email')}</label>
                <Input id="email" type="email" placeholder="you@example.com" autoComplete="email" {...register('email')} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>

              {serverError && (
                <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{serverError}</div>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? t('Sending…') : t('Send reset link')}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                {t('Remembered it?')}{' '}
                <Link to="/login" className="font-medium text-primary hover:underline">{t('Sign in')}</Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </AuthShell>
  );
}
