'use client';

import { useEffect, useState, useCallback } from 'react';
import { Route, ArrowDown, ArrowRightLeft, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiFetch, formatCurrency } from '@/lib/api';

interface Zone {
  id: string;
  name: string;
  code: string;
  color: string;
  description?: string;
  isActive: boolean;
}

interface PriceResult {
  fromZoneName: string;
  toZoneName: string;
  price: number;
  fareId: string | null;
  fromZoneId?: string;
  toZoneId?: string;
}

export function RoutePlanner() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [fromZoneId, setFromZoneId] = useState<string>('');
  const [toZoneId, setToZoneId] = useState<string>('');
  const [result, setResult] = useState<PriceResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [swapping, setSwapping] = useState(false);

  useEffect(() => {
    const fetchZones = async () => {
      const res = await apiFetch<Zone[]>('/api/v1/zones');
      if (res.success && res.data) {
        setZones(res.data.filter((z) => z.isActive));
      } else {
        setError('Impossible de charger les zones. Veuillez réessayer.');
      }
      setLoading(false);
    };
    fetchZones();
  }, []);

  const handleSwap = useCallback(() => {
    setSwapping(true);
    setFromZoneId(toZoneId);
    setToZoneId(fromZoneId);
    setResult(null);
    setError(null);
    setTimeout(() => setSwapping(false), 300);
  }, [fromZoneId, toZoneId]);

  const handleCalculate = useCallback(async () => {
    if (!fromZoneId || !toZoneId) {
      setError('Veuillez sélectionner une zone de départ et d\'arrivée.');
      return;
    }
    if (fromZoneId === toZoneId) {
      setError('Les zones de départ et d\'arrivée doivent être différentes.');
      return;
    }

    setError(null);
    setResult(null);
    setCalculating(true);

    const res = await apiFetch<PriceResult>('/api/pricing/calculate', {
      method: 'POST',
      body: JSON.stringify({ fromZoneId, toZoneId }),
    });

    if (res.success && res.data) {
      setResult(res.data as PriceResult);
    } else {
      setError(
        res.error || 'Aucun tarif trouvé pour ce trajet. Veuillez vérifier les zones sélectionnées.'
      );
    }
    setCalculating(false);
  }, [fromZoneId, toZoneId]);

  const getZoneColor = (zoneId: string) => {
    const zone = zones.find((z) => z.id === zoneId);
    return zone?.color || 'var(--primary)';
  };

  const getZoneName = (zoneId: string) => {
    const zone = zones.find((z) => z.id === zoneId);
    return zone?.name || '';
  };

  const getZoneCode = (zoneId: string) => {
    const zone = zones.find((z) => z.id === zoneId);
    return zone?.code || '';
  };

  return (
    <section id="itineraire" className="bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Route className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-foreground">
              Planificateur d&apos;itinéraire
            </h2>
            <p className="text-muted-foreground">
              Calculez le prix de votre trajet entre deux zones
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Selector Card */}
          <div className="lg:col-span-2">
            <Card className="border-border/50 shadow-lg">
              <CardContent className="p-6">
                {loading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-4 w-32 rounded" />
                    <Skeleton className="h-10 w-full rounded-md" />
                    <div className="flex justify-center">
                      <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-32 rounded" />
                    <Skeleton className="h-10 w-full rounded-md" />
                    <Skeleton className="h-10 w-full rounded-md mt-4" />
                  </div>
                ) : (
                  <>
                    {/* Departure Zone */}
                    <div className="space-y-2">
                      <Label htmlFor="from-zone" className="text-sm font-medium text-foreground">
                        Zone de départ
                      </Label>
                      <Select
                        value={fromZoneId}
                        onValueChange={(val) => {
                          setFromZoneId(val);
                          setResult(null);
                          setError(null);
                        }}
                      >
                        <SelectTrigger id="from-zone" className="w-full h-11">
                          <SelectValue placeholder="Sélectionnez une zone" />
                        </SelectTrigger>
                        <SelectContent>
                          {zones.map((zone) => (
                            <SelectItem key={zone.id} value={zone.id}>
                              <div className="flex items-center gap-2">
                                <span
                                  className="h-2.5 w-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: zone.color }}
                                />
                                <span>{zone.name}</span>
                                <span className="text-muted-foreground text-xs">({zone.code})</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Swap Button */}
                    <div className="flex justify-center py-1">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleSwap}
                        className="h-9 w-9 rounded-full border-primary/20 text-primary hover:bg-primary/10 hover:text-primary transition-all duration-300"
                        aria-label="Inverser départ et arrivée"
                      >
                        <ArrowRightLeft
                          className={`h-4 w-4 transition-transform duration-300 ${
                            swapping ? 'rotate-180' : 'rotate-0'
                          }`}
                        />
                      </Button>
                    </div>

                    {/* Arrival Zone */}
                    <div className="space-y-2">
                      <Label htmlFor="to-zone" className="text-sm font-medium text-foreground">
                        Zone d&apos;arrivée
                      </Label>
                      <Select
                        value={toZoneId}
                        onValueChange={(val) => {
                          setToZoneId(val);
                          setResult(null);
                          setError(null);
                        }}
                      >
                        <SelectTrigger id="to-zone" className="w-full h-11">
                          <SelectValue placeholder="Sélectionnez une zone" />
                        </SelectTrigger>
                        <SelectContent>
                          {zones.map((zone) => (
                            <SelectItem key={zone.id} value={zone.id}>
                              <div className="flex items-center gap-2">
                                <span
                                  className="h-2.5 w-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: zone.color }}
                                />
                                <span>{zone.name}</span>
                                <span className="text-muted-foreground text-xs">({zone.code})</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Calculate Button */}
                    <Button
                      className="mt-4 w-full h-11 gap-2 text-base font-semibold"
                      onClick={handleCalculate}
                      disabled={calculating || !fromZoneId || !toZoneId}
                    >
                      {calculating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Calcul en cours...
                        </>
                      ) : (
                        <>
                          <ArrowDown className="h-4 w-4" />
                          Calculer le prix
                        </>
                      )}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Result Area */}
          <div className="lg:col-span-3">
            {!result && !error && !calculating && (
              <Card className="border-dashed border-border/80 bg-muted/20 h-full min-h-[240px] flex items-center justify-center">
                <CardContent className="p-8 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/5">
                    <Route className="h-8 w-8 text-primary/40" />
                  </div>
                  <p className="text-lg font-medium text-muted-foreground">
                    Sélectionnez vos zones
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground/70">
                    Choisissez un point de départ et une destination pour voir le prix de votre trajet
                  </p>
                </CardContent>
              </Card>
            )}

            {calculating && (
              <Card className="border-border/50 h-full min-h-[240px] flex items-center justify-center">
                <CardContent className="p-8 text-center">
                  <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
                  <p className="text-lg font-medium text-muted-foreground">
                    Calcul du tarif en cours...
                  </p>
                </CardContent>
              </Card>
            )}

            {error && !calculating && (
              <Card className="border-destructive/30 bg-destructive/5 h-full min-h-[240px] flex items-center justify-center">
                <CardContent className="p-8 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                    <AlertCircle className="h-8 w-8 text-destructive" />
                  </div>
                  <p className="text-lg font-medium text-destructive">
                    {error}
                  </p>
                </CardContent>
              </Card>
            )}

            {result && !calculating && (
              <Card className="border-border/50 shadow-lg overflow-hidden">
                {/* Price Banner */}
                <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-6 text-white">
                  <p className="text-sm font-medium text-primary-foreground/80">Prix du trajet</p>
                  <p className="mt-1 text-4xl font-extrabold tracking-tight sm:text-5xl">
                    {formatCurrency(result.price)}
                  </p>
                </div>

                <CardContent className="p-6">
                  {/* Route Visualization */}
                  <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/30 p-4">
                    {/* Departure */}
                    <div className="flex-1 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full ring-2 ring-offset-2 ring-offset-background"
                          style={{ backgroundColor: getZoneColor(fromZoneId) }}
                        />
                        <span className="font-semibold text-foreground">
                          {result.fromZoneName || getZoneName(fromZoneId)}
                        </span>
                      </div>
                      <Badge variant="outline" className="mt-1.5 text-xs">
                        {getZoneCode(fromZoneId) || fromZoneId}
                      </Badge>
                    </div>

                    {/* Arrow */}
                    <div className="flex shrink-0 flex-col items-center gap-0.5">
                      <div className="h-px w-8 bg-primary/40" />
                      <ArrowRightLeft className="h-5 w-5 text-primary" />
                      <div className="h-px w-8 bg-primary/40" />
                    </div>

                    {/* Arrival */}
                    <div className="flex-1 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full ring-2 ring-offset-2 ring-offset-background"
                          style={{ backgroundColor: getZoneColor(toZoneId) }}
                        />
                        <span className="font-semibold text-foreground">
                          {result.toZoneName || getZoneName(toZoneId)}
                        </span>
                      </div>
                      <Badge variant="outline" className="mt-1.5 text-xs">
                        {getZoneCode(toZoneId) || toZoneId}
                      </Badge>
                    </div>
                  </div>

                  {/* Trip Details */}
                  <div className="mt-5 grid grid-cols-2 gap-4">
                    <div className="rounded-lg border border-border/50 bg-background p-3">
                      <p className="text-xs text-muted-foreground">Trajet</p>
                      <p className="mt-0.5 text-sm font-medium text-foreground">
                        {result.fromZoneName || getZoneName(fromZoneId)} →{' '}
                        {result.toZoneName || getZoneName(toZoneId)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border/50 bg-background p-3">
                      <p className="text-xs text-muted-foreground">Tarif</p>
                      <p className="mt-0.5 text-sm font-medium text-foreground">
                        {formatCurrency(result.price)}
                      </p>
                    </div>
                  </div>

                  {/* Info Note */}
                  <div className="mt-5 rounded-lg border border-primary/15 bg-primary/5 p-3">
                    <p className="text-xs text-muted-foreground">
                      💡 Achetez votre ticket directement au guichet le plus proche de votre zone de départ.
                      Le prix affiché est valable pour un trajet simple aller.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
