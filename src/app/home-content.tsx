'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { AppShell } from '@/components/smartticket/app-shell';
import { Header } from '@/components/computicket/header';
import { HeroSection } from '@/components/computicket/hero-section';
import { BusCarriersSection } from '@/components/computicket/bus-carriers-section';
import { HowItWorksSection } from '@/components/computicket/how-it-works-section';
import { HelpSection } from '@/components/computicket/help-section';
import { SignageDemoSection } from '@/components/computicket/signage-demo-section';
import { Footer } from '@/components/computicket/footer';
import { DigitalSignage } from '@/components/display/digital-signage';
import { Bus } from 'lucide-react';
import { LiveScheduleDemo } from '@/components/portal/live-schedule-demo';

function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4 animate-pulse">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-lg">
          <Bus className="h-8 w-8" />
        </div>
        <div className="text-center">
          <h1 className="text-xl font-bold text-slate-900">SmartTicketQR</h1>
          <p className="mt-1 text-sm text-slate-400">Chargement...</p>
        </div>
      </div>
    </div>
  );
}

function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <BusCarriersSection />
        <HowItWorksSection />
        <div id="horaires">
          <LiveScheduleDemo />
        </div>
        <SignageDemoSection />
        <HelpSection />
      </main>
      <Footer />
    </div>
  );
}

function DisplayPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <DigitalSignage />
    </Suspense>
  );
}

function HomeInner() {
  const searchParams = useSearchParams();
  const displayStation = searchParams.get('display');

  if (displayStation) {
    return <DisplayPage />;
  }

  // Auth bypassed — always show dashboard as SUPERADMIN
  return <AppShell />;
}

export default function HomeContent() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <HomeInner />
    </Suspense>
  );
}
