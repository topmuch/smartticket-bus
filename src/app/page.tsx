'use client';

import dynamic from 'next/dynamic';

const AppShell = dynamic(() => import('@/components/smartticket/app-shell'), {
  ssr: false,
});

export default function Page() {
  return <AppShell />;
}
