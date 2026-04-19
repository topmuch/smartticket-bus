'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch, formatCurrency, formatDate, getStatusColor, getStatusLabel } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
} from 'lucide-react';

interface TicketRecord {
  id: string;
  ticketNumber: string;
  type: string;
  status: string;
  price: number;
  amountPaid: number;
  paymentMethod: string;
  passengerName: string | null;
  passengerPhone: string | null;
  fromStop: { name: string } | null;
  toStop: { name: string } | null;
  fromZone: { name: string } | string | null;
  toZone: { name: string } | string | null;
  soldBy: { name: string } | null;
  createdAt: string;
  validFrom: string;
  validTo: string;
}

const PAYMENT_ICONS: Record<string, React.ReactNode> = {
  cash: <Banknote className="w-3.5 h-3.5" />,
  mobile: <Smartphone className="w-3.5 h-3.5" />,
  card: <CreditCard className="w-3.5 h-3.5" />,
  ESPECES: <Banknote className="w-3.5 h-3.5" />,
  MOBILE_MONEY: <Smartphone className="w-3.5 h-3.5" />,
  CARTE: <CreditCard className="w-3.5 h-3.5" />,
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Espèces',
  mobile: 'Mobile Money',
  card: 'Carte',
  ESPECES: 'Espèces',
  MOBILE_MONEY: 'Mobile Money',
  CARTE: 'Carte',
};

export default function SalesHistoryView() {
  const user = useAuthStore((s) => s.user);
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  // Default to empty string so ALL tickets are shown (no date filter by default)
  const [dateFilter, setDateFilter] = useState('');

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('soldById', user?.id || '');
    if (dateFilter) {
      params.set('from', dateFilter);
      params.set('to', dateFilter);
    }
    params.set('limit', '100');

    const res = await apiFetch<{ tickets: TicketRecord[]; total: number }>('/api/tickets?' + params.toString());
    if (res.success && res.data) {
      setTickets(res.data.tickets || []);
    }
    setLoading(false);
  }, [user?.id, dateFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTickets();
  }, [fetchTickets]);

  const filteredTickets = tickets.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.ticketNumber.toLowerCase().includes(q) ||
      (t.passengerName && t.passengerName.toLowerCase().includes(q))
    );
  });

  const totalSales = tickets.length;
  const totalRevenue = tickets.reduce((sum, t) => sum + t.price, 0);
  const cashTotal = tickets
    .filter((t) => t.paymentMethod === 'cash' || t.paymentMethod === 'ESPECES')
    .reduce((sum, t) => sum + t.amountPaid, 0);
  const mobileMoneyTotal = tickets
    .filter((t) => t.paymentMethod === 'mobile' || t.paymentMethod === 'MOBILE_MONEY')
    .reduce((sum, t) => sum + t.price, 0);

  const handleExportCSV = () => {
    const headers = ['N° Ticket', 'Type', 'Passager', 'Trajet', 'Prix', 'Paiement', 'Statut', 'Heure'];
    const rows = filteredTickets.map((t) => [
      t.ticketNumber,
      t.type === 'UNIT' ? 'Unité' : 'Abonnement',
      t.passengerName || '-',
      `${t.fromStop?.name || '?'} → ${t.toStop?.name || '?'}`,
      t.price,
      PAYMENT_LABELS[t.paymentMethod] || t.paymentMethod,
      getStatusLabel(t.status),
      formatDate(t.createdAt),
    ]);
    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ventes${dateFilter ? `_${dateFilter}` : '_toutes'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

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
                <p className="text-xs text-muted-foreground">Total Ventes</p>
                <p className="text-xl font-bold">{totalSales}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <TrendingUp className="w-5 h-5 text-green-700" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Chiffre d&apos;affaires</p>
                <p className="text-xl font-bold">{formatCurrency(totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <Banknote className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Espèces</p>
                <p className="text-lg font-bold">{formatCurrency(cashTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Smartphone className="w-5 h-5 text-blue-700" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Mobile Money</p>
                <p className="text-lg font-bold">{formatCurrency(mobileMoneyTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par N° ticket ou passager..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="icon" onClick={fetchTickets} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </Button>
            <Button variant="outline" onClick={handleExportCSV} disabled={filteredTickets.length === 0}>
              <Download className="w-4 h-4 mr-1" /> CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="w-5 h-5" /> Historique des Tickets
            <Badge variant="secondary">{filteredTickets.length} résultat(s)</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Chargement...</span>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Ticket className="w-10 h-10 mb-2 opacity-30" />
              <p>Aucune vente trouvée</p>
            </div>
          ) : (
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[130px]">N° Ticket</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="hidden sm:table-cell">Passager</TableHead>
                    <TableHead>Trajet</TableHead>
                    <TableHead className="text-right">Prix</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="hidden md:table-cell">Validité</TableHead>
                    <TableHead className="hidden lg:table-cell">Heure</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-mono text-xs font-medium">
                        {ticket.ticketNumber}
                      </TableCell>
                      <TableCell>
                        <Badge variant={ticket.type === 'SUBSCRIPTION' ? 'secondary' : 'outline'}>
                          {ticket.type === 'UNIT' ? 'Unité' : 'Abo.'}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div>
                          <p className="text-sm">{ticket.passengerName || '—'}</p>
                          {ticket.passengerPhone && (
                            <p className="text-xs text-muted-foreground">{ticket.passengerPhone}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">
                          {ticket.fromStop?.name || (typeof ticket.fromZone === 'object' ? ticket.fromZone?.name : ticket.fromZone) || '?'} → {ticket.toStop?.name || (typeof ticket.toZone === 'object' ? ticket.toZone?.name : ticket.toZone) || '?'}
                        </p>
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
                      <TableCell className="hidden md:table-cell">
                        <div className="text-xs text-muted-foreground leading-tight">
                          <div>{formatDate(ticket.validFrom)}</div>
                          <div className="text-muted-foreground">→</div>
                          <div>{formatDate(ticket.validTo)}</div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(ticket.createdAt)}
                        </div>
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
