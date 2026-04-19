'use client';

import { useEffect, useState, useMemo } from 'react';
import { MapPin, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api';

interface Zone {
  id: string;
  name: string;
  code: string;
  color: string;
  isActive: boolean;
}

interface Stop {
  id: string;
  name: string;
  code: string;
  zoneId?: string;
  zoneName?: string;
  zoneCode?: string;
  zone?: { id: string; name: string; code: string; color: string } | null;
  latitude: number;
  longitude: number;
  isActive: boolean;
}

export function StopsSection() {
  const [stops, setStops] = useState<Stop[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [zoneFilter, setZoneFilter] = useState<string>('all');

  useEffect(() => {
    const fetchData = async () => {
      const [stopsRes, zonesRes] = await Promise.all([
        apiFetch<Stop[]>('/api/v1/stops'),
        apiFetch<Zone[]>('/api/v1/zones'),
      ]);
      if (stopsRes.success && stopsRes.data) {
        setStops(stopsRes.data.filter((s) => s.isActive));
      }
      if (zonesRes.success && zonesRes.data) {
        setZones(zonesRes.data.filter((z) => z.isActive));
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const filteredStops = useMemo(() => {
    return stops.filter((stop) => {
      const matchSearch =
        search === '' ||
        stop.name.toLowerCase().includes(search.toLowerCase()) ||
        stop.code.toLowerCase().includes(search.toLowerCase());
      const stopZoneId = stop.zoneId || stop.zone?.id || '';
      const matchZone =
        zoneFilter === 'all' || stopZoneId === zoneFilter;
      return matchSearch && matchZone;
    });
  }, [stops, search, zoneFilter]);

  return (
    <section id="arrets">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-foreground">Points d'arrêt</h2>
            <p className="text-muted-foreground">
              Trouvez les arrêts de bus proches de vous
            </p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher un arrêt..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={zoneFilter} onValueChange={setZoneFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filtrer par zone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les zones</SelectItem>
              {zones.map((zone) => (
                <SelectItem key={zone.id} value={zone.id}>
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: zone.color || 'var(--muted-foreground)' }}
                    />
                    {zone.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-xl border border-border/50 p-5">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4 rounded" />
                    <Skeleton className="h-4 w-1/2 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredStops.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-16 text-center">
            <MapPin className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-lg font-medium text-muted-foreground">
              Aucun arrêt trouvé
            </p>
            <p className="mt-1 text-sm text-muted-foreground/70">
              Essayez de modifier vos critères de recherche
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredStops.map((stop) => {
              const zoneName = stop.zoneName || stop.zone?.name || '';
              const zoneCode = stop.zoneCode || stop.zone?.code || '';
              const zoneColor = stop.zone?.color || 'var(--muted-foreground)';

              return (
                <Card
                  key={stop.id}
                  className="border-border/50 transition-shadow hover:shadow-lg"
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-foreground">
                          {stop.name}
                        </h3>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {stop.code}
                          </Badge>
                          {zoneName && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: zoneColor }}
                              />
                              {zoneName}
                            </div>
                          )}
                        </div>
                      </div>
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
