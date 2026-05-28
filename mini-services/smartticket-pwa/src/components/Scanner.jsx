import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { api } from '../services/api';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { initAudio, playResultSound, playBeep } from '../utils/SoundManager';
import Feedback from './Feedback';
import OfflineBanner from './OfflineBanner';

const SCANNER_ID = 'smartticket-reader';

export default function Scanner() {
  const [result, setResult] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannerError, setScannerError] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const scannerRef = useRef(null);
  const lastScanRef = useRef(null);
  const { isOffline, pendingCount, syncStatus, queueScan, syncPending } = useOfflineSync();

  // Initialize audio on first user interaction (browser policy)
  useEffect(() => {
    const init = () => initAudio();
    document.addEventListener('click', init, { once: true });
    document.addEventListener('touchstart', init, { once: true });
    return () => {
      document.removeEventListener('click', init);
      document.removeEventListener('touchstart', init);
    };
  }, []);

  const handleScan = useCallback(async (decodedText) => {
    const now = Date.now();

    // Anti-doublon : bloquer si scan < 3s du même QR code
    if (isScanning) return;
    if (lastScanRef.current && now - lastScanRef.current.time < 3000 && lastScanRef.current.text === decodedText) return;

    setIsScanning(true);
    lastScanRef.current = { text: decodedText, time: now };

    try {
      // Feedback immédiat (vibration + bip)
      if (navigator.vibrate) navigator.vibrate(100);

      if (isOffline) {
        // Mode hors-ligne : enregistrer dans la file IndexedDB
        await queueScan(decodedText, true);
        const offlineResult = { valid: true, message: 'Contrôle enregistré (hors-ligne)', offline: true };
        setResult(offlineResult);
        setShowFeedback(true);
        playBeep(); // Bip neutre pour hors-ligne
      } else {
        // Mode en ligne : vérifier via API backend
        const res = await api.verifyTicket(decodedText);
        setResult(res.data);
        setShowFeedback(true);
        playResultSound(res.data?.valid === true);
      }
    } catch (err) {
      console.error('Scan error:', err);
      const errorResult = { valid: false, message: 'Erreur lors de la vérification', reason: 'error' };
      setResult(errorResult);
      setShowFeedback(true);
      playResultSound(false);
    } finally {
      setTimeout(() => setIsScanning(false), 2000);
    }
  }, [isScanning, isOffline, queueScan]);

  const handleCloseFeedback = useCallback(() => {
    setShowFeedback(false);
    setResult(null);
  }, []);

  useEffect(() => {
    let html5QrCode = null;

    const startScanner = async () => {
      try {
        html5QrCode = new Html5Qrcode(SCANNER_ID);
        scannerRef.current = html5QrCode;

        const config = {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        };

        // Add formatsToSupport if the library supports it
        try {
          const { Html5QrcodeSupportedFormats } = await import('html5-qrcode');
          if (Html5QrcodeSupportedFormats) {
            config.formatsToSupport = [
              Html5QrcodeSupportedFormats.QR_CODE,
              Html5QrcodeSupportedFormats.CODE_128,
            ];
          }
        } catch {
          // formatsToSupport not available in this version, use defaults
        }

        await html5QrCode.start(
          { facingMode: 'environment' },
          config,
          handleScan,
          () => {} // Ignore continuous scan errors
        );
        setCameraActive(true);
        setScannerError(null);
      } catch (err) {
        console.error('Camera error:', err);
        setScannerError(
          err.toString().includes('NotAllowedError')
            ? 'Caméra non autorisée. Veuillez autoriser l\'accès à la caméra dans les paramètres.'
            : err.toString().includes('NotFoundError')
            ? 'Aucune caméra détectée sur cet appareil.'
            : `Erreur caméra: ${err.message}`
        );
      }
    };

    const timer = setTimeout(startScanner, 300);

    return () => {
      clearTimeout(timer);
      if (html5QrCode) {
        html5QrCode.stop().catch(() => {});
      }
      setCameraActive(false);
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Offline Banner */}
      {isOffline && <OfflineBanner />}

      {/* Sync Status Bar */}
      {pendingCount > 0 && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between">
          <span className="text-sm text-amber-700 font-medium">
            📤 {pendingCount} contrôle{pendingCount > 1 ? 's' : ''} en attente
          </span>
          <button
            onClick={syncPending}
            disabled={syncStatus === 'syncing' || isOffline}
            className="text-sm font-semibold text-amber-700 bg-amber-100 px-3 py-1 rounded-lg
                       hover:bg-amber-200 active:scale-95 transition-all disabled:opacity-50"
          >
            {syncStatus === 'syncing' ? '⏳ Synchronisation...' : '🔄 Synchroniser'}
          </button>
        </div>
      )}

      {/* Back button */}
      <div className="px-4 pt-3 pb-1">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </button>
      </div>

      {/* Scanner Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {!cameraActive && !scannerError && (
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 border-4 border-bus-navy border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-500 text-sm">Démarrage de la caméra...</p>
          </div>
        )}

        {scannerError && (
          <div className="card max-w-sm w-full text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-3xl">📷</span>
            </div>
            <h3 className="font-semibold text-gray-800 mb-1">Caméra indisponible</h3>
            <p className="text-sm text-gray-500">{scannerError}</p>
          </div>
        )}

        <div id={SCANNER_ID} className={`w-full max-w-md ${cameraActive ? '' : 'hidden'}`} />

        {cameraActive && (
          <div className="mt-3 text-center">
            <p className="text-sm text-gray-500">
              Pointez la caméra vers le QR code du ticket
            </p>
            {isScanning && (
              <p className="text-xs text-blue-600 font-medium mt-1">Vérification en cours...</p>
            )}
          </div>
        )}
      </div>

      {/* Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3
                      flex items-center justify-between safe-area-bottom">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isOffline ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
          <span className="text-sm text-gray-600">{isOffline ? 'Hors-ligne' : 'En ligne'}</span>
        </div>
        <div className="text-xs text-gray-400">
          SmartTicket Bus v1.0
        </div>
      </div>

      {/* Fullscreen Feedback Overlay */}
      <Feedback data={showFeedback ? result : null} onClose={handleCloseFeedback} />
    </div>
  );
}
