import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';

const DB_NAME = 'smartticket_offline';
const DB_VERSION = 1;
const STORE_NAME = 'pending_scans';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function useOfflineSync() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState('idle'); // idle | syncing | synced | error
  const syncInProgress = useRef(false);
  const pendingCountRef = useRef(pendingCount);

  // Keep ref in sync
  pendingCountRef.current = pendingCount;

  const loadPendingCount = useCallback(async () => {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const count = await new Promise((resolve, reject) => {
        const req = store.count();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      setPendingCount(count);
    } catch (err) {
      console.error('Error loading pending count:', err);
    }
  }, []);

  const queueScan = useCallback(async (qrToken, result, locationLat = null, locationLng = null) => {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.add({
        qr_token: qrToken,
        result: result ? 'VALID' : 'INVALID',
        reason: result?.reason || null,
        controller_id: api.user?.id,
        location_lat: locationLat,
        location_lng: locationLng,
        queued_at: new Date().toISOString()
      });
      await new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
      await loadPendingCount();
    } catch (err) {
      console.error('Error queueing scan:', err);
    }
  }, [loadPendingCount]);

  const syncPending = useCallback(async () => {
    if (syncInProgress.current || !api.authenticated) return;
    syncInProgress.current = true;
    setSyncStatus('syncing');

    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const allItems = await new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      if (allItems.length === 0) {
        setSyncStatus('synced');
        syncInProgress.current = false;
        return;
      }

      const controls = allItems.map(item => ({
        qr_data: item.qr_token,
        result: item.result,
        reason: item.reason || 'Offline sync',
        latitude: item.location_lat,
        longitude: item.location_lng,
        scanned_at: item.queued_at
      }));

      const res = await api.syncOfflineControls(controls);
      if (res.success) {
        const deleteTx = db.transaction(STORE_NAME, 'readwrite');
        deleteTx.objectStore(STORE_NAME).clear();
        await new Promise((resolve) => { deleteTx.oncomplete = resolve; });
        setPendingCount(0);
        setSyncStatus('synced');
      } else {
        setSyncStatus('error');
      }
    } catch (err) {
      console.error('Sync error:', err);
      setSyncStatus('error');
    } finally {
      syncInProgress.current = false;
    }
  }, []);

  useEffect(() => {
    const goOnline = () => {
      setIsOffline(false);
      if (pendingCountRef.current > 0) syncPending();
    };
    const goOffline = () => setIsOffline(true);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    loadPendingCount();

    const interval = setInterval(loadPendingCount, 10000);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      clearInterval(interval);
    };
  }, [loadPendingCount, syncPending]);

  return { isOffline, pendingCount, syncStatus, queueScan, syncPending, loadPendingCount };
}
