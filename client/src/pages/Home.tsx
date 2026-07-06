import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Calendar, Star, Shield, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DoctorCard } from '@/components/features/DoctorCard';
import { searchDoctors } from '@/services/api';
import { useDebounce } from '@/hooks/useDebounce';
import { Link } from 'react-router-dom';

export default function Home() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 350);

  const { data: doctors, isLoading } = useQuery({
    queryKey: ['doctors', 'search', debouncedQuery],
    queryFn: () => searchDoctors(debouncedQuery),
    enabled: debouncedQuery.length >= 1,
  });

  const showResults = debouncedQuery.length >= 1;

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/5 py-20 px-4">
        <div className="container max-w-3xl text-center mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Find the right doctor,<br />
            <span className="text-primary">book in seconds.</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Search by name, specialty, or location. View availability and confirm your appointment instantly.
          </p>

          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              className="pl-10 h-12 text-base shadow-md"
              placeholder="Search doctors, specialties, or locations..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              aria-label="Search doctors"
            />
          </div>
        </div>
      </section>

      {/* Search Results */}
      {showResults && (
        <section className="container py-8">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : doctors && doctors.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground mb-4">{doctors.length} doctor{doctors.length !== 1 ? 's' : ''} found</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {doctors.map(doctor => <DoctorCard key={doctor.id} doctor={doctor} />)}
              </div>
            </>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No doctors found</p>
              <p className="text-sm">Try a different name, specialty, or location.</p>
            </div>
          )}
        </section>
      )}

      {/* Features */}
      {!showResults && (
        <>
          <section className="container py-16">
            <h2 className="text-3xl font-bold text-center mb-12">How it works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { icon: Search, title: 'Search', desc: 'Find doctors by name, specialty, or location in real time.' },
                { icon: Calendar, title: 'Book', desc: 'Pick an available time slot and confirm in one click.' },
                { icon: Star, title: 'Attend', desc: 'Receive a confirmation email and show up for your appointment.' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex flex-col items-center text-center gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">{title}</h3>
                  <p className="text-muted-foreground text-sm">{desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-muted/40 py-16">
            <div className="container grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-4">Are you a doctor?</h2>
                <p className="text-muted-foreground mb-6">Join MediConnect to manage your schedule, accept bookings, and reach more patients — all from one dashboard.</p>
                <Button asChild>
                  <Link to="/register">Join as a Doctor <ArrowRight className="h-4 w-4 ml-1" /></Link>
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4 text-center">
                {[
                  { value: '500+', label: 'Doctors' },
                  { value: '10k+', label: 'Patients' },
                  { value: '50k+', label: 'Appointments' },
                  { value: '4.9★', label: 'Avg Rating' },
                ].map(s => (
                  <div key={s.label} className="rounded-xl border bg-card p-6">
                    <p className="text-3xl font-bold text-primary">{s.value}</p>
                    <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="container py-16 text-center">
            <Shield className="h-10 w-10 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-3">Your privacy matters</h2>
            <p className="text-muted-foreground max-w-md mx-auto">All data is encrypted in transit. We never sell your personal or medical information.</p>
          </section>
        </>
      )}
    </div>
  );
}
