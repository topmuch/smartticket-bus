'use client';

import { useState, useEffect } from 'react';
import { apiFetch, formatCurrency } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Download,
  TrendingUp,
  Ticket,
  Shield,
  DollarSign,
  BarChart3,
  Users,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────
interface DashboardStats {
  totalRevenue: number;
  totalTicketsSold: number;
  totalControls: number;
  validControlRate: string | number;
  revenueByDay: { date: string; revenue: number; tickets: number }[];
  ticketsByType: Record<string, number>;
  topLines: { lineId: string; lineName: string; lineNumber: string; revenue: number; tickets: number }[];
  topZones: { zoneId: string; zoneName: string; zoneCode: string; revenue: number; tickets: number }[];
  activeSubscriptions: number;
  openCashSessions: number;
}

interface ControlsStats {
  totalControls: number;
  validCount: number;
  invalidCount: number;
  validRate: string | number;
  fraudRate: string | number;
  fraudCount: number;
  breakdown: Record<string, number>;
  controlsByController: { controllerId: string; controllerName: string; totalControls: number }[];
  controlsByLine: { lineId: string; lineName: string; lineNumber: string; totalControls: number }[];
}

// ── Period Options ─────────────────────────────────────
const PERIODS = [
  { value: 'today', label: "Aujourd'hui" },
  { value: 'week', label: 'Cette Semaine' },
  { value: 'month', label: 'Ce Mois' },
  { value: 'year', label: 'Cette Année' },
];

// ── KPI Card ───────────────────────────────────────────
function KpiCard({
  title,
  value,
  icon: Icon,
  subtitle,
  colorClass,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  subtitle?: string;
  colorClass?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className={`rounded-lg p-2 ${colorClass || 'bg-primary/10 text-primary'}`}>
            <Icon className="size-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════
// Reports View
// ═══════════════════════════════════════════════════════
export default function ReportsView() {
  const [period, setPeriod] = useState('month');

  // ── Data State ───────────────────────────────────────
  const [dashboard, setDashboard] = useState<DashboardStats | null>(null);
  const [controls, setControls] = useState<ControlsStats | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Fetch Data (initial + on period change) ──────────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [dashRes, ctrlRes] = await Promise.all([
        apiFetch<DashboardStats>(`/api/reports/dashboard?period=${period}`),
        apiFetch<ControlsStats>(`/api/reports/controls?period=${period}`),
      ]);
      if (!cancelled) {
        if (dashRes.success && dashRes.data) setDashboard(dashRes.data);
        if (ctrlRes.success && ctrlRes.data) setControls(ctrlRes.data);
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [period]);

  // ── Export Handler ───────────────────────────────────
  function handleExport(type: 'revenue' | 'controls' | 'tickets') {
    const params = new URLSearchParams({ type });
    if (period !== 'month') params.set('period', period);
    window.open(`/api/reports/export?${params.toString()}`, '_blank');
  }

  // ── Compute Chart Data ───────────────────────────────
  const revenueByDay = dashboard?.revenueByDay ?? [];
  const maxRevenue = Math.max(...revenueByDay.map((d) => d.revenue), 1);

  // ── Control Result Labels ────────────────────────────
  const resultLabels: Record<string, string> = {
    VALID: 'Valide',
    INVALID: 'Invalide',
    EXPIRED: 'Expiré',
    ALREADY_USED: 'Déjà utilisé',
    FALSIFIED: 'Falsifié',
    NOT_FOUND: 'Non trouvé',
  };

  // Convert breakdown object into array for rendering
  const controlsByResult = controls?.breakdown
    ? Object.entries(controls.breakdown)
        .map(([result, count]) => ({ result, count }))
        .sort((a, b) => b.count - a.count)
    : [];

  const totalControlsCount = controls?.totalControls ?? 0;

  // ── Render ───────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <Button
              key={p.value}
              variant={period === p.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport('revenue')}>
            <Download className="mr-1 size-4" />
            Revenus CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('controls')}>
            <Download className="mr-1 size-4" />
            Contrôles CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('tickets')}>
            <Download className="mr-1 size-4" />
            Tickets CSV
          </Button>
        </div>
      </div>

      {loading ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-4 w-32 mb-4" />
              <Skeleton className="h-48 w-full" />
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title="Total Revenus"
              value={formatCurrency(dashboard?.totalRevenue ?? 0)}
              icon={DollarSign}
              subtitle="Période sélectionnée"
              colorClass="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
            />
            <KpiCard
              title="Tickets Vendus"
              value={String(dashboard?.totalTicketsSold ?? 0)}
              icon={Ticket}
              subtitle={dashboard?.ticketsByType && Object.keys(dashboard.ticketsByType).length > 0 ? `${Object.keys(dashboard.ticketsByType).length} type(s)` : undefined}
              colorClass="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
            />
            <KpiCard
              title="Contrôles"
              value={String(dashboard?.totalControls ?? 0)}
              icon={Shield}
              subtitle={
                controls
                  ? `${controls.validCount} valides, ${controls.invalidCount} invalides`
                  : undefined
              }
              colorClass="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
            />
            <KpiCard
              title="Taux Validation"
              value={`${Number(dashboard?.validControlRate || 0).toFixed(1)}%`}
              icon={TrendingUp}
              subtitle={controls?.fraudRate ? `Fraude: ${Number(controls.fraudRate).toFixed(1)}%` : undefined}
              colorClass="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
            />
          </div>

          {/* Revenue by Day Chart */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="size-5 text-muted-foreground" />
                <CardTitle className="text-base">Revenus par jour</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {revenueByDay.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  Aucune donnée de revenus pour cette période
                </div>
              ) : (
                <div className="space-y-1">
                  {revenueByDay.map((day) => {
                    const pct = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
                    return (
                      <div key={day.date} className="flex items-center gap-3">
                        <span className="w-20 shrink-0 text-xs text-muted-foreground text-right">
                          {day.date}
                        </span>
                        <div className="relative h-7 flex-1 rounded-md bg-muted">
                          <div
                            className="h-full rounded-md bg-primary/80 transition-all duration-500"
                            style={{ width: `${Math.max(pct, 1)}%` }}
                          />
                          <span className="absolute inset-0 flex items-center px-2 text-xs font-medium text-primary-foreground">
                            {formatCurrency(day.revenue)}
                          </span>
                        </div>
                        <span className="w-16 shrink-0 text-xs text-muted-foreground text-right">
                          {day.tickets} ticket{day.tickets > 1 ? 's' : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bottom Grid: Controls Breakdown + Top Lines */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Controls Breakdown */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Shield className="size-5 text-muted-foreground" />
                  <CardTitle className="text-base">Répartition des contrôles</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {controlsByResult.length > 0 ? (
                  <div className="space-y-3">
                    {controlsByResult.map((item) => {
                      const pct = totalControlsCount > 0 ? (item.count / totalControlsCount) * 100 : 0;
                      const barColor =
                        item.result === 'VALID'
                          ? 'bg-emerald-500'
                          : item.result === 'ALREADY_USED' || item.result === 'FALSIFIED'
                            ? 'bg-red-500'
                            : item.result === 'EXPIRED'
                              ? 'bg-amber-500'
                              : 'bg-gray-400';
                      return (
                        <div key={item.result} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{resultLabels[item.result] || item.result}</span>
                            <span className="text-muted-foreground">
                              {item.count} ({pct.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="h-3 w-full rounded-full bg-muted">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                              style={{ width: `${Math.max(pct, 1)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    Aucun contrôle pour cette période
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Lines by Revenue */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="size-5 text-muted-foreground" />
                  <CardTitle className="text-base">Lignes les plus performantes</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {dashboard?.topLines && dashboard.topLines.length > 0 ? (
                  <div className="space-y-3">
                    {dashboard.topLines.map((line, idx) => {
                      const topRevenue = Math.max(...dashboard.topLines.map((l) => l.revenue), 1);
                      const pct = (line.revenue / topRevenue) * 100;
                      return (
                        <div key={line.lineId || `line-${idx}`} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-bold">
                                {idx + 1}
                              </span>
                              <span className="font-medium">
                                {line.lineNumber || ''} – {line.lineName || 'Sans ligne'}
                              </span>
                            </div>
                            <span className="font-medium">{formatCurrency(line.revenue)}</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary/70 transition-all duration-500"
                              style={{ width: `${Math.max(pct, 2)}%` }}
                            />
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {line.tickets} ticket{line.tickets > 1 ? 's' : ''} vendu{line.tickets > 1 ? 's' : ''}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    Aucune donnée de lignes pour cette période
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tickets by Type + Top Zones */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Tickets by Type */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Ticket className="size-5 text-muted-foreground" />
                  <CardTitle className="text-base">Tickets par type</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {dashboard?.ticketsByType && Object.keys(dashboard.ticketsByType).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(dashboard.ticketsByType).map(([type, count]) => {
                      const typeLabel = type === 'UNIT' ? 'Ticket Unité' : type === 'SUBSCRIPTION' ? 'Abonnement' : type;
                      return (
                        <div key={type} className="flex items-center justify-between rounded-lg border p-3">
                          <div>
                            <p className="font-medium">{typeLabel}</p>
                            <p className="text-sm text-muted-foreground">{count} vendu{count > 1 ? 's' : ''}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant="secondary" className="font-mono">{count}</Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    Aucun ticket vendu pour cette période
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Zones */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Users className="size-5 text-muted-foreground" />
                  <CardTitle className="text-base">Zones les plus fréquentées</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {dashboard?.topZones && dashboard.topZones.length > 0 ? (
                  <div className="space-y-3">
                    {dashboard.topZones.map((zone, idx) => (
                      <div key={zone.zoneId || `zone-${idx}`} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-3">
                          <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-bold">
                            {idx + 1}
                          </span>
                          <div>
                            <p className="font-medium">{zone.zoneName || 'Sans zone'}</p>
                            <p className="text-sm text-muted-foreground">{zone.tickets} ticket{zone.tickets > 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        <p className="font-semibold">{formatCurrency(zone.revenue)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    Aucune donnée de zones pour cette période
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
