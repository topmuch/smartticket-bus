'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Clock, Bus, Search, AlertCircle, MapPin, ChevronRight, Timer, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { apiFetch } from '@/lib/api';
import { getDayName } from '@/lib/api';

// ============================================
// Types
// ============================================

interface LineBasic {
  id: string;
  name: string;
  number: string;
  color?: string;
}

interface StopInfo {
  stopId: string;
  stopName: string;
  stopCode: string;
  zoneName: string;
  zoneColor: string;
}

interface Passage {
  departureTime: string;
  startTime: string;
  endTime: string;
  frequency: number;
  stops: StopInfo[];
}

interface LineInfo {
  id: string;
  number: string;
  name: string;
  color: string;
}

interface PassagesData {
  line: LineInfo | null;
  dayOfWeek: number;
  dayName: string;
  currentTime: string;
  isServiceEnded: boolean;
  passages: Passage[];
  stops: StopInfo[];
}

const DAY_OPTIONS = [
  { value: 'today', label: "Aujourd'hui" },
  { value: '1', label: 'Lundi' },
  { value: '2', label: 'Mardi' },
  { value: '3', label: 'Mercredi' },
  { value: '4', label: 'Jeudi' },
  { value: '5', label: 'Vendredi' },
  { value: '6', label: 'Samedi' },
  { value: '0', label: 'Dimanche' },
];

// ============================================
// Component: Real-Time Clock
// ============================================

function LiveClock() {
  const [time, setTime] = useState(new Date().toLocaleTimeString('fr-FR'));

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('fr-FR'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="inline-flex items-center gap-2 rounded-full border bg-background px-4 py-1.5 shadow-sm">
      <Clock className="h-4 w-4 text-primary" />
      <span className="font-mono text-sm font-bold tracking-wide tabular-nums text-foreground">
        {time}
      </span>
    </div>
  );
}

// ============================================
// Component: Stop Tag
// ============================================

function StopTag({ stop }: { stop: StopInfo }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border/50 bg-muted/40 px-3 py-2 text-xs">
      <div
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: stop.zoneColor }}
      />
      <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
      <span className="font-medium text-foreground">{stop.stopName}</span>
      <span className="text-muted-foreground">({stop.stopCode})</span>
    </div>
  );
}

// ============================================
// Component: Passage Row
// ============================================

function PassageRow({ passage, isFirst, stopsExpanded, onToggleStops }: {
  passage: Passage;
  isFirst: boolean;
  stopsExpanded: boolean;
  onToggleStops: () => void;
}) {
  const now = new Date();
  const [h, m] = passage.departureTime.split(':').map(Number);
  const depMinutes = h * 60 + m;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const minutesUntil = depMinutes - nowMinutes;

  // Time status
  let timeBadge: { label: string; variant: 'default' | 'secondary' | 'outline' } = { label: '', variant: 'outline' };
  if (minutesUntil <= 0) {
    timeBadge = { label: 'En cours', variant: 'default' };
  } else if (minutesUntil <= 5) {
    timeBadge = { label: `${minutesUntil} min`, variant: 'default' };
  } else if (minutesUntil <= 15) {
    timeBadge = { label: `${minutesUntil} min`, variant: 'secondary' };
  } else {
    timeBadge = { label: `${minutesUntil} min`, variant: 'outline' };
  }

  return (
    <div className="group">
      <div
        className={`flex items-center justify-between gap-3 px-4 py-3.5 transition-colors cursor-pointer hover:bg-muted/50 ${
          isFirst ? 'bg-primary/5 rounded-t-lg' : ''
        }`}
        onClick={onToggleStops}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onToggleStops(); }}
      >
        {/* Departure time */}
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold font-mono tabular-nums text-foreground">
            {passage.departureTime}
          </span>
          <Badge variant={timeBadge.variant} className="text-xs">
            {timeBadge.label}
          </Badge>
        </div>

        {/* Frequency + expand */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
            <Timer className="h-3 w-3" />
            <span>tous les {passage.frequency} min</span>
          </div>
          <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${stopsExpanded ? 'rotate-90' : ''}`} />
        </div>
      </div>

      {/* Expandable stops list */}
      {stopsExpanded && passage.stops.length > 0 && (
        <div className="border-t border-border/30 bg-muted/20 px-4 py-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Arrêts desservis
          </p>
          <div className="flex flex-wrap gap-2">
            {passage.stops.map((stop, i) => (
              <div key={stop.stopId} className="flex items-center gap-1.5">
                <StopTag stop={stop} />
                {i < passage.stops.length - 1 && (
                  <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {isFirst && !stopsExpanded && (
        <Separator className="opacity-50" />
      )}
    </div>
  );
}

// ============================================
// Component: Empty State
// ============================================

function EmptyState({ message }: { message: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-10 text-center">
        <AlertCircle className="mb-3 h-10 w-10 text-muted-foreground/50" />
        <p className="text-base font-medium text-muted-foreground">{message}</p>
        <p className="mt-1 text-sm text-muted-foreground/70">
          Sélectionnez une autre ligne ou un autre jour.
        </p>
      </CardContent>
    </Card>
  );
}

// ============================================
// Main Component: SchedulesSection
// ============================================

export function SchedulesSection() {
  const [lines, setLines] = useState<LineBasic[]>([]);
  const [selectedLineId, setSelectedLineId] = useState<string>('');
  const [dayFilter, setDayFilter] = useState<string>('today');
  const [passagesData, setPassagesData] = useState<PassagesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedPassage, setExpandedPassage] = useState<number | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const todayDay = new Date().getDay();

  // Fetch available lines on mount
  useEffect(() => {
    const fetchLines = async () => {
      const res = await apiFetch<LineBasic[]>('/api/v1/lines');
      if (res.success && res.data) {
        setLines(res.data.filter((l: any) => l.isActive !== false));
      }
    };
    fetchLines();
  }, []);

  // Fetch passages when line or day changes
  const fetchPassages = useCallback(async (lineId: string, dayVal: string) => {
    if (!lineId) {
      setPassagesData(null);
      return;
    }

    setLoading(true);
    setError(null);
    setExpandedPassage(null);

    try {
      const effectiveDay = dayVal === 'today' ? '' : `&day_of_week=${dayVal}`;
      const res = await apiFetch<PassagesData>(
        `/api/v1/public/passages?line_id=${lineId}${effectiveDay}`
      );

      if (res.success && res.data) {
        setPassagesData(res.data as unknown as PassagesData);
      } else {
        setError(res.error || 'Erreur lors du chargement des horaires');
      }
    } catch {
      setError('Erreur réseau. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch when line/day changes
  useEffect(() => {
    fetchPassages(selectedLineId, dayFilter);
  }, [selectedLineId, dayFilter, fetchPassages]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!selectedLineId) return;

    refreshTimerRef.current = setInterval(() => {
      fetchPassages(selectedLineId, dayFilter);
    }, 60000);

    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [selectedLineId, dayFilter, fetchPassages]);

  const handleLineChange = (value: string) => {
    setSelectedLineId(value);
  };

  const handleDayChange = (value: string) => {
    setDayFilter(value);
  };

  const handleManualRefresh = () => {
    fetchPassages(selectedLineId, dayFilter);
  };

  const effectiveDayLabel =
    dayFilter === 'today'
      ? `Aujourd'hui (${getDayName(todayDay)})`
      : getDayName(parseInt(dayFilter, 10));

  const selectedLine = lines.find((l) => l.id === selectedLineId);

  return (
    <section id="horaires" className="bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-foreground">Horaires</h2>
              <p className="text-muted-foreground">
                Prochains passages en temps réel
              </p>
            </div>
          </div>
          <LiveClock />
        </div>

        {/* Filters Row */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Line Selector */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Select value={selectedLineId} onValueChange={handleLineChange}>
              <SelectTrigger className="w-full pl-9">
                <Bus className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Choisir une ligne de bus..." />
              </SelectTrigger>
              <SelectContent>
                {lines.map((line) => (
                  <SelectItem key={line.id} value={line.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: line.color || '#6b7280' }}
                      />
                      <span className="font-medium">
                        {line.number} — {line.name}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Day Selector */}
          <Select value={dayFilter} onValueChange={handleDayChange}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Jour" />
            </SelectTrigger>
            <SelectContent>
              {DAY_OPTIONS.map((day) => (
                <SelectItem key={day.value} value={day.value}>
                  {day.label}
                  {day.value === 'today' && (
                    <span className="ml-1.5 text-xs text-primary font-bold">●</span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Refresh Button */}
          {selectedLineId && (
            <Button
              variant="outline"
              size="icon"
              onClick={handleManualRefresh}
              disabled={loading}
              className="shrink-0"
              title="Rafraîchir"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>

        {/* Content Area */}
        {!selectedLineId ? (
          /* No line selected */
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Bus className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-lg font-medium text-muted-foreground">
                Sélectionnez une ligne
              </p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground/70">
                Choisissez une ligne de bus dans le menu ci-dessus pour voir les prochains passages.
              </p>
            </CardContent>
          </Card>
        ) : loading ? (
          /* Loading state */
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-6 w-48 rounded" />
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-7 w-16 rounded" />
                    <Skeleton className="h-5 w-14 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-20 rounded" />
                </div>
              ))}
            </CardContent>
          </Card>
        ) : error ? (
          /* Error state */
          <EmptyState message={error} />
        ) : passagesData && !passagesData.line ? (
          /* No schedule for this day */
          <EmptyState message={passagesData.dayName ? `Aucun service prévu pour cette ligne le ${passagesData.dayName}.` : 'Aucun horaire disponible.'} />
        ) : passagesData && passagesData.isServiceEnded && passagesData.passages.length === 0 ? (
          /* Service ended */
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <Clock className="h-7 w-7 text-amber-600 dark:text-amber-400" />
              </div>
              <p className="text-base font-medium text-foreground">
                Service terminé pour aujourd&apos;hui
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Le dernier bus est parti. Prochain service demain.
              </p>
            </CardContent>
          </Card>
        ) : passagesData && passagesData.passages.length > 0 ? (
          /* Passages list */
          <Card className="overflow-hidden">
            {/* Card header with line info */}
            <CardHeader className="border-b bg-gradient-to-r from-primary/10 to-primary/5 px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white font-bold text-sm"
                    style={{ backgroundColor: passagesData.line?.color || '#6b7280' }}
                  >
                    {passagesData.line?.number || ''}
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      {passagesData.line?.name}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Prochains départs — {effectiveDayLabel}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="hidden sm:inline-flex gap-1">
                  <MapPin className="h-3 w-3" />
                  {passagesData.stops.length} arrêt{passagesData.stops.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            </CardHeader>

            {/* Passages list */}
            <div className="divide-y divide-border/30 max-h-[480px] overflow-y-auto custom-scrollbar">
              {passagesData.passages.map((passage, index) => (
                <PassageRow
                  key={`${passage.departureTime}-${index}`}
                  passage={passage}
                  isFirst={index === 0}
                  stopsExpanded={expandedPassage === index}
                  onToggleStops={() =>
                    setExpandedPassage((prev) => (prev === index ? null : index))
                  }
                />
              ))}
            </div>

            {/* Footer with stops summary */}
            {passagesData.stops.length > 0 && (
              <div className="border-t bg-muted/30 px-4 py-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Itinéraire complet
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {passagesData.stops.map((stop, i) => (
                    <div key={stop.stopId} className="flex items-center gap-1.5">
                      <div className="flex items-center gap-1 rounded-md bg-background px-2 py-1 text-xs border border-border/50">
                        <div
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: stop.zoneColor }}
                        />
                        <span className="font-medium">{stop.stopCode}</span>
                      </div>
                      {i < passagesData.stops.length - 1 && (
                        <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        ) : (
          /* Fallback empty */
          <EmptyState message="Aucun passage trouvé pour cette ligne." />
        )}
      </div>
    </section>
  );
}
