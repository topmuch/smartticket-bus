'use client';

import { useState } from 'react';
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

export default function Home() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (isAuthenticated) {
    return <AppShell />;
  }

  return <PublicPortal />;
}
