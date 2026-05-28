'use client';

import { useState, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, QrCode } from 'lucide-react';

// ============================================================
// StationQRInfo — Dynamic QR Code Block for Digital Signage
// ============================================================
//
// HOW TO CUSTOMIZE:
// - stationId: Pass the station database ID (e.g. "station-abc123")
//   The QR URL will be: NEXT_PUBLIC_SITE_URL/gare/{slug}?station={stationId}
// - stationSlug: Friendly slug for the URL (e.g. "peters"). Defaults to stationId.
// - qrSize: Pixel size of the QR code (default 160 for 1080p, min 120)
// - baseUrl: Override the base URL. Defaults to NEXT_PUBLIC_SITE_URL env var,
//   then falls back to window.location.origin, then "https://smartticketqr.com"
// - compact: If true, hides the URL text below the QR (smaller footprint)
//
// Props can be passed from the parent or configured via .env:
//   NEXT_PUBLIC_SITE_URL=https://smartticketqr.com
// ============================================================

interface StationQRInfoProps {
  /** Station database ID (used in QR URL query param) */
  stationId: string;
  /** Friendly URL slug for the station (e.g. "peters", "dakar-centrale") */
  stationSlug?: string;
  /** QR code pixel size. Minimum 120, recommended 160 for 1080p displays */
  qrSize?: number;
  /** Override base URL for the QR target. Defaults to NEXT_PUBLIC_SITE_URL or window.location.origin */
  baseUrl?: string;
  /** Compact mode: hides the URL text below the QR for smaller footprints */
  compact?: boolean;
  /** Additional CSS class names */
  className?: string;
}

/**
 * Builds the QR target URL from configuration.
 * Order of precedence:
 *   1. baseUrl prop
 *   2. NEXT_PUBLIC_SITE_URL env var
 *   3. window.location.origin
 *   4. Fallback: "https://smartticketqr.com"
 */
function buildQrUrl(
  stationId: string,
  stationSlug: string,
  baseUrlOverride?: string,
): string {
  let base: string;
  if (baseUrlOverride) {
    base = baseUrlOverride.replace(/\/+$/, '');
  } else if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_SITE_URL) {
    base = process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, '');
  } else if (typeof window !== 'undefined') {
    base = window.location.origin;
  } else {
    base = 'https://smartticketqr.com';
  }
  return `${base}/gare/${stationSlug}?station=${stationId}`;
}

/**
 * Display URL shown below the QR code (shortened for readability).
 * Shows domain/gare/slug only (no query params).
 */
function buildDisplayUrl(
  stationSlug: string,
  baseUrlOverride?: string,
): string {
  let base: string;
  if (baseUrlOverride) {
    base = baseUrlOverride.replace(/\/+$/, '');
    // Strip protocol for display
    base = base.replace(/^https?:\/\//, '');
  } else if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_SITE_URL) {
    base = process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, '').replace(/^https?:\/\//, '');
  } else if (typeof window !== 'undefined') {
    base = window.location.host;
  } else {
    base = 'smartticketqr.com';
  }
  return `${base}/gare/${stationSlug}`;
}

/**
 * StationQRInfo — Reusable QR Code block for digital signage displays.
 *
 * Features:
 * - QR Level H (high error correction) for reliable scanning at angles / with reflections
 * - Static QR per session (no re-renders unless stationId/slug changes)
 * - WCAG AAA contrast (black on white)
 * - Accessible: aria-label, semantic markup
 * - Fallback if qrcode.react fails to render
 * - No animation on QR itself (scanning requirement)
 * - Fade-in animation on mount only (one-time)
 */
export function StationQRInfo({
  stationId,
  stationSlug,
  qrSize = 160,
  baseUrl,
  compact = false,
  className = '',
}: StationQRInfoProps) {
  // Track QR render failure for fallback
  const [qrFailed, setQrFailed] = useState(false);

  // Derive slug from stationId if not provided
  const slug = stationSlug || stationId;

  // Memoize QR URL to prevent re-renders
  const qrUrl = useMemo(
    () => buildQrUrl(stationId, slug, baseUrl),
    [stationId, slug, baseUrl],
  );

  const displayUrl = useMemo(
    () => buildDisplayUrl(slug, baseUrl),
    [slug, baseUrl],
  );

  // Clamp QR size to minimum 120px
  const effectiveSize = Math.max(120, qrSize);

  return (
    <div
      className={`
        relative flex flex-col items-center justify-center
        bg-white border border-gray-200
        rounded-xl shadow-lg shadow-black/8
        px-5 py-4
        ${className}
      `}
      role="region"
      aria-label={`Code QR pour accéder aux horaires en direct de la gare — Scannez avec votre téléphone`}
    >
      {/* ── CTA Text ── */}
      <div className="flex items-center gap-2 mb-3">
        <Smartphone className="w-4 h-4 md:w-5 md:h-5 text-slate-600 shrink-0" />
        <p className="text-sm md:text-base lg:text-lg font-bold text-slate-800 text-center leading-tight">
          Scannez pour les horaires en direct
        </p>
      </div>

      {/* ── QR Code ── */}
      <div
        className="bg-white rounded-lg p-2.5 md:p-3"
        style={{ lineHeight: 0 }}
      >
        {qrFailed ? (
          /* ── Fallback if QR render fails ── */
          <div
            className="flex flex-col items-center justify-center text-center"
            style={{
              width: effectiveSize,
              height: effectiveSize,
            }}
            aria-live="polite"
            role="alert"
          >
            <QrCode className="w-8 h-8 md:w-10 md:h-10 text-gray-300 mb-2" />
            <p className="text-xs md:text-sm text-gray-400 font-medium px-2">
              QR indisponible
            </p>
            <p className="text-[10px] md:text-xs text-gray-300 mt-1 px-2">
              Rendez-vous sur
            </p>
            <p className="text-[10px] md:text-xs text-blue-500 font-semibold mt-0.5 break-all px-2">
              {displayUrl}
            </p>
          </div>
        ) : (
          <QRCodeSVG
            value={qrUrl}
            size={effectiveSize}
            level="H"
            includeMargin={false}
            bgColor="#FFFFFF"
            fgColor="#000000"
            onError={() => setQrFailed(true)}
            // No animation — QR codes must be static for reliable scanning
          />
        )}
      </div>

      {/* ── Display URL ── */}
      {!compact && (
        <p className="mt-2.5 text-[10px] md:text-xs text-gray-400 font-mono text-center select-all break-all max-w-[240px]">
          {displayUrl}
        </p>
      )}
    </div>
  );
}

export default StationQRInfo;
