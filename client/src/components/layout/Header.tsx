import { Link, useNavigate } from 'react-router-dom';
import { Stethoscope, Moon, Sun, LogOut, LayoutDashboard, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { useState, useEffect } from 'react';

const NAV_LINKS = [
  { label: 'Find a doctor', href: '/' },
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'For doctors', href: '/#for-doctors' },
] as const;

export function Header() {
  const { user, role, signOut } = useAuthStore();
  const navigate = useNavigate();
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  const handleSignOut = async () => {
    await signOut();
    setMenuOpen(false);
    navigate('/');
  };

  const dashboardPath = role === 'admin' ? '/admin' : role === 'doctor' ? '/doctor/dashboard' : '/patient/dashboard';

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2.5 shrink-0" aria-label="MediConnect home">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-primary to-accent text-white shadow-sm">
            <Stethoscope className="h-5 w-5" />
          </span>
          <span className="font-display font-extrabold text-xl tracking-tight">
            Medi<span className="text-primary">Connect</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Main">
          {NAV_LINKS.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setDark(d => !d)} aria-label="Toggle theme">
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {user ? (
            <div className="hidden md:flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link to={dashboardPath}><LayoutDashboard className="h-4 w-4 mr-1.5" />Dashboard</Link>
              </Button>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-1.5" />Sign out
              </Button>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Sign in</Link>
              </Button>
              <Button size="sm" className="shadow-sm" asChild>
                <Link to="/register">Get started</Link>
              </Button>
            </div>
          )}

          {/* Mobile menu toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMenuOpen(o => !o)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <nav className="md:hidden border-t bg-background px-5 py-4 space-y-1 animate-fade-in" aria-label="Mobile">
          {NAV_LINKS.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              onClick={() => setMenuOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              {label}
            </a>
          ))}
          <div className="pt-3 mt-2 border-t flex flex-col gap-2">
            {user ? (
              <>
                <Button variant="outline" size="sm" asChild onClick={() => setMenuOpen(false)}>
                  <Link to={dashboardPath}><LayoutDashboard className="h-4 w-4 mr-1.5" />Dashboard</Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-1.5" />Sign out
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" asChild onClick={() => setMenuOpen(false)}>
                  <Link to="/login">Sign in</Link>
                </Button>
                <Button size="sm" asChild onClick={() => setMenuOpen(false)}>
                  <Link to="/register">Get started</Link>
                </Button>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
