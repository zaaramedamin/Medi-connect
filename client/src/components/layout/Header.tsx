import { Link, useNavigate } from 'react-router-dom';
import { Stethoscope, Moon, Sun, LogOut, User, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { useState, useEffect } from 'react';

export function Header() {
  const { user, role, signOut } = useAuthStore();
  const navigate = useNavigate();
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const dashboardPath = role === 'doctor' ? '/doctor/dashboard' : '/patient/dashboard';

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-sm">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary">
          <Stethoscope className="h-6 w-6" />
          MediConnect
        </Link>

        <nav className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setDark(d => !d)} aria-label="Toggle theme">
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {user ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to={dashboardPath}><LayoutDashboard className="h-4 w-4 mr-1" />Dashboard</Link>
              </Button>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-1" />Sign out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login"><User className="h-4 w-4 mr-1" />Sign in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/register">Get started</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
