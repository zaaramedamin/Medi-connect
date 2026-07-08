import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, CalendarCheck, Star, Stethoscope } from 'lucide-react';
import { HeroBackdrop } from '@/components/ui/hero-backdrop';
import { useT } from '@/i18n';

/** Full-width two-column shell for the auth pages: form on the left, a branded
 *  medical aside on the right (hidden on small screens) so the page fills the width. */
export function AuthShell({ children }: { children: ReactNode }) {
  const t = useT();
  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-2">
      <div className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">{children}</div>
      </div>

      <aside className="relative hidden overflow-hidden lg:block">
        <HeroBackdrop image="/why/care.jpg" />
        <div className="relative flex h-full flex-col justify-between p-10 text-white">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
              <Stethoscope className="h-5 w-5" />
            </span>
            <span className="font-display text-xl font-extrabold">MediConnect</span>
          </Link>

          <div>
            <h2 className="max-w-sm text-3xl font-bold leading-tight">
              {t('Healthcare that finally respects your time')}
            </h2>
            <ul className="mt-6 space-y-3 text-white/90">
              <li className="flex items-center gap-2.5"><ShieldCheck className="h-5 w-5" /> {t('Verified doctors')}</li>
              <li className="flex items-center gap-2.5"><CalendarCheck className="h-5 w-5" /> {t('Instant confirmation')}</li>
              <li className="flex items-center gap-2.5"><Star className="h-5 w-5" /> {t('Free cancellation')}</li>
            </ul>
          </div>

          <p className="text-sm text-white/70">© {new Date().getFullYear()} MediConnect</p>
        </div>
      </aside>
    </div>
  );
}
