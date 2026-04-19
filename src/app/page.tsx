'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { AppShell } from '@/components/smartticket/app-shell';
import { LandingNavbar } from '@/components/portal/landing-navbar';
import { LandingHero } from '@/components/portal/landing-hero';
import { RoutePlanner } from '@/components/portal/route-planner';
import { LiveScheduleDemo } from '@/components/portal/live-schedule-demo';
import { SchedulesSection } from '@/components/portal/schedules-section';
import { LinesSection } from '@/components/portal/lines-section';
import { StopsSection } from '@/components/portal/stops-section';
import { FeaturesSection } from '@/components/portal/features-section';
import { TariffsZonesSection } from '@/components/portal/tariffs-zones-section';
import { AppsAccessSection } from '@/components/portal/apps-access-section';
import { LandingFooter } from '@/components/portal/landing-footer';
import { MobileBottomNav } from '@/components/portal/mobile-bottom-nav';
import { DigitalSignage } from '@/components/display/digital-signage';
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
      <main className="flex-1 md:pb-0 pb-16">
        <LandingHero />
        <RoutePlanner />
        <LiveScheduleDemo />
        <SchedulesSection />
        <LinesSection />
        <StopsSection />
        <FeaturesSection />
        <TariffsZonesSection />
        <AppsAccessSection onLoginClick={() => {}} />
      </main>
      <LandingFooter />
      <MobileBottomNav />
    </div>
  );
}

function DisplayPageWrapper() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <DigitalSignage />
    </Suspense>
  );
}

export default function Home() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const validateSession = useAuthStore((s) => s.validateSession);
  const setHasHydrated = useAuthStore((s) => s.setHasHydrated);
  const searchParams = useSearchParams();
  const displayStation = searchParams.get('display');

  // Validate session and handle hydration timeout
  useEffect(() => {
    if (hasHydrated && isAuthenticated) {
      validateSession();
    } else if (!hasHydrated) {
      const timer = setTimeout(() => {
        setHasHydrated();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [hasHydrated, isAuthenticated, validateSession, setHasHydrated]);

  // Digital Signage mode: /?display=stationId bypasses normal layout
  if (displayStation) {
    return <DisplayPageWrapper />;
  }

  // Before hydration completes, check if there's a persisted session
  if (!hasHydrated) {
    if (isAuthenticated) {
      return <LoadingScreen />;
    }
    return <LandingPage />;
  }

  // After hydration
  if (isAuthenticated) {
    return <AppShell />;
  }

  return <LandingPage />;
}
