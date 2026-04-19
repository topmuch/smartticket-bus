import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// ── Types ──────────────────────────────────────────────────
export interface StationRecord {
  id: string;
  name: string;
  city: string;
  timezone: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
}

export interface DepartureRecord {
  id: string;
  stationId: string;
  lineId: string;
  scheduledTime: string;
  platform: number | string;
  scheduleType: string;
  dayOfWeek: number;
  destination: string;
  delayMinutes: number;
  status: string;
  createdAt: string;
}

export interface MessageRecord {
  id: string;
  stationId: string | null;
  message: string;
  priority: string;
  startDate: string;
  endDate: string;
  createdAt: string;
}

export interface StationDbData {
  stations: StationRecord[];
  departures: DepartureRecord[];
  messages: MessageRecord[];
}

// ── File Path ──────────────────────────────────────────────
const DB_FILE = path.join(process.cwd(), 'db', 'stations.json');

// ── Read / Write helpers ───────────────────────────────────
function readDb(): StationDbData {
  const raw = fs.readFileSync(DB_FILE, 'utf-8');
  return JSON.parse(raw) as StationDbData;
}

function writeDb(data: StationDbData): void {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// ── ID Generator ───────────────────────────────────────────
export function generateId(prefix: string): string {
  const uuid = crypto.randomUUID();
  return `${prefix}-${uuid.slice(0, 8)}`;
}

// ── Stations ───────────────────────────────────────────────
export function getStations(): StationRecord[] {
  return readDb().stations;
}

export function getStationById(id: string): StationRecord | undefined {
  return readDb().stations.find((s) => s.id === id);
}

export function createStation(data: Omit<StationRecord, 'id' | 'createdAt'>): StationRecord {
  const db = readDb();
  const station: StationRecord = {
    ...data,
    id: generateId('station'),
    createdAt: new Date().toISOString(),
  };
  db.stations.push(station);
  writeDb(db);
  return station;
}

export function updateStation(id: string, data: Partial<Omit<StationRecord, 'id' | 'createdAt'>>): StationRecord | null {
  const db = readDb();
  const idx = db.stations.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  db.stations[idx] = { ...db.stations[idx], ...data };
  writeDb(db);
  return db.stations[idx];
}

export function deleteStation(id: string): boolean {
  const db = readDb();
  const idx = db.stations.findIndex((s) => s.id === id);
  if (idx === -1) return false;
  db.stations.splice(idx, 1);
  // Also remove associated departures
  db.departures = db.departures.filter((d) => d.stationId !== id);
  // Also remove associated messages
  db.messages = db.messages.filter((m) => m.stationId !== id);
  writeDb(db);
  return true;
}

// ── Departures ─────────────────────────────────────────────
export function getDepartures(filters?: { stationId?: string; dayOfWeek?: number }): DepartureRecord[] {
  const db = readDb();
  let departures = db.departures;
  if (filters?.stationId) {
    departures = departures.filter((d) => d.stationId === filters.stationId);
  }
  if (filters?.dayOfWeek !== undefined && filters?.dayOfWeek !== null) {
    departures = departures.filter((d) => d.dayOfWeek === filters.dayOfWeek);
  }
  return departures;
}

export function getDepartureById(id: string): DepartureRecord | undefined {
  return readDb().departures.find((d) => d.id === id);
}

export function createDeparture(data: Omit<DepartureRecord, 'id' | 'createdAt'>): DepartureRecord {
  const db = readDb();
  const departure: DepartureRecord = {
    ...data,
    id: generateId('dep'),
    createdAt: new Date().toISOString(),
  };
  db.departures.push(departure);
  writeDb(db);
  return departure;
}

export function updateDeparture(id: string, data: Partial<Omit<DepartureRecord, 'id' | 'createdAt'>>): DepartureRecord | null {
  const db = readDb();
  const idx = db.departures.findIndex((d) => d.id === id);
  if (idx === -1) return null;
  db.departures[idx] = { ...db.departures[idx], ...data };
  writeDb(db);
  return db.departures[idx];
}

export function deleteDeparture(id: string): boolean {
  const db = readDb();
  const idx = db.departures.findIndex((d) => d.id === id);
  if (idx === -1) return false;
  db.departures.splice(idx, 1);
  writeDb(db);
  return true;
}

export function updateDepartureDelay(id: string, delayMinutes: number, status: string): DepartureRecord | null {
  return updateDeparture(id, { delayMinutes, status });
}

export function createDeparturesBatch(items: Omit<DepartureRecord, 'id' | 'createdAt'>[]): DepartureRecord[] {
  const db = readDb();
  const newDepartures = items.map((data) => ({
    ...data,
    id: generateId('dep'),
    createdAt: new Date().toISOString(),
  }));
  db.departures.push(...newDepartures);
  writeDb(db);
  return newDepartures;
}

// ── Messages ───────────────────────────────────────────────
export function getMessages(): MessageRecord[] {
  return readDb().messages;
}

export function getMessageById(id: string): MessageRecord | undefined {
  return readDb().messages.find((m) => m.id === id);
}

export function createMessage(data: Omit<MessageRecord, 'id' | 'createdAt'>): MessageRecord {
  const db = readDb();
  const message: MessageRecord = {
    ...data,
    id: generateId('msg'),
    createdAt: new Date().toISOString(),
  };
  db.messages.push(message);
  writeDb(db);
  return message;
}

export function updateMessage(id: string, data: Partial<Omit<MessageRecord, 'id' | 'createdAt'>>): MessageRecord | null {
  const db = readDb();
  const idx = db.messages.findIndex((m) => m.id === id);
  if (idx === -1) return null;
  db.messages[idx] = { ...db.messages[idx], ...data };
  writeDb(db);
  return db.messages[idx];
}

export function deleteMessage(id: string): boolean {
  const db = readDb();
  const idx = db.messages.findIndex((m) => m.id === id);
  if (idx === -1) return false;
  db.messages.splice(idx, 1);
  writeDb(db);
  return true;
}

// ── Count helpers ──────────────────────────────────────────
export function countDeparturesForStation(stationId: string): number {
  return readDb().departures.filter((d) => d.stationId === stationId).length;
}

export function countMessagesForStation(stationId: string): number {
  return readDb().messages.filter((m) => m.stationId === stationId).length;
}
