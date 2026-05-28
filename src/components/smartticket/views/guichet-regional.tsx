'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch, formatCurrency, formatDate } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
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
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bus,
  Clock,
  Users,
  CreditCard,
  Smartphone,
  Banknote,
  CheckCircle,
  Printer,
  AlertTriangle,
  Calendar,
  ArrowRight,
  ArrowLeft,
  Ticket,
  Loader2,
  Wallet,
  RefreshCw,
  MapPin,
  X,
  Store,
  TrendingUp,
  Phone,
  User,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────

interface Line {
  id: string;
  name: string;
  number: number;
  color: string;
  fromStation?: string;
  toStation?: string;
}

type DepartureStatus = 'SCHEDULED' | 'BOARDING' | 'DEPARTED' | 'DELAYED' | 'CANCELLED';

interface Departure {
  id: string;
  lineId: string;
  line?: { id: string; name: string; number: number; color: string };
  departureTime: string;
  platform?: string | null;
  direction: 'outbound' | 'return';
  price: number;
  totalSeats: number;
  bookedSeats: number;
  status: DepartureStatus;
  delayMinutes?: number;
}

interface CashSession {
  id: string;
  status: string;
  openingBalance: number;
  operator?: { name: string } | null;
}

interface RecentSale {
  id: string;
  ticketNumber: string;
  passengerName: string | null;
  price: number;
  lineLabel?: string;
  direction?: string;
  departureTime?: string;
  soldAt: string;
}

interface SoldTicket {
  id: string;
  ticketNumber: string;
  qrCode?: string;
  price: number;
  amountPaid: number;
  changeGiven: number;
  validFrom: string;
  validTo: string;
  passengerName: string | null;
  passengerPhone?: string | null;
  type: string;
  status: string;
  fromZone?: string;
  toZone?: string;
  lineLabel?: string;
  direction?: string;
  departureTime?: string;
  platform?: string;
  qrImage?: string;
}

type PaymentMethod = 'cash' | 'mobile' | 'card';
type Direction = 'outbound' | 'return';
type Step = 1 | 2 | 3;

const STEP_LABELS = ['Trajet', 'Passager', 'Paiement'];

// ── Helpers ────────────────────────────────────────────

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function tomorrowStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return 'Demain';
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).format(d);
}

function getQuickAmounts(price: number): number[] {
  const amounts = new Set<number>();
  const targets = [price, 500, 1000, 2000, 5000, 10000];
  for (const t of targets) {
    const rounded = Math.ceil(t / 50) * 50;
    if (rounded >= price) amounts.add(rounded);
  }
  return Array.from(amounts).sort((a, b) => a - b).slice(0, 4);
}

function departureStatusLabel(status: DepartureStatus): { text: string; emoji: string } {
  switch (status) {
    case 'DELAYED': return { text: 'Retard', emoji: '\u23F0' };
    case 'BOARDING': return { text: 'Embarquement', emoji: '\uD83D\uDEB6' };
    case 'DEPARTED': return { text: 'Parti', emoji: '\uD83D\uDE97' };
    case 'CANCELLED': return { text: 'Annulé', emoji: '\u274C' };
    default: return { text: 'À l\'heure', emoji: '\u2705' };
  }
}

function statusBadgeClass(status: DepartureStatus): string {
  switch (status) {
    case 'DELAYED': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200';
    case 'BOARDING': return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-200';
    case 'DEPARTED': return 'bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400 border-gray-200';
    case 'CANCELLED': return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200';
    default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200';
  }
}

// ── Animation Variants ─────────────────────────────────

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
};

// ── Main Component ─────────────────────────────────────

export default function GuichetRegional() {
  const user = useAuthStore((s) => s.user);

  // ── Step navigation ──
  const [step, setStep] = useState<Step>(1);
  const [stepDirection, setStepDirection] = useState<number>(1);

  // ── Data ──
  const [lines, setLines] = useState<Line[]>([]);
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [cashSession, setCashSession] = useState<CashSession | null>(null);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [todayStats, setTodayStats] = useState({ count: 0, revenue: 0 });

  // ── Loading states ──
  const [linesLoading, setLinesLoading] = useState(true);
  const [departuresLoading, setDeparturesLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [selling, setSelling] = useState(false);
  const [openingSession, setOpeningSession] = useState(false);

  // ── Form: Step 1 ──
  const [selectedDate, setSelectedDate] = useState<string>(todayStr());
  const [selectedLineId, setSelectedLineId] = useState<string>('');
  const [direction, setDirection] = useState<Direction>('outbound');
  const [selectedDeparture, setSelectedDeparture] = useState<Departure | null>(null);

  // ── Form: Step 2 ──
  const [passengerName, setPassengerName] = useState('');
  const [passengerPhone, setPassengerPhone] = useState('');

  // ── Form: Step 3 ──
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [saleError, setSaleError] = useState('');

  // ── Ticket result ──
  const [soldTicket, setSoldTicket] = useState<SoldTicket | null>(null);
  const [showTicketDialog, setShowTicketDialog] = useState(false);

  // ── Auto-refresh timer ──
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastRefreshRef = useRef<number>(0);

  // ── Derived ──
  const price = selectedDeparture?.price || 0;
  const change = Math.max(0, Number(amountPaid || 0) - price);
  const quickAmounts = price > 0 ? getQuickAmounts(price) : [];
  const availableSeats = selectedDeparture
    ? Math.max(0, selectedDeparture.totalSeats - selectedDeparture.bookedSeats)
    : 0;

  const selectedLine = lines.find((l) => l.id === selectedLineId);

  const canSell =
    selectedDeparture &&
    price > 0 &&
    availableSeats > 0 &&
    (paymentMethod !== 'cash' || Number(amountPaid || 0) >= price);

  // ── Fetch lines + cash session on mount ──
  useEffect(() => {
    apiFetch<Line[]>('/api/lines').then((res) => {
      if (res.success && res.data) setLines(res.data);
      setLinesLoading(false);
    });

    apiFetch<CashSession[]>('/api/cash-sessions?status=OPEN').then((res) => {
      if (res.success && res.data && res.data.length > 0) {
        setCashSession(res.data[0]);
      }
      setSessionLoading(false);
    });

    fetchRecentSales();
  }, []);

  // ── Fetch departures when date / line / direction change ──
  useEffect(() => {
    if (!selectedLineId) {
      setDepartures([]);
      setSelectedDeparture(null);
      return;
    }
    fetchDepartures();
  }, [selectedDate, selectedLineId, direction]);

  // ── Auto-refresh every 60s ──
  useEffect(() => {
    refreshTimerRef.current = setInterval(() => {
      if (selectedLineId) {
        fetchDepartures(true);
      }
      fetchRecentSales();
    }, 60000);

    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [selectedLineId, selectedDate, direction]);

  // ── Data fetchers ──
  const fetchDepartures = useCallback(async (silent = false) => {
    if (!silent) setDeparturesLoading(true);
    const res = await apiFetch<Departure[]>(`/api/departures?date=${selectedDate}&lineId=${selectedLineId}&direction=${direction}`);
    if (res.success && res.data) {
      setDepartures(res.data);
      lastRefreshRef.current = Date.now();
    }
    if (!silent) setDeparturesLoading(false);
  }, [selectedDate, selectedLineId, direction]);

  const fetchRecentSales = useCallback(async () => {
    const res = await apiFetch<{ tickets?: RecentSale[] } | RecentSale[]>('/api/tickets?limit=5');
    if (res.success && res.data) {
      const tickets = Array.isArray(res.data) ? res.data : (res.data.tickets || []);
      setRecentSales(tickets);
      const total = tickets.reduce((sum: number, t: any) => sum + (t.price || 0), 0);
      setTodayStats({ count: tickets.length, revenue: total });
    }
  }, []);

  // ── Handlers ──
  const goToStep = (next: Step) => {
    setStepDirection(next > step ? 1 : -1);
    setStep(next);
  };

  const handleSelectDeparture = (dep: Departure) => {
    if (dep.status === 'DEPARTED' || dep.status === 'CANCELLED') return;
    if (dep.totalSeats - dep.bookedSeats <= 0) return;
    setSelectedDeparture(dep);
    goToStep(2);
  };

  const handlePaymentMethodChange = (method: PaymentMethod) => {
    setPaymentMethod(method);
    if (method !== 'cash') {
      setAmountPaid(String(price));
    } else {
      setAmountPaid('');
    }
  };

  const handleOpenSession = async () => {
    setOpeningSession(true);
    try {
      const res = await apiFetch<CashSession>('/api/cash-sessions', {
        method: 'POST',
        body: JSON.stringify({ openingBalance: 50000 }),
      });
      if (res.success && res.data) {
        setCashSession(res.data);
      }
    } catch {
      // silent
    } finally {
      setOpeningSession(false);
    }
  };

  const handleSell = async () => {
    if (!canSell || !selectedDeparture) return;
    setSelling(true);
    setSaleError('');

    try {
      const res = await apiFetch('/api/tickets/sell', {
        method: 'POST',
        body: JSON.stringify({
          departureId: selectedDeparture.id,
          passengerName: passengerName || null,
          passengerPhone: passengerPhone || null,
          paymentMethod,
          amountPaid: paymentMethod === 'cash' ? Number(amountPaid || 0) : price,
          cashSessionId: cashSession?.id || null,
        }),
      });

      if (res.success && res.data) {
        const ticket = res.data as SoldTicket;
        // Fetch QR code image
        if (ticket.id) {
          const qrRes = await apiFetch<{ qr_image?: string; qrImage?: string }>(`/api/tickets/${ticket.id}/qr`);
          if (qrRes.success && qrRes.data) {
            ticket.qrImage = (qrRes.data as any).qr_image || (qrRes.data as any).qrImage || '';
          }
        }
        setSoldTicket(ticket);
        setShowTicketDialog(true);
        fetchRecentSales();
        fetchDepartures(true);
      } else {
        setSaleError(res.error || 'Erreur lors de la vente du ticket.');
      }
    } catch {
      setSaleError('Erreur réseau. Vérifiez votre connexion.');
    } finally {
      setSelling(false);
    }
  };

  const handleCloseTicket = () => {
    setShowTicketDialog(false);
    setSoldTicket(null);
    resetForm();
  };

  const resetForm = () => {
    setStep(1);
    setSelectedDeparture(null);
    setPassengerName('');
    setPassengerPhone('');
    setPaymentMethod('cash');
    setAmountPaid('');
    setSaleError('');
  };

  const handleRefreshDepartures = () => {
    fetchDepartures();
  };

  // ── Render ────────────────────────────────────────────
  return (
    <div className="min-h-full">
      {/* Cash Session Banner — Blocking if none */}
      {!sessionLoading && !cashSession && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span className="text-sm font-medium">
                Ouvrez une caisse avant de vendre des tickets.
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
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Store className="w-6 h-6 text-green-600" />
              Guichet Régional
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Opérateur : <span className="font-medium text-foreground">{user?.name}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {cashSession && (
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs px-3 py-1.5">
                <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                Caisse ouverte
              </Badge>
            )}
          </div>
        </div>

        {/* ── Step Indicator ── */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              {STEP_LABELS.map((label, i) => {
                const stepNum = (i + 1) as Step;
                const isActive = step === stepNum;
                const isCompleted = step > stepNum;
                return (
                  <div key={label} className="flex items-center gap-2">
                    <div
                      className={`flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold transition-all duration-300 ${
                        isCompleted
                          ? 'bg-green-600 text-white shadow-md shadow-green-200 dark:shadow-green-900/30'
                          : isActive
                            ? 'bg-green-600 text-white shadow-md shadow-green-200 dark:shadow-green-900/30 scale-110'
                            : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {isCompleted ? <CheckCircle className="w-5 h-5" /> : stepNum}
                    </div>
                    <span
                      className={`text-sm font-medium hidden sm:inline transition-colors ${
                        isActive ? 'text-green-700 dark:text-green-400' : isCompleted ? 'text-green-600 dark:text-green-500' : 'text-muted-foreground'
                      }`}
                    >
                      {label}
                    </span>
                    {i < STEP_LABELS.length - 1 && (
                      <div className={`w-8 sm:w-16 h-0.5 rounded-full transition-colors duration-300 ${
                        step > stepNum ? 'bg-green-600' : 'bg-muted'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ── Main Content ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: Step Content */}
          <div className="lg:col-span-2 relative">
            {/* Cash session blocking overlay */}
            {!cashSession && !sessionLoading && (
              <div className="absolute inset-0 z-20 bg-background/80 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <div className="text-center px-4">
                  <Wallet className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-base font-semibold text-muted-foreground">
                    Ouvrez une caisse avant de vendre
                  </p>
                  <p className="text-sm text-muted-foreground/70 mt-1">
                    La vente de tickets nécessite une session de caisse active.
                  </p>
                </div>
              </div>
            )}

            {/* Animated step transitions */}
            <AnimatePresence mode="wait" custom={stepDirection}>
              {/* ═══════════════════════════════════════════ */}
              {/* STEP 1 — Choose Trip                       */}
              {/* ═══════════════════════════════════════════ */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  custom={stepDirection}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="space-y-5"
                >
                  {/* Date + Line Selection */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Bus className="w-4 h-4 text-green-600" />
                        Choisir un Trajet
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Date Picker */}
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-green-600" />
                          Date de départ
                        </Label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => setSelectedDate(todayStr())}
                            className={`p-3 rounded-xl border-2 text-center transition-all ${
                              selectedDate === todayStr()
                                ? 'border-green-600 bg-green-50 dark:bg-green-950/30 dark:border-green-500'
                                : 'border-muted hover:border-green-300 dark:hover:border-green-700'
                            }`}
                          >
                            <p className="text-sm font-bold">Aujourd&apos;hui</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date())}
                            </p>
                          </button>
                          <button
                            onClick={() => setSelectedDate(tomorrowStr())}
                            className={`p-3 rounded-xl border-2 text-center transition-all ${
                              selectedDate === tomorrowStr()
                                ? 'border-green-600 bg-green-50 dark:bg-green-950/30 dark:border-green-500'
                                : 'border-muted hover:border-green-300 dark:hover:border-green-700'
                            }`}
                          >
                            <p className="text-sm font-bold">Demain</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).format(
                                new Date(Date.now() + 86400000)
                              )}
                            </p>
                          </button>
                        </div>
                      </div>

                      {/* Line Selector */}
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium flex items-center gap-1.5">
                          <Bus className="w-4 h-4 text-green-600" />
                          Ligne
                        </Label>
                        {linesLoading ? (
                          <Skeleton className="h-10 w-full rounded-md" />
                        ) : (
                          <Select value={selectedLineId} onValueChange={(v) => {
                            setSelectedLineId(v);
                            setSelectedDeparture(null);
                          }}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Sélectionner une ligne" />
                            </SelectTrigger>
                            <SelectContent>
                              {lines.map((line) => (
                                <SelectItem key={line.id} value={line.id}>
                                  <span className="flex items-center gap-2">
                                    <span
                                      className="w-3 h-3 rounded-full shrink-0"
                                      style={{ backgroundColor: line.color || '#16a34a' }}
                                    />
                                    <span className="font-medium">L{line.number}</span>
                                    <span className="text-muted-foreground">
                                      {line.fromStation || ''}{line.fromStation && line.toStation ? ' \u2194 ' : ' — '}
                                      {line.toStation || line.name}
                                    </span>
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                      {/* Direction Toggle */}
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">Direction</Label>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { value: 'outbound' as Direction, label: 'Aller', emoji: '\u27A1\uFE0F' },
                            { value: 'return' as Direction, label: 'Retour', emoji: '\u2B05\uFE0F' },
                          ].map((d) => (
                            <button
                              key={d.value}
                              onClick={() => {
                                setDirection(d.value);
                                setSelectedDeparture(null);
                              }}
                              className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                                direction === d.value
                                  ? 'border-green-600 bg-green-50 dark:bg-green-950/30 dark:border-green-500 text-green-700 dark:text-green-400'
                                  : 'border-muted text-muted-foreground hover:border-green-300 dark:hover:border-green-700'
                              }`}
                            >
                              <span>{d.emoji}</span>
                              {d.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Departures List */}
                  {selectedLineId && (
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <Clock className="w-4 h-4 text-green-600" />
                            Départs — {formatDisplayDate(selectedDate)}
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleRefreshDepartures}
                              disabled={departuresLoading}
                              className="h-8 px-2"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${departuresLoading ? 'animate-spin' : ''}`} />
                            </Button>
                            {departures.length > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {departures.length} départ{departures.length > 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {departuresLoading ? (
                          <div className="space-y-3">
                            {Array.from({ length: 3 }).map((_, i) => (
                              <Skeleton key={i} className="h-20 w-full rounded-xl" />
                            ))}
                          </div>
                        ) : departures.length === 0 ? (
                          <div className="text-center py-10">
                            <Bus className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                            <p className="text-sm text-muted-foreground font-medium">
                              Aucun départ disponible
                            </p>
                            <p className="text-xs text-muted-foreground/70 mt-1">
                              Essayez une autre date ou direction.
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
                            {departures.map((dep) => {
                              const seats = Math.max(0, dep.totalSeats - dep.bookedSeats);
                              const isFull = seats <= 0;
                              const isDeparted = dep.status === 'DEPARTED';
                              const isCancelled = dep.status === 'CANCELLED';
                              const isDisabled = isFull || isDeparted || isCancelled;
                              const statusInfo = departureStatusLabel(dep.status);

                              return (
                                <motion.button
                                  key={dep.id}
                                  whileHover={!isDisabled ? { scale: 1.02 } : undefined}
                                  whileTap={!isDisabled ? { scale: 0.98 } : undefined}
                                  onClick={() => handleSelectDeparture(dep)}
                                  disabled={isDisabled}
                                  className={`relative text-left p-4 rounded-xl border-2 transition-all ${
                                    isDisabled
                                      ? 'border-muted bg-muted/30 opacity-60 cursor-not-allowed'
                                      : 'border-muted hover:border-green-400 dark:hover:border-green-600 hover:shadow-md cursor-pointer'
                                  } ${isCancelled ? 'border-red-200 dark:border-red-800/50' : ''} ${
                                    selectedDeparture?.id === dep.id
                                      ? 'border-green-600 bg-green-50/50 dark:bg-green-950/20 dark:border-green-500'
                                      : ''
                                  }`}
                                >
                                  {/* Full overlay */}
                                  {isFull && !isDeparted && !isCancelled && (
                                    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/70 z-10">
                                      <Badge className="bg-red-600 text-white text-xs font-bold px-3 py-1">
                                        COMPLET
                                      </Badge>
                                    </div>
                                  )}

                                  {/* Status badge */}
                                  <div className="flex items-center justify-between mb-2">
                                    {dep.status === 'SCHEDULED' || dep.status === 'DELAYED' || dep.status === 'BOARDING' ? (
                                      <Badge className={`text-xs px-2 py-0.5 border ${statusBadgeClass(dep.status)}`}>
                                        {statusInfo.emoji} {statusInfo.text}
                                        {dep.status === 'DELAYED' && dep.delayMinutes && (
                                          <span className="ml-1 font-bold">+{dep.delayMinutes} min</span>
                                        )}
                                      </Badge>
                                    ) : (
                                      <Badge className={`text-xs px-2 py-0.5 border ${statusBadgeClass(dep.status)}`}>
                                        {statusInfo.emoji} {statusInfo.text}
                                      </Badge>
                                    )}
                                    <span className="text-xs text-muted-foreground font-mono">
                                      {dep.platform ? `Quai ${dep.platform}` : ''}
                                    </span>
                                  </div>

                                  {/* Time + Price */}
                                  <div className="flex items-end justify-between">
                                    <div>
                                      <p className="text-2xl font-extrabold text-foreground">
                                        {formatTime(dep.departureTime)}
                                      </p>
                                      {dep.status === 'DELAYED' && dep.delayMinutes && (
                                        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium line-through">
                                          {formatTime(
                                            new Date(
                                              new Date(dep.departureTime).getTime() - dep.delayMinutes * 60000
                                            ).toISOString()
                                          )}
                                        </p>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <p className="text-lg font-bold text-green-600 dark:text-green-400">
                                        {formatCurrency(dep.price)}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Seats indicator */}
                                  {!isDisabled && (
                                    <div className="mt-2 flex items-center gap-1.5">
                                      <Users className="w-3.5 h-3.5 text-muted-foreground" />
                                      <p className={`text-xs font-medium ${
                                        seats <= 5
                                          ? 'text-amber-600 dark:text-amber-400'
                                          : 'text-green-600 dark:text-green-400'
                                      }`}>
                                        {seats} place{seats > 1 ? 's' : ''} disponible{seats > 1 ? 's' : ''}
                                      </p>
                                    </div>
                                  )}

                                  {/* Boarding pulse animation */}
                                  {dep.status === 'BOARDING' && (
                                    <motion.div
                                      className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-green-500"
                                      animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                                      transition={{ duration: 1.5, repeat: Infinity }}
                                    />
                                  )}
                                </motion.button>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </motion.div>
              )}

              {/* ═══════════════════════════════════════════ */}
              {/* STEP 2 — Passenger Info                     */}
              {/* ═══════════════════════════════════════════ */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  custom={stepDirection}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="space-y-5"
                >
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <User className="w-4 h-4 text-green-600" />
                        Informations Passager
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <p className="text-sm text-muted-foreground bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                        Les informations du passager sont optionnelles mais recommandées.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="regional-pax-name" className="text-sm font-medium flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-muted-foreground" />
                            Nom du passager
                          </Label>
                          <Input
                            id="regional-pax-name"
                            placeholder="Ex: Amadou Diallo"
                            value={passengerName}
                            onChange={(e) => setPassengerName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="regional-pax-phone" className="text-sm font-medium flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                            Téléphone
                          </Label>
                          <Input
                            id="regional-pax-phone"
                            type="tel"
                            placeholder="+221 77 123 4567"
                            value={passengerPhone}
                            onChange={(e) => setPassengerPhone(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Trip Summary */}
                      {selectedDeparture && (
                        <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Résumé du trajet</p>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                              <Bus className="w-5 h-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate">
                                {selectedDeparture.line
                                  ? `L${selectedDeparture.line.number} — ${selectedDeparture.line.name}`
                                  : selectedLine
                                    ? `L${selectedLine.number} — ${selectedLine.name}`
                                    : 'Ligne'
                                }
                              </p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3" />
                                {direction === 'outbound' ? 'Aller' : 'Retour'}
                              </p>
                            </div>
                          </div>

                          <Separator />

                          <div className="grid grid-cols-3 gap-3">
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">Heure</p>
                              <p className="text-lg font-bold flex items-center justify-center gap-1">
                                <Clock className="w-4 h-4 text-green-600" />
                                {formatTime(selectedDeparture.departureTime)}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">Quai</p>
                              <p className="text-lg font-bold">
                                {selectedDeparture.platform || '—'}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">Prix</p>
                              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                                {formatCurrency(price)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-muted-foreground" />
                            <p className={`text-xs font-medium ${
                              availableSeats <= 5
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-green-600 dark:text-green-400'
                            }`}>
                              {availableSeats} place{availableSeats > 1 ? 's' : ''} restante{availableSeats > 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between pt-2">
                        <Button variant="outline" onClick={() => goToStep(1)} size="lg">
                          <ArrowLeft className="w-4 h-4 mr-1.5" />
                          Retour
                        </Button>
                        <Button onClick={() => goToStep(3)} size="lg" className="bg-green-600 hover:bg-green-700 text-white font-semibold">
                          Continuer
                          <ArrowRight className="w-4 h-4 ml-1.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* ═══════════════════════════════════════════ */}
              {/* STEP 3 — Payment & Confirmation             */}
              {/* ═══════════════════════════════════════════ */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  custom={stepDirection}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="space-y-5"
                >
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-green-600" />
                        Paiement
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      {/* Order Summary */}
                      {selectedDeparture && (
                        <div className="bg-muted/50 rounded-xl p-4 space-y-2.5">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Ligne</span>
                            <span className="font-medium text-sm">
                              {selectedDeparture.line
                                ? `L${selectedDeparture.line.number} — ${selectedDeparture.line.name}`
                                : 'Ligne'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Direction</span>
                            <Badge variant="outline" className="text-xs">
                              {direction === 'outbound' ? 'Aller' : 'Retour'}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Départ</span>
                            <span className="font-medium text-sm flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                              {formatTime(selectedDeparture.departureTime)}
                            </span>
                          </div>
                          {selectedDeparture.platform && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Quai</span>
                              <span className="font-medium text-sm">{selectedDeparture.platform}</span>
                            </div>
                          )}
                          {passengerName && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Passager</span>
                              <span className="font-medium text-sm">{passengerName}</span>
                            </div>
                          )}
                          <Separator />
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-semibold">Montant à payer</span>
                            <span className="text-2xl font-extrabold text-green-600 dark:text-green-400">
                              {formatCurrency(price)}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Payment Method */}
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Mode de paiement</Label>
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

                      {/* Cash Amount Input */}
                      {paymentMethod === 'cash' && price > 0 && (
                        <div className="space-y-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                          <Label htmlFor="regional-amount" className="text-sm font-semibold flex items-center gap-1">
                            <Banknote className="w-4 h-4" />
                            Montant reçu
                          </Label>
                          <Input
                            id="regional-amount"
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
                            <CheckCircle className="w-5 h-5 mr-2" />
                            CONFIRMER LA VENTE
                            {price > 0 && (
                              <span className="ml-2 font-mono text-base">— {formatCurrency(price)}</span>
                            )}
                          </>
                        )}
                      </Button>

                      <div className="flex justify-between pt-1">
                        <Button variant="outline" onClick={() => goToStep(2)} size="lg">
                          <ArrowLeft className="w-4 h-4 mr-1.5" />
                          Retour
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* RIGHT: Sidebar — Stats + Recent Sales */}
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
                <p className="text-2xl font-bold">{formatCurrency(todayStats.revenue)}</p>
                <p className="text-xs text-muted-foreground">Total aujourd&apos;hui</p>
              </Card>
            </div>

            {/* Cash Session Info */}
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

            {/* Recent Sales */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  Dernières Ventes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentSales.length === 0 ? (
                  <div className="text-center py-6">
                    <Ticket className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-xs text-muted-foreground">Aucune vente aujourd&apos;hui</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {recentSales.map((sale) => (
                      <motion.div
                        key={sale.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                          <Ticket className="w-4 h-4 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {sale.lineLabel || sale.ticketNumber}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {sale.passengerName || 'Passager anonyme'}
                            {sale.soldAt && ` \u00B7 ${formatDate(sale.soldAt)}`}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-green-600 dark:text-green-400 shrink-0">
                          {formatCurrency(sale.price)}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* ── Ticket Confirmation Dialog ── */}
      <Dialog open={showTicketDialog} onOpenChange={(open) => { if (!open) handleCloseTicket(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-green-600 flex items-center justify-center gap-2 text-lg">
              <CheckCircle className="w-6 h-6" />
              Ticket Vendu avec succès !
            </DialogTitle>
            <DialogDescription className="text-center">
              Le billet a été enregistré. Présentez le QR code au contrôleur.
            </DialogDescription>
          </DialogHeader>

          {soldTicket && (
            <div className="space-y-4">
              {/* Ticket Card */}
              <div className="border-2 border-green-200 dark:border-green-800 rounded-2xl overflow-hidden shadow-lg">
                {/* Ticket Header */}
                <div className="bg-green-700 text-white px-5 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Bus className="w-5 h-5" />
                    <span className="text-lg font-extrabold">SmartTicket Bus</span>
                  </div>
                  <p className="text-[10px] text-white/70 uppercase tracking-wider mt-0.5">
                    Ticket Voyage — Guichet Régional
                  </p>
                </div>

                {/* QR Code */}
                <div className="px-5 py-4 text-center bg-white">
                  {soldTicket.qrImage ? (
                    <img
                      src={soldTicket.qrImage}
                      alt="QR Code du ticket"
                      className="w-40 h-40 mx-auto rounded-lg"
                    />
                  ) : soldTicket.qrCode ? (
                    <div className="w-40 h-40 mx-auto flex items-center justify-center border-2 border-dashed border-green-300 rounded-lg">
                      <div className="text-center">
                        <Ticket className="w-8 h-8 text-green-600 mx-auto mb-1" />
                        <p className="text-xs text-muted-foreground">QR</p>
                      </div>
                    </div>
                  ) : (
                    <div className="w-40 h-40 mx-auto flex items-center justify-center border-2 border-dashed border-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">QR Code non disponible</p>
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-2 font-mono font-bold">
                    {soldTicket.ticketNumber}
                  </p>
                </div>

                {/* Ticket Details */}
                <div className="px-5 py-3 space-y-2 bg-muted/30">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Bus className="w-3.5 h-3.5" />
                      Ligne
                    </span>
                    <span className="font-medium">
                      {soldTicket.lineLabel || '—'}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      Direction
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {soldTicket.direction === 'outbound' ? 'Aller' : 'Retour'}
                    </Badge>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Départ
                    </span>
                    <span className="font-medium">
                      {soldTicket.departureTime ? formatTime(soldTicket.departureTime) : '—'}
                    </span>
                  </div>

                  {soldTicket.platform && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Quai</span>
                      <span className="font-medium">{soldTicket.platform}</span>
                    </div>
                  )}

                  {soldTicket.passengerName && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        Passager
                      </span>
                      <span className="font-medium">{soldTicket.passengerName}</span>
                    </div>
                  )}

                  <Separator />

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Prix</span>
                    <span className="font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(soldTicket.price)}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Payé</span>
                    <span className="font-medium">{formatCurrency(soldTicket.amountPaid)}</span>
                  </div>

                  {soldTicket.changeGiven > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Monnaie</span>
                      <span className="font-bold text-green-600">
                        {formatCurrency(soldTicket.changeGiven)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Ticket Footer */}
                <div className="px-5 py-2 text-center border-t border-muted-foreground/10 bg-muted/20">
                  <p className="text-[10px] text-muted-foreground">
                    Opérateur : {user?.name} — {new Intl.DateTimeFormat('fr-FR', {
                      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
                    }).format(new Date())}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    window.print();
                  }}
                  className="flex-1"
                  size="lg"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimer
                </Button>
                <Button
                  onClick={handleCloseTicket}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold"
                  size="lg"
                >
                  Nouvelle Vente
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
