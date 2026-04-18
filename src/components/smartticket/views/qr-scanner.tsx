'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch, formatDate, formatCurrency, getStatusColor, getStatusLabel } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { useOfflineSync } from '@/hooks/use-offline-sync';
import { verifyQROffline, OfflineVerifyResponse } from '@/lib/offline-qr-verify';
import { addPendingControl } from '@/lib/offline-store';
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
  CameraOff,
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
  WifiOff,
  Wifi,
  Download,
  Upload,
  CloudOff,
  Keyboard,
} from 'lucide-react';

type ScanResult = 'VALID' | 'EXPIRED' | 'ALREADY_USED' | 'FALSIFIED' | 'NOT_FOUND' | 'INVALID' | 'BLACKLISTED';
type ScannerMode = 'camera' | 'manual';

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
  offline?: boolean;
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
  BLACKLISTED: {
    icon: <ShieldX className="w-16 h-16" />,
    color: 'text-red-600',
    label: 'TICKET ANNULÉ',
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

const SCANNER_ELEMENT_ID = 'smartticket-admin-scanner';

export default function QrScannerView() {
  const [qrInput, setQrInput] = useState('');
  const [scanResult, setScanResult] = useState<ValidationResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [todayValid, setTodayValid] = useState(0);
  const [todayInvalid, setTodayInvalid] = useState(0);
  const [syncResult, setSyncResult] = useState<{ synced: number; failed: number } | null>(null);
  const [scannerMode, setScannerMode] = useState<ScannerMode>('camera');
  const [cameraInitializing, setCameraInitializing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const autoResetRef = useRef<NodeJS.Timeout | null>(null);
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);
  const syncResultRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const html5QrRef = useRef<any>(null);
  const isMountedRef = useRef(true);
  const isStoppingRef = useRef(false);

  const {
    isOnline,
    pendingCount,
    isSyncing,
    isDownloading,
    lastSyncError,
    syncPendingControls,
    downloadOfflineData,
    fullSync,
  } = useOfflineSync();

  // Keep handleScan in a ref so the camera callback always calls the latest version
  const handleScanRef = useRef<(qrString: string) => Promise<void>>();

  const fetchTodayStats = useCallback(async () => {
    if (!isOnline) return;
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
  }, [isOnline]);

  useEffect(() => {
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

  const queueOfflineControl = async (
    qrString: string,
    result: string,
    reason?: string
  ) => {
    await addPendingControl({
      qrString,
      result,
      reason,
      scannedAt: new Date().toISOString(),
    });
  };

  const convertOfflineResult = (
    offlineRes: OfflineVerifyResponse
  ): ValidationResult => {
    return {
      success: offlineRes.result === 'VALID',
      offline: true,
      data: offlineRes.payload
        ? {
            ticket: {
              id: offlineRes.payload.ticketId,
              ticketNumber: offlineRes.payload.ticketNumber,
              type: offlineRes.payload.type,
              status: offlineRes.result === 'VALID' ? 'VALID' : offlineRes.result,
              price: 0,
              validFrom: offlineRes.payload.validFrom,
              validTo: offlineRes.payload.validTo,
              passengerName: offlineRes.payload.passengerName || null,
              passengerPhone: null,
              passengerPhoto: null,
              fromStop: offlineRes.payload.fromStop
                ? { name: offlineRes.payload.fromStop }
                : null,
              toStop: offlineRes.payload.toStop
                ? { name: offlineRes.payload.toStop }
                : null,
              line: null,
            },
            result: offlineRes.result as ScanResult,
            reason: offlineRes.reason,
          }
        : undefined,
      error:
        offlineRes.result !== 'VALID' && !offlineRes.payload
          ? offlineRes.reason
          : undefined,
    };
  };

  const handleScan = async (qrString: string) => {
    if (!qrString.trim() || scanning || cooldown) return;

    setScanning(true);
    setScanResult(null);

    if (autoResetRef.current) clearTimeout(autoResetRef.current);

    const trimmedQr = qrString.trim();

    if (!isOnline) {
      // Offline validation
      try {
        const offlineRes = await verifyQROffline(trimmedQr);
        const result = convertOfflineResult(offlineRes);

        // Queue the control for later sync
        await queueOfflineControl(trimmedQr, offlineRes.result, offlineRes.reason);

        setScanResult(result);
        setScanning(false);

        const isValid = offlineRes.result === 'VALID';
        playBeep(isValid);
      } catch {
        setScanResult({
          success: false,
          offline: true,
          error: 'Erreur de validation hors-ligne',
          data: {
            ticket: {
              id: '',
              ticketNumber: '',
              type: 'UNIT',
              status: 'INVALID',
              price: 0,
              validFrom: '',
              validTo: '',
              passengerName: null,
              passengerPhone: null,
              passengerPhoto: null,
              fromStop: null,
              toStop: null,
              line: null,
            },
            result: 'INVALID',
            reason: 'Erreur de validation hors-ligne',
          },
        });
        setScanning(false);
        playBeep(false);
      }
    } else {
      // Online validation (server API)
      const res = await apiFetch('/api/tickets/validate', {
        method: 'POST',
        body: JSON.stringify({ qrString: trimmedQr }),
      });

      setScanResult(res);
      setScanning(false);

      const isValid = res.success === true;
      playBeep(isValid);
      fetchTodayStats();
    }

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

  // Keep handleScan ref updated
  handleScanRef.current = handleScan;

  // Camera management
  const stopCamera = useCallback(async () => {
    if (html5QrRef.current && !isStoppingRef.current) {
      isStoppingRef.current = true;
      try {
        await html5QrRef.current.stop();
      } catch {
        // Ignore stop errors (scanner may already be stopped)
      }
      try {
        html5QrRef.current.clear();
      } catch {
        // Ignore clear errors
      }
      html5QrRef.current = null;
      isStoppingRef.current = false;
    }
  }, []);

  const startCamera = useCallback(async () => {
    if (!isMountedRef.current) return;

    setCameraInitializing(true);
    setCameraError(null);

    try {
      const { Html5Qrcode } = await import('html5-qrcode');

      if (!isMountedRef.current) return;

      // Ensure the scanner element exists
      const scannerEl = document.getElementById(SCANNER_ELEMENT_ID);
      if (!scannerEl) {
        if (isMountedRef.current) {
          setCameraError('Élément de scanner introuvable.');
          setCameraInitializing(false);
        }
        return;
      }

      // Make sure any previous instance is cleaned up
      await stopCamera();
      if (!isMountedRef.current) return;

      const html5QrCode = new Html5Qrcode(SCANNER_ELEMENT_ID);
      html5QrRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        (decodedText: string) => {
          // This callback fires continuously from the camera feed.
          // Use the ref to call the latest handleScan.
          if (handleScanRef.current && !scanning && !cooldown) {
            handleScanRef.current(decodedText);
          }
        },
        () => {
          // Ignore continuous QR detection failures (no QR in frame)
        }
      );

      if (isMountedRef.current) {
        setCameraInitializing(false);
        setCameraError(null);
      }
    } catch (err: any) {
      if (!isMountedRef.current) return;

      console.error('Camera error:', err);
      setCameraInitializing(false);
      html5QrRef.current = null;

      const errStr = err?.toString() || '';
      if (errStr.includes('NotAllowedError') || errStr.includes('Permission')) {
        setCameraError('Caméra non autorisée. Veuillez autoriser l\'accès à la caméra dans les paramètres de votre navigateur.');
      } else if (errStr.includes('NotFoundError') || errStr.includes('Requested device not found')) {
        setCameraError('Aucune caméra détectée sur cet appareil.');
      } else if (errStr.includes('NotReadableError') || errStr.includes('Could not start')) {
        setCameraError('La caméra est déjà utilisée par une autre application.');
      } else {
        setCameraError(`Erreur caméra : ${err?.message || 'Impossible de démarrer la caméra.'}`);
      }

      // Auto-fallback to manual mode
      setScannerMode('manual');
    }
  }, [scanning, cooldown, stopCamera]);

  // Start/stop camera when scannerMode changes
  useEffect(() => {
    if (scannerMode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
  }, [scannerMode, startCamera, stopCamera]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    inputRef.current?.focus();
    return () => {
      isMountedRef.current = false;
      if (autoResetRef.current) clearTimeout(autoResetRef.current);
      if (cooldownRef.current) clearTimeout(cooldownRef.current);
      if (syncResultRef.current) clearTimeout(syncResultRef.current);
      // Stop camera on unmount
      if (html5QrRef.current) {
        html5QrRef.current.stop().catch(() => {});
        html5QrRef.current = null;
      }
    };
  }, []);

  const handleDemoScan = () => {
    const demoStrings = [
      'SMARTTK|TK-20250101-0001|1735689600|1735700400|abc123|demo_sig',
      'SMARTTK|EXPIRED-TICKET|1700000000|1700000001|xyz|expired_sig',
      'INVALID_QR_STRING',
    ];
    const randomDemo = demoStrings[Math.floor(Math.random() * demoStrings.length)];
    setQrInput(randomDemo);
    handleScan(randomDemo);
  };

  const handleSync = async () => {
    const result = await fullSync();
    setSyncResult(result);
    fetchTodayStats();

    if (syncResultRef.current) clearTimeout(syncResultRef.current);
    syncResultRef.current = setTimeout(() => setSyncResult(null), 4000);
  };

  const resultType: ScanResult | null = scanResult?.data
    ? scanResult.data.result
    : scanResult?.error
    ? 'NOT_FOUND'
    : null;
  const config = resultType ? RESULT_CONFIG[resultType] : null;

  // Show the camera placeholder or the real scanner
  const showViewfinderPlaceholder = scannerMode === 'manual' || cameraInitializing || !!cameraError;

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* Offline Indicator Banner */}
      {!isOnline && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <WifiOff className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">
              Mode hors-ligne
            </p>
            <p className="text-xs text-amber-600">
              Les tickets sont vérifiés localement. Les contrôles seront synchronisés automatiquement.
            </p>
          </div>
          <Badge variant="outline" className="flex-shrink-0 bg-amber-100 text-amber-700 border-amber-300 text-xs">
            HORS-LIGNE
          </Badge>
        </div>
      )}

      {/* Sync Status & Controls */}
      {(pendingCount > 0 || !isOnline || syncResult || lastSyncError) && (
        <Card className="border-dashed">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {isOnline ? (
                  <Wifi className="w-4 h-4 text-green-600 flex-shrink-0" />
                ) : (
                  <CloudOff className="w-4 h-4 text-amber-500 flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {isOnline
                      ? 'Connecté'
                      : 'Hors-ligne'}
                  </p>
                  {pendingCount > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {pendingCount} contrôle{pendingCount > 1 ? 's' : ''} en attente de synchronisation
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {syncResult && (
                  <span className="text-xs text-green-600 font-medium">
                    {syncResult.synced} synchronisé{syncResult.synced > 1 ? 's' : ''}
                  </span>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSync}
                  disabled={isSyncing || isDownloading || (!isOnline && pendingCount === 0)}
                  className="text-xs h-8"
                >
                  {isSyncing || isDownloading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  )}
                  Synchroniser
                </Button>
              </div>
            </div>

            {lastSyncError && (
              <p className="text-xs text-red-500 mt-2">{lastSyncError}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Download Offline Data Button (when online) */}
      {isOnline && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={downloadOfflineData}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
            ) : (
              <Download className="w-3.5 h-3.5 mr-1.5" />
            )}
            Télécharger données hors-ligne
          </Button>
          {pendingCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={syncPendingControls}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              ) : (
                <Upload className="w-3.5 h-3.5 mr-1.5" />
              )}
              Envoyer contrôles ({pendingCount})
            </Button>
          )}
        </div>
      )}

      {/* Scanner Area */}
      <Card className={`border-2 ${scanResult ? (resultType === 'VALID' ? 'border-green-400' : 'border-red-400') : 'border-primary/30'} transition-colors`}>
        <CardContent className="p-4">
          {/* Scanner Mode Toggle */}
          <div className="flex rounded-lg overflow-hidden border mb-4 bg-muted/50">
            <button
              onClick={() => setScannerMode('camera')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-all ${
                scannerMode === 'camera'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Camera className="w-4 h-4" />
              Caméra
            </button>
            <button
              onClick={() => setScannerMode('manual')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-all border-l ${
                scannerMode === 'manual'
                  ? 'bg-primary text-primary-foreground shadow-sm border-l-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted border-l-border'
              }`}
            >
              <Keyboard className="w-4 h-4" />
              Manuel
            </button>
          </div>

          {/* Viewfinder */}
          <div className="relative aspect-square max-w-[300px] mx-auto rounded-2xl overflow-hidden bg-gray-950 mb-4">
            {/* Offline overlay indicator in viewfinder */}
            {!isOnline && !scanResult && !scanning && (
              <div className="absolute top-2 right-2 z-10">
                <Badge className="bg-amber-500 text-white text-[10px] px-2 py-0.5">
                  <WifiOff className="w-3 h-3 mr-1" />
                  HORS-LIGNE
                </Badge>
              </div>
            )}

            {/* === CAMERA MODE: Real scanner div === */}
            {scannerMode === 'camera' && !cameraInitializing && !cameraError && (
              <>
                {/* The html5-qrcode renders a <video> and <canvas> into this div */}
                <div id={SCANNER_ELEMENT_ID} className="w-full h-full" />
                {/* Corner markers on top of camera feed */}
                <div className="absolute inset-4 pointer-events-none">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white rounded-tl-md" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white rounded-tr-md" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white rounded-bl-md" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white rounded-br-md" />
                </div>
                {/* Scan line animation on top of camera */}
                {!scanResult && !scanning && (
                  <div className={`absolute inset-x-0 top-0 h-0.5 shadow-[0_0_10px_rgba(74,222,128,0.8)] animate-bounce pointer-events-none ${isOnline ? 'bg-green-400' : 'bg-amber-400'}`} />
                )}
              </>
            )}

            {/* === CAMERA MODE: Initializing spinner === */}
            {scannerMode === 'camera' && cameraInitializing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
                <Loader2 className="w-12 h-12 animate-spin" />
                <p className="text-sm opacity-70">Démarrage de la caméra...</p>
              </div>
            )}

            {/* === CAMERA MODE: Error state === */}
            {scannerMode === 'camera' && cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-400 px-6">
                <CameraOff className="w-12 h-12 opacity-50" />
                <p className="text-xs text-center opacity-70">{cameraError}</p>
                <button
                  onClick={() => startCamera()}
                  className="mt-1 text-xs text-white/70 hover:text-white underline underline-offset-2 transition-colors"
                >
                  Réessayer
                </button>
              </div>
            )}

            {/* === MANUAL MODE: Placeholder with corners + scan line === */}
            {showViewfinderPlaceholder && (
              <>
                {/* Corner markers */}
                <div className="absolute inset-4 pointer-events-none">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white rounded-tl-md" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white rounded-tr-md" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white rounded-bl-md" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white rounded-br-md" />
                </div>

                {/* Scan line animation */}
                {!scanResult && !scanning && (
                  <div className={`absolute inset-x-0 top-0 h-0.5 shadow-[0_0_10px_rgba(74,222,128,0.8)] animate-bounce pointer-events-none ${isOnline ? 'bg-green-400' : 'bg-amber-400'}`} />
                )}

                {/* Placeholder icon & text */}
                {!scanResult && !scanning && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 gap-2">
                    <Camera className="w-12 h-12 opacity-30" />
                    <p className="text-xs opacity-50">Scanner un ticket</p>
                  </div>
                )}
              </>
            )}

            {/* Scanning overlay (covers both modes during API validation) */}
            {scanning && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
                <Loader2 className="w-12 h-12 animate-spin text-white" />
              </div>
            )}

            {/* Result overlay (covers both modes) */}
            {scanResult && config && (
              <div className={`absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 z-20 ${config.bg}`}>
                <div className={config.color}>{config.icon}</div>
                <p className={`text-xl font-bold ${config.color}`}>{config.label}</p>
                {scanResult.data?.reason && (
                  <p className="text-sm text-muted-foreground text-center">{scanResult.data.reason}</p>
                )}
                {scanResult.error && (
                  <p className="text-sm text-muted-foreground text-center">{scanResult.error}</p>
                )}
                {scanResult.offline && (
                  <Badge variant="outline" className="text-xs bg-white/50 border-amber-300 text-amber-700">
                    <WifiOff className="w-3 h-3 mr-1" />
                    Vérification hors-ligne
                  </Badge>
                )}
                <p className="text-xs text-muted-foreground mt-2">Réinitialisation automatique...</p>
              </div>
            )}
          </div>

          {/* QR Input (always visible as manual input; primary in manual mode) */}
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
