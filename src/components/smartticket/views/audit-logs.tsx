'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch, formatDate } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  RefreshCw,
  Download,
  Loader2,
  FileText,
  Shield,
  Filter,
  LogIn,
  ShoppingCart,
  UserCog,
  Edit,
  Trash2,
  Eye,
  Globe,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────
interface AuditLogRecord {
  id: string;
  userId: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  details: string;
  ip: string | null;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
}

interface AuditLogsResponse {
  logs: AuditLogRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ── Action Labels (French) ─────────────────────────────
const ACTION_LABELS: Record<string, string> = {
  LOGIN: 'Connexion',
  LOGOUT: 'Déconnexion',
  LOGIN_FAILED: 'Échec Connexion',
  SELL_TICKET: 'Vente Ticket',
  VALIDATE_TICKET: 'Validation Ticket',
  CREATE_USER: 'Création Utilisateur',
  UPDATE_USER: 'Modification Utilisateur',
  DELETE_USER: 'Suppression Utilisateur',
  CHANGE_PASSWORD: 'Changement Mot de Passe',
  OPEN_SESSION: 'Ouverture Caisse',
  CLOSE_SESSION: 'Fermeture Caisse',
  CREATE_ZONE: 'Création Zone',
  UPDATE_ZONE: 'Modification Zone',
  DELETE_ZONE: 'Suppression Zone',
  CREATE_FARE: 'Création Tarif',
  UPDATE_FARE: 'Modification Tarif',
  DELETE_FARE: 'Suppression Tarif',
  CREATE_LINE: 'Création Ligne',
  UPDATE_LINE: 'Modification Ligne',
  DELETE_LINE: 'Suppression Ligne',
  CREATE_STOP: 'Création Arrêt',
  UPDATE_STOP: 'Modification Arrêt',
  DELETE_STOP: 'Suppression Arrêt',
  SYNC_CONTROLS: 'Synchronisation Contrôles',
  EXPORT_DATA: 'Export Données',
};

// ── Action Color Badges ────────────────────────────────
function getActionColor(action: string): string {
  if (action.startsWith('LOGIN') || action === 'LOGOUT') {
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
  }
  if (action.startsWith('SELL') || action.startsWith('VALIDATE')) {
    return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
  }
  if (action.startsWith('CREATE')) {
    return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
  }
  if (action.startsWith('UPDATE')) {
    return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
  }
  if (action.startsWith('DELETE')) {
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  }
  if (action.includes('SESSION')) {
    return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
  }
  if (action.includes('SYNC') || action.includes('EXPORT')) {
    return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200';
  }
  return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
}

// ── Action Icon ────────────────────────────────────────
function getActionIcon(action: string) {
  if (action.startsWith('LOGIN') || action === 'LOGOUT') {
    return <LogIn className="w-3 h-3" />;
  }
  if (action.startsWith('SELL')) {
    return <ShoppingCart className="w-3 h-3" />;
  }
  if (action.startsWith('VALIDATE')) {
    return <Eye className="w-3 h-3" />;
  }
  if (action.includes('USER') || action.includes('PASSWORD')) {
    return <UserCog className="w-3 h-3" />;
  }
  if (action.startsWith('CREATE')) {
    return <FileText className="w-3 h-3" />;
  }
  if (action.startsWith('UPDATE')) {
    return <Edit className="w-3 h-3" />;
  }
  if (action.startsWith('DELETE')) {
    return <Trash2 className="w-3 h-3" />;
  }
  if (action.includes('SYNC') || action.includes('EXPORT')) {
    return <Globe className="w-3 h-3" />;
  }
  return <Shield className="w-3 h-3" />;
}

// ── Action Filter Options ──────────────────────────────
const ACTION_FILTER_OPTIONS = [
  { value: 'all', label: 'Toutes les actions' },
  { value: 'LOGIN', label: 'Connexion' },
  { value: 'LOGIN_FAILED', label: 'Échec Connexion' },
  { value: 'SELL_TICKET', label: 'Vente Ticket' },
  { value: 'VALIDATE_TICKET', label: 'Validation Ticket' },
  { value: 'CREATE_USER', label: 'Création Utilisateur' },
  { value: 'UPDATE_USER', label: 'Modification Utilisateur' },
  { value: 'DELETE_USER', label: 'Suppression Utilisateur' },
  { value: 'CHANGE_PASSWORD', label: 'Changement MDP' },
  { value: 'OPEN_SESSION', label: 'Ouverture Caisse' },
  { value: 'CLOSE_SESSION', label: 'Fermeture Caisse' },
  { value: 'SYNC_CONTROLS', label: 'Sync Contrôles' },
];

// ═══════════════════════════════════════════════════════
// Audit Logs View (SUPERADMIN)
// ═══════════════════════════════════════════════════════
export default function AuditLogsView() {
  // ── State ────────────────────────────────────────────
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalLogs, setTotalLogs] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  // ── Fetch Logs ───────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('limit', '50');
    if (actionFilter !== 'all') params.set('action', actionFilter);

    const res = await apiFetch<AuditLogsResponse>(
      '/api/audit-logs?' + params.toString()
    );
    if (res.success && res.data) {
      setLogs(res.data.logs || []);
      setTotalLogs(res.data.pagination?.total ?? res.data.logs?.length ?? 0);
    }
    setLoading(false);
  }, [actionFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLogs();
  }, [fetchLogs]);

  // ── Client-side Search ───────────────────────────────
  const filteredLogs = logs.filter((log) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (ACTION_LABELS[log.action] || log.action).toLowerCase().includes(q) ||
      (log.user?.name || '').toLowerCase().includes(q) ||
      (log.user?.email || '').toLowerCase().includes(q) ||
      (log.entity || '').toLowerCase().includes(q) ||
      (log.ip || '').toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q)
    );
  });

  // ── Action Distribution ──────────────────────────────
  const actionCounts = logs.reduce<Record<string, number>>((acc, log) => {
    acc[log.action] = (acc[log.action] || 0) + 1;
    return acc;
  }, {});

  const uniqueActions = Object.keys(actionCounts).sort(
    (a, b) => actionCounts[b] - actionCounts[a]
  );

  // ── Format Details ───────────────────────────────────
  function formatDetails(details: string): string {
    try {
      const parsed = JSON.parse(details);
      // Show a condensed version of the details
      if (typeof parsed === 'string') return parsed;
      if (typeof parsed === 'object') {
        const entries = Object.entries(parsed)
          .slice(0, 3)
          .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`);
        const result = entries.join(', ');
        return result.length > 80 ? result.slice(0, 77) + '...' : result;
      }
      return JSON.stringify(parsed);
    } catch {
      return details.length > 80 ? details.slice(0, 77) + '...' : details;
    }
  }

  // ── CSV Export ───────────────────────────────────────
  const handleExportCSV = () => {
    const headers = [
      'Date/Heure',
      'Utilisateur',
      'Email',
      'Rôle',
      'Action',
      'Entité',
      'ID Entité',
      'Détails',
      'IP',
    ];

    const rows = filteredLogs.map((log) => [
      formatDate(log.createdAt),
      log.user?.name || '-',
      log.user?.email || '-',
      log.user?.role || '-',
      ACTION_LABELS[log.action] || log.action,
      log.entity || '-',
      log.entityId || '-',
      log.details.replace(/"/g, '""'),
      log.ip || '-',
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell)}"`).join(','))
      .join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ── Render ───────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Événements</p>
                <p className="text-xl font-bold">{totalLogs}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                <LogIn className="w-5 h-5 text-blue-700 dark:text-blue-300" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Connexions</p>
                <p className="text-xl font-bold">
                  {(actionCounts['LOGIN'] || 0) + (actionCounts['LOGIN_FAILED'] || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900">
                <ShoppingCart className="w-5 h-5 text-emerald-700 dark:text-emerald-300" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ventes</p>
                <p className="text-xl font-bold">{actionCounts['SELL_TICKET'] || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
                <Shield className="w-5 h-5 text-purple-700 dark:text-purple-300" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Types d&apos;actions</p>
                <p className="text-xl font-bold">{uniqueActions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-5 h-5" /> Répartition des Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {uniqueActions.map((action) => (
              <Badge
                key={action}
                className={`${getActionColor(action)} gap-1`}
                variant="outline"
              >
                {getActionIcon(action)}
                {ACTION_LABELS[action] || action}
                <span className="ml-1 opacity-70">({actionCounts[action]})</span>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtres</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par utilisateur, action, IP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Action filter */}
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                {ACTION_FILTER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Actions */}
            <Button
              variant="outline"
              size="icon"
              onClick={fetchLogs}
              disabled={loading}
              title="Actualiser"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleExportCSV}
              disabled={filteredLogs.length === 0}
              title="Exporter CSV"
            >
              <Download className="w-4 h-4 mr-1" /> CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-5 h-5" /> Journal d&apos;Audit
            <Badge variant="secondary">{filteredLogs.length} entrée(s)</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-8 w-[160px]" />
                  <Skeleton className="h-8 w-[120px]" />
                  <Skeleton className="h-8 w-[100px]" />
                  <Skeleton className="h-8 w-[250px] flex-1" />
                  <Skeleton className="h-8 w-[100px]" />
                </div>
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Shield className="w-10 h-10 mb-2 opacity-30" />
              <p>Aucune entrée d&apos;audit trouvée</p>
              <p className="text-xs mt-1">Essayez de modifier vos filtres</p>
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[160px]">Date/Heure</TableHead>
                    <TableHead className="w-[140px]">Utilisateur</TableHead>
                    <TableHead className="w-[150px]">Action</TableHead>
                    <TableHead className="hidden md:table-cell w-[100px]">Entité</TableHead>
                    <TableHead className="hidden lg:table-cell">Détails</TableHead>
                    <TableHead className="hidden xl:table-cell w-[130px]">IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <FileText className="w-3 h-3 shrink-0" />
                          {formatDate(log.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">
                            {log.user?.name || 'Système'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {log.user?.email || ''}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${getActionColor(log.action)} gap-1`}
                          variant="outline"
                        >
                          {getActionIcon(log.action)}
                          {ACTION_LABELS[log.action] || log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {log.entity || '—'}
                        </span>
                        {log.entityId && (
                          <p className="text-xs font-mono text-muted-foreground/70">
                            {log.entityId}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span
                          className="text-xs text-muted-foreground"
                          title={log.details}
                        >
                          {formatDetails(log.details)}
                        </span>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <span className="text-xs font-mono text-muted-foreground">
                          {log.ip || '—'}
                        </span>
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
