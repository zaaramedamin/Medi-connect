import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useAuthStore } from '@/stores/authStore';
import { useState } from 'react';

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormData = z.infer<typeof schema>;

export default function Login() {
  const [serverError, setServerError] = useState<string | null>(null);
  const { signIn } = useAuthStore();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    const { error } = await signIn(data.email, data.password);
    if (error) {
      setServerError(error);
      return;
    }
    const role = useAuthStore.getState().role;
    navigate(role === 'doctor' ? '/doctor/dashboard' : '/patient/dashboard');
  };

  return (
    <div className="container flex items-center justify-center min-h-[calc(100vh-8rem)] py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Stethoscope className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>Sign in to your MediConnect account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-1">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <Input id="email" type="email" placeholder="you@example.com" autoComplete="email" {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-1">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <Input id="password" type="password" placeholder="••••••••" autoComplete="current-password" {...register('password')} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            {serverError && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">{serverError}</div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-4">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary hover:underline font-medium">Create one</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
