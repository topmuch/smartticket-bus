'use client';

import { useEffect, useState, useMemo } from 'react';
import { Clock, Bus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api';
import { getDayName } from '@/lib/api';

interface LineBasic {
  id: string;
  name: string;
  number: string;
}

interface Schedule {
  id: string;
  lineId: string;
  lineName?: string;
  lineNumber?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  frequencyMin: number;
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

export function SchedulesSection() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [lines, setLines] = useState<LineBasic[]>([]);
  const [loading, setLoading] = useState(true);
  const [lineFilter, setLineFilter] = useState<string>('all');
  const [dayFilter, setDayFilter] = useState<string>('today');

  const todayDay = useMemo(() => {
    return new Date().getDay(); // 0=Sun, 1=Mon...6=Sat
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const [schedulesRes, linesRes] = await Promise.all([
        apiFetch<Schedule[]>('/api/v1/schedules'),
        apiFetch<LineBasic[]>('/api/v1/lines'),
      ]);
      if (schedulesRes.success && schedulesRes.data) {
        setSchedules(schedulesRes.data);
      }
      if (linesRes.success && linesRes.data) {
        setLines(linesRes.data.filter((l) => l.isActive !== false));
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const filteredSchedules = useMemo(() => {
    const effectiveDay =
      dayFilter === 'today' ? todayDay.toString() : dayFilter;

    return schedules.filter((s) => {
      const matchLine = lineFilter === 'all' || s.lineId === lineFilter;
      const matchDay = s.dayOfWeek.toString() === effectiveDay;
      return matchLine && matchDay;
    });
  }, [schedules, lineFilter, dayFilter, todayDay]);

  // Group schedules by line for better display
  const groupedByLine = useMemo(() => {
    const groups: Record<string, Schedule[]> = {};
    for (const s of filteredSchedules) {
      if (!groups[s.lineId]) {
        groups[s.lineId] = [];
      }
      groups[s.lineId].push(s);
    }
    return groups;
  }, [filteredSchedules]);

  const currentDayLabel = getDayName(todayDay);
  const effectiveDayLabel =
    dayFilter === 'today'
      ? `Aujourd'hui (${currentDayLabel})`
      : getDayName(parseInt(dayFilter, 10));

  return (
    <section id="horaires" className="bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-foreground">Horaires</h2>
            <p className="text-muted-foreground">
              Consultez les horaires de passage des bus
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <Select value={lineFilter} onValueChange={setLineFilter}>
            <SelectTrigger className="w-full sm:w-[240px]">
              <SelectValue placeholder="Toutes les lignes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les lignes</SelectItem>
              {lines.map((line) => (
                <SelectItem key={line.id} value={line.id}>
                  <div className="flex items-center gap-2">
                    <Bus className="h-3.5 w-3.5 text-muted-foreground" />
                    {line.number} — {line.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={dayFilter} onValueChange={setDayFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Jour" />
            </SelectTrigger>
            <SelectContent>
              {DAY_OPTIONS.map((day) => (
                <SelectItem key={day.value} value={day.value}>
                  {day.label}
                  {day.value === 'today' && (
                    <span className="ml-1 text-xs text-primary">●</span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-border/50 p-5">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-1/2 rounded" />
                    <Skeleton className="h-4 w-full rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : Object.keys(groupedByLine).length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-16 text-center">
            <Clock className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-lg font-medium text-muted-foreground">
              Aucun horaire trouvé
            </p>
            <p className="mt-1 text-sm text-muted-foreground/70">
              Aucun horaire disponible pour les filtres sélectionnés
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Day indicator */}
            <Badge variant="secondary" className="gap-1.5 px-3 py-1">
              <Clock className="h-3.5 w-3.5" />
              {effectiveDayLabel}
            </Badge>

            {Object.entries(groupedByLine).map(([lineId, lineSchedules]) => {
              const line = lines.find((l) => l.id === lineId);
              const lineName = line?.name || lineSchedules[0]?.lineName || 'Ligne';
              const lineNumber = line?.number || lineSchedules[0]?.lineNumber || '';

              return (
                <Card
                  key={lineId}
                  className="border-border/50 transition-shadow hover:shadow-lg"
                >
                  <CardContent className="p-5">
                    {/* Line Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Bus className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {lineNumber && (
                            <span className="mr-1.5">Ligne {lineNumber}</span>
                          )}
                          {lineName}
                        </h3>
                      </div>
                    </div>

                    {/* Schedule Grid */}
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {lineSchedules.map((schedule) => (
                        <div
                          key={schedule.id}
                          className="flex items-center gap-3 rounded-lg bg-muted/50 p-3"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                            <Clock className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">
                              {schedule.startTime} — {schedule.endTime}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Tous les {schedule.frequencyMin} min
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
