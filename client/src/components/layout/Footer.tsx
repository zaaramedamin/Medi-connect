import { Link } from 'react-router-dom';
import { Stethoscope, Mail, MapPin } from 'lucide-react';

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55v-2.15c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.75 2.69 1.25 3.34.95.1-.74.4-1.25.72-1.53-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11.03 11.03 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.26 5.68.41.35.77 1.05.77 2.12v3.14c0 .3.21.67.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.55V9h3.57v11.45Z" />
    </svg>
  );
}

const PATIENT_LINKS = [
  { label: 'Find a doctor', href: '/' },
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'Create an account', href: '/register' },
] as const;

const DOCTOR_LINKS = [
  { label: 'Partner with us', href: 'mailto:partners@mediconnect.tn' },
  { label: 'Why MediConnect', href: '/#for-doctors' },
  { label: 'Doctor sign in', href: '/login' },
] as const;

export function Footer() {
  return (
    <footer className="border-t bg-muted/40 mt-auto">
      <div className="container py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="lg:pr-8">
            <Link to="/" className="flex items-center gap-2.5 mb-4" aria-label="MediConnect home">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-primary to-accent text-white">
                <Stethoscope className="h-5 w-5" />
              </span>
              <span className="font-display font-extrabold text-lg tracking-tight">
                Medi<span className="text-primary">Connect</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed mb-5">
              Healthcare made simple — find trusted doctors and book appointments online in seconds.
            </p>
            <div className="flex gap-2">
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub"
                className="flex h-9 w-9 items-center justify-center rounded-lg border bg-card text-muted-foreground transition-colors hover:text-primary hover:border-primary/40"
              >
                <GithubIcon className="h-4 w-4" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                aria-label="LinkedIn"
                className="flex h-9 w-9 items-center justify-center rounded-lg border bg-card text-muted-foreground transition-colors hover:text-primary hover:border-primary/40"
              >
                <LinkedinIcon className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* For patients */}
          <nav aria-label="For patients">
            <h3 className="text-sm font-bold mb-4">For patients</h3>
            <ul className="space-y-2.5">
              {PATIENT_LINKS.map(({ label, href }) => (
                <li key={label}>
                  <a href={href} className="text-sm text-muted-foreground transition-colors hover:text-primary">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* For doctors */}
          <nav aria-label="For doctors">
            <h3 className="text-sm font-bold mb-4">For doctors</h3>
            <ul className="space-y-2.5">
              {DOCTOR_LINKS.map(({ label, href }) => (
                <li key={label}>
                  <a href={href} className="text-sm text-muted-foreground transition-colors hover:text-primary">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-bold mb-4">Contact</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2.5">
                <Mail className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                <a href="mailto:contact@mediconnect.tn" className="transition-colors hover:text-primary">
                  contact@mediconnect.tn
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                Tunis, Tunisia
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t">
        <div className="container py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} MediConnect. Built by Zaara Med Amin &amp; Dhia Zorai.</p>
          <nav className="flex gap-5" aria-label="Legal">
            <a href="#" className="transition-colors hover:text-primary">Privacy</a>
            <a href="#" className="transition-colors hover:text-primary">Terms</a>
            <a href="#" className="transition-colors hover:text-primary">Cookies</a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
