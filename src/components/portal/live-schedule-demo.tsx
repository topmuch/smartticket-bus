'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bus,
  CheckCircle2,
  Clock,
  MapPin,
  Route,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  mockScheduleData,
  availableLines,
  type MockDeparture,
} from '@/data/mock-schedule';

const getMinutesUntil = (departureTime: string): number => {
  const [h, m] = departureTime.split(':').map(Number);
  const depMinutes = h * 60 + m;
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return depMinutes - nowMinutes;
};

const STATUS_ORDER: Record<MockDeparture['status'], number> = {
  boarding: 0,
  upcoming: 1,
  completed: 2,
};

export function LiveScheduleDemo() {
  const [selectedLine, setSelectedLine] = useState<string>('ALL');
  const [departures, setDepartures] = useState<MockDeparture[]>(mockScheduleData);
  const [currentTime, setCurrentTime] = useState('');

  // Live clock + auto-refresh every 30s
  useEffect(() => {
    const update = () => {
      setCurrentTime(new Date().toLocaleTimeString('fr-FR'));
      setDepartures((prev) =>
        prev.map((d) => {
          if (d.status === 'completed') return d;
          const [h, m] = d.departure.split(':').map(Number);
          const offset = Math.floor(Math.random() * 3) - 1; // -1, 0, or +1
          const newMin = Math.max(0, Math.min(59, m + offset));
          const newDep = `${String(h).padStart(2, '0')}:${String(newMin).padStart(2, '0')}`;
          const [ah, am] = d.arrival.split(':').map(Number);
          const newArr = `${String(ah).padStart(2, '0')}:${String(Math.min(59, am + offset)).padStart(2, '0')}`;
          return { ...d, departure: newDep, arrival: newArr };
        }),
      );
    };
    update();
    const interval = setInterval(update, 30_000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = useCallback(() => {
    setDepartures((prev) =>
      prev.map((d) => {
        if (d.status === 'completed') return d;
        const [h, m] = d.departure.split(':').map(Number);
        const offset = Math.floor(Math.random() * 3) - 1;
        const newMin = Math.max(0, Math.min(59, m + offset));
        const newDep = `${String(h).padStart(2, '0')}:${String(newMin).padStart(2, '0')}`;
        const [ah, am] = d.arrival.split(':').map(Number);
        const newArr = `${String(ah).padStart(2, '0')}:${String(Math.min(59, am + offset)).padStart(2, '0')}`;
        return { ...d, departure: newDep, arrival: newArr };
      }),
    );
  }, []);

  const filteredDepartures = useMemo(() => {
    const filtered =
      selectedLine === 'ALL'
        ? departures
        : departures.filter((d) => d.line === selectedLine);
    return [...filtered].sort(
      (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status],
    );
  }, [departures, selectedLine]);

  const getStatusBadge = (dep: MockDeparture) => {
    if (dep.status === 'completed') {
      return (
        <Badge variant="secondary" className="gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Terminé
        </Badge>
      );
    }

    if (dep.status === 'boarding') {
      return (
        <Badge
          className="gap-1 animate-pulse"
          style={{ backgroundColor: '#10b981', color: '#fff', borderColor: '#10b981' }}
        >
          Embarquement
        </Badge>
      );
    }

    // upcoming — suppressHydrationWarning on wrapper avoids server/client time mismatch
    const minutesUntil = getMinutesUntil(dep.departure);
    if (minutesUntil <= 0) {
      return (
        <Badge
          variant="secondary"
          className="gap-1"
          style={{ backgroundColor: '#2563eb', color: '#fff', borderColor: '#2563eb' }}
        >
          <Clock className="h-3 w-3" />
          En approche
        </Badge>
      );
    }
    return (
      <Badge
        variant="secondary"
        className="gap-1"
        style={{ backgroundColor: '#2563eb', color: '#fff', borderColor: '#2563eb' }}
      >
        <Clock className="h-3 w-3" />
        <span suppressHydrationWarning>Dans {minutesUntil} min</span>
      </Badge>
    );
  };

  return (
    <section id="horaires-demo" className="py-20 bg-muted/30 relative overflow-hidden" suppressHydrationWarning>
      <span id="horaires" className="sr-only" />
      {/* Background decoration: subtle gradient orbs */}
      <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-emerald-500/5 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-blue-500/5 blur-3xl" />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 relative">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-1.5 mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
              Simulation Active
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            Prochains Départs en Direct
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Suivez les horaires, les trajets et les temps de parcours en temps
            réel.
          </p>
        </div>

        {/* Line Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {availableLines.map((line) => (
            <Button
              key={line.code}
              variant={selectedLine === line.code ? 'default' : 'outline'}
              onClick={() => setSelectedLine(line.code)}
              size="sm"
              className={selectedLine === line.code ? 'shadow-md' : ''}
            >
              {line.code !== 'ALL' && (
                <span
                  className="h-2 w-2 rounded-full mr-2"
                  style={{ backgroundColor: line.color }}
                />
              )}
              {line.label}
            </Button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="ml-2"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Actualiser
          </Button>
        </div>

        {/* Live Clock */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background px-4 py-2 shadow-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono text-sm font-bold tabular-nums text-foreground" suppressHydrationWarning>
              {currentTime || '--:--:--'}
            </span>
          </div>
        </div>

        {/* Departures List */}
        <Card className="overflow-hidden border-border/50 shadow-lg">
          {/* Table Header */}
          <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-3 bg-muted/50 border-b text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <div className="col-span-1">Ligne</div>
            <div className="col-span-4">Direction</div>
            <div className="col-span-2">Départ</div>
            <div className="col-span-2">Arrivée</div>
            <div className="col-span-3">Statut</div>
          </div>

          {/* Rows */}
          <AnimatePresence mode="popLayout">
            {filteredDepartures.map((dep, idx) => (
              <motion.div
                key={`${dep.line}-${dep.departure}-${dep.direction}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{
                  opacity: dep.status === 'completed' ? 0.5 : 1,
                  y: 0,
                }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                className={`grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 px-6 py-4 border-b last:border-b-0 hover:bg-muted/30 transition-colors ${
                  dep.status === 'completed' ? 'opacity-50' : ''
                }`}
                role="row"
                aria-label={`${dep.line} vers ${dep.direction}, départ ${dep.departure}`}
              >
                {/* Line Badge */}
                <div className="sm:col-span-1 flex items-center">
                  <span
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white shrink-0"
                    style={{ backgroundColor: dep.lineColor }}
                  >
                    {dep.line}
                  </span>
                </div>

                {/* Direction */}
                <div className="sm:col-span-4 flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium text-foreground truncate">
                    {dep.direction}
                  </span>
                </div>

                {/* Departure */}
                <div className="sm:col-span-2 flex items-center">
                  <span className="font-mono text-sm font-bold tabular-nums text-foreground">
                    {dep.departure}
                  </span>
                </div>

                {/* Arrival */}
                <div className="sm:col-span-2 flex items-center gap-1.5">
                  <span className="font-mono text-sm tabular-nums text-muted-foreground">
                    {dep.arrival}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    +{dep.durationMin}min
                  </span>
                </div>

                {/* Status Badge */}
                <div className="sm:col-span-3 flex items-center">
                  {getStatusBadge(dep)}
                </div>

                {/* Mobile-only: stops count */}
                <div className="sm:hidden flex items-center gap-1.5 text-xs text-muted-foreground pl-10">
                  <Route className="h-3 w-3" /> {dep.stopsCount} arrêts
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredDepartures.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              <Bus className="mx-auto h-8 w-8 mb-2 opacity-40" />
              <p>Aucun passage pour cette ligne</p>
            </div>
          )}

          {/* Footer summary */}
          <div className="px-6 py-3 bg-muted/30 border-t flex items-center justify-between text-xs text-muted-foreground">
            <span>{filteredDepartures.length} passage(s) affiché(s)</span>
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3" /> Mis à jour automatiquement
            </span>
          </div>
        </Card>
      </div>
    </section>
  );
}
