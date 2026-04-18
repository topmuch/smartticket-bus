'use client';

/**
 * SmartTicket Offline QR Verifier
 * Verifies ticket QR codes locally without server connectivity.
 *
 * The QR format is now JWT (HS256 signed): header.payload.signature
 * The payload (middle part) contains ticket data with short keys (tid, typ, exp, etc.)
 * We decode the payload client-side and check against local IndexedDB data.
 *
 * Verification steps:
 *  1. Parse the JWT QR string (header.payload.signature)
 *  2. Base64url decode the payload part to get ticket data
 *  3. Check blacklist (cancelled/revoked tickets)
 *  4. Check whitelist (valid subscription tickets)
 *  5. Check expiry (exp timestamp)
 *  6. Return result
 */

import { isBlacklisted, isWhitelisted } from './offline-store';

// ==========================================
// BASE64URL DECODE (lightweight, no deps)
// ==========================================

function base64UrlDecode(input: string): string {
  // Convert base64url to base64
  let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  // Pad with '=' if needed
  const pad = base64.length % 4;
  if (pad) {
    base64 += '='.repeat(4 - pad);
  }
  try {
    return decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch {
    return atob(base64);
  }
}

// ==========================================
// QR PAYLOAD TYPES
// ==========================================

export interface OfflineQRPayload {
  // JWT short keys
  tid: string;                    // ticket ID
  typ: 'UNIT' | 'SUBSCRIPTION';   // ticket type
  exp: number;                    // expiry timestamp (seconds)
  iat: number;                    // issued-at timestamp (seconds)
  zf?: string;                    // from zone ID
  zt?: string;                    // to zone ID
  // Human-readable fields for display
  ticketNumber?: string;
  passengerName?: string;
  fromStop?: string;
  toStop?: string;
  fromZone?: string;
  toZone?: string;
}

export type OfflineVerifyResult =
  | 'VALID'
  | 'BLACKLISTED'
  | 'EXPIRED'
  | 'NOT_FOUND'
  | 'INVALID';

export interface OfflineVerifyResponse {
  result: OfflineVerifyResult;
  payload: OfflineQRPayload | null;
  reason: string;
}

// ==========================================
// PARSE QR STRING
// ==========================================

export function parseQRString(qrString: string): {
  token: string;
  signature: string;
  payload: OfflineQRPayload | null;
  error?: string;
} {
  try {
    const trimmed = qrString.trim();

    // Handle both our format (base64payload.signature) and JWT format (header.payload.signature)
    const parts = trimmed.split('.');

    if (parts.length === 3) {
      // JWT format: header.payload.signature
      // Our payload is in the middle part (index 1)
      const header = parts[0];
      const body = parts[1];
      const signature = parts[2];

      if (!body || !signature) {
        return { token: '', signature: '', payload: null, error: 'Format JWT incomplet' };
      }

      let payload: OfflineQRPayload;
      try {
        const json = base64UrlDecode(body);
        payload = JSON.parse(json) as OfflineQRPayload;
      } catch {
        return { token: body, signature, payload: null, error: 'Données JWT corrompues' };
      }

      // Validate required fields (short keys: tid, exp)
      if (!payload.tid || !payload.exp) {
        return { token: body, signature, payload: null, error: 'Champs requis manquants dans le JWT' };
      }

      return { token: body, signature, payload };
    }

    return { token: '', signature: '', payload: null, error: 'Format QR non reconnu (JWT requis)' };
  } catch {
    return { token: '', signature: '', payload: null, error: 'Erreur de lecture du QR' };
  }
}

// ==========================================
// OFFLINE VERIFICATION
// ==========================================

export async function verifyQROffline(qrString: string): Promise<OfflineVerifyResponse> {
  // Step 1: Parse the QR string
  const parsed = parseQRString(qrString);

  if (!parsed.payload) {
    return {
      result: 'INVALID',
      payload: null,
      reason: parsed.error || 'Format QR invalide',
    };
  }

  const payload = parsed.payload;

  // Step 2: Check blacklist (cancelled/revoked tickets)
  const blacklisted = await isBlacklisted(payload.tid);
  if (blacklisted) {
    return {
      result: 'BLACKLISTED',
      payload,
      reason: 'Ce ticket a été annulé ou révoqué',
    };
  }

  // Step 3: Check expiry (exp is in seconds)
  const nowSec = Math.floor(Date.now() / 1000);

  if (nowSec > payload.exp) {
    return {
      result: 'EXPIRED',
      payload,
      reason: 'Ce ticket a expiré',
    };
  }

  // Step 4: Check whitelist for subscriptions
  // Subscriptions should be whitelisted. For UNIT tickets, we can't fully
  // verify offline (they might already be used), so we accept them if
  // not blacklisted and not expired.
  if (payload.typ === 'SUBSCRIPTION') {
    const whitelisted = await isWhitelisted(payload.tid);
    if (!whitelisted) {
      return {
        result: 'NOT_FOUND',
        payload,
        reason: 'Abonnement non trouvé dans les données hors-ligne',
      };
    }
  }

  // Step 5: All checks passed - ticket is valid offline
  return {
    result: 'VALID',
    payload,
    reason: 'Ticket valide (vérification hors-ligne)',
  };
}
