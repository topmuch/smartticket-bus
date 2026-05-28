'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Download, X, Smartphone, Monitor } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * PWA Service Worker Registration Hook.
 * Handles SW registration, update detection, and install prompts.
 */
export function usePWA() {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const installPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Check standalone mode via matchMedia change listener
    const standaloneQuery = window.matchMedia('(display-mode: standalone)');
    function updateStandalone() {
      const isStandalone =
        standaloneQuery.matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsInstalled(isStandalone);
    }

    // Safari check (no matchMedia support for standalone)
    if ((window.navigator as unknown as { standalone?: boolean }).standalone === true) {
      updateStandalone();
    } else {
      standaloneQuery.addEventListener('change', updateStandalone);
    }

    // Register service worker
    async function registerSW() {
      if (!('serviceWorker' in navigator)) return;

      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        console.log('[PWA] Service Worker registered:', reg.scope);
        setRegistration(reg);

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setIsUpdateAvailable(true);
              }
            });
          }
        });

        if (reg.waiting) {
          setIsUpdateAvailable(true);
        }
      } catch (error) {
        console.error('[PWA] Service Worker registration failed:', error);
      }
    }

    registerSW();

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      installPromptRef.current = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    }

    function handleAppInstalled() {
      console.log('[PWA] App installed successfully');
      setIsInstalled(true);
      installPromptRef.current = null;
      setCanInstall(false);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      standaloneQuery.removeEventListener('change', updateStandalone);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    const prompt = installPromptRef.current;
    if (!prompt) return false;

    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      installPromptRef.current = null;
      setCanInstall(false);
      return outcome === 'accepted';
    } catch (error) {
      console.error('[PWA] Install prompt failed:', error);
      return false;
    }
  }, []);

  const applyUpdate = useCallback(async () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
    setIsUpdateAvailable(false);
  }, [registration]);

  return { isInstalled, isUpdateAvailable, canInstall, promptInstall, applyUpdate };
}

/**
 * PWA Install Prompt Banner Component.
 */
export function PWAInstallBanner() {
  const { canInstall, promptInstall, isInstalled } = usePWA();
  const [dismissed, setDismissed] = useState(false);

  if (!canInstall || isInstalled || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[100] sm:left-auto sm:right-4 sm:w-96 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="rounded-xl border bg-card p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground">
              Installer SmartTicketQR
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Accédez rapidement à l&apos;application depuis votre écran d&apos;accueil.
              Fonctionne hors ligne.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => promptInstall()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Installer
              </button>
              <button
                onClick={() => setDismissed(true)}
                className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                Plus tard
              </button>
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * PWA Update Notification Component.
 */
export function PWAUpdateBanner() {
  const { isUpdateAvailable, applyUpdate } = usePWA();

  if (!isUpdateAvailable) return null;

  return (
    <div className="fixed top-16 right-4 z-[100] animate-in slide-in-from-top-2 fade-in duration-300">
      <div className="rounded-lg border bg-card p-3 shadow-lg flex items-center gap-2">
        <Monitor className="w-4 h-4 text-primary" />
        <span className="text-sm text-foreground">Mise à jour disponible</span>
        <button
          onClick={applyUpdate}
          className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Mettre à jour
        </button>
      </div>
    </div>
  );
}
