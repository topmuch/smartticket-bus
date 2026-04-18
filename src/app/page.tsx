'use client';

import { useAuthStore } from '@/stores/auth-store';
import { LoginPage } from '@/components/smartticket/login-page';
import { AppShell } from '@/components/smartticket/app-shell';

export default function Home() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <AppShell />;
}
