'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch, formatDate, formatCurrency, getStatusColor, getStatusLabel } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import {
  QrCode,
  ScanLine,
  CheckCircle,
  XCircle,
  Camera,
  Volume2,
  VolumeX,
  Loader2,
  Ticket,
  User,
  Clock,
  CalendarDays,
  MapPin,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  ShieldX,
  Smartphone,
} from 'lucide-react';

type ScanResult = 'VALID' | 'EXPIRED' | 'ALREADY_USED' | 'FALSIFIED' | 'NOT_FOUND' | 'INVALID';

interface ValidationResult {
  success: boolean;
  data?: {
    ticket: {
      id: string;
      ticketNumber: string;
      type: string;
      status: string;
      price: number;
      validFrom: string;
      validTo: string;
      passengerName: string | null;
      passengerPhone: string | null;
      passengerPhoto: string | null;
      fromStop: { name: string } | null;
      toStop: { name: string } | null;
      line: { name: string; number: number } | null;
    };
    result: ScanResult;
    reason?: string;
  };
  error?: string;
}

const RESULT_CONFIG: Record<ScanResult, { icon: React.ReactNode; color: string; label: string; bg: string }> = {
  VALID: {
    icon: <CheckCircle className="w-16 h-16" />,
    color: 'text-green-600',
    label: 'TICKET VALIDE',
    bg: 'bg-green-50 border-green-200',
  },
  EXPIRED: {
    icon: <XCircle className="w-16 h-16" />,
    color: 'text-amber-600',
    label: 'TICKET EXPIRÉ',
    bg: 'bg-amber-50 border-amber-200',
  },
  ALREADY_USED: {
    icon: <XCircle className="w-16 h-16" />,
    color: 'text-orange-600',
    label: 'DÉJÀ UTILISÉ',
    bg: 'bg-orange-50 border-orange-200',
  },
  FALSIFIED: {
    icon: <ShieldX className="w-16 h-16" />,
    color: 'text-red-600',
    label: 'TICKET FALSIFIÉ',
    bg: 'bg-red-50 border-red-200',
  },
  NOT_FOUND: {
    icon: <XCircle className="w-16 h-16" />,
    color: 'text-gray-600',
    label: 'TICKET INCONNU',
    bg: 'bg-gray-50 border-gray-200',
  },
  INVALID: {
    icon: <ShieldX className="w-16 h-16" />,
    color: 'text-red-600',
    label: 'TICKET INVALIDE',
    bg: 'bg-red-50 border-red-200',
  },
};

export default function QrScannerView() {
  const [qrInput, setQrInput] = useState('');
  const [scanResult, setScanResult] = useState<ValidationResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [todayValid, setTodayValid] = useState(0);
  const [todayInvalid, setTodayInvalid] = useState(0);
  const autoResetRef = useRef<NodeJS.Timeout | null>(null);
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchTodayStats = useCallback(async () => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    const res = await apiFetch<{
      totalScans: number;
      validCount: number;
      invalidCount: number;
    }>('/api/controls/stats?controllerId=' + user.id);

    if (res.success && res.data) {
      setTodayValid(res.data.validCount);
      setTodayInvalid(res.data.invalidCount);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTodayStats();
  }, [fetchTodayStats]);

  const playBeep = (isValid: boolean) => {
    if (!soundEnabled) return;
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.value = 0.3;

      if (isValid) {
        osc.frequency.value = 880;
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else {
        osc.frequency.value = 300;
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch {
      // Audio not supported
    }
  };

  const handleScan = async (qrString: string) => {
    if (!qrString.trim() || scanning || cooldown) return;

    setScanning(true);
    setScanResult(null);

    if (autoResetRef.current) clearTimeout(autoResetRef.current);

    const res = await apiFetch('/api/tickets/validate', {
      method: 'POST',
      body: JSON.stringify({ qrString: qrString.trim() }),
    });

    setScanResult(res);
    setScanning(false);

    const isValid = res.success === true;
    playBeep(isValid);
    fetchTodayStats();

    // Auto reset after 3 seconds
    autoResetRef.current = setTimeout(() => {
      setScanResult(null);
      setQrInput('');
      inputRef.current?.focus();
    }, 3000);

    // Cooldown: disable scan for 2 seconds
    setCooldown(true);
    cooldownRef.current = setTimeout(() => setCooldown(false), 2000);
  };

  const handleDemoScan = () => {
    // Generate a demo QR string for testing
    const demoStrings = [
      'SMARTTK|TK-20250101-0001|1735689600|1735700400|abc123|demo_sig',
      'SMARTTK|EXPIRED-TICKET|1700000000|1700000001|xyz|expired_sig',
      'INVALID_QR_STRING',
    ];
    const randomDemo = demoStrings[Math.floor(Math.random() * demoStrings.length)];
    setQrInput(randomDemo);
    handleScan(randomDemo);
  };

  const resultType: ScanResult | null = scanResult?.data
    ? scanResult.data.result
    : scanResult?.error
    ? 'NOT_FOUND'
    : null;
  const config = resultType ? RESULT_CONFIG[resultType] : null;

  useEffect(() => {
    inputRef.current?.focus();
    return () => {
      if (autoResetRef.current) clearTimeout(autoResetRef.current);
      if (cooldownRef.current) clearTimeout(cooldownRef.current);
    };
  }, []);

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* Scanner Area */}
      <Card className={`border-2 ${scanResult ? (resultType === 'VALID' ? 'border-green-400' : 'border-red-400') : 'border-primary/30'} transition-colors`}>
        <CardContent className="p-4">
          {/* Viewfinder */}
          <div className="relative aspect-square max-w-[300px] mx-auto rounded-2xl overflow-hidden bg-gray-950 mb-4">
            {/* Corner markers */}
            <div className="absolute inset-4">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white rounded-tl-md" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white rounded-tr-md" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white rounded-bl-md" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white rounded-br-md" />
            </div>

            {/* Scan line animation */}
            {!scanResult && !scanning && (
              <div className="absolute inset-x-0 top-0 h-0.5 bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.8)] animate-bounce" />
            )}

            {scanning && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Loader2 className="w-12 h-12 animate-spin text-white" />
              </div>
            )}

            {/* Result overlay */}
            {scanResult && config && (
              <div className={`absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 ${config.bg}`}>
                <div className={config.color}>{config.icon}</div>
                <p className={`text-xl font-bold ${config.color}`}>{config.label}</p>
                {scanResult.data?.reason && (
                  <p className="text-sm text-muted-foreground text-center">{scanResult.data.reason}</p>
                )}
                {scanResult.error && (
                  <p className="text-sm text-muted-foreground text-center">{scanResult.error}</p>
                )}
                <p className="text-xs text-muted-foreground mt-2">Réinitialisation automatique...</p>
              </div>
            )}

            {/* Camera placeholder */}
            {!scanResult && !scanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 gap-2">
                <Camera className="w-12 h-12 opacity-30" />
                <p className="text-xs opacity-50">Scanner un ticket</p>
              </div>
            )}
          </div>

          {/* QR Input */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  placeholder="Coller ou saisir le QR..."
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleScan(qrInput)}
                  className="pl-9 h-12 text-base font-mono"
                  disabled={scanning || cooldown}
                />
              </div>
              <Button
                onClick={() => handleScan(qrInput)}
                disabled={scanning || cooldown || !qrInput.trim()}
                className="h-12 px-6 bg-green-600 hover:bg-green-700 text-white font-bold"
              >
                {scanning || cooldown ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <ScanLine className="w-5 h-5" />
                )}
              </Button>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleDemoScan}
              disabled={scanning || cooldown}
            >
              <Smartphone className="w-4 h-4 mr-2" />
              Scanner un Ticket (Démo)
            </Button>

            {/* Sound toggle */}
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="text-muted-foreground"
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                <span className="text-xs ml-1">{soundEnabled ? 'Son activé' : 'Son désactivé'}</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ticket Details (on valid scan) */}
      {scanResult?.success && scanResult.data?.ticket && (
        <Card className="border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-green-700">
              <ShieldCheck className="w-5 h-5" /> Détails du Ticket
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">N° Ticket</p>
                <p className="font-mono font-bold">{scanResult.data.ticket.ticketNumber}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Type</p>
                <Badge variant={scanResult.data.ticket.type === 'SUBSCRIPTION' ? 'secondary' : 'default'}>
                  {scanResult.data.ticket.type === 'UNIT' ? 'Unité' : 'Abonnement'}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Prix</p>
                <p className="font-semibold">{formatCurrency(scanResult.data.ticket.price)}</p>
              </div>
              {scanResult.data.ticket.line && (
                <div>
                  <p className="text-muted-foreground text-xs">Ligne</p>
                  <p className="font-medium">
                    {scanResult.data.ticket.line.number} - {scanResult.data.ticket.line.name}
                  </p>
                </div>
              )}
            </div>

            {(scanResult.data.ticket.fromStop || scanResult.data.ticket.toStop) && (
              <>
                <Separator />
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-green-600" />
                  <span>{scanResult.data.ticket.fromStop?.name || '?'}</span>
                  <span className="text-muted-foreground">→</span>
                  <span>{scanResult.data.ticket.toStop?.name || '?'}</span>
                </div>
              </>
            )}

            {scanResult.data.ticket.passengerName && (
              <>
                <Separator />
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{scanResult.data.ticket.passengerName}</span>
                  </div>
                  {scanResult.data.ticket.passengerPhone && (
                    <span className="text-muted-foreground">{scanResult.data.ticket.passengerPhone}</span>
                  )}
                </div>
                {scanResult.data.ticket.passengerPhoto && (
                  <div className="flex justify-center">
                    <img
                      src={scanResult.data.ticket.passengerPhoto}
                      alt="Photo passager"
                      className="w-16 h-16 rounded-full object-cover border"
                    />
                  </div>
                )}
              </>
            )}

            <Separator />
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>Valide du {formatDate(scanResult.data.ticket.validFrom)}</span>
              <span className="text-muted-foreground">au {formatDate(scanResult.data.ticket.validTo)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium">Contrôles du jour</span>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchTodayStats}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div className="text-center bg-muted/50 rounded-lg p-3">
              <p className="text-2xl font-bold">{todayValid + todayInvalid}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="text-center bg-green-50 rounded-lg p-3 border border-green-200">
              <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-green-700">{todayValid}</p>
              <p className="text-xs text-green-600">Validés</p>
            </div>
            <div className="text-center bg-red-50 rounded-lg p-3 border border-red-200">
              <XCircle className="w-5 h-5 text-red-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-red-700">{todayInvalid}</p>
              <p className="text-xs text-red-600">Invalides</p>
            </div>
          </div>
          {todayValid + todayInvalid > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Taux de validation</span>
                <span>
                  {todayValid + todayInvalid > 0
                    ? Math.round((todayValid / (todayValid + todayInvalid)) * 100)
                    : 0}
                  %
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{
                    width: `${
                      todayValid + todayInvalid > 0
                        ? (todayValid / (todayValid + todayInvalid)) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
