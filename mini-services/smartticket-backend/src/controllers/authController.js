// ============================================
// SmartTicket Bus - Contrôleur d'Authentification
// Login, Refresh, Profil, Mot de passe
// ============================================
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'smartticket-bus-jwt-secret-key-2024';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'smartticket-bus-refresh-secret-key-2024';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// ============================================
// CONNEXION (LOGIN)
// ============================================
exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: "Email et mot de passe requis"
    });
  }

  try {
    // 1. Chercher l'utilisateur
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Email ou mot de passe incorrect"
      });
    }

    // 2. Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: "Email ou mot de passe incorrect"
      });
    }

    // 3. Vérifier que le compte est actif
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        error: "Compte désactivé. Contactez l'administrateur."
      });
    }

    // 4. Générer les tokens
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    const refreshToken = jwt.sign(
      { userId: user.id },
      JWT_REFRESH_SECRET,
      { expiresIn: JWT_REFRESH_EXPIRES_IN }
    );

    // 5. Mettre à jour last_login_at
    db.prepare('UPDATE users SET last_login_at = datetime(\'now\') WHERE id = ?').run(user.id);

    // 6. Logger l'audit
    db.prepare(`
      INSERT INTO audit_logs (user_id, action, entity, entity_id, details)
      VALUES (?, 'LOGIN', 'User', ?, ?)
    `).run(user.id, user.id, JSON.stringify({ email: user.email, role: user.role }));

    // 7. Répondre
    res.json({
      success: true,
      message: "Connexion réussie 🚌",
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          phone: user.phone
        },
        tokens: {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: JWT_EXPIRES_IN,
          token_type: 'Bearer'
        }
      }
    });

  } catch (error) {
    console.error('Erreur login:', error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur lors de la connexion"
    });
  }
};

// ============================================
// REFRESH TOKEN
// ============================================
exports.refresh = (req, res) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    return res.status(400).json({
      success: false,
      error: "Refresh token requis"
    });
  }

  try {
    const decoded = jwt.verify(refresh_token, JWT_REFRESH_SECRET);

    const user = db.prepare('SELECT id, email, name, role, is_active FROM users WHERE id = ?').get(decoded.userId);
    if (!user || !user.is_active) {
      return res.status(401).json({ success: false, error: 'Utilisateur non trouvé ou désactivé' });
    }

    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.json({
      success: true,
      data: {
        access_token: accessToken,
        expires_in: JWT_EXPIRES_IN,
        token_type: 'Bearer'
      }
    });
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: "Refresh token invalide ou expiré"
    });
  }
};

// ============================================
// PROFIL UTILISATEUR (/me)
// ============================================
exports.getMe = (req, res) => {
  try {
    const user = db.prepare(`
      SELECT id, email, name, role, phone, last_login_at, created_at
      FROM users WHERE id = ?
    `).get(req.user.userId);

    if (!user) {
      return res.status(404).json({ success: false, error: 'Utilisateur non trouvé' });
    }

    // Compter les tickets vendus aujourd'hui (pour opérateur)
    let todayStats = null;
    if (req.user.role === 'OPERATOR') {
      todayStats = db.prepare(`
        SELECT 
          COUNT(*) as tickets_sold,
          COALESCE(SUM(price), 0) as revenue
        FROM tickets
        WHERE seller_id = ? AND date(sold_at) = date('now')
      `).get(req.user.userId);
    }

    // Compter les contrôles aujourd'hui (pour contrôleur)
    let todayControls = null;
    if (req.user.role === 'CONTROLLER') {
      todayControls = db.prepare(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN result = 'VALID' THEN 1 END) as valid,
          COUNT(CASE WHEN result != 'VALID' THEN 1 END) as infractions
        FROM controls
        WHERE controller_id = ? AND date(scanned_at) = date('now')
      `).get(req.user.userId);
    }

    res.json({
      success: true,
      data: {
        ...user,
        today_stats: todayStats,
        today_controls: todayControls
      }
    });
  } catch (error) {
    console.error('Erreur get me:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

// ============================================
// CHANGER MOT DE PASSE
// ============================================
exports.changePassword = async (req, res) => {
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json({ success: false, error: 'Ancien et nouveau mot de passe requis' });
  }

  if (new_password.length < 6) {
    return res.status(400).json({ success: false, error: 'Le nouveau mot de passe doit avoir au moins 6 caractères' });
  }

  try {
    const user = db.prepare('SELECT id, password_hash FROM users WHERE id = ?').get(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Utilisateur non trouvé' });
    }

    const isValid = await bcrypt.compare(current_password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Ancien mot de passe incorrect' });
    }

    const newHash = await bcrypt.hash(new_password, 10);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?').run(newHash, user.id);

    db.prepare(`
      INSERT INTO audit_logs (user_id, action, entity, entity_id)
      VALUES (?, 'CHANGE_PASSWORD', 'User', ?)
    `).run(user.id, user.id);

    res.json({ success: true, message: 'Mot de passe modifié avec succès' });
  } catch (error) {
    console.error('Erreur change password:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};
