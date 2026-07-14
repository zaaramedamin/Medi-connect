import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense, lazy, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Toaster } from 'sonner';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CartDrawer } from '@/components/features/CartDrawer';
import { HealthAssistant } from '@/components/features/HealthAssistant';
import { SessionTimeout } from '@/components/features/SessionTimeout';
import { ScrollProgress } from '@/components/ui/scroll-progress';
import { ConfirmProvider } from '@/components/ui/confirm-dialog';
import { useAuthStore } from '@/stores/authStore';
import { useAuthInit } from '@/hooks/useAuth';
import { I18nProvider } from '@/i18n';

const Home = lazy(() => import('@/pages/Home'));
const Login = lazy(() => import('@/pages/auth/Login'));
const Register = lazy(() => import('@/pages/auth/Register'));
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/auth/ResetPassword'));
const Settings = lazy(() => import('@/pages/Settings'));
const PatientDashboard = lazy(() => import('@/pages/patient/Dashboard'));
const DoctorDashboard = lazy(() => import('@/pages/doctor/Dashboard'));
const DoctorProfile = lazy(() => import('@/pages/doctor/Profile'));
const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard'));
const Shop = lazy(() => import('@/pages/Shop'));
const WhyMediConnect = lazy(() => import('@/pages/WhyMediConnect'));
const Community = lazy(() => import('@/pages/community/Community'));
const CommunityArticle = lazy(() => import('@/pages/community/Article'));
const NewArticle = lazy(() => import('@/pages/community/NewArticle'));
const PatientFile = lazy(() => import('@/pages/records/PatientFile'));
const MedicalDocument = lazy(() => import('@/pages/records/Document'));

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

function Spinner() {
  return (
    <div className="flex h-64 items-center justify-center">
      <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

type Role = 'patient' | 'doctor' | 'admin';

function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: Role | Role[] }) {
  const { user, role: userRole, loading } = useAuthStore();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  const allowed = role == null || (Array.isArray(role) ? role : [role]).includes(userRole as Role);
  if (!allowed) return <Navigate to="/" replace />;
  return <>{children}</>;
}

// Per-route document titles (first match wins; longest prefixes first)
const PAGE_TITLES: [string, string][] = [
  ['/patient/dashboard', 'My appointments'],
  ['/doctor/dashboard', 'Doctor dashboard'],
  ['/community/new', 'Write an article'],
  ['/forgot-password', 'Reset password'],
  ['/reset-password', 'New password'],
  ['/community', 'Doctor insights & advice'],
  ['/why-mediconnect', 'Why MediConnect'],
  ['/settings', 'Account settings'],
  ['/register', 'Create an account'],
  ['/records/document/', 'Medical document'],
  ['/records/patient/', 'Patient file'],
  ['/doctor/', 'Doctor profile'],
  ['/login', 'Sign in'],
  ['/admin', 'Admin dashboard'],
  ['/shop', 'Health shop'],
];

function AppRoutes() {
  useAuthInit();
  const location = useLocation();

  useEffect(() => {
    const match = PAGE_TITLES.find(([prefix]) => location.pathname.startsWith(prefix))?.[1];
    document.title = match ? `${match} · MediConnect` : 'MediConnect — Find a doctor & book online';
  }, [location.pathname]);

  // Public content pages get the floating AI health assistant; auth,
  // dashboards, checkout and the article editor do not.
  const path = location.pathname;
  const showAssistant =
    path === '/' ||
    path === '/shop' ||
    path === '/why-mediconnect' ||
    (path.startsWith('/community') && path !== '/community/new');

  return (
    <div className="flex min-h-screen flex-col">
      <ScrollProgress />
      <Header />
      <CartDrawer />
      <SessionTimeout />
      <Toaster richColors position="top-center" />
      <main className="flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <Suspense fallback={<Spinner />}>
              <Routes location={location}>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route
                  path="/settings"
                  element={<ProtectedRoute><Settings /></ProtectedRoute>}
                />
                <Route path="/shop" element={<Shop />} />
                <Route path="/why-mediconnect" element={<WhyMediConnect />} />
                <Route path="/community" element={<Community />} />
                <Route
                  path="/community/new"
                  element={<ProtectedRoute role={['doctor', 'admin']}><NewArticle /></ProtectedRoute>}
                />
                <Route path="/community/:id" element={<CommunityArticle />} />
                <Route path="/doctor/:id" element={<DoctorProfile />} />
                <Route
                  path="/records/patient/:patientId"
                  element={<ProtectedRoute role="doctor"><PatientFile /></ProtectedRoute>}
                />
                <Route
                  path="/records/document/:id"
                  element={<ProtectedRoute role={['doctor', 'patient']}><MedicalDocument /></ProtectedRoute>}
                />
                <Route
                  path="/patient/dashboard"
                  element={<ProtectedRoute role="patient"><PatientDashboard /></ProtectedRoute>}
                />
                <Route
                  path="/doctor/dashboard"
                  element={<ProtectedRoute role="doctor"><DoctorDashboard /></ProtectedRoute>}
                />
                <Route
                  path="/admin"
                  element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>}
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
      {showAssistant && <HealthAssistant />}
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <ConfirmProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ConfirmProvider>
      </QueryClientProvider>
    </I18nProvider>
  );
}
