import jwt from 'jsonwebtoken';

const QR_SIGNING_SECRET = process.env.QR_SIGNING_SECRET || 'smartticket-qr-secret';

// JWT payload with short keys matching user's spec
export interface QRPayload {
  tid: string;              // ticket ID
  typ: 'UNIT' | 'SUBSCRIPTION'; // ticket type
  zf?: string;              // from zone ID
  zt?: string;              // to zone ID
  exp: number;              // expiry timestamp (seconds)
  iat: number;              // issued-at timestamp (seconds)
  // Human-readable fields for display
  ticketNumber?: string;
  passengerName?: string;
  fromStop?: string;
  toStop?: string;
  fromZone?: string;
  toZone?: string;
}

/**
 * Sign a QR payload using JWT HS256.
 * Returns the JWT string (not base64url JSON like the old approach).
 */
export function generateQRToken(payload: QRPayload): string {
  return jwt.sign(payload, QR_SIGNING_SECRET, { algorithm: 'HS256' });
}

/**
 * Verify and decode a JWT QR token.
 * Checks signature, expiry, and returns the decoded payload.
 */
export function parseAndVerifyQR(token: string): {
  valid: boolean;
  payload: QRPayload | null;
  error?: string;
} {
  try {
    const decoded = jwt.verify(token, QR_SIGNING_SECRET, { algorithms: ['HS256'] }) as QRPayload;

    // Double-check expiry (jwt.verify already checks this, but be explicit)
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && now > decoded.exp) {
      return { valid: false, payload: null, error: 'QR expiré' };
    }

    return { valid: true, payload: decoded };
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return { valid: false, payload: null, error: 'QR expiré' };
    }
    if (err.name === 'JsonWebTokenError') {
      return { valid: false, payload: null, error: 'Signature QR falsifiée' };
    }
    if (err.name === 'NotBeforeError') {
      return { valid: false, payload: null, error: 'QR non encore valide' };
    }
    return { valid: false, payload: null, error: 'Erreur de lecture QR' };
  }
}
