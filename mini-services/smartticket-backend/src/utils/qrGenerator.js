// ============================================
// SmartTicket Bus - Générateur & Vérificateur QR Code
// Utilise JWT (JSON Web Token) pour la sécurité
// ============================================
const jwt = require('jsonwebtoken');
require('dotenv').config();

const QR_SECRET = process.env.QR_SECRET;

if (!QR_SECRET) {
  console.error('❌ CRITIQUE: QR_SECRET n\'est pas défini dans .env');
  console.error('   Générez une clé: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
}

/**
 * Génère un QR Code sécurisé au format JWT
 * Payload: { tid, typ, zf, zt, exp, iat }
 * 
 * @param {Object} data - Données du ticket
 * @param {string} data.id - ID du ticket
 * @param {string} data.type - 'single' ou 'subscription'
 * @param {string} data.from_zone_id - Zone de départ
 * @param {string} data.to_zone_id - Zone d'arrivée
 * @param {string|Date} data.valid_until - Date d'expiration
 * @returns {string} JWT token (le QR code sera ce token encodé en image)
 */
function generateSecureQRCode(data) {
  const payload = {
    tid: data.id,                    // Ticket ID
    typ: data.type || 'single',      // Type
    zf: data.from_zone_id,           // Zone From
    zt: data.to_zone_id,             // Zone To
    exp: Math.floor(new Date(data.valid_until).getTime() / 1000), // Expiration (epoch seconds)
    iat: Math.floor(Date.now() / 1000) // Issued at
  };

  // NOTA: 'exp' est déjà dans le payload, pas besoin de expiresIn
  const token = jwt.sign(payload, QR_SECRET, {
    algorithm: 'HS256'
  });

  return token;
}

/**
 * Vérifie et décode un QR Code JWT
 * 
 * @param {string} qrToken - Le JWT token du QR code
 * @returns {Object} { valid: boolean, payload?: Object, error?: string }
 */
function verifySecureQRCode(qrToken) {
  try {
    // Vérifier le JWT
    const decoded = jwt.verify(qrToken, QR_SECRET, {
      algorithms: ['HS256']
    });

    return {
      valid: true,
      payload: decoded
    };
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return { valid: false, error: 'EXPIRED', message: 'Le ticket a expiré' };
    }
    if (err.name === 'JsonWebTokenError') {
      return { valid: false, error: 'FALSIFIED', message: 'QR Code falsifié ou invalide' };
    }
    return { valid: false, error: 'INVALID', message: 'Erreur de vérification QR' };
  }
}

/**
 * Génère une image QR code (data URL) à partir d'un texte/token
 * Utilise la librairie 'qrcode'
 * 
 * @param {string} text - Le texte à encoder
 * @returns {Promise<string>} Data URL de l'image QR
 */
async function generateQRImage(text) {
  try {
    const QRCode = require('qrcode');
    const dataUrl = await QRCode.toDataURL(text, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    });
    return dataUrl;
  } catch (err) {
    console.error('Erreur génération image QR:', err);
    return null;
  }
}

module.exports = {
  generateSecureQRCode,
  verifySecureQRCode,
  generateQRImage
};
