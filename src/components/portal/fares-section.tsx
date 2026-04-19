'use client';

import { useEffect, useState } from 'react';
import { Ticket, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { apiFetch, formatCurrency } from '@/lib/api';

interface Zone {
  id: string;
  name: string;
  code: string;
  color: string;
  description?: string;
  isActive: boolean;
}

interface Tariff {
  id: string;
  fromZoneId: string;
  toZoneId: string;
  fromZone?: { id: string; name: string; code: string; color: string };
  toZone?: { id: string; name: string; code: string; color: string };
  fromZoneName?: string;
  toZoneName?: string;
  price: number;
  isActive: boolean;
}

export function FaresSection() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [zonesRes, tariffsRes] = await Promise.all([
        apiFetch<Zone[]>('/api/v1/zones'),
        apiFetch<Tariff[]>('/api/v1/public/fares'),
      ]);
      if (zonesRes.success && zonesRes.data) {
        setZones(zonesRes.data.filter((z) => z.isActive));
      }
      if (tariffsRes.success && tariffsRes.data) {
        setTariffs(
          (tariffsRes.data as Tariff[]).filter(
            (t) => t.isActive !== false
          )
        );
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  return (
    <section id="tarifs">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Ticket className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-foreground">
              Tarifs &amp; Zones
            </h2>
            <p className="text-muted-foreground">
              Découvrez les tarifs applicables selon les zones de trajet
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="rounded-xl border border-border/50 p-5">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-24 rounded" />
                    <Skeleton className="h-4 w-16 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Zone Cards */}
            <div className="mb-10">
              <h3 className="mb-4 text-lg font-semibold text-foreground">
                Zones de transport
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {zones.map((zone) => (
                  <Card
                    key={zone.id}
                    className="border-border/50 transition-shadow hover:shadow-lg"
                  >
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white font-bold text-sm"
                          style={{
                            backgroundColor:
                              zone.color || 'var(--primary)',
                          }}
                        >
                          {zone.code}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-foreground">
                            {zone.name}
                          </h4>
                          {zone.description && (
                            <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
                              {zone.description}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="shrink-0">
                          {zone.code}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Separator className="mb-10" />

            {/* Tariff Table */}
            <div>
              <h3 className="mb-4 text-lg font-semibold text-foreground">
                Grille tarifaire
              </h3>
              {tariffs.length > 0 ? (
                <Card className="border-border/50 overflow-hidden">
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/50">
                            <th className="px-5 py-3 text-left font-medium text-muted-foreground">
                              Origine
                            </th>
                            <th className="px-5 py-3 text-left font-medium text-muted-foreground">
                              Destination
                            </th>
                            <th className="px-5 py-3 text-right font-medium text-muted-foreground">
                              Prix
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {tariffs.map((tariff) => {
                            const fromName =
                              tariff.fromZone?.name ||
                              tariff.fromZoneName ||
                              '-';
                            const toName =
                              tariff.toZone?.name ||
                              tariff.toZoneName ||
                              '-';
                            const fromColor =
                              tariff.fromZone?.color || 'var(--muted-foreground)';
                            const toColor =
                              tariff.toZone?.color || 'var(--muted-foreground)';

                            return (
                              <tr
                                key={tariff.id}
                                className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors"
                              >
                                <td className="px-5 py-3">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className="h-2.5 w-2.5 rounded-full shrink-0"
                                      style={{
                                        backgroundColor: fromColor,
                                      }}
                                    />
                                    <span className="font-medium text-foreground">
                                      {fromName}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-5 py-3">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className="h-2.5 w-2.5 rounded-full shrink-0"
                                      style={{ backgroundColor: toColor }}
                                    />
                                    <span className="font-medium text-foreground">
                                      {toName}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-5 py-3 text-right">
                                  <Badge
                                    variant="default"
                                    className="font-semibold"
                                  >
                                    {formatCurrency(tariff.price)}
                                  </Badge>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-border/50">
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">
                      Les informations tarifaires seront bientôt disponibles.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Note */}
            <div className="mt-8 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="text-sm text-foreground/80">
                <p className="font-medium">
                  Achetez vos tickets directement au guichet
                </p>
                <p className="mt-1 text-muted-foreground">
                  Les tickets sont disponibles auprès de nos opérateurs aux
                  principaux points d&apos;arrêt. Présentez-vous avec votre pièce
                  d&apos;identité pour l&apos;achat.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
