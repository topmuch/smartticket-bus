'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch, formatCurrency, formatDate, getStatusColor, getStatusLabel } from '@/lib/api';
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
  Ticket,
  Search,
  CalendarDays,
  TrendingUp,
  Clock,
  RefreshCw,
  Download,
  Loader2,
  Receipt,
  Banknote,
  CreditCard,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Filter,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────
interface TicketRecord {
  id: string;
  ticketNumber: string;
  type: string;
  status: string;
  price: number;
  amountPaid: number;
  paymentMethod: string;
  passengerName: string | null;
  fromZone: { name: string } | null;
  toZone: { name: string } | null;
  fromStop: { name: string } | null;
  toStop: { name: string } | null;
  soldBy: { name: string } | null;
  line: { number: string; name: string } | null;
  soldAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface TicketListResponse {
  tickets: TicketRecord[];
  pagination: Pagination;
}

// ── Constants ──────────────────────────────────────────
const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Espèces',
  mobile: 'Mobile Money',
  card: 'Carte',
  ESPECES: 'Espèces',
  MOBILE_MONEY: 'Mobile Money',
  CARTE: 'Carte',
};

const PAYMENT_ICONS: Record<string, React.ReactNode> = {
  cash: <Banknote className="w-3.5 h-3.5" />,
  mobile: <Smartphone className="w-3.5 h-3.5" />,
  card: <CreditCard className="w-3.5 h-3.5" />,
  ESPECES: <Banknote className="w-3.5 h-3.5" />,
  MOBILE_MONEY: <Smartphone className="w-3.5 h-3.5" />,
  CARTE: <CreditCard className="w-3.5 h-3.5" />,
};

const TYPE_LABELS: Record<string, string> = {
  UNIT: 'Unité',
  SUBSCRIPTION: 'Abonnement',
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'VALID', label: 'Valide' },
  { value: 'USED', label: 'Utilisé' },
  { value: 'EXPIRED', label: 'Expiré' },
  { value: 'CANCELLED', label: 'Annulé' },
];

const TYPE_OPTIONS = [
  { value: 'all', label: 'Tous les types' },
  { value: 'UNIT', label: 'Unité' },
  { value: 'SUBSCRIPTION', label: 'Abonnement' },
];

const PAGE_SIZE = 20;

// ═══════════════════════════════════════════════════════
// Ticket List View (SUPERADMIN Billetterie)
// ═══════════════════════════════════════════════════════
export default function TicketListView() {
  // ── State ────────────────────────────────────────────
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // ── Fetch Tickets ────────────────────────────────────
  const fetchTickets = useCallback(
    async (page: number = 1) => {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(PAGE_SIZE));

      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);
      if (searchQuery) params.set('search', searchQuery);

      const res = await apiFetch<TicketListResponse>(
        '/api/tickets?' + params.toString()
      );
      if (res.success && res.data) {
        setTickets(res.data.tickets || []);
        setPagination(res.data.pagination || {
          page: 1,
          limit: PAGE_SIZE,
          total: 0,
          totalPages: 0,
        });
      }
      setLoading(false);
    },
    [statusFilter, typeFilter, dateFrom, dateTo, searchQuery]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTickets(1);
  }, [fetchTickets]);

  // ── Pagination Handlers ──────────────────────────────
  const goToPage = (page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      fetchTickets(page);
    }
  };

  // ── Summary Calculations ─────────────────────────────
  const validCount = tickets.filter((t) => t.status === 'VALID').length;
  const usedCount = tickets.filter((t) => t.status === 'USED').length;

  // For summary we use the total from pagination
  // But also show current page aggregates
  const totalRevenue = tickets.reduce((sum, t) => sum + t.price, 0);

  // ── CSV Export ───────────────────────────────────────
  const handleExportCSV = () => {
    const headers = [
      'N° Ticket',
      'Type',
      'Statut',
      'Prix',
      'Montant Payé',
      'Moyen Paiement',
      'Passager',
      'Zone Départ',
      'Zone Arrivée',
      'Arrêt Départ',
      'Arrêt Arrivée',
      'Ligne',
      'Vendu Par',
      'Date de Vente',
    ];

    const rows = tickets.map((t) => [
      t.ticketNumber,
      TYPE_LABELS[t.type] || t.type,
      getStatusLabel(t.status),
      String(t.price),
      String(t.amountPaid),
      PAYMENT_LABELS[t.paymentMethod] || t.paymentMethod,
      t.passengerName || '-',
      typeof t.fromZone === 'object' && t.fromZone ? t.fromZone.name : (t.fromZone || '-'),
      typeof t.toZone === 'object' && t.toZone ? t.toZone.name : (t.toZone || '-'),
      typeof t.fromStop === 'object' && t.fromStop ? t.fromStop.name : (t.fromStop || '-'),
      typeof t.toStop === 'object' && t.toStop ? t.toStop.name : (t.toStop || '-'),
      t.line ? `${t.line.number} - ${t.line.name}` : '-',
      typeof t.soldBy === 'object' && t.soldBy ? t.soldBy.name : (t.soldBy || '-'),
      formatDate(t.soldAt),
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `billetterie_${new Date().toISOString().split('T')[0]}.csv`;
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
                <Ticket className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Tickets</p>
                <p className="text-xl font-bold">{pagination.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                <TrendingUp className="w-5 h-5 text-green-700 dark:text-green-300" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Revenus (page)</p>
                <p className="text-xl font-bold">{formatCurrency(totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900">
                <CheckCircle2 className="w-5 h-5 text-emerald-700 dark:text-emerald-300" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Valides (page)</p>
                <p className="text-xl font-bold">{validCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
                <Receipt className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Utilisés (page)</p>
                <p className="text-xl font-bold">{usedCount}</p>
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
            {/* Search by ticket number */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par N° ticket..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Status filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Type filter */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[170px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date range */}
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="date"
                placeholder="Du"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="pl-9 w-full sm:w-[150px]"
              />
            </div>
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="date"
                placeholder="Au"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="pl-9 w-full sm:w-[150px]"
              />
            </div>

            {/* Actions */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => fetchTickets(1)}
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
              disabled={tickets.length === 0}
              title="Exporter CSV"
            >
              <Download className="w-4 h-4 mr-1" /> CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Ticket Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="w-5 h-5" /> Billetterie — Tous les Tickets
            <Badge variant="secondary">{pagination.total} ticket(s)</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-8 w-[120px]" />
                  <Skeleton className="h-8 w-[80px]" />
                  <Skeleton className="h-8 w-[200px] flex-1" />
                  <Skeleton className="h-8 w-[80px]" />
                  <Skeleton className="h-8 w-[80px]" />
                </div>
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Ticket className="w-10 h-10 mb-2 opacity-30" />
              <p>Aucun ticket trouvé</p>
              <p className="text-xs mt-1">Essayez de modifier vos filtres</p>
            </div>
          ) : (
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[130px]">N° Ticket</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="hidden md:table-cell">Passager</TableHead>
                    <TableHead>Trajet</TableHead>
                    <TableHead className="hidden lg:table-cell">Ligne</TableHead>
                    <TableHead className="text-right">Prix</TableHead>
                    <TableHead className="hidden md:table-cell">Paiement</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="hidden lg:table-cell">Guichetier</TableHead>
                    <TableHead className="hidden xl:table-cell">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-mono text-xs font-medium">
                        {ticket.ticketNumber}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={ticket.type === 'SUBSCRIPTION' ? 'secondary' : 'outline'}
                        >
                          {TYPE_LABELS[ticket.type] || ticket.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm">
                          {ticket.passengerName || '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">
                          {typeof ticket.fromZone === 'object' && ticket.fromZone
                            ? ticket.fromZone.name
                            : (ticket.fromZone || '?')}{' '}
                          →{' '}
                          {typeof ticket.toZone === 'object' && ticket.toZone
                            ? ticket.toZone.name
                            : (ticket.toZone || '?')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {typeof ticket.fromStop === 'object' && ticket.fromStop
                            ? ticket.fromStop.name
                            : ''}{' '}
                          →{' '}
                          {typeof ticket.toStop === 'object' && ticket.toStop
                            ? ticket.toStop.name
                            : ''}
                        </p>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {ticket.line ? (
                          <Badge variant="outline" className="font-mono">
                            {ticket.line.number} — {ticket.line.name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(ticket.price)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-1.5 text-sm">
                          {PAYMENT_ICONS[ticket.paymentMethod]}
                          {PAYMENT_LABELS[ticket.paymentMethod] || ticket.paymentMethod}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(ticket.status)} variant="outline">
                          {getStatusLabel(ticket.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">
                        {typeof ticket.soldBy === 'object' && ticket.soldBy
                          ? ticket.soldBy.name
                          : (ticket.soldBy || '—')}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(ticket.soldAt)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {!loading && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Page {pagination.page} sur {pagination.totalPages} — {pagination.total} ticket(s)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => goToPage(pagination.page - 1)}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => goToPage(pagination.page + 1)}
                >
                  Suivant
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
