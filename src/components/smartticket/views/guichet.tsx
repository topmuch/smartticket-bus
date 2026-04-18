'use client';

import { useState, useEffect } from 'react';
import { apiFetch, formatCurrency, formatDate } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  ArrowRightLeft,
  Banknote,
  Smartphone,
  CreditCard,
  Loader2,
  Ticket,
  TrendingUp,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  CircleDot,
  Store,
  Clock,
} from 'lucide-react';
import TicketCard from './ticket-card';

// ── Types ──────────────────────────────────────────────

interface Zone {
  id: string;
  name: string;
  code: string;
  color: string;
  isActive: boolean;
}

interface FareResult {
  price: number;
  fromZoneName: string;
  toZoneName: string;
  fareId: string | null;
}

interface CashSession {
  id: string;
  status: string;
  openingBalance: number;
  operator?: { name: string } | null;
}

interface TicketRecord {
  id: string;
  ticketNumber: string;
  price: number;
  passengerName: string | null;
  fromZone: string;
  toZone: string;
  createdAt: string;
}

interface SoldTicket {
  id: string;
  ticketNumber: string;
  qrCode: string;
  price: number;
  amountPaid: number;
  changeGiven: number;
  validFrom: string;
  validTo: string;
  passengerName: string | null;
  type: string;
  status: string;
  fromZone: string;
  toZone: string;
}

type PaymentMethod = 'cash' | 'mobile' | 'card';

// ── Quick amount helper ────────────────────────────────

function getQuickAmounts(price: number): number[] {
  const amounts = new Set<number>();
  const targets = [price, 500, 1000, 2000, 5000, 10000];
  for (const t of targets) {
    const rounded = Math.ceil(t / 50) * 50;
    if (rounded >= price) amounts.add(rounded);
  }
  return Array.from(amounts).sort((a, b) => a - b).slice(0, 4);
}

// ── Main Component ─────────────────────────────────────

export default function Guichet() {
  const user = useAuthStore((s) => s.user);

  // Data
  const [zones, setZones] = useState<Zone[]>([]);
  const [recentTickets, setRecentTickets] = useState<TicketRecord[]>([]);
  const [todayStats, setTodayStats] = useState({ count: 0, total: 0 });
  const [cashSession, setCashSession] = useState<CashSession | null>(null);

  // Loading states
  const [zonesLoading, setZonesLoading] = useState(true);
  const [priceLoading, setPriceLoading] = useState(false);
  const [selling, setSelling] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [openingSession, setOpeningSession] = useState(false);

  // Form
  const [fromZoneId, setFromZoneId] = useState('');
  const [toZoneId, setToZoneId] = useState('');
  const [fareResult, setFareResult] = useState<FareResult | null>(null);
  const [fareError, setFareError] = useState('');
  const [passengerName, setPassengerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [saleError, setSaleError] = useState('');

  // Ticket modal
  const [soldTicket, setSoldTicket] = useState<SoldTicket | null>(null);

  // ── Fetch zones on mount ──────────────────────────────
  useEffect(() => {
    apiFetch<Zone[]>('/api/zones').then((res) => {
      if (res.success && res.data) setZones(res.data);
      setZonesLoading(false);
    });
  }, []);

  // ── Check cash session on mount ───────────────────────
  useEffect(() => {
    apiFetch<CashSession[]>('/api/cash-sessions?limit=1').then((res) => {
      if (res.success && res.data && res.data.length > 0) {
        const latest = res.data[0];
        if (latest.status === 'OPEN') {
          setCashSession(latest);
        }
      }
      setSessionLoading(false);
    });
  }, []);

  // ── Fetch recent tickets on mount ─────────────────────
  const [ticketsFetched, setTicketsFetched] = useState(false);
  if (!ticketsFetched) {
    setTicketsFetched(true);
    apiFetch<TicketRecord[]>('/api/tickets?limit=5').then((res) => {
      if (res.success && res.data) {
        setRecentTickets(res.data);
        const total = res.data.reduce((sum, t) => sum + t.price, 0);
        setTodayStats({ count: res.data.length, total });
      }
    });
  }

  // ── Price calculation triggered by zone changes ───────
  const doCalculatePrice = async (from: string, to: string) => {
    if (!from || !to) {
      setFareResult(null);
      setFareError('');
      return;
    }
    if (from === to) {
      setFareError('Les zones de départ et d\'arrivée doivent être différentes.');
      setFareResult(null);
      return;
    }
    setFareError('');
    setPriceLoading(true);
    const res = await apiFetch<FareResult>('/api/pricing/calculate', {
      method: 'POST',
      body: JSON.stringify({ fromZoneId: from, toZoneId: to }),
    });
    if (res.success && res.data) {
      setFareResult(res.data);
      setFareError('');
    } else {
      setFareResult(null);
      setFareError(res.error || 'Tarif non disponible pour ce trajet.');
    }
    setPriceLoading(false);
  };

  // ── Derived values ────────────────────────────────────
  const price = fareResult?.price || 0;
  const change = Math.max(0, Number(amountPaid || 0) - price);
  const quickAmounts = price > 0 ? getQuickAmounts(price) : [];
  const canSell = fromZoneId && toZoneId && fareResult && price > 0 && (
    paymentMethod !== 'cash' || Number(amountPaid || 0) >= price
  );

  // ── Handlers ──────────────────────────────────────────
  const handleFromZoneChange = (value: string) => {
    setFromZoneId(value);
    doCalculatePrice(value, toZoneId);
  };

  const handleToZoneChange = (value: string) => {
    setToZoneId(value);
    doCalculatePrice(fromZoneId, value);
  };

  const swapZones = () => {
    const newFrom = toZoneId;
    const newTo = fromZoneId;
    setFromZoneId(newFrom);
    setToZoneId(newTo);
    doCalculatePrice(newFrom, newTo);
  };

  const refreshTickets = async () => {
    const res = await apiFetch<TicketRecord[]>('/api/tickets?limit=5');
    if (res.success && res.data) {
      setRecentTickets(res.data);
      const total = res.data.reduce((sum, t) => sum + t.price, 0);
      setTodayStats({ count: res.data.length, total });
    }
  };

  const handleOpenSession = async () => {
    setOpeningSession(true);
    const res = await apiFetch<CashSession>('/api/cash-sessions', {
      method: 'POST',
      body: JSON.stringify({ openingBalance: 50000 }),
    });
    if (res.success && res.data) {
      setCashSession(res.data);
    }
    setOpeningSession(false);
  };

  const handleSell = async () => {
    if (!canSell || !fareResult) return;
    setSelling(true);
    setSaleError('');

    const res = await apiFetch('/api/tickets', {
      method: 'POST',
      body: JSON.stringify({
        fromStopId: fromZoneId,
        toStopId: toZoneId,
        price,
        amountPaid: paymentMethod === 'cash' ? Number(amountPaid || 0) : price,
        paymentMethod,
        passengerName: passengerName || null,
      }),
    });

    setSelling(false);

    if (res.success && res.data) {
      setSoldTicket(res.data as SoldTicket);
      refreshTickets();
    } else {
      setSaleError(res.error || 'Erreur lors de la vente du ticket.');
    }
  };

  const handleCloseTicket = () => {
    setSoldTicket(null);
    resetForm();
  };

  const resetForm = () => {
    setFromZoneId('');
    setToZoneId('');
    setFareResult(null);
    setFareError('');
    setPassengerName('');
    setPaymentMethod('cash');
    setAmountPaid('');
    setSaleError('');
  };

  const handlePaymentMethodChange = (method: PaymentMethod) => {
    setPaymentMethod(method);
    if (method !== 'cash') {
      setAmountPaid(String(price));
    } else {
      setAmountPaid('');
    }
  };

  const fromZone = zones.find((z) => z.id === fromZoneId);
  const toZone = zones.find((z) => z.id === toZoneId);

  // ── Render ────────────────────────────────────────────
  return (
    <div className="min-h-full">
      {/* Cash Session Banner */}
      {!sessionLoading && !cashSession && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span className="text-sm font-medium">
                Aucune session de caisse ouverte. Vous devez ouvrir une session avant de vendre.
              </span>
            </div>
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
              onClick={handleOpenSession}
              disabled={openingSession}
            >
              {openingSession ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Wallet className="w-4 h-4 mr-1.5" />
              )}
              Ouvrir Caisse (50 000 FCFA)
            </Button>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Store className="w-6 h-6 text-green-600" />
              Guichet de Vente
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Opérateur : <span className="font-medium text-foreground">{user?.name}</span>
            </p>
          </div>
          {cashSession && (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs px-3 py-1.5 self-start">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              Caisse ouverte
            </Badge>
          )}
        </div>

        {/* Main Content: 2 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: Selling Form */}
          <div className="lg:col-span-2 space-y-5">
            {/* Cash session blocking overlay */}
            {!cashSession && !sessionLoading && (
              <div className="relative">
                <div className="absolute inset-0 z-10 bg-background/80 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <div className="text-center">
                    <Wallet className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground font-medium">
                      Ouvrez une session de caisse pour commencer
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Zone Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <CircleDot className="w-4 h-4 text-green-600" />
                  Sélection du Trajet
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Departure */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Zone de Départ</Label>
                    {zonesLoading ? (
                      <Skeleton className="h-10 w-full rounded-md" />
                    ) : (
                      <Select value={fromZoneId} onValueChange={handleFromZoneChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choisir la zone de départ" />
                        </SelectTrigger>
                        <SelectContent>
                          {zones.filter((z) => z.isActive).map((zone) => (
                            <SelectItem key={zone.id} value={zone.id}>
                              <span className="flex items-center gap-2">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: zone.color || '#16a34a' }}
                                />
                                <span className="text-xs text-muted-foreground">{zone.code}</span>
                                {zone.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Arrival */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Zone d&apos;Arrivée</Label>
                    {zonesLoading ? (
                      <Skeleton className="h-10 w-full rounded-md" />
                    ) : (
                      <Select value={toZoneId} onValueChange={handleToZoneChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choisir la zone d'arrivée" />
                        </SelectTrigger>
                        <SelectContent>
                          {zones.filter((z) => z.isActive).map((zone) => (
                            <SelectItem key={zone.id} value={zone.id}>
                              <span className="flex items-center gap-2">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: zone.color || '#dc2626' }}
                                />
                                <span className="text-xs text-muted-foreground">{zone.code}</span>
                                {zone.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                {/* Swap button */}
                {(fromZoneId || toZoneId) && (
                  <div className="flex justify-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={swapZones}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <ArrowRightLeft className="w-4 h-4 mr-1" />
                      Inverser
                    </Button>
                  </div>
                )}

                {/* Price Display */}
                {priceLoading && (
                  <div className="flex items-center justify-center py-3 gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Calcul du tarif...</span>
                  </div>
                )}

                {fareError && (
                  <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
                    {fareError}
                  </div>
                )}

                {fareResult && !priceLoading && (
                  <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-center gap-3 text-sm">
                      <span className="font-medium">{fareResult.fromZoneName}</span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{fareResult.toZoneName}</span>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Tarif</p>
                      <p className="text-3xl font-extrabold text-green-600 dark:text-green-400">
                        {formatCurrency(fareResult.price)}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Passenger + Payment */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-green-600" />
                  Paiement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Passenger Name (optional) */}
                <div className="space-y-1.5">
                  <Label htmlFor="passengerName" className="text-sm font-medium">
                    Nom du passager <span className="text-muted-foreground font-normal">(optionnel)</span>
                  </Label>
                  <Input
                    id="passengerName"
                    placeholder="Nom complet du passager"
                    value={passengerName}
                    onChange={(e) => setPassengerName(e.target.value)}
                  />
                </div>

                {/* Payment Method */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Mode de paiement</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      { value: 'cash' as PaymentMethod, icon: Banknote, label: 'Espèces' },
                      { value: 'mobile' as PaymentMethod, icon: Smartphone, label: 'Mobile Money' },
                      { value: 'card' as PaymentMethod, icon: CreditCard, label: 'Carte' },
                    ] as const).map((method) => (
                      <button
                        key={method.value}
                        type="button"
                        onClick={() => handlePaymentMethodChange(method.value)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                          paymentMethod === method.value
                            ? 'border-green-600 bg-green-50 dark:bg-green-950/30 dark:border-green-500'
                            : 'border-muted hover:border-muted-foreground/30'
                        }`}
                      >
                        <method.icon className={`w-5 h-5 ${
                          paymentMethod === method.value
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-muted-foreground'
                        }`} />
                        <span className={`text-xs font-medium ${
                          paymentMethod === method.value
                            ? 'text-green-700 dark:text-green-300'
                            : 'text-muted-foreground'
                        }`}>
                          {method.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cash amount input */}
                {paymentMethod === 'cash' && price > 0 && (
                  <div className="space-y-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                    <Label htmlFor="amountPaid" className="text-sm font-semibold flex items-center gap-1">
                      <Banknote className="w-4 h-4" />
                      Montant reçu
                    </Label>
                    <Input
                      id="amountPaid"
                      type="number"
                      placeholder="0"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      className="text-xl font-bold text-center h-12"
                      min={price}
                      step={50}
                      autoFocus
                    />

                    {/* Quick amount buttons */}
                    {quickAmounts.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {quickAmounts.map((amount) => (
                          <Button
                            key={amount}
                            variant="outline"
                            size="sm"
                            onClick={() => setAmountPaid(String(amount))}
                            className="text-xs h-8"
                          >
                            {formatCurrency(amount)}
                          </Button>
                        ))}
                      </div>
                    )}

                    {/* Change display */}
                    {Number(amountPaid || 0) > 0 && (
                      <div className={`rounded-lg p-3 text-center ${
                        Number(amountPaid || 0) >= price
                          ? 'bg-green-100 dark:bg-green-950/40 border border-green-200 dark:border-green-800'
                          : 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800'
                      }`}>
                        {Number(amountPaid || 0) >= price ? (
                          <>
                            <p className="text-xs text-green-600 dark:text-green-400 font-medium">Monnaie à rendre</p>
                            <p className="text-2xl font-extrabold text-green-700 dark:text-green-300">
                              {formatCurrency(change)}
                            </p>
                          </>
                        ) : (
                          <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                            Il manque {formatCurrency(price - Number(amountPaid || 0))}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Non-cash info */}
                {paymentMethod !== 'cash' && price > 0 && (
                  <div className="bg-muted/50 rounded-lg p-3 text-center text-sm text-muted-foreground">
                    <p>
                      Le montant de <strong className="text-foreground">{formatCurrency(price)}</strong> sera encaissé via{' '}
                      {paymentMethod === 'mobile' ? 'Mobile Money' : 'Carte bancaire'}.
                    </p>
                  </div>
                )}

                {/* Error */}
                {saleError && (
                  <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
                    {saleError}
                  </div>
                )}

                {/* SELL BUTTON */}
                <Button
                  onClick={handleSell}
                  disabled={!canSell || selling || !cashSession}
                  className="w-full h-14 text-lg font-bold bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                >
                  {selling ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Ticket className="w-5 h-5 mr-2" />
                      VENDRE LE TICKET 🎟️
                      {price > 0 && (
                        <span className="ml-2 font-mono text-base">— {formatCurrency(price)}</span>
                      )}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: Today's Summary */}
          <div className="space-y-5">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Ticket className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <p className="text-2xl font-bold">{todayStats.count}</p>
                <p className="text-xs text-muted-foreground">Tickets aujourd&apos;hui</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
                <p className="text-2xl font-bold">{formatCurrency(todayStats.total)}</p>
                <p className="text-xs text-muted-foreground">Total aujourd&apos;hui</p>
              </Card>
            </div>

            {/* Cash Session Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-muted-foreground" />
                  Session de Caisse
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sessionLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ) : cashSession ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Statut</span>
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">
                        Ouverte
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fond de caisse</span>
                      <span className="font-medium">{formatCurrency(cashSession.openingBalance)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <p className="text-sm text-muted-foreground">Aucune session ouverte</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Last 5 Tickets */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  Dernières Ventes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentTickets.length === 0 ? (
                  <div className="text-center py-6">
                    <Ticket className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-xs text-muted-foreground">Aucune vente aujourd&apos;hui</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {recentTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                          <Ticket className="w-4 h-4 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 text-sm font-medium truncate">
                            <span className="truncate">{ticket.fromZone}</span>
                            <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span className="truncate">{ticket.toZone}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {ticket.passengerName || 'Passager anonyme'}
                            {ticket.createdAt && ` · ${formatDate(ticket.createdAt)}`}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-green-600 dark:text-green-400 shrink-0">
                          {formatCurrency(ticket.price)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Ticket Card Modal */}
      {soldTicket && (
        <TicketCard
          ticket={soldTicket}
          onClose={handleCloseTicket}
          onNewSale={() => {}}
        />
      )}
    </div>
  );
}
