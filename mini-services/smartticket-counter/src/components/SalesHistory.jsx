import { useState, useEffect, useCallback } from 'react';
import {
  Ticket,
  ArrowRight,
  Clock,
  User,
  Banknote,
  Smartphone,
  CreditCard,
  RefreshCw,
  ChevronDown,
  Loader2,
  AlertCircle,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import { getTickets } from '../services/api';

const PAYMENT_LABELS = {
  cash: { label: 'Espèces', icon: Banknote, color: 'bg-green-100 text-green-700' },
  mobile_money: { label: 'Mobile Money', icon: Smartphone, color: 'bg-blue-100 text-blue-700' },
  card: { label: 'Carte', icon: CreditCard, color: 'bg-purple-100 text-purple-700' },
};

export default function SalesHistory() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const fetchTickets = useCallback(async (pageNum = 1, append = false) => {
    try {
      const res = await getTickets({ page: pageNum, limit: 20 });
      if (res.success) {
        const list = Array.isArray(res.data) ? res.data : res.data?.items || [];
        setTickets((prev) => (append ? [...prev, ...list] : list));
        setHasMore(list.length >= 20);
      } else {
        setError(res.message || 'Erreur de chargement');
      }
    } catch (err) {
      setError(err.message || 'Erreur réseau');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets(1);
  }, [fetchTickets]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    setPage(1);
    await fetchTickets(1, false);
  };

  const loadMore = async () => {
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchTickets(nextPage, true);
  };

  // Summary
  const totalTickets = tickets.length;
  const totalRevenue = tickets.reduce((sum, t) => sum + (t.price || 0), 0);

  // Group by date
  const grouped = tickets.reduce((acc, t) => {
    const date = t.created_at
      ? new Date(t.created_at).toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        })
      : 'Date inconnue';
    if (!acc[date]) acc[date] = [];
    acc[date].push(t);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="card h-20 bg-gray-100" />
        <div className="card h-24 bg-gray-100" />
        <div className="card h-24 bg-gray-100" />
        <div className="card h-24 bg-gray-100" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Summary bar */}
      <div className="card flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <Calendar className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="text-xs text-gray-500">Historique des ventes</div>
            <div className="text-sm font-semibold text-gray-900">
              {totalTickets} ticket{totalTickets > 1 ? 's' : ''} vendu{totalTickets > 1 ? 's' : ''}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">Revenu total</div>
          <div className="text-lg font-bold text-accent">
            {totalRevenue.toLocaleString('fr-FR')} <span className="text-xs font-normal text-accent/70">FCFA</span>
          </div>
        </div>
      </div>

      {/* Refresh */}
      <button
        onClick={handleRefresh}
        className="flex items-center gap-1.5 text-sm text-primary font-medium mx-auto active:opacity-70"
        disabled={refreshing}
      >
        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        Actualiser
      </button>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Tickets grouped by date */}
      {Object.entries(grouped).length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Ticket className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucune vente enregistrée</p>
          <p className="text-xs mt-1">Les tickets vendus apparaîtront ici</p>
        </div>
      ) : (
        Object.entries(grouped).map(([date, items]) => (
          <div key={date}>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
              {date}
            </div>
            <div className="space-y-2">
              {items.map((ticket) => {
                const pm = PAYMENT_LABELS[ticket.payment_method] || PAYMENT_LABELS.cash;
                const isExpanded = expanded === ticket.id;
                return (
                  <div
                    key={ticket.id}
                    className="card cursor-pointer active:bg-gray-50 transition-colors"
                    onClick={() => setExpanded(isExpanded ? null : ticket.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Ticket className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-sm font-semibold text-primary truncate">
                              #{ticket.ticket_number || ticket.id}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${pm.color}`}>
                              {pm.label}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 truncate flex items-center gap-1">
                            {ticket.from_zone || '—'}
                            <ArrowRight className="w-3 h-3 flex-shrink-0" />
                            {ticket.to_zone || '—'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-bold text-sm">
                          {(ticket.price || 0).toLocaleString('fr-FR')}
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-gray-100 text-xs space-y-1.5 animate-fade-in">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Passager</span>
                          <span className="font-medium flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {ticket.passenger_name || '—'}
                          </span>
                        </div>
                        {ticket.passenger_phone && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Téléphone</span>
                            <span className="font-medium">{ticket.passenger_phone}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-500">Heure</span>
                          <span className="font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {ticket.created_at
                              ? new Date(ticket.created_at).toLocaleTimeString('fr-FR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '—'}
                          </span>
                        </div>
                        {ticket.valid_until && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Valide jusqu'au</span>
                            <span className="font-medium">
                              {new Date(ticket.valid_until).toLocaleString('fr-FR', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Load more */}
      {hasMore && tickets.length > 0 && (
        <button
          onClick={loadMore}
          className="w-full py-3 text-sm text-primary font-medium flex items-center justify-center gap-2 active:opacity-70"
        >
          <Loader2 className="w-4 h-4" />
          Charger plus de tickets
        </button>
      )}
    </div>
  );
}
