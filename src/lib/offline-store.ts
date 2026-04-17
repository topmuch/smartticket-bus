'use client';

/**
 * SmartTicket Offline Store
 * IndexedDB wrapper for offline ticket validation by controllers.
 *
 * Object stores:
 *   - blacklist: cancelled/revoked ticket IDs
 *   - whitelist: valid subscription ticket IDs
 *   - pending-controls: queued control records for sync
 */

const DB_NAME = 'smartticket-offline';
const DB_VERSION = 1;

interface BlacklistRecord {
  ticketId: string;
  reason: string;
  addedAt: number;
}

interface WhitelistRecord {
  ticketId: string;
  expiresAt: number;
  addedAt: number;
}

interface PendingControl {
  id?: number;
  qrString: string;
  result: string;
  reason?: string;
  scannedAt: string;
  batchId?: string;
  latitude?: number;
  longitude?: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(new Error('Impossible d\'ouvrir IndexedDB'));
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Blacklist store
      if (!db.objectStoreNames.contains('blacklist')) {
        const blacklist = db.createObjectStore('blacklist', { keyPath: 'ticketId' });
        blacklist.createIndex('addedAt', 'addedAt', { unique: false });
      }

      // Whitelist store
      if (!db.objectStoreNames.contains('whitelist')) {
        const whitelist = db.createObjectStore('whitelist', { keyPath: 'ticketId' });
        whitelist.createIndex('expiresAt', 'expiresAt', { unique: false });
      }

      // Pending controls store (auto-increment id)
      if (!db.objectStoreNames.contains('pending-controls')) {
        const controls = db.createObjectStore('pending-controls', {
          keyPath: 'id',
          autoIncrement: true,
        });
        controls.createIndex('scannedAt', 'scannedAt', { unique: false });
        controls.createIndex('batchId', 'batchId', { unique: false });
      }
    };
  });
}

function getStore(
  db: IDBDatabase,
  storeName: string,
  mode: IDBTransactionMode = 'readonly'
): IDBObjectStore {
  const tx = db.transaction(storeName, mode);
  return tx.objectStore(storeName);
}

// ==========================================
// BLACKLIST
// ==========================================

export async function addToBlacklist(ticketId: string, reason: string): Promise<void> {
  const db = await openDB();
  const store = getStore(db, 'blacklist', 'readwrite');
  const record: BlacklistRecord = { ticketId, reason, addedAt: Date.now() };
  store.put(record);
  await new Promise<void>((resolve, reject) => {
    db.transaction.oncomplete = () => resolve();
    db.transaction.onerror = () => reject(new Error('Erreur ajout blacklist'));
  });
}

export async function isBlacklisted(ticketId: string): Promise<boolean> {
  const db = await openDB();
  const store = getStore(db, 'blacklist', 'readonly');
  const request = store.get(ticketId);
  return new Promise((resolve) => {
    request.onsuccess = () => resolve(!!request.result);
    request.onerror = () => resolve(false);
  });
}

export async function getBlacklist(): Promise<BlacklistRecord[]> {
  const db = await openDB();
  const store = getStore(db, 'blacklist', 'readonly');
  const request = store.getAll();
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(new Error('Erreur lecture blacklist'));
  });
}

export async function clearBlacklist(): Promise<void> {
  const db = await openDB();
  const store = getStore(db, 'blacklist', 'readwrite');
  store.clear();
  await new Promise<void>((resolve, reject) => {
    db.transaction.oncomplete = () => resolve();
    db.transaction.onerror = () => reject(new Error('Erreur nettoyage blacklist'));
  });
}

export async function replaceBlacklist(records: Array<{ ticketId: string; reason: string }>): Promise<void> {
  const db = await openDB();
  const store = getStore(db, 'blacklist', 'readwrite');
  store.clear();
  const now = Date.now();
  for (const rec of records) {
    store.put({ ...rec, addedAt: now });
  }
  await new Promise<void>((resolve, reject) => {
    db.transaction.oncomplete = () => resolve();
    db.transaction.onerror = () => reject(new Error('Erreur remplacement blacklist'));
  });
}

// ==========================================
// WHITELIST
// ==========================================

export async function addToWhitelist(ticketId: string, expiresAt: number): Promise<void> {
  const db = await openDB();
  const store = getStore(db, 'whitelist', 'readwrite');
  const record: WhitelistRecord = { ticketId, expiresAt, addedAt: Date.now() };
  store.put(record);
  await new Promise<void>((resolve, reject) => {
    db.transaction.oncomplete = () => resolve();
    db.transaction.onerror = () => reject(new Error('Erreur ajout whitelist'));
  });
}

export async function isWhitelisted(ticketId: string): Promise<boolean> {
  const db = await openDB();
  const store = getStore(db, 'whitelist', 'readonly');
  const request = store.get(ticketId);
  return new Promise((resolve) => {
    request.onsuccess = () => {
      const record = request.result as WhitelistRecord | undefined;
      if (!record) {
        resolve(false);
        return;
      }
      // Check if expired
      if (record.expiresAt < Date.now()) {
        resolve(false);
        return;
      }
      resolve(true);
    };
    request.onerror = () => resolve(false);
  });
}

export async function getWhitelist(): Promise<WhitelistRecord[]> {
  const db = await openDB();
  const store = getStore(db, 'whitelist', 'readonly');
  const request = store.getAll();
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(new Error('Erreur lecture whitelist'));
  });
}

export async function cleanupExpiredWhitelist(): Promise<number> {
  const db = await openDB();
  const store = getStore(db, 'whitelist', 'readwrite');
  const now = Date.now();
  const request = store.openCursor();
  let removed = 0;

  return new Promise((resolve, reject) => {
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        const record = cursor.value as WhitelistRecord;
        if (record.expiresAt < now) {
          cursor.delete();
          removed++;
        }
        cursor.continue();
      }
    };
    request.onerror = () => reject(new Error('Erreur nettoyage whitelist expirée'));
    db.transaction.oncomplete = () => resolve(removed);
  });
}

export async function clearWhitelist(): Promise<void> {
  const db = await openDB();
  const store = getStore(db, 'whitelist', 'readwrite');
  store.clear();
  await new Promise<void>((resolve, reject) => {
    db.transaction.oncomplete = () => resolve();
    db.transaction.onerror = () => reject(new Error('Erreur nettoyage whitelist'));
  });
}

export async function replaceWhitelist(records: Array<{ ticketId: string; expiresAt: number }>): Promise<void> {
  const db = await openDB();
  const store = getStore(db, 'whitelist', 'readwrite');
  store.clear();
  const now = Date.now();
  for (const rec of records) {
    store.put({ ...rec, addedAt: now });
  }
  await new Promise<void>((resolve, reject) => {
    db.transaction.oncomplete = () => resolve();
    db.transaction.onerror = () => reject(new Error('Erreur remplacement whitelist'));
  });
}

// ==========================================
// PENDING CONTROLS
// ==========================================

export async function addPendingControl(control: Omit<PendingControl, 'id'>): Promise<void> {
  const db = await openDB();
  const store = getStore(db, 'pending-controls', 'readwrite');
  store.add(control);
  await new Promise<void>((resolve, reject) => {
    db.transaction.oncomplete = () => resolve();
    db.transaction.onerror = () => reject(new Error('Erreur ajout contrôle en attente'));
  });
}

export async function getPendingControls(): Promise<PendingControl[]> {
  const db = await openDB();
  const store = getStore(db, 'pending-controls', 'readonly');
  const request = store.getAll();
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(new Error('Erreur lecture contrôles en attente'));
  });
}

export async function getPendingControlsCount(): Promise<number> {
  const db = await openDB();
  const store = getStore(db, 'pending-controls', 'readonly');
  const request = store.count();
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Erreur comptage contrôles'));
  });
}

export async function clearPendingControls(): Promise<void> {
  const db = await openDB();
  const store = getStore(db, 'pending-controls', 'readwrite');
  store.clear();
  await new Promise<void>((resolve, reject) => {
    db.transaction.oncomplete = () => resolve();
    db.transaction.onerror = () => reject(new Error('Erreur suppression contrôles en attente'));
  });
}

export async function removePendingControlsByIds(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await openDB();
  const store = getStore(db, 'pending-controls', 'readwrite');
  for (const id of ids) {
    store.delete(id);
  }
  await new Promise<void>((resolve, reject) => {
    db.transaction.oncomplete = () => resolve();
    db.transaction.onerror = () => reject(new Error('Erreur suppression contrôles par ID'));
  });
}

// ==========================================
// OFFLINE DATA LAST SYNC TIMESTAMP
// ==========================================

export async function setLastSyncTime(): Promise<void> {
  try {
    localStorage.setItem('smartticket-last-sync', Date.now().toString());
  } catch {
    // localStorage not available
  }
}

export async function getLastSyncTime(): Promise<number | null> {
  try {
    const val = localStorage.getItem('smartticket-last-sync');
    return val ? parseInt(val, 10) : null;
  } catch {
    return null;
  }
}
