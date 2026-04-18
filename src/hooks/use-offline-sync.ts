'use client';

/**
 * useOfflineSync Hook
 * Provides offline/online status tracking, pending controls sync,
 * and offline data download for controllers.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '@/lib/api';
import {
  getPendingControls,
  getPendingControlsCount,
  clearPendingControls,
  removePendingControlsByIds,
  replaceBlacklist,
  replaceWhitelist,
  cleanupExpiredWhitelist,
  setLastSyncTime,
} from '@/lib/offline-store';

interface SyncResult {
  synced: number;
  failed: number;
}

interface OfflineSyncState {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  isDownloading: boolean;
  lastSyncError: string | null;
}

export function useOfflineSync() {
  const [state, setState] = useState<OfflineSyncState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    pendingCount: 0,
    isSyncing: false,
    isDownloading: false,
    lastSyncError: null,
  });

  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Track online/offline status
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      if (isMountedRef.current) {
        setState((prev) => ({ ...prev, isOnline: true }));
      }
    };

    const handleOffline = () => {
      if (isMountedRef.current) {
        setState((prev) => ({ ...prev, isOnline: false }));
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Refresh pending controls count periodically
  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await getPendingControlsCount();
      if (isMountedRef.current) {
        setState((prev) => ({ ...prev, pendingCount: count }));
      }
    } catch {
      // IndexedDB not available
    }
  }, []);

  // Load pending count periodically via interval (setState in callback, not directly in effect)
  useEffect(() => {
    const interval = setInterval(() => {
      refreshPendingCount();
    }, 5000);
    return () => clearInterval(interval);
  }, [refreshPendingCount]);

  // Sync pending controls to server
  const syncPendingControls = useCallback(async (): Promise<SyncResult> => {
    if (state.isSyncing) return { synced: 0, failed: 0 };

    setState((prev) => ({ ...prev, isSyncing: true, lastSyncError: null }));

    try {
      const pending = await getPendingControls();

      if (pending.length === 0) {
        setState((prev) => ({ ...prev, isSyncing: false }));
        return { synced: 0, failed: 0 };
      }

      // Prepare controls for sync API
      const controls = pending.map((ctrl) => ({
        qrString: ctrl.qrString,
        result: ctrl.result,
        reason: ctrl.reason,
        scannedAt: ctrl.scannedAt,
        batchId: ctrl.batchId,
        latitude: ctrl.latitude,
        longitude: ctrl.longitude,
      }));

      const res = await apiFetch<{ syncedCount: number }>('/api/controls/sync', {
        method: 'POST',
        body: JSON.stringify({ controls }),
      });

      if (res.success && res.data) {
        // Successfully synced - clear pending controls
        await clearPendingControls();
        if (isMountedRef.current) {
          setState((prev) => ({
            ...prev,
            isSyncing: false,
            pendingCount: 0,
          }));
        }
        return { synced: res.data.syncedCount, failed: 0 };
      } else {
        if (isMountedRef.current) {
          setState((prev) => ({
            ...prev,
            isSyncing: false,
            lastSyncError: res.error || 'Erreur de synchronisation',
          }));
        }
        return { synced: 0, failed: pending.length };
      }
    } catch (error) {
      if (isMountedRef.current) {
        setState((prev) => ({
          ...prev,
          isSyncing: false,
          lastSyncError: 'Erreur réseau lors de la synchronisation',
        }));
      }
      return { synced: 0, failed: 0 };
    }
  }, [state.isSyncing]);

  // Download blacklist/whitelist from server
  const downloadOfflineData = useCallback(async () => {
    if (state.isDownloading) return;

    setState((prev) => ({ ...prev, isDownloading: true, lastSyncError: null }));

    try {
      const res = await apiFetch<{
        blacklist: Array<{ ticketId: string; reason: string }>;
        whitelist: Array<{ ticketId: string; expiresAt: number }>;
      }>('/api/offline/data');

      if (res.success && res.data) {
        // Replace local data with server data
        await replaceBlacklist(res.data.blacklist);
        await replaceWhitelist(res.data.whitelist);
        await cleanupExpiredWhitelist();
        await setLastSyncTime();

        if (isMountedRef.current) {
          setState((prev) => ({ ...prev, isDownloading: false }));
        }
      } else {
        if (isMountedRef.current) {
          setState((prev) => ({
            ...prev,
            isDownloading: false,
            lastSyncError: res.error || 'Erreur de téléchargement',
          }));
        }
      }
    } catch (error) {
      if (isMountedRef.current) {
        setState((prev) => ({
          ...prev,
          isDownloading: false,
          lastSyncError: 'Erreur réseau lors du téléchargement',
        }));
      }
    }
  }, [state.isDownloading]);

  // Full sync: download data + upload pending controls
  const fullSync = useCallback(async (): Promise<SyncResult> => {
    // First upload pending controls
    const syncResult = await syncPendingControls();

    // Then download fresh data
    await downloadOfflineData();

    return syncResult;
  }, [syncPendingControls, downloadOfflineData]);

  return {
    isOnline: state.isOnline,
    pendingCount: state.pendingCount,
    isSyncing: state.isSyncing,
    isDownloading: state.isDownloading,
    lastSyncError: state.lastSyncError,
    syncPendingControls,
    downloadOfflineData,
    fullSync,
    refreshPendingCount,
  };
}
