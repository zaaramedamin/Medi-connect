import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense, lazy } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ScrollProgress } from '@/components/ui/scroll-progress';
import { useAuthStore } from '@/stores/authStore';
import { useAuthInit } from '@/hooks/useAuth';

const Home = lazy(() => import('@/pages/Home'));
const Login = lazy(() => import('@/pages/auth/Login'));
const Register = lazy(() => import('@/pages/auth/Register'));
const PatientDashboard = lazy(() => import('@/pages/patient/Dashboard'));
const DoctorDashboard = lazy(() => import('@/pages/doctor/Dashboard'));
const DoctorProfile = lazy(() => import('@/pages/doctor/Profile'));
const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard'));

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

function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: 'patient' | 'doctor' | 'admin' }) {
  const { user, role: userRole, loading } = useAuthStore();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (role && userRole !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  useAuthInit();
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col">
      <ScrollProgress />
      <Header />
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
                <Route path="/doctor/:id" element={<DoctorProfile />} />
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
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
