import { Link, useNavigate } from 'react-router-dom';
import { Stethoscope, Moon, Sun, LogOut, LayoutDashboard, Menu, X, ShoppingBag, UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { useCartStore, cartCount } from '@/stores/cartStore';
import { useState, useEffect } from 'react';

const NAV_LINKS = [
  { label: 'Find a doctor', href: '/' },
  { label: 'Shop', href: '/shop' },
  { label: 'Insights', href: '/community' },
  { label: 'Why us', href: '/why-mediconnect' },
] as const;

const NAV_LINK_CLASS =
  'rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted';

/** Hash links scroll within the home page; route links use client-side navigation. */
function NavLink({ label, href, onClick, className = NAV_LINK_CLASS }: { label: string; href: string; onClick?: () => void; className?: string }) {
  if (href.includes('#')) {
    return <a href={href} onClick={onClick} className={className}>{label}</a>;
  }
  return <Link to={href} onClick={onClick} className={className}>{label}</Link>;
}

export function Header() {
  const { user, role, signOut } = useAuthStore();
  const cartItems = useCartStore(s => s.items);
  const openCart = useCartStore(s => s.open);
  const count = cartCount(cartItems);
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
          {NAV_LINKS.map(link => (
            <NavLink key={link.label} {...link} />
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={openCart}
            aria-label={`Open bag${count ? `, ${count} items` : ''}`}
            className="relative"
          >
            <ShoppingBag className="h-4 w-4" />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground">
                {count}
              </span>
            )}
          </Button>

          <Button variant="ghost" size="icon" onClick={() => setDark(d => !d)} aria-label="Toggle theme">
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {user ? (
            <div className="hidden md:flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link to={dashboardPath}><LayoutDashboard className="h-4 w-4 mr-1.5" />Dashboard</Link>
              </Button>
              <Button variant="ghost" size="icon" asChild aria-label="Account settings">
                <Link to="/settings"><UserCog className="h-4 w-4" /></Link>
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
          {NAV_LINKS.map(link => (
            <NavLink
              key={link.label}
              {...link}
              onClick={() => setMenuOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
            />
          ))}
          <div className="pt-3 mt-2 border-t flex flex-col gap-2">
            {user ? (
              <>
                <Button variant="outline" size="sm" asChild onClick={() => setMenuOpen(false)}>
                  <Link to={dashboardPath}><LayoutDashboard className="h-4 w-4 mr-1.5" />Dashboard</Link>
                </Button>
                <Button variant="outline" size="sm" asChild onClick={() => setMenuOpen(false)}>
                  <Link to="/settings"><UserCog className="h-4 w-4 mr-1.5" />Settings</Link>
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
