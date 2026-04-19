'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { AppShell } from '@/components/smartticket/app-shell';
import { PortalHeader } from '@/components/portal/portal-header';
import { HeroSection } from '@/components/portal/hero-section';
import { LinesSection } from '@/components/portal/lines-section';
import { StopsSection } from '@/components/portal/stops-section';
import { SchedulesSection } from '@/components/portal/schedules-section';
import { FaresSection } from '@/components/portal/fares-section';
import { RoutePlanner } from '@/components/portal/route-planner';
import { LoginDialog } from '@/components/portal/login-dialog';
import { PortalFooter } from '@/components/portal/portal-footer';
import { MobileBottomNav } from '@/components/portal/mobile-bottom-nav';
import { Bus } from 'lucide-react';

function PublicPortal() {
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PortalHeader onLoginClick={() => setLoginOpen(true)} />
      <main className="flex-1">
        <HeroSection />
        <RoutePlanner />
        <LinesSection />
        <StopsSection />
        <SchedulesSection />
        <FaresSection />
      </main>
      <div className="pb-20 md:pb-0">
        <PortalFooter />
      </div>
      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
      <MobileBottomNav />
    </div>
  );
}

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

  return <PublicPortal />;
}
