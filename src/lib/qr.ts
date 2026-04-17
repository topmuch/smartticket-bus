import crypto from 'crypto';

const QR_SIGNING_SECRET = process.env.QR_SIGNING_SECRET || 'smartticket-qr-secret';

export interface QRPayload {
  ticketId: string;
  ticketNumber: string;
  type: 'UNIT' | 'SUBSCRIPTION';
  fromZone?: string;
  toZone?: string;
  fromStop?: string;
  toStop?: string;
  passengerName?: string;
  validFrom: string;
  validTo: string;
  issuedAt: string;
}

export function generateQRToken(payload: QRPayload): { token: string; signature: string } {
  const token = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', QR_SIGNING_SECRET)
    .update(token)
    .digest('base64url');

  return { token, signature };
}

export function verifyQRSignature(token: string, signature: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', QR_SIGNING_SECRET)
    .update(token)
    .digest('base64url');

  return crypto.timingSafeEqual(
    Buffer.from(signature, 'base64url'),
    Buffer.from(expectedSignature, 'base64url')
  );
}

export function decodeQRToken(token: string): QRPayload | null {
  try {
    const json = Buffer.from(token, 'base64url').toString('utf-8');
    return JSON.parse(json) as QRPayload;
  } catch {
    return null;
  }
}

export function generateFullQR(payload: QRPayload): string {
  const { token, signature } = generateQRToken(payload);
  return `${token}.${signature}`;
}

export function parseAndVerifyQR(qrString: string): {
  valid: boolean;
  payload: QRPayload | null;
  error?: string;
} {
  try {
    const [token, signature] = qrString.split('.');

    if (!token || !signature) {
      return { valid: false, payload: null, error: 'Format QR invalide' };
    }

    if (!verifyQRSignature(token, signature)) {
      return { valid: false, payload: null, error: 'Signature QR falsifiée' };
    }

    const payload = decodeQRToken(token);
    if (!payload) {
      return { valid: false, payload: null, error: 'Données QR corrompues' };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false, payload: null, error: 'Erreur de lecture QR' };
  }
}
