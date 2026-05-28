'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch, formatDate, getStatusColor, getStatusLabel } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Shield,
  ScanLine,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ShieldX,
  RefreshCw,
  Loader2,
  Wifi,
  WifiOff,
  CalendarDays,
  Filter,
  User,
} from 'lucide-react';

interface ControlRecord {
  id: string;
  result: string;
  reason: string | null;
  scannedAt: string;
  synced: boolean;
  ticket: {
    ticketNumber: string;
    type: string;
    passengerName: string | null;
  } | null;
}

interface ControlStats {
  totalScans: number;
  validCount: number;
  invalidCount: number;
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

const RESULT_BADGE_COLORS: Record<string, string> = {
  VALID: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  EXPIRED: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  ALREADY_USED: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  FALSIFIED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  NOT_FOUND: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  INVALID: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

export default function MyControlsView() {
  const user = useAuthStore((s) => s.user);
  const [controls, setControls] = useState<ControlRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [resultFilter, setResultFilter] = useState<string>('ALL');
  const [stats, setStats] = useState<ControlStats>({
    totalScans: 0,
    validCount: 0,
    invalidCount: 0,
  });
  const [hasUnsynced, setHasUnsynced] = useState(false);

  const fetchControls = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const params = new URLSearchParams();
    params.set('controllerId', user.id);
    params.set('limit', '100');
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);

    const res = await apiFetch<{ controls: ControlRecord[]; pagination: { total: number } }>(
      '/api/controls?' + params.toString()
    );

    if (res.success && res.data) {
      setControls(res.data.controls || []);

      // Compute today's stats from all controls (unfiltered)
      const todayStr = getTodayDateString();
      const allRes = await apiFetch<{ controls: ControlRecord[] }>(
        '/api/controls?controllerId=' + user.id + '&limit=100'
      );
      if (allRes.success && allRes.data) {
        const todayControls = (allRes.data.controls || []).filter(
          (c) => c.scannedAt && c.scannedAt.startsWith(todayStr)
        );
        setStats({
          totalScans: todayControls.length,
          validCount: todayControls.filter((c) => c.result === 'VALID').length,
          invalidCount: todayControls.filter((c) => c.result !== 'VALID').length,
        });
        setHasUnsynced((allRes.data.controls || []).some((c) => !c.synced));
      }
    }

    setLoading(false);
  }, [user, dateFrom, dateTo]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchControls();
  }, [fetchControls]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchControls, 30000);
    return () => clearInterval(interval);
  }, [fetchControls]);

  const filteredControls = controls.filter((c) => {
    if (resultFilter !== 'ALL' && c.result !== resultFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header with sync status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {hasUnsynced ? (
            <Badge className="bg-amber-100 text-amber-700 border-amber-200" variant="outline">
              <WifiOff className="w-3 h-3 mr-1" /> Synchronisation en attente
            </Badge>
          ) : (
            <Badge className="bg-green-100 text-green-700 border-green-200" variant="outline">
              <Wifi className="w-3 h-3 mr-1" /> Synchronisé
            </Badge>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={fetchControls} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Actualiser
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ScanLine className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Aujourd&apos;hui</p>
                <p className="text-xl font-bold">{stats.totalScans}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle className="w-5 h-5 text-green-700" />
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
                <XCircle className="w-5 h-5 text-red-700" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Invalides</p>
                <p className="text-xl font-bold text-red-700">{stats.invalidCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtres</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2 flex-1">
              <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
              <Input
                type="date"
                placeholder="Du"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="flex-1"
              />
              <span className="text-muted-foreground text-sm">→</span>
              <Input
                type="date"
                placeholder="Au"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="flex-1"
              />
            </div>
            <Select value={resultFilter} onValueChange={setResultFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Résultat" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les résultats</SelectItem>
                <SelectItem value="VALID">Valide</SelectItem>
                <SelectItem value="EXPIRED">Expiré</SelectItem>
                <SelectItem value="ALREADY_USED">Déjà utilisé</SelectItem>
                <SelectItem value="FALSIFIED">Falsifié</SelectItem>
                <SelectItem value="NOT_FOUND">Non trouvé</SelectItem>
                <SelectItem value="INVALID">Invalide</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Controls Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-5 h-5" /> Mes Contrôles
            <Badge variant="secondary">{filteredControls.length} résultat(s)</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Chargement des contrôles...</span>
            </div>
          ) : filteredControls.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <ScanLine className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">Aucun contrôle trouvé</p>
              <p className="text-xs mt-1">
                {resultFilter !== 'ALL' || dateFrom || dateTo
                  ? 'Essayez de modifier vos filtres'
                  : 'Scannez des tickets pour voir vos contrôles ici'}
              </p>
            </div>
          ) : (
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[130px]">Résultat</TableHead>
                    <TableHead>N° Ticket</TableHead>
                    <TableHead className="hidden sm:table-cell">Passager</TableHead>
                    <TableHead className="hidden md:table-cell">Motif</TableHead>
                    <TableHead className="hidden lg:table-cell">Date / Heure</TableHead>
                    <TableHead>Sync</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredControls.map((control) => (
                    <TableRow key={control.id}>
                      <TableCell>
                        <Badge
                          className={`gap-1 ${RESULT_BADGE_COLORS[control.result] || ''}`}
                          variant="outline"
                        >
                          {RESULT_ICONS[control.result] || <ScanLine className="w-3 h-3" />}
                          <span className="text-xs">
                            {RESULT_LABELS[control.result] || control.result}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs font-medium">
                        {control.ticket?.ticketNumber || '—'}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-1.5 text-sm">
                          <User className="w-3.5 h-3.5 text-muted-foreground" />
                          {control.ticket?.passengerName || '—'}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-[200px] truncate">
                        {control.reason || '—'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(control.scannedAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {control.synced ? (
                          <Badge
                            variant="outline"
                            className="text-green-600 border-green-200 bg-green-50"
                          >
                            <Wifi className="w-3 h-3 mr-0.5" />
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-amber-600 border-amber-200 bg-amber-50"
                          >
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
    </div>
  );
}
