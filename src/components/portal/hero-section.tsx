'use client';

import { useEffect, useState } from 'react';
import { MapPin, Route, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api';

interface PublicInfo {
  appName: string;
  version: string;
  zonesCount: number;
  linesCount: number;
  stopsCount: number;
  currency: string;
  cities: string[];
}

export function HeroSection() {
  const [info, setInfo] = useState<PublicInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const fetchInfo = async () => {
      const res = await apiFetch<PublicInfo>('/api/public/info');
      if (res.success && res.data) {
        setInfo(res.data);
      }
      setLoading(false);
    };
    fetchInfo();
    // Trigger fade-in animation
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.querySelector(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      id="accueil"
      className="relative overflow-hidden bg-gradient-to-br from-primary/90 via-primary to-primary/95"
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-36">
        <div
          className={`transition-all duration-1000 ease-out ${
            mounted
              ? 'translate-y-0 opacity-100'
              : 'translate-y-8 opacity-0'
          }`}
        >
          {/* Main Heading */}
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl">
              Voyagez intelligemment avec{' '}
              <span className="text-yellow-300">SmartTicket Bus</span>
            </h1>
            <p className="mt-4 text-lg text-primary-foreground/80 sm:text-xl">
              Billetterie moderne pour le transport en commun à Dakar
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              size="lg"
              variant="secondary"
              onClick={() => scrollTo('#lignes')}
              className="gap-2 text-base font-semibold"
            >
              Explorer les lignes
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => scrollTo('#tarifs')}
              className="border-primary-foreground/30 bg-transparent text-base font-semibold text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              Consulter les tarifs
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div
          className={`mt-16 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6 transition-all duration-1000 delay-300 ease-out ${
            mounted
              ? 'translate-y-0 opacity-100'
              : 'translate-y-8 opacity-0'
          }`}
        >
          {loading ? (
            <>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-xl bg-white/10 backdrop-blur-sm p-5 border border-white/20"
                >
                  <Skeleton className="mx-auto mb-3 h-10 w-10 rounded-lg bg-white/20" />
                  <Skeleton className="mx-auto mb-1 h-8 w-16 rounded bg-white/20" />
                  <Skeleton className="mx-auto h-4 w-28 rounded bg-white/20" />
                </div>
              ))}
            </>
          ) : (
            <>
              <StatCard
                icon={<MapPin className="h-5 w-5" />}
                value={info?.zonesCount ?? 0}
                label="Zones couvertes"
              />
              <StatCard
                icon={<Route className="h-5 w-5" />}
                value={info?.linesCount ?? 0}
                label="Lignes actives"
              />
              <StatCard
                icon={<Clock className="h-5 w-5" />}
                value={info?.stopsCount ?? 0}
                label="Points d'arrêt"
              />
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm transition-colors hover:bg-white/15">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/20 text-white">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-sm text-primary-foreground/70">{label}</p>
      </div>
    </div>
  );
}
