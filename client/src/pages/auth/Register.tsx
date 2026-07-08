import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Stethoscope } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useAuthStore } from '@/stores/authStore';
import { AuthShell } from '@/components/layout/AuthShell';
import { useT } from '@/i18n';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
});

type FormData = z.infer<typeof schema>;

export default function Register() {
  const [serverError, setServerError] = useState<string | null>(null);
  const { signUp } = useAuthStore();
  const t = useT();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    const { error } = await signUp(data.email, data.password, data.name, 'patient');
    if (error) {
      setServerError(error);
      return;
    }
    navigate('/patient/dashboard');
  };

  return (
    <AuthShell>
      <Card className="w-full max-w-md border-0 shadow-none">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Stethoscope className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">{t('Create your account')}</CardTitle>
          <CardDescription>{t('Book appointments with trusted doctors in seconds')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-1">
              <label htmlFor="name" className="text-sm font-medium">{t('Full name')}</label>
              <Input id="name" placeholder="Jane Smith" autoComplete="name" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-1">
              <label htmlFor="email" className="text-sm font-medium">{t('Email')}</label>
              <Input id="email" type="email" placeholder="you@example.com" autoComplete="email" {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-1">
              <label htmlFor="password" className="text-sm font-medium">{t('Password')}</label>
              <Input id="password" type="password" placeholder="••••••••" autoComplete="new-password" {...register('password')} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              <p className="text-xs text-muted-foreground">{t('Min 8 chars, one uppercase, one number')}</p>
            </div>

            {serverError && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">{serverError}</div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? t('Creating account...') : t('Create account')}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-4">
            {t('Already have an account?')}{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">{t('Sign in')}</Link>
          </p>

          <p className="text-center text-xs text-muted-foreground mt-6 border-t pt-4">
            {t('Are you a doctor?')}{' '}
            <a href="mailto:partners@mediconnect.tn" className="text-primary hover:underline font-medium">
              {t('Partner with us')}
            </a>{' '}
            {t('to get listed.')}
          </p>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
