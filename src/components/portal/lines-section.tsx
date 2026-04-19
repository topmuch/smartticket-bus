'use client';

import { useEffect, useState } from 'react';
import { Bus, MapPin, Clock, ChevronRight, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { apiFetch } from '@/lib/api';
import { getDayName } from '@/lib/api';

interface LineStop {
  order: number;
  stopName?: string;
  stopCode?: string;
  zoneName?: string;
  zoneCode?: string;
  stop?: {
    name: string;
    code: string;
    zone?: { name: string; code: string; color?: string } | null;
  } | null;
}

interface Schedule {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  frequencyMin: number;
}

interface Line {
  id: string;
  name: string;
  number: string;
  description: string;
  color: string;
  isActive: boolean;
  stopsCount?: number;
  scheduleCount?: number;
  _count?: {
    lineStops: number;
    schedules: number;
  };
}

interface LineDetail extends Line {
  lineStops: LineStop[];
  schedules: Schedule[];
}

export function LinesSection() {
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLine, setSelectedLine] = useState<LineDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    const fetchLines = async () => {
      const res = await apiFetch<Line[]>('/api/v1/lines');
      if (res.success && res.data) {
        setLines(res.data.filter((l) => l.isActive));
      }
      setLoading(false);
    };
    fetchLines();
  }, []);

  const handleSelectLine = async (line: Line) => {
    if (selectedLine?.id === line.id) {
      setSelectedLine(null);
      return;
    }
    setDetailLoading(true);
    setSelectedLine(null);
    const res = await apiFetch<LineDetail>(`/api/v1/lines/${line.id}`);
    if (res.success && res.data) {
      setSelectedLine(res.data);
    }
    setDetailLoading(false);
  };

  return (
    <section id="lignes" className="bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Bus className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-foreground">Nos Lignes</h2>
            <p className="text-muted-foreground">
              Explorez les lignes de bus disponibles à Dakar
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-xl border border-border/50 p-5">
                <Skeleton className="mb-3 h-10 w-16 rounded-lg" />
                <Skeleton className="mb-2 h-5 w-3/4 rounded" />
                <Skeleton className="h-4 w-full rounded" />
                <div className="mt-3 flex gap-2">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Line Cards - Horizontal scroll on mobile, grid on desktop */}
            <ScrollArea className="w-full lg:hidden">
              <div className="flex gap-4 pb-4">
                {lines.map((line) => (
                  <LineCard
                    key={line.id}
                    line={line}
                    isSelected={selectedLine?.id === line.id}
                    onClick={() => handleSelectLine(line)}
                  />
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>

            <div className="hidden gap-4 lg:grid lg:grid-cols-2 xl:grid-cols-3">
              {lines.map((line) => (
                <LineCard
                  key={line.id}
                  line={line}
                  isSelected={selectedLine?.id === line.id}
                  onClick={() => handleSelectLine(line)}
                />
              ))}
            </div>

            {/* Detail Panel */}
            {detailLoading && (
              <Card className="mt-8 border-border/50">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <Skeleton className="h-6 w-1/2 rounded" />
                    <Skeleton className="h-4 w-full rounded" />
                    <div className="space-y-2 pt-2">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-10 w-full rounded" />
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedLine && !detailLoading && (
              <Card className="mt-8 border-border/50">
                <CardContent className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-xl text-xl font-bold text-white"
                        style={{ backgroundColor: selectedLine.color || 'var(--primary)' }}
                      >
                        {selectedLine.number}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">
                          {selectedLine.name}
                        </h3>
                        {selectedLine.description && (
                          <p className="text-sm text-muted-foreground">
                            {selectedLine.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedLine(null)}
                      className="h-8 w-8 text-muted-foreground"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <Separator className="my-5" />

                  {/* Stops */}
                  <div className="mb-6">
                    <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                      <MapPin className="h-4 w-4 text-primary" />
                      Arrêts desservis
                    </h4>
                    <div className="max-h-64 overflow-y-auto space-y-1.5">
                      {(selectedLine.lineStops || [])
                        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                        .map((ls, idx) => {
                          const stopName = ls.stopName || ls.stop?.name || 'Arrêt';
                          const stopCode = ls.stopCode || ls.stop?.code || '';
                          const zoneName = ls.zoneName || ls.stop?.zone?.name || '';
                          const zoneColor = ls.stop?.zone?.color;

                          return (
                            <div
                              key={idx}
                              className="flex items-center gap-3 rounded-lg bg-muted/50 p-3 text-sm"
                            >
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                {ls.order ?? idx + 1}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-foreground">
                                  {stopName}
                                </p>
                                {zoneName && (
                                  <div className="mt-0.5 flex items-center gap-1.5">
                                    <span
                                      className="h-2 w-2 rounded-full"
                                      style={{ backgroundColor: zoneColor || 'var(--muted-foreground)' }}
                                    />
                                    <span className="text-xs text-muted-foreground">
                                      {zoneName}
                                    </span>
                                  </div>
                                )}
                              </div>
                              {stopCode && (
                                <Badge variant="outline" className="shrink-0 text-xs">
                                  {stopCode}
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* Schedules */}
                  {selectedLine.schedules && selectedLine.schedules.length > 0 && (
                    <div>
                      <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Clock className="h-4 w-4 text-primary" />
                        Horaires de passage
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="pb-2 pr-4 text-left font-medium text-muted-foreground">
                                Jour
                              </th>
                              <th className="pb-2 pr-4 text-left font-medium text-muted-foreground">
                                Début
                              </th>
                              <th className="pb-2 pr-4 text-left font-medium text-muted-foreground">
                                Fin
                              </th>
                              <th className="pb-2 text-left font-medium text-muted-foreground">
                                Fréquence
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedLine.schedules.map((schedule) => (
                              <tr
                                key={schedule.id}
                                className="border-b border-border/50 last:border-0"
                              >
                                <td className="py-2.5 pr-4 text-foreground">
                                  {getDayName(schedule.dayOfWeek)}
                                </td>
                                <td className="py-2.5 pr-4 text-foreground">
                                  {schedule.startTime}
                                </td>
                                <td className="py-2.5 pr-4 text-foreground">
                                  {schedule.endTime}
                                </td>
                                <td className="py-2.5 text-muted-foreground">
                                  Tous les {schedule.frequencyMin} min
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {(!selectedLine.lineStops || selectedLine.lineStops.length === 0) &&
                    (!selectedLine.schedules || selectedLine.schedules.length === 0) && (
                      <p className="py-4 text-center text-sm text-muted-foreground">
                        Aucune information détaillée disponible pour cette ligne.
                      </p>
                    )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function LineCard({
  line,
  isSelected,
  onClick,
}: {
  line: Line;
  isSelected: boolean;
  onClick: () => void;
}) {
  const stopsCount = line._count?.lineStops ?? line.stopsCount ?? 0;
  const scheduleCount = line._count?.schedules ?? line.scheduleCount ?? 0;
  const cardBg = line.color || 'var(--primary)';

  return (
    <Card
      className={`group min-w-[260px] cursor-pointer border-border/50 transition-all hover:shadow-lg lg:min-w-0 ${
        isSelected
          ? 'ring-2 ring-primary shadow-md'
          : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl font-bold text-white"
            style={{ backgroundColor: cardBg }}
          >
            {line.number}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-foreground">{line.name}</h3>
            {line.description && (
              <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                {line.description}
              </p>
            )}
          </div>
          <ChevronRight
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
              isSelected ? 'rotate-90' : 'group-hover:translate-x-0.5'
            }`}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="secondary" className="gap-1 text-xs">
            <MapPin className="h-3 w-3" />
            {stopsCount} arrêt{stopsCount > 1 ? 's' : ''}
          </Badge>
          <Badge variant="secondary" className="gap-1 text-xs">
            <Clock className="h-3 w-3" />
            {scheduleCount} horaire{scheduleCount > 1 ? 's' : ''}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
