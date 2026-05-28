'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  MapPin,
  Bus,
  Users,
  AlertTriangle,
  Calendar,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

// ============================================================
// Types
// ============================================================

type DepartureStatus = 'SCHEDULED' | 'BOARDING' | 'DELAYED' | 'DEPARTED' | 'CANCELLED';

interface Station {
  id: string;
  name: string;
  code?: string;
  city?: string;
}

interface Departure {
  id: string;
  lineNumber: string;
  lineName?: string;
  direction: string;
  destination: string;
  scheduledTime: string;
  actualTime?: string;
  platform: string;
  status: DepartureStatus;
  availableSeats?: number;
  price?: number;
}

interface StationDepartureBoardProps {
  stationId?: string;
}

// ============================================================
// Constants
// ============================================================

const POLL_INTERVAL = 30_000;

const FRENCH_DAYS = [
  'Dimanche', 'Lundi', 'Mardi', 'Mercredi',
  'Jeudi', 'Vendredi', 'Samedi',
] as const;

const FRENCH_MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
] as const;

const STATUS_CONFIG: Record<
  DepartureStatus,
  {
    label: string;
    dotColor: string;
    containerClass: string;
    dotPulse?: boolean;
    strikethrough?: boolean;
    rowMuted?: boolean;
    sortPriority: number;
  }
> = {
  SCHEDULED: {
    label: 'À l\'heure',
    dotColor: 'bg-green-500',
    containerClass: 'bg-green-50 text-green-700 dark:bg-green-950/60 dark:text-green-400',
    sortPriority: 0,
  },
  BOARDING: {
    label: 'Embarquement',
    dotColor: 'bg-amber-500',
    containerClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400',
    dotPulse: true,
    sortPriority: -1,
  },
  DELAYED: {
    label: 'Retardé',
    dotColor: 'bg-red-500',
    containerClass: 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-400',
    sortPriority: 1,
  },
  DEPARTED: {
    label: 'Parti',
    dotColor: 'bg-gray-400',
    containerClass: 'bg-gray-100 text-gray-400 dark:bg-gray-800/60 dark:text-gray-500',
    strikethrough: true,
    rowMuted: true,
    sortPriority: 10,
  },
  CANCELLED: {
    label: 'Annulé',
    dotColor: 'bg-red-500',
    containerClass: 'bg-red-50 text-red-500 dark:bg-red-950/60 dark:text-red-400',
    strikethrough: true,
    sortPriority: 20,
  },
};

// ============================================================
// Utility Helpers
// ============================================================

function formatFrenchDate(date: Date): string {
  const day = FRENCH_DAYS[date.getDay()];
  const dayNum = date.getDate();
  const month = FRENCH_MONTHS[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${dayNum} ${month} ${year}`;
}

function formatTimeHHMMSS(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function formatTimeHHMM(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function computeDelayMinutes(scheduled: string, actual?: string): number | null {
  if (!actual || actual === scheduled) return null;
  const [sh, sm] = scheduled.split(':').map(Number);
  const [ah, am] = actual.split(':').map(Number);
  return (ah * 60 + am) - (sh * 60 + sm);
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
}

function todayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function sortDepartures(departures: Departure[]): Departure[] {
  return [...departures].sort((a, b) => {
    const priorityA = STATUS_CONFIG[a.status]?.sortPriority ?? 0;
    const priorityB = STATUS_CONFIG[b.status]?.sortPriority ?? 0;
    if (priorityA !== priorityB) return priorityA - priorityB;
    // Secondary sort by scheduled time
    return a.scheduledTime.localeCompare(b.scheduledTime);
  });
}

// ============================================================
// Custom Hooks
// ============================================================

function useRealTimeClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return now;
}

function useDeparturePolling(stationId: string | null, date: string) {
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const mountedRef = useRef(true);

  const fetchDepartures = useCallback(async () => {
    if (!stationId) return;
    try {
      const res = await fetch(
        `/api/departures/station/${encodeURIComponent(stationId)}?date=${date}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (mountedRef.current) {
        setDepartures(Array.isArray(json) ? json : []);
        setError(null);
        setLastUpdated(new Date());
        setLoading(false);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Erreur réseau');
        setLoading(false);
      }
    }
  }, [stationId, date]);

  // Initial fetch + polling
  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    fetchDepartures();
    const id = setInterval(fetchDepartures, POLL_INTERVAL);
    return () => {
      mountedRef.current = false;
      clearInterval(id);
    };
  }, [fetchDepartures]);

  return { departures, loading, error, lastUpdated };
}

function useStations() {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/public/stops');
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled && json.success && Array.isArray(json.data)) {
          setStations(
            json.data.map((s: any) => ({
              id: s.id,
              name: s.name,
              code: s.code,
              city: s.zone?.name || '',
            }))
          );
        }
      } catch {
        // stations unavailable — silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { stations, loading };
}

// ============================================================
// Sub-Components
// ============================================================

/** Real-time clock display with pulsing colon separators */
function ClockDisplay({ now }: { now: Date }) {
  const timeStr = formatTimeHHMMSS(now);
  const [h, m, s] = timeStr.split(':');

  return (
    <div className="flex items-center gap-0.5 font-mono tabular-nums">
      <Clock className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground mr-1.5" />
      <span className="text-xl md:text-2xl lg:text-4xl font-bold">{h}</span>
      <span className="text-xl md:text-2xl lg:text-4xl font-bold animate-pulse-colon">:</span>
      <span className="text-xl md:text-2xl lg:text-4xl font-bold">{m}</span>
      <span className="text-xl md:text-2xl lg:text-4xl font-bold animate-pulse-colon">:</span>
      <span className="text-xl md:text-2xl lg:text-4xl font-bold text-muted-foreground">{s}</span>
    </div>
  );
}

/** Station name selector dropdown */
function StationSelector({
  stations,
  loading,
  value,
  onValueChange,
}: {
  stations: Station[];
  loading: boolean;
  value: string;
  onValueChange: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2">
        <Skeleton className="h-5 w-40" />
      </div>
    );
  }

  const selectedStation = stations.find((s) => s.id === value);

  return (
    <div className="flex items-center gap-2">
      <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-auto min-w-[200px] md:min-w-[280px] border-none shadow-none bg-transparent p-0 h-auto text-base md:text-lg font-semibold hover:bg-accent/50 rounded-md px-3 py-1.5">
          <SelectValue placeholder="Sélectionner une gare">
            {selectedStation
              ? `${selectedStation.name}${selectedStation.city ? ` — ${selectedStation.city}` : ''}`
              : 'Sélectionner une gare'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {stations.map((station) => (
            <SelectItem key={station.id} value={station.id}>
              <span className="flex items-center gap-2">
                <Bus className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span>
                  {station.name}
                  {station.city ? (
                    <span className="text-muted-foreground ml-1 text-xs">
                      — {station.city}
                    </span>
                  ) : null}
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Status badge with dot and label */
function StatusBadge({
  status,
  delayMinutes,
}: {
  status: DepartureStatus;
  delayMinutes: number | null;
}) {
  const config = STATUS_CONFIG[status];
  if (!config) return null;

  const delayLabel =
    delayMinutes !== null && delayMinutes > 0
      ? `${config.label} +${delayMinutes} min`
      : config.label;

  return (
    <motion.div
      key={`${status}-${delayMinutes}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 md:px-3 md:py-1.5 rounded-full text-xs md:text-sm font-semibold whitespace-nowrap"
    >
      <span
        className={`w-2 h-2 md:w-2.5 md:h-2.5 rounded-full shrink-0 ${config.dotColor}`}
        style={config.dotPulse ? { animation: 'boardingPulse 1.5s ease-in-out infinite' } : undefined}
      />
      {delayLabel}
    </motion.div>
  );
}

/** Last-update indicator */
function LastUpdateIndicator({ date }: { date: Date | null }) {
  if (!date) return null;

  const time = formatTimeHHMM(date);

  return (
    <div className="flex items-center gap-1.5 text-xs md:text-sm text-muted-foreground">
      <RefreshCw className="w-3 h-3 animate-spin-slow" />
      <span>Dernière mise à jour : {time}</span>
    </div>
  );
}

/** Empty state when no departures exist */
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-16 lg:py-24 text-muted-foreground"
    >
      <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-muted/60 flex items-center justify-center mb-4">
        <Calendar className="w-8 h-8 md:w-10 md:h-10 text-muted-foreground/60" />
      </div>
      <p className="text-lg md:text-xl lg:text-2xl font-semibold text-foreground/70">
        Aucun départ prévu aujourd&apos;hui
      </p>
      <p className="text-sm md:text-base mt-2 text-muted-foreground">
        Les informations seront mises à jour automatiquement.
      </p>
    </motion.div>
  );
}

/** Loading skeleton for the table rows */
function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <Skeleton className="h-6 w-14" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-6 w-12 rounded" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-6 w-36" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-16" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-6 w-20 rounded-full" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-10" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-20" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

// ============================================================
// Main Component
// ============================================================

export function StationDepartureBoard({ stationId: propStationId }: StationDepartureBoardProps) {
  const now = useRealTimeClock();

  // Station state
  const [activeStationId, setActiveStationId] = useState<string>(propStationId ?? '');
  const { stations, loading: stationsLoading } = useStations();
  const showStationSelector = !propStationId;

  // Derive the effective station ID
  const effectiveStationId = propStationId ?? activeStationId;

  // Departure data
  const today = useMemo(() => todayDateString(), []);
  const { departures, loading, error, lastUpdated } = useDeparturePolling(
    effectiveStationId || null,
    today
  );

  // Sorted departures
  const sortedDepartures = useMemo(() => sortDepartures(departures), [departures]);

  // Station name for header
  const stationName = useMemo(() => {
    if (propStationId && stations.length > 0) {
      return stations.find((s) => s.id === propStationId)?.name ?? '';
    }
    if (!showStationSelector) return '';
    return stations.find((s) => s.id === activeStationId)?.name ?? '';
  }, [propStationId, activeStationId, stations, showStationSelector]);

  return (
    <>
      {/* Custom keyframe animations */}
      <style>{`
        @keyframes boardingPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.6); }
        }
        .animate-pulse-colon {
          animation: pulseColon 1s ease-in-out infinite;
        }
        @keyframes pulseColon {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
        @keyframes fadeInRow {
          0% { opacity: 0; transform: translateY(-4px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-row {
          animation: fadeInRow 0.35s ease-out forwards;
        }
      `}</style>

      <Card className="w-full border-0 shadow-lg bg-card text-card-foreground overflow-hidden">
        {/* ── Header ── */}
        <CardHeader className="pb-2 md:pb-4 space-y-2">
          {/* Top row: title + clock */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Left: Title & Date */}
            <div className="space-y-0.5">
              <CardTitle className="text-2xl md:text-3xl lg:text-4xl font-extrabold uppercase tracking-wide flex items-center gap-3">
                <Bus className="w-7 h-7 md:w-9 md:h-9 text-primary" />
                <span>Prochains Départs</span>
              </CardTitle>
              <div className="flex items-center gap-2 text-sm md:text-base text-muted-foreground pl-0 sm:pl-10">
                <Calendar className="w-4 h-4" />
                <span>{formatFrenchDate(now)}</span>
              </div>
            </div>

            {/* Right: Clock */}
            <div className="flex items-center gap-3 sm:gap-4">
              <ClockDisplay now={now} />
            </div>
          </div>

          {/* Bottom row: station selector + update indicator */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1">
            {showStationSelector ? (
              <StationSelector
                stations={stations}
                loading={stationsLoading}
                value={activeStationId}
                onValueChange={setActiveStationId}
              />
            ) : stationName ? (
              <div className="flex items-center gap-2 text-base md:text-lg font-semibold">
                <MapPin className="w-4 h-4 text-primary" />
                <span>{stationName}</span>
              </div>
            ) : (
              <Skeleton className="h-6 w-48" />
            )}

            <LastUpdateIndicator date={lastUpdated} />
          </div>
        </CardHeader>

        {/* ── Table ── */}
        <CardContent className="p-0 md:p-4 md:pt-0">
          {!effectiveStationId && showStationSelector ? (
            /* Prompt to select station */
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <MapPin className="w-12 h-12 mb-4 text-muted-foreground/40" />
              <p className="text-lg font-medium">
                Sélectionnez une gare pour voir les départs
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs md:text-sm font-bold uppercase tracking-wider w-[100px] md:w-[120px]">
                      Heure
                    </TableHead>
                    <TableHead className="text-xs md:text-sm font-bold uppercase tracking-wider w-[80px] md:w-[100px]">
                      Ligne
                    </TableHead>
                    <TableHead className="text-xs md:text-sm font-bold uppercase tracking-wider">
                      Destination
                    </TableHead>
                    <TableHead className="text-xs md:text-sm font-bold uppercase tracking-wider w-[80px] md:w-[90px] hidden md:table-cell">
                      Sens
                    </TableHead>
                    <TableHead className="text-xs md:text-sm font-bold uppercase tracking-wider w-[80px] md:w-[100px]">
                      Quai
                    </TableHead>
                    <TableHead className="text-xs md:text-sm font-bold uppercase tracking-wider w-[130px] md:w-[170px]">
                      Statut
                    </TableHead>
                    <TableHead className="text-xs md:text-sm font-bold uppercase tracking-wider w-[70px] md:w-[80px] hidden lg:table-cell">
                      Places
                    </TableHead>
                    <TableHead className="text-xs md:text-sm font-bold uppercase tracking-wider w-[80px] md:w-[100px] hidden lg:table-cell">
                      Prix
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {loading && sortedDepartures.length === 0 ? (
                      <TableSkeleton rows={8} />
                    ) : error ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-16">
                          <div className="flex flex-col items-center text-destructive">
                            <AlertTriangle className="w-10 h-10 mb-3" />
                            <p className="text-lg font-semibold">
                              Erreur de chargement
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {error}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : sortedDepartures.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center p-0">
                          <EmptyState />
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedDepartures.map((dep, index) => {
                        const config = STATUS_CONFIG[dep.status];
                        const delay = computeDelayMinutes(dep.scheduledTime, dep.actualTime);
                        const displayTime = dep.actualTime && dep.actualTime !== dep.scheduledTime
                          ? dep.actualTime
                          : dep.scheduledTime;
                        const isCancelled = dep.status === 'CANCELLED';
                        const isDeparted = dep.status === 'DEPARTED';
                        const isMuted = config?.rowMuted ?? false;
                        const isStrikethrough = config?.strikethrough ?? false;

                        return (
                          <motion.tr
                            key={dep.id}
                            layout
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3, delay: index * 0.03 }}
                            className={`
                              border-b transition-colors animate-fade-in-row
                              ${isMuted ? 'opacity-50' : 'hover:bg-muted/40'}
                              ${isCancelled ? 'bg-red-50/40 dark:bg-red-950/20' : ''}
                              ${isDeparted ? 'bg-muted/30' : ''}
                            `}
                            style={{
                              animationDelay: `${index * 0.03}s`,
                              animationFillMode: 'both',
                            }}
                          >
                            {/* Time */}
                            <TableCell className="py-3 md:py-4">
                              <span
                                className={`text-base md:text-lg font-bold font-mono tabular-nums ${
                                  isMuted ? 'text-muted-foreground' : 'text-foreground'
                                } ${isStrikethrough ? 'line-through' : ''}`}
                              >
                                {displayTime}
                              </span>
                            </TableCell>

                            {/* Line */}
                            <TableCell className="py-3 md:py-4">
                              <Badge
                                variant="outline"
                                className="text-xs md:text-sm font-bold px-2 py-0.5 border-primary/30 bg-primary/5"
                              >
                                {dep.lineNumber}
                              </Badge>
                            </TableCell>

                            {/* Destination */}
                            <TableCell className="py-3 md:py-4">
                              <span
                                className={`text-sm md:text-base lg:text-lg font-semibold ${
                                  isMuted ? 'text-muted-foreground' : 'text-foreground'
                                } ${isStrikethrough ? 'line-through' : ''}`}
                              >
                                {dep.destination}
                              </span>
                              {dep.lineName && dep.lineName !== dep.destination && (
                                <span className="block text-xs text-muted-foreground mt-0.5 hidden lg:block">
                                  {dep.lineName}
                                </span>
                              )}
                            </TableCell>

                            {/* Direction (hidden on mobile) */}
                            <TableCell className="py-3 md:py-4 hidden md:table-cell">
                              <span
                                className={`text-xs md:text-sm font-medium ${
                                  isMuted ? 'text-muted-foreground' : 'text-foreground/70'
                                }`}
                              >
                                {dep.direction}
                              </span>
                            </TableCell>

                            {/* Platform */}
                            <TableCell className="py-3 md:py-4">
                              <span
                                className={`text-sm md:text-base font-bold ${
                                  isMuted ? 'text-muted-foreground' : 'text-foreground'
                                }`}
                              >
                                {dep.platform}
                              </span>
                            </TableCell>

                            {/* Status */}
                            <TableCell className="py-3 md:py-4">
                              <div className={config?.containerClass ?? ''}>
                                <StatusBadge status={dep.status} delayMinutes={delay} />
                              </div>
                            </TableCell>

                            {/* Available Seats (hidden on smaller screens) */}
                            <TableCell className="py-3 md:py-4 hidden lg:table-cell">
                              {dep.availableSeats !== undefined && dep.availableSeats !== null ? (
                                <div className="flex items-center gap-1">
                                  <Users className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span
                                    className={`text-sm font-medium ${
                                      dep.availableSeats === 0
                                        ? 'text-red-500'
                                        : dep.availableSeats <= 5
                                          ? 'text-amber-600 dark:text-amber-400'
                                          : 'text-foreground'
                                    }`}
                                  >
                                    {dep.availableSeats}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">—</span>
                              )}
                            </TableCell>

                            {/* Price (hidden on smaller screens) */}
                            <TableCell className="py-3 md:py-4 hidden lg:table-cell">
                              {dep.price !== undefined && dep.price !== null ? (
                                <span className={`text-sm font-medium ${isMuted ? 'text-muted-foreground' : 'text-foreground'}`}>
                                  {formatCurrency(dep.price)}
                                </span>
                              ) : (
                                <span className="text-sm text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </motion.tr>
                        );
                      })
                    )}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>

        {/* ── Footer: auto-refresh info ── */}
        {effectiveStationId && !loading && (
          <div className="flex items-center justify-center px-4 py-2 border-t bg-muted/20">
            <p className="text-xs text-muted-foreground">
              Actualisation automatique toutes les 30 secondes
            </p>
          </div>
        )}
      </Card>
    </>
  );
}

export default StationDepartureBoard;
