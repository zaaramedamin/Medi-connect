import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  UserPlus, Trash2, ShieldCheck, ShieldOff, Stethoscope, LayoutDashboard,
  Users, Newspaper, Activity, CalendarCheck, Wallet, TrendingUp, Clock, PenSquare,
  Package, Pencil, ShoppingBag, Bot,
} from 'lucide-react';
import RagConsoleTab from './RagConsole';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  getAdminDoctors, createDoctor, updateDoctor, setDoctorSubscription, deleteDoctor,
  getAdminStats, getAdminPatients, deletePatient, getArticles, deleteArticle,
  getAdminOrders, setOrderStatus,
} from '@/services/api';
import type { AdminDoctor, Order } from '@/types';
import { ARTICLE_CATEGORY_META } from '@/data/articleMeta';
import { formatDT } from '@/data/products';
import { useT } from '@/i18n';
import { formatDate, cn } from '@/lib/utils';

type Tab = 'overview' | 'doctors' | 'patients' | 'sales' | 'posts' | 'assistant';

const TABS: { value: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { value: 'overview', label: 'Overview', icon: LayoutDashboard },
  { value: 'doctors', label: 'Doctors', icon: Stethoscope },
  { value: 'patients', label: 'Patients', icon: Users },
  { value: 'sales', label: 'Sales', icon: Package },
  { value: 'posts', label: 'Posts', icon: Newspaper },
  { value: 'assistant', label: 'AI Console', icon: Bot },
];

export default function AdminDashboard() {
  const t = useT();
  const [tab, setTab] = useState<Tab>('overview');

  return (
    <div className="container max-w-5xl py-8">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <ShieldCheck className="h-6 w-6 text-primary" /> {t('Admin Dashboard')}
        </h1>
        <p className="text-muted-foreground">{t('Manage doctors, patients, posts, and see how the platform is performing.')}</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-1 rounded-xl border bg-card p-1">
        {TABS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
              tab === value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4" /> {t(label)}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab />}
      {tab === 'doctors' && <DoctorsTab />}
      {tab === 'patients' && <PatientsTab />}
      {tab === 'sales' && <SalesTab />}
      {tab === 'posts' && <PostsTab />}
      {tab === 'assistant' && <RagConsoleTab />}
    </div>
  );
}

// ── Overview / statistics ────────────────────────────────────────────
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function OverviewTab() {
  const t = useT();
  const { data: stats, isLoading } = useQuery({ queryKey: ['admin', 'stats'], queryFn: getAdminStats });

  if (isLoading || !stats) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />)}
      </div>
    );
  }

  const statCards = [
    { label: t('Doctors'), value: stats.totals.doctors, sub: `${stats.totals.activeDoctors} ${t('active')}`, icon: Stethoscope },
    { label: t('Patients'), value: stats.totals.patients, sub: t('registered'), icon: Users },
    { label: t('Appointments'), value: stats.totals.appointments, sub: `${stats.totals.upcoming} ${t('upcoming')}`, icon: CalendarCheck },
    { label: t('Completed visits'), value: stats.totals.completed, sub: t('all time'), icon: Activity },
  ];

  const maxHour = Math.max(...stats.hourly.map(h => h.count), 1);
  const maxDay = Math.max(...stats.weekday, 1);
  const busyHours = stats.hourly.filter(h => h.hour >= 7 && h.hour <= 21);

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map(({ label, value, sub, icon: Icon }) => (
          <div key={label} className="rounded-2xl border bg-card p-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{label}</span>
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <p className="font-display text-3xl font-extrabold">{value}</p>
            <p className="text-xs text-muted-foreground">{sub}</p>
          </div>
        ))}
      </div>

      {/* Revenue */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <RevenueCard label={t('Total revenue')} value={stats.revenue.total} icon={Wallet} highlight />
        <RevenueCard label={t('Consultations')} value={stats.revenue.consultation} icon={TrendingUp} />
        <RevenueCard label={t('Subscriptions')} value={stats.revenue.subscription} icon={ShieldCheck} />
        <RevenueCard label={t('Shop sales')} value={stats.revenue.shop} icon={ShoppingBag} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top doctors by reservations */}
        <Card>
          <CardHeader><CardTitle className="text-base">{t('Most-booked doctors')}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {stats.topDoctors.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('No reservations yet.')}</p>
            ) : (
              stats.topDoctors.map((d, i) => {
                const pct = (d.reservations / (stats.topDoctors[0].reservations || 1)) * 100;
                return (
                  <div key={d.id}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="truncate font-medium">
                        <span className="mr-1.5 text-muted-foreground">{i + 1}.</span>{d.name}
                        {d.specialty && <span className="ml-1 text-xs text-muted-foreground">· {d.specialty}</span>}
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums">{d.reservations}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-linear-to-r from-primary to-accent" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Peak booking hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              {t('Peak booking hours')}
              <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> {t('busiest')}: {String(stats.peakHour.hour).padStart(2, '0')}:00
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-36 items-end gap-1">
              {busyHours.map(h => (
                <div key={h.hour} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className={cn('w-full rounded-t', h.hour === stats.peakHour.hour ? 'bg-primary' : 'bg-primary/30')}
                      style={{ height: `${(h.count / maxHour) * 100}%` }}
                      title={`${h.hour}:00 — ${h.count} bookings`}
                    />
                  </div>
                  <span className="text-[9px] text-muted-foreground">{h.hour}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{t('Reservations by hour of day (07:00–21:00).')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Weekday distribution */}
      <Card>
        <CardHeader><CardTitle className="text-base">{t('Bookings by day of week')}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {WEEKDAYS.map((label, i) => (
              <div key={label} className="text-center">
                <div className="flex h-24 items-end justify-center">
                  <div
                    className="w-6 rounded-t bg-accent/70"
                    style={{ height: `${(stats.weekday[i] / maxDay) * 100}%` }}
                    title={`${stats.weekday[i]} bookings`}
                  />
                </div>
                <p className="mt-1 text-xs font-medium">{label}</p>
                <p className="text-[11px] text-muted-foreground tabular-nums">{stats.weekday[i]}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RevenueCard({ label, value, icon: Icon, highlight }: { label: string; value: number; icon: typeof Wallet; highlight?: boolean }) {
  return (
    <div className={cn('rounded-2xl border p-5', highlight ? 'bg-linear-to-br from-primary to-accent text-white' : 'bg-card')}>
      <div className="mb-2 flex items-center justify-between">
        <span className={cn('text-sm', highlight ? 'text-white/85' : 'text-muted-foreground')}>{label}</span>
        <Icon className={cn('h-4 w-4', highlight ? 'text-white' : 'text-primary')} />
      </div>
      <p className="font-display text-2xl font-extrabold">{formatDT(value)}</p>
    </div>
  );
}

// ── Doctors management ───────────────────────────────────────────────
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

function DoctorsTab() {
  const t = useT();
  const te = (m?: string) => (m ? t(m) : undefined);
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<AdminDoctor | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: doctors, isLoading } = useQuery({ queryKey: ['admin', 'doctors'], queryFn: getAdminDoctors });
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'doctors'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
  };

  const createMutation = useMutation({
    mutationFn: createDoctor,
    onSuccess: () => { invalidate(); setAddOpen(false); reset(); toast.success(t('Doctor onboarded.')); },
    onError: (e: Error) => setFormError(e.message),
  });
  const subMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'activate' | 'deactivate' }) => setDoctorSubscription(id, action),
    onSuccess: d => { invalidate(); toast.success(d.subscription_status === 'active' ? t('Subscription activated.') : t('Subscription deactivated.')); },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteDoctor,
    onSuccess: () => { invalidate(); toast.success(t('Doctor deleted.')); },
    onError: (e: Error) => toast.error(e.message),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<NewDoctorForm, unknown, NewDoctorParsed>({
    resolver: zodResolver(newDoctorSchema),
  });

  const onSubmit = (data: NewDoctorParsed) => {
    setFormError(null);
    createMutation.mutate({ ...data, activate: true });
  };

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => { setFormError(null); setAddOpen(true); }}>
          <UserPlus className="mr-1.5 h-4 w-4" /> {t('Onboard doctor')}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {doctors?.map(doc => {
              const initials = doc.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
              const active = doc.subscription_status === 'active';
              return (
                <div key={doc.id} className="flex flex-wrap items-center gap-4 p-4">
                  <Avatar className="h-11 w-11 shrink-0">
                    {doc.photos_url && <AvatarImage src={doc.photos_url} alt={doc.name} />}
                    <AvatarFallback className="bg-secondary text-sm font-bold text-secondary-foreground">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{doc.name}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {doc.specialty ?? t('No specialty')}{doc.location ? ` · ${doc.location}` : ''}
                    </p>
                  </div>
                  <div className="mr-2 text-right">
                    <Badge variant={active ? 'success' : 'secondary'} className="capitalize">{doc.subscription_status}</Badge>
                    {doc.subscription_expires && <p className="mt-1 text-xs text-muted-foreground">{t('until')} {formatDate(doc.subscription_expires)}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setEditing(doc)} aria-label={`Edit ${doc.name}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {active ? (
                      <Button variant="outline" size="sm" onClick={() => subMutation.mutate({ id: doc.id, action: 'deactivate' })} disabled={subMutation.isPending}>
                        <ShieldOff className="mr-1 h-4 w-4" /> {t('Deactivate')}
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => subMutation.mutate({ id: doc.id, action: 'activate' })} disabled={subMutation.isPending}>
                        <ShieldCheck className="mr-1 h-4 w-4" /> {t('Activate')}
                      </Button>
                    )}
                    <Button
                      variant="ghost" size="icon" className="text-destructive hover:text-destructive"
                      onClick={() => { if (confirm(t('Delete {name}? This cannot be undone.').replace('{name}', doc.name))) deleteMutation.mutate(doc.id); }}
                      disabled={deleteMutation.isPending} aria-label={`Delete ${doc.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
            {doctors?.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">{t('No doctors yet. Onboard your first one.')}</p>}
          </CardContent>
        </Card>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Stethoscope className="h-5 w-5 text-primary" /> {t('Onboard a doctor')}</DialogTitle>
            <DialogDescription>{t('Creates a login account and an active 1-year subscription.')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('Full name')} error={te(errors.name?.message)}><Input {...register('name')} placeholder="Dr. Jane Smith" /></Field>
              <Field label={t('Specialty')} error={te(errors.specialty?.message)}><Input {...register('specialty')} placeholder="Cardiology" /></Field>
            </div>
            <Field label={t('Email')} error={te(errors.email?.message)}><Input type="email" {...register('email')} placeholder="doctor@clinic.tn" /></Field>
            <Field label={t('Temporary password')} error={te(errors.password?.message)}><Input type="text" {...register('password')} placeholder={t('Min 8 characters')} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('City')} error={te(errors.location?.message)}><Input {...register('location')} placeholder="Tunis" /></Field>
              <Field label={t('Cost (DT)')} error={te(errors.cost?.message)}><Input type="number" {...register('cost')} placeholder="60" /></Field>
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>{t('Cancel')}</Button>
              <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
                {createMutation.isPending ? t('Creating...') : t('Create doctor')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {editing && (
        <EditDoctorDialog doctor={editing} onClose={() => setEditing(null)} onSaved={invalidate} />
      )}
    </>
  );
}

const editDoctorSchema = z.object({
  name: z.string().min(2, 'Name is required').max(100),
  specialty: z.string().max(100).optional(),
  location: z.string().max(200).optional(),
  cost: z.coerce.number().min(0).optional(),
});
type EditDoctorForm = z.input<typeof editDoctorSchema>;
type EditDoctorParsed = z.output<typeof editDoctorSchema>;

function EditDoctorDialog({ doctor, onClose, onSaved }: { doctor: AdminDoctor; onClose: () => void; onSaved: () => void }) {
  const t = useT();
  const te = (m?: string) => (m ? t(m) : undefined);
  const { register, handleSubmit, formState: { errors } } = useForm<EditDoctorForm, unknown, EditDoctorParsed>({
    resolver: zodResolver(editDoctorSchema),
    defaultValues: {
      name: doctor.name,
      specialty: doctor.specialty ?? '',
      location: doctor.location ?? '',
      cost: doctor.cost ?? undefined,
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: EditDoctorParsed) => updateDoctor(doctor.id, data),
    onSuccess: () => { onSaved(); onClose(); toast.success(t('Doctor updated.')); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Pencil className="h-4 w-4 text-primary" /> {t('Edit')} {doctor.name}</DialogTitle>
          <DialogDescription>{t('Changes are visible to patients immediately.')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(data => updateMutation.mutate(data))} className="space-y-3" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('Full name')} error={te(errors.name?.message)}><Input {...register('name')} /></Field>
            <Field label={t('Specialty')} error={te(errors.specialty?.message)}><Input {...register('specialty')} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('City')} error={te(errors.location?.message)}><Input {...register('location')} /></Field>
            <Field label={t('Cost (DT)')} error={te(errors.cost?.message)}><Input type="number" {...register('cost')} /></Field>
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>{t('Cancel')}</Button>
            <Button type="submit" className="flex-1" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? t('Saving…') : t('Save changes')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Patients management ──────────────────────────────────────────────
function PatientsTab() {
  const t = useT();
  const queryClient = useQueryClient();
  const { data: patients, isLoading } = useQuery({ queryKey: ['admin', 'patients'], queryFn: getAdminPatients });
  const deleteMutation = useMutation({
    mutationFn: deletePatient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'patients'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      toast.success(t('Patient deleted.'));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}</div>;

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{t('Patients')} ({patients?.length ?? 0})</CardTitle></CardHeader>
      <CardContent className="divide-y p-0">
        {patients?.map(p => {
          const initials = p.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
          return (
            <div key={p.id} className="flex flex-wrap items-center gap-4 p-4">
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarFallback className="bg-secondary text-sm font-bold text-secondary-foreground">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{p.name}</p>
                <p className="truncate text-sm text-muted-foreground">{p.email}</p>
              </div>
              <div className="mr-2 text-right text-sm">
                <p className="font-medium">{p.appointments} {t(p.appointments !== 1 ? 'bookings' : 'booking')}</p>
                <p className="text-xs text-muted-foreground">{t('joined')} {formatDate(p.created_at)}</p>
              </div>
              <Button
                variant="ghost" size="icon" className="text-destructive hover:text-destructive"
                onClick={() => { if (confirm(t('Delete {name} and their bookings? This cannot be undone.').replace('{name}', p.name))) deleteMutation.mutate(p.id); }}
                disabled={deleteMutation.isPending} aria-label={`Delete ${p.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
        {patients?.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">{t('No patients registered yet.')}</p>}
      </CardContent>
    </Card>
  );
}

// ── Sales / shop orders ──────────────────────────────────────────────
const ORDER_STATUS_STYLE: Record<Order['status'], 'secondary' | 'success' | 'destructive'> = {
  placed: 'secondary',
  delivered: 'success',
  cancelled: 'destructive',
};

function SalesTab() {
  const t = useT();
  const queryClient = useQueryClient();
  const { data: orders, isLoading } = useQuery({ queryKey: ['admin', 'orders'], queryFn: getAdminOrders });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: Order['status'] }) => setOrderStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      toast.success(t('Order updated.'));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}</div>;
  }

  const active = (orders ?? []).filter(o => o.status !== 'cancelled');
  const revenue = active.reduce((sum, o) => sum + Number(o.total), 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <RevenueCard label={t('Shop revenue')} value={revenue} icon={ShoppingBag} highlight />
        <div className="rounded-2xl border bg-card p-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t('Orders')}</span>
            <Package className="h-4 w-4 text-primary" />
          </div>
          <p className="font-display text-2xl font-extrabold">{active.length}</p>
        </div>
        <div className="rounded-2xl border bg-card p-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t('Avg order')}</span>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <p className="font-display text-2xl font-extrabold">
            {formatDT(active.length ? Math.round(revenue / active.length) : 0)}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">{t('Orders')}</CardTitle></CardHeader>
        <CardContent className="divide-y p-0">
          {orders?.map(o => (
            <div key={o.id} className="flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{o.reference}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {o.customer_name} · {o.items.reduce((n, i) => n + i.quantity, 0)} {t('items')} · {formatDate(o.created_at)}
                </p>
              </div>
              <span className="font-bold text-primary">{formatDT(Number(o.total))}</span>
              <Badge variant={ORDER_STATUS_STYLE[o.status]} className="capitalize">{t(o.status)}</Badge>
              <select
                value={o.status}
                onChange={e => statusMutation.mutate({ id: o.id, status: e.target.value as Order['status'] })}
                disabled={statusMutation.isPending}
                className="h-9 cursor-pointer rounded-lg border bg-card px-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Update status of ${o.reference}`}
              >
                <option value="placed">{t('Placed')}</option>
                <option value="delivered">{t('Delivered')}</option>
                <option value="cancelled">{t('Cancelled')}</option>
              </select>
            </div>
          ))}
          {orders?.length === 0 && (
            <p className="p-8 text-center text-sm text-muted-foreground">
              {t('No orders yet. They appear here once patients check out from the shop.')}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Posts management ─────────────────────────────────────────────────
function PostsTab() {
  const t = useT();
  const queryClient = useQueryClient();
  const { data: articles, isLoading } = useQuery({ queryKey: ['articles', 'all'], queryFn: () => getArticles() });
  const deleteMutation = useMutation({
    mutationFn: deleteArticle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      toast.success(t('Post deleted.'));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button asChild><Link to="/community/new"><PenSquare className="mr-1.5 h-4 w-4" /> {t('Write a post')}</Link></Button>
      </div>
      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {articles?.map(a => {
              const meta = ARTICLE_CATEGORY_META[a.category];
              return (
                <div key={a.id} className="flex flex-wrap items-center gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <Link to={`/community/${a.id}`} className="truncate font-semibold hover:text-primary">{a.title}</Link>
                    <p className="truncate text-sm text-muted-foreground">
                      {a.author.name} · {a.comment_count} {t(a.comment_count !== 1 ? 'comments' : 'comment')}
                    </p>
                  </div>
                  <Badge variant="secondary" className={cn('shrink-0', meta.badge)}>{t(meta.label)}</Badge>
                  <Button
                    variant="ghost" size="icon" className="text-destructive hover:text-destructive"
                    onClick={() => { if (confirm(t('Delete “{title}”? This cannot be undone.').replace('{title}', a.title))) deleteMutation.mutate(a.id); }}
                    disabled={deleteMutation.isPending} aria-label={`${t('Delete')} ${a.title}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
            {articles?.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">{t('No posts yet.')}</p>}
          </CardContent>
        </Card>
      )}
    </>
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
