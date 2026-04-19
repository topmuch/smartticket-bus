'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Wallet,
  Ticket,
  CheckCircle,
  Users,
  TrendingUp,
  Loader2,
  BarChart3,
  MapPin,
  RefreshCw,
  Calendar,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch, formatCurrency } from '@/lib/api';
import type { ViewId } from '../app-shell';

interface DashboardData {
  totalRevenue: number;
  totalTicketsSold: number;
  totalControls: number;
  validControlRate: number;
  activeSubscriptions: number;
  openCashSessions: number;
  revenueByDay: { date: string; revenue: number }[];
  ticketsByType: { type: string; count: number }[];
  topLines: { id: string; name: string; ticketCount: number }[];
  topZones: { id: string; name: string; ticketCount: number }[];
}

type Period = 'today' | 'week' | 'month' | 'year';

interface PeriodOption {
  value: Period;
  label: string;
  subtitle: string;
}

const PERIOD_OPTIONS: PeriodOption[] = [
  { value: 'today', label: "Aujourd'hui", subtitle: "Vue d'ensemble de l'activité du jour" },
  { value: 'week', label: 'Cette Semaine', subtitle: "Vue d'ensemble de l'activité de la semaine" },
  { value: 'month', label: 'Ce Mois', subtitle: "Vue d'ensemble de l'activité du mois" },
  { value: 'year', label: 'Cette Année', subtitle: "Vue d'ensemble de l'activité de l'année" },
];

function formatTime(date: Date): string {
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function AdminDashboard({ onNavigate }: { onNavigate: (view: ViewId) => void }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState<Period>('today');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Single effect: initial load + auto-refresh every 30s
  useEffect(() => {
    let active = true;

    const loadData = async (showRefresh: boolean) => {
      if (!active) return;
      if (showRefresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');

      const result = await apiFetch<DashboardData>(
        `/api/reports/dashboard?period=${period}`,
      );

      if (!active) return;

      if (result.success && result.data) {
        setData(result.data);
        setLastUpdated(new Date());
      } else {
        setError(result.error || 'Erreur de chargement');
      }

      if (showRefresh) {
        setIsRefreshing(false);
      } else {
        setLoading(false);
      }
    };

    loadData(false);

    intervalRef.current = setInterval(() => {
      loadData(true);
    }, 30_000);

    return () => {
      active = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [period]);

  const handlePeriodChange = (newPeriod: Period) => {
    if (newPeriod === period) return;
    setPeriod(newPeriod);
  };

  const currentPeriodMeta = PERIOD_OPTIONS.find((p) => p.value === period)!;

  const kpiCards = [
    {
      title: 'Revenus du jour',
      value: data ? formatCurrency(data.totalRevenue) : '—',
      icon: <Wallet className="w-5 h-5" />,
      description: "Chiffre d'affaires aujourd'hui",
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    },
    {
      title: 'Tickets vendus',
      value: data ? data.totalTicketsSold.toString() : '—',
      icon: <Ticket className="w-5 h-5" />,
      description: 'Billets émis aujourd\'hui',
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/40',
    },
    {
      title: 'Taux de validation',
      value: data ? `${Number(data.validControlRate || 0).toFixed(1)}%` : '—',
      icon: <CheckCircle className="w-5 h-5" />,
      description: 'Contrôles valides / total',
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-950/40',
    },
    {
      title: 'Abonnements actifs',
      value: data ? data.activeSubscriptions.toString() : '—',
      icon: <Users className="w-5 h-5" />,
      description: 'Abonnements en cours',
      color: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-50 dark:bg-violet-950/40',
    },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Tableau de Bord</h1>
          {(isRefreshing || loading) && (
            <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
          )}
        </div>
        <p className="text-muted-foreground mt-1">
          {currentPeriodMeta.subtitle}
        </p>
        {lastUpdated && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground/70">
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Dernière mise à jour : {formatTime(lastUpdated)}</span>
          </div>
        )}
      </div>

      {/* Period Selector */}
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
        <div className="flex flex-wrap gap-2">
          {PERIOD_OPTIONS.map((option) => (
            <Button
              key={option.value}
              size="sm"
              variant={period === option.value ? 'default' : 'outline'}
              onClick={() => handlePeriodChange(option.value)}
              disabled={loading || isRefreshing}
              className="text-xs sm:text-sm"
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24 mb-1" />
                <Skeleton className="h-3 w-36" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((kpi) => (
            <Card key={kpi.title} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {kpi.title}
                </CardTitle>
                <div className={`rounded-lg p-2 ${kpi.bg}`}>
                  <span className={kpi.color}>{kpi.icon}</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpi.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{kpi.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Secondary Stats Row */}
      {!loading && data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Tickets by Type */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Ticket className="w-4 h-4 text-primary" />
                Tickets par Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.ticketsByType && data.ticketsByType.length > 0 ? (
                  data.ticketsByType.map((item) => (
                    <div key={item.type} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {item.type === 'UNIT' ? 'Ticket Unité' : 'Abonnement'}
                      </span>
                      <Badge variant="secondary" className="font-mono">
                        {item.count}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Aucune donnée disponible</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Lines */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Lignes Populaires
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.topLines && data.topLines.length > 0 ? (
                  data.topLines.map((line, idx) => (
                    <div key={line.lineId || `line-${idx}`} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-5 h-5 rounded text-xs font-bold bg-primary/10 text-primary">
                          {idx + 1}
                        </span>
                        <span className="text-sm truncate max-w-[120px]">{line.lineName || line.name || 'Sans ligne'}</span>
                      </div>
                      <Badge variant="secondary" className="font-mono shrink-0">
                        {line.tickets || line.ticketCount || 0}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Aucune donnée disponible</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Active Sessions & Controls */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Activité en Cours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Caisses ouvertes</span>
                  <Badge
                    variant="outline"
                    className="font-mono border-green-300 text-green-700 dark:border-green-700 dark:text-green-400"
                  >
                    {data.openCashSessions}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Contrôles aujourd&apos;hui</span>
                  <Badge variant="secondary" className="font-mono">
                    {data.totalControls}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Taux de validité</span>
                  <Badge
                    variant="outline"
                    className={`font-mono ${
                      data.validControlRate >= 80
                        ? 'border-green-300 text-green-700 dark:border-green-700 dark:text-green-400'
                        : data.validControlRate >= 50
                          ? 'border-amber-300 text-amber-700 dark:border-amber-400'
                          : 'border-red-300 text-red-700 dark:border-red-700 dark:text-red-400'
                    }`}
                  >
                    {Number(data.validControlRate || 0).toFixed(1)}%
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Revenue by Day (last 7 entries) */}
      {!loading && data && data.revenueByDay && data.revenueByDay.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Revenus Récents
            </CardTitle>
            <CardDescription>Évolution du chiffre d&apos;affaires</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.revenueByDay.slice(-7).map((day) => {
                const maxRev = Math.max(...data.revenueByDay.map((d) => d.revenue), 1);
                const pct = (day.revenue / maxRev) * 100;
                return (
                  <div key={day.date} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-20 shrink-0">
                      {new Date(day.date).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </span>
                    <div className="flex-1 h-6 bg-muted rounded-md overflow-hidden">
                      <div
                        className="h-full bg-primary/70 rounded-md transition-all duration-500"
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-24 text-right shrink-0">
                      {formatCurrency(day.revenue)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
