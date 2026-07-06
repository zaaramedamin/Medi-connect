import { Stethoscope } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t py-8 mt-auto">
      <div className="container flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <Stethoscope className="h-4 w-4 text-primary" />
          MediConnect
        </div>
        <p>© {new Date().getFullYear()} MediConnect. Built by Zaara Med Amin &amp; Dhia Zorai.</p>
        <nav className="flex gap-4">
          <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
          <a href="#" className="hover:text-foreground transition-colors">Terms</a>
          <a href="#" className="hover:text-foreground transition-colors">Contact</a>
        </nav>
      </div>
    </footer>
  );
}
