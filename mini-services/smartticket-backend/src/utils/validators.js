const { z } = require('zod');

// ============================================
// Validation Schemas
// ============================================

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Mot de passe requis')
});

const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Mot de passe actuel requis'),
  new_password: z.string().min(8, 'Le nouveau mot de passe doit contenir au moins 8 caractères')
    .regex(/[A-Z]/, 'Doit contenir au moins une majuscule')
    .regex(/[0-9]/, 'Doit contenir au moins un chiffre')
    .regex(/[^A-Za-z0-9]/, 'Doit contenir au moins un caractère spécial')
});

const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token requis')
});

const createZoneSchema = z.object({
  code: z.string().min(1, 'Code requis').max(10, 'Code trop long'),
  name: z.string().min(1, 'Nom requis').max(100, 'Nom trop long'),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Couleur invalide (format: #RRGGBB)').optional()
});

const updateZoneSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Couleur invalide').optional(),
  is_active: z.boolean().optional()
});

const createTariffSchema = z.object({
  from_zone_id: z.string().min(1, 'Zone de départ requise'),
  to_zone_id: z.string().min(1, "Zone d'arrivée requise"),
  price: z.number().positive('Le prix doit être positif').max(50000, 'Prix maximum 50,000 FCFA'),
  ticket_type: z.enum(['single', 'subscription', 'daily']).optional()
});

const calculatePriceSchema = z.object({
  from_zone_id: z.string().min(1, 'Zone de départ requise'),
  to_zone_id: z.string().min(1, "Zone d'arrivée requise"),
  ticket_type: z.enum(['single', 'subscription', 'daily']).optional()
});

const sellTicketSchema = z.object({
  from_zone_id: z.string().min(1, 'Zone de départ requise'),
  to_zone_id: z.string().min(1, "Zone d'arrivée requise"),
  passenger_name: z.string().min(1, 'Nom du passager requis').max(100, 'Nom trop long'),
  passenger_phone: z.string().max(20).optional(),
  payment_method: z.enum(['cash', 'mobile', 'card'], 'Méthode de paiement invalide'),
  amount_paid: z.number().nonnegative('Montant payé invalide'),
  line_id: z.string().optional(),
  from_stop_id: z.string().optional(),
  to_stop_id: z.string().optional(),
  notes: z.string().max(500).optional()
});

const scanVerifySchema = z.object({
  qr_token: z.string().min(10, 'QR token invalide').optional(),
  qr_string: z.string().min(10, 'QR string invalide').optional(),
  location_lat: z.number().min(-90).max(90).optional(),
  location_lng: z.number().min(-180).max(180).optional(),
  note: z.string().max(200).optional()
}).refine(data => data.qr_token || data.qr_string, {
  message: 'qr_token ou qr_string requis'
});

const createCashSessionSchema = z.object({
  opening_balance: z.number().nonnegative('Solde initial invalide').max(1000000, 'Montant maximum 1,000,000 FCFA')
});

const closeCashSessionSchema = z.object({
  actual_cash: z.number().min(0, 'Montant invalide').max(10000000, 'Montant maximum dépassé'),
  notes: z.string().max(500).optional()
});

const syncControlsSchema = z.object({
  controls: z.array(z.object({
    qr_data: z.string().min(1, 'QR data requis'),
    result: z.enum(['VALID', 'INVALID', 'FALSIFIED', 'EXPIRED'], 'Résultat invalide'),
    reason: z.string().max(200).optional(),
    passenger_name: z.string().max(100).optional(),
    ticket_number: z.string().max(50).optional(),
    timestamp: z.string().optional(),
    location_lat: z.number().optional(),
    location_lng: z.number().optional()
  })).max(500, 'Maximum 500 contrôles par synchronisation')
});

const createUserSchema = z.object({
  email: z.string().email('Email invalide'),
  name: z.string().min(2, 'Nom trop court').max(100, 'Nom trop long'),
  password: z.string().min(8, 'Mot de passe trop court')
    .regex(/[A-Z]/, 'Doit contenir au moins une majuscule')
    .regex(/[0-9]/, 'Doit contenir au moins un chiffre'),
  role: z.enum(['SUPERADMIN', 'OPERATOR', 'CONTROLLER'], 'Rôle invalide'),
  phone: z.string().max(20).optional()
});

const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  role: z.enum(['SUPERADMIN', 'OPERATOR', 'CONTROLLER']).optional(),
  is_active: z.boolean().optional()
});

const createLineSchema = z.object({
  number: z.string().min(1, 'Numéro de ligne requis').max(10),
  name: z.string().min(1, 'Nom requis').max(100),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Couleur invalide').optional()
});

const createStopSchema = z.object({
  code: z.string().min(1, 'Code requis').max(10),
  name: z.string().min(1, 'Nom requis').max(100),
  zone_id: z.string().min(1, 'Zone requise'),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional()
});

// ============================================
// Validation Middleware Factory
// ============================================

function validate(schema) {
  return (req, res, next) => {
    try {
      const result = schema.safeParse(req.body);
      if (!result.success) {
        const errorList = (result.error && result.error.errors) ? result.error.errors : [{ path: ['body'], message: 'Données invalides' }];
        const errors = errorList.map(e => ({
          field: Array.isArray(e.path) ? e.path.join('.') : String(e.path),
          message: e.message || 'Erreur de validation'
        }));
        return res.status(400).json({
          success: false,
          error: 'Données invalides',
          details: errors
        });
      }
      // Replace req.body with validated/sanitized data
      req.body = result.data;
      next();
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: 'Données invalides',
        details: [{ field: 'body', message: err.message }]
      });
    }
  };
}

// Helper to validate query params
function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const errors = result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message
      }));
      return res.status(400).json({
        success: false,
        error: 'Paramètres de requête invalides',
        details: errors
      });
    }
    req.query = result.data;
    next();
  };
}

module.exports = {
  // Schemas
  loginSchema,
  changePasswordSchema,
  refreshTokenSchema,
  createZoneSchema,
  updateZoneSchema,
  createTariffSchema,
  calculatePriceSchema,
  sellTicketSchema,
  scanVerifySchema,
  createCashSessionSchema,
  closeCashSessionSchema,
  syncControlsSchema,
  createUserSchema,
  updateUserSchema,
  createLineSchema,
  createStopSchema,
  // Middleware
  validate,
  validateQuery
};
