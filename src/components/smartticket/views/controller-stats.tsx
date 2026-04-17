'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch, formatDate, getStatusColor } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart3,
  CheckCircle,
  XCircle,
  ShieldCheck,
  ShieldX,
  Clock,
  ScanLine,
  TrendingUp,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Wifi,
  WifiOff,
  CalendarDays,
} from 'lucide-react';

interface ControlStats {
  totalScans: number;
  validCount: number;
  invalidCount: number;
  validRate: number;
  breakdown: Record<string, number>;
  dailyScanCounts: { date: string; total: number; valid: number; invalid: number }[];
}

interface ControlRecord {
  id: string;
  result: string;
  reason: string | null;
  createdAt: string;
  synced: boolean;
  ticket: {
    ticketNumber: string;
    type: string;
    passengerName: string | null;
  } | null;
}

const RESULT_ICONS: Record<string, React.ReactNode> = {
  VALID: <CheckCircle className="w-4 h-4 text-green-600" />,
  EXPIRED: <Clock className="w-4 h-4 text-amber-600" />,
  ALREADY_USED: <AlertTriangle className="w-4 h-4 text-orange-600" />,
  FALSIFIED: <ShieldX className="w-4 h-4 text-red-600" />,
  NOT_FOUND: <XCircle className="w-4 h-4 text-gray-500" />,
  INVALID: <ShieldX className="w-4 h-4 text-red-600" />,
};

const RESULT_LABELS: Record<string, string> = {
  VALID: 'Valide',
  EXPIRED: 'Expiré',
  ALREADY_USED: 'Déjà utilisé',
  FALSIFIED: 'Falsifié',
  NOT_FOUND: 'Non trouvé',
  INVALID: 'Invalide',
};

const RESULT_COLORS: Record<string, string> = {
  VALID: 'bg-green-500',
  EXPIRED: 'bg-amber-500',
  ALREADY_USED: 'bg-orange-500',
  FALSIFIED: 'bg-red-500',
  NOT_FOUND: 'bg-gray-400',
  INVALID: 'bg-red-500',
};

export default function ControllerStatsView() {
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<ControlStats | null>(null);
  const [recentControls, setRecentControls] = useState<ControlRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [synced, setSynced] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [statsRes, controlsRes] = await Promise.all([
      apiFetch<ControlStats>('/api/controls/stats?controllerId=' + user.id),
      apiFetch<{ controls: ControlRecord[] }>('/api/controls?controllerId=' + user.id + '&limit=50'),
    ]);

    if (statsRes.success && statsRes.data) {
      setStats(statsRes.data);
    }
    if (controlsRes.success && controlsRes.data) {
      setRecentControls(controlsRes.data.controls || []);
      // Check sync status
      const unsynced = (controlsRes.data.controls || []).some((c) => !c.synced);
      setSynced(!unsynced);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const maxDailyCount = stats?.dailyScanCounts
    ? Math.max(...stats.dailyScanCounts.map((d) => d.total), 1)
    : 1;

  return (
    <div className="space-y-4">
      {/* Sync Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {synced ? (
            <Badge className="bg-green-100 text-green-700 border-green-200" variant="outline">
              <Wifi className="w-3 h-3 mr-1" /> Synchronisé
            </Badge>
          ) : (
            <Badge className="bg-amber-100 text-amber-700 border-amber-200" variant="outline">
              <WifiOff className="w-3 h-3 mr-1" /> Non synchronisé
            </Badge>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Actualiser
        </Button>
      </div>

      {loading && !stats ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Chargement des statistiques...</span>
        </div>
      ) : stats ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <ScanLine className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Scans</p>
                    <p className="text-xl font-bold">{stats.totalScans}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100">
                    <ShieldCheck className="w-5 h-5 text-green-700" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Valides</p>
                    <p className="text-xl font-bold text-green-700">{stats.validCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-100">
                    <ShieldX className="w-5 h-5 text-red-700" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Invalides</p>
                    <p className="text-xl font-bold text-red-700">{stats.invalidCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <TrendingUp className="w-5 h-5 text-blue-700" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Taux Validation</p>
                    <p className="text-xl font-bold text-blue-700">{stats.validRate.toFixed(1)}%</p>
                  </div>
                </div>
                <Progress value={stats.validRate} className="mt-2 h-1.5" />
              </CardContent>
            </Card>
          </div>

          {/* Breakdown by Result */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-5 h-5" /> Répartition par Résultat
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(stats.breakdown).map(([result, count]) => {
                const percentage = stats.totalScans > 0 ? (count / stats.totalScans) * 100 : 0;
                return (
                  <div key={result} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {RESULT_ICONS[result] || <ScanLine className="w-4 h-4 text-muted-foreground" />}
                        <span className="font-medium">{RESULT_LABELS[result] || result}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{count}</span>
                        <span className="text-xs text-muted-foreground">({percentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${RESULT_COLORS[result] || 'bg-gray-400'}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {Object.keys(stats.breakdown).length === 0 && (
                <p className="text-center text-muted-foreground py-4 text-sm">
                  Aucun contrôle effectué
                </p>
              )}
            </CardContent>
          </Card>

          {/* Daily Scan Counts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="w-5 h-5" /> Activité Quotidienne
              </CardTitle>
              <CardDescription>Derniers 7 jours</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.dailyScanCounts.length > 0 ? (
                <div className="space-y-2">
                  {stats.dailyScanCounts.map((day) => (
                    <div key={day.date} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-24 shrink-0">
                        {new Date(day.date).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </span>
                      <div className="flex-1 flex gap-0.5 h-6">
                        <div
                          className="bg-green-500 rounded-l-sm h-full transition-all flex items-center justify-end"
                          style={{
                            width: `${maxDailyCount > 0 ? (day.valid / maxDailyCount) * 100 : 0}%`,
                            minWidth: day.valid > 0 ? '4px' : '0px',
                          }}
                        >
                          {day.valid > 0 && (
                            <span className="text-[10px] text-white pr-1 font-medium">{day.valid}</span>
                          )}
                        </div>
                        <div
                          className="bg-red-500 rounded-r-sm h-full transition-all flex items-center justify-end"
                          style={{
                            width: `${maxDailyCount > 0 ? (day.invalid / maxDailyCount) * 100 : 0}%`,
                            minWidth: day.invalid > 0 ? '4px' : '0px',
                          }}
                        >
                          {day.invalid > 0 && (
                            <span className="text-[10px] text-white pr-1 font-medium">{day.invalid}</span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs font-medium w-8 text-right">{day.total}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-4 mt-2 pt-2 border-t">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <div className="w-3 h-3 bg-green-500 rounded" /> Valides
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <div className="w-3 h-3 bg-red-500 rounded" /> Invalides
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4 text-sm">
                  Aucune donnée disponible
                </p>
              )}
            </CardContent>
          </Card>

          {/* Recent Controls */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-5 h-5" /> Contrôles Récents
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {recentControls.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <ScanLine className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-sm">Aucun contrôle effectué</p>
                </div>
              ) : (
                <div className="max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Résultat</TableHead>
                        <TableHead>N° Ticket</TableHead>
                        <TableHead className="hidden sm:table-cell">Passager</TableHead>
                        <TableHead className="hidden md:table-cell">Motif</TableHead>
                        <TableHead className="hidden lg:table-cell">Heure</TableHead>
                        <TableHead>Sync</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentControls.map((control) => (
                        <TableRow key={control.id}>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {RESULT_ICONS[control.result] || <ScanLine className="w-4 h-4" />}
                              <span className="text-sm font-medium">
                                {RESULT_LABELS[control.result] || control.result}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {control.ticket?.ticketNumber || '—'}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm">
                            {control.ticket?.passengerName || '—'}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                            {control.reason || '—'}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                            {formatDate(control.createdAt)}
                          </TableCell>
                          <TableCell>
                            {control.synced ? (
                              <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                                <Wifi className="w-3 h-3 mr-0.5" />
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                                <WifiOff className="w-3 h-3 mr-0.5" />
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <BarChart3 className="w-12 h-12 mb-3 opacity-30" />
            <p>Impossible de charger les statistiques</p>
            <Button variant="outline" className="mt-3" onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-1" /> Réessayer
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
