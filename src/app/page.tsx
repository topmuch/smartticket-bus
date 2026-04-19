'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { AppShell } from '@/components/smartticket/app-shell';
import { LandingNavbar } from '@/components/portal/landing-navbar';
import { LandingHero } from '@/components/portal/landing-hero';
import { LiveScheduleDemo } from '@/components/portal/live-schedule-demo';
import { FeaturesSection } from '@/components/portal/features-section';
import { TariffsZonesSection } from '@/components/portal/tariffs-zones-section';
import { AppsAccessSection } from '@/components/portal/apps-access-section';
import { LandingFooter } from '@/components/portal/landing-footer';
import { Bus } from 'lucide-react';

function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 animate-pulse">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
          <Bus className="h-8 w-8" />
        </div>
        <div className="text-center">
          <h1 className="text-xl font-bold text-foreground">SmartTicket Bus</h1>
          <p className="mt-1 text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    </div>
  );
}

function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <LandingNavbar />
      <main className="flex-1">
        <LandingHero />
        <LiveScheduleDemo />
        <FeaturesSection />
        <TariffsZonesSection />
        <AppsAccessSection onLoginClick={() => {}} />
      </main>
      <LandingFooter />
    </div>
  );
}

export default function Home() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const validateSession = useAuthStore((s) => s.validateSession);
  const setHasHydrated = useAuthStore((s) => s.setHasHydrated);

  // Validate session on mount (after hydration)
  useEffect(() => {
    if (hasHydrated && isAuthenticated) {
      validateSession();
    } else if (!hasHydrated) {
      // If hydration hasn't fired yet via onRehydrateStorage, force it after a timeout
      const timer = setTimeout(() => {
        setHasHydrated();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [hasHydrated, isAuthenticated, validateSession, setHasHydrated]);

  // Show loading screen while auth store rehydrates
  if (!hasHydrated) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    return <AppShell />;
  }

  return <LandingPage />;
}
