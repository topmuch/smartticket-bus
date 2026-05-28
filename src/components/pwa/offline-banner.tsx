'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { WifiOff } from 'lucide-react';

/**
 * Subscribe to online/offline events via useSyncExternalStore.
 */
function subscribeToOnlineStatus(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getOnlineSnapshot() {
  return navigator.onLine;
}

function getServerSnapshot() {
  return true; // Assume online on server
}

/**
 * Offline Banner Component.
 * Detects network disconnection and displays a notification banner.
 * Uses useSyncExternalStore to avoid cascading renders.
 */
export function OfflineBanner() {
  const isOnline = useSyncExternalStore(
    subscribeToOnlineStatus,
    getOnlineSnapshot,
    getServerSnapshot
  );

  if (isOnline) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[200] bg-amber-600 text-white py-2 px-4 text-center text-sm font-medium flex items-center justify-center gap-2"
      role="alert"
      aria-live="assertive"
    >
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>Vous êtes hors connexion. Certaines fonctionnalités peuvent être limitées.</span>
    </div>
  );
}
