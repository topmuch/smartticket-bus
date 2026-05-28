import { useState } from 'react';
import { api } from '../services/api';

export default function LoginForm({ onLogin }) {
  const [email, setEmail] = useState('control1@smartticket.bus');
  const [password, setPassword] = useState('Control@123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.login(email, password);
      if (res.success && api.user) {
        if (api.user.role !== 'CONTROLLER' && api.user.role !== 'SUPERADMIN') {
          setError('Accès réservé aux contrôleurs.');
          api.logout();
          return;
        }
        onLogin(api.user);
      } else {
        setError(res.data?.message || 'Identifiants incorrects');
      }
    } catch (err) {
      setError('Erreur de connexion. Vérifiez votre réseau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-bus-navy to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-12 h-12 text-blue-300" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g transform="translate(15, 20)">
                <rect x="5" y="10" width="60" height="40" rx="6" fill="#60a5fa"/>
                <rect x="10" y="14" width="12" height="10" rx="2" fill="#93c5fd"/>
                <rect x="26" y="14" width="12" height="10" rx="2" fill="#93c5fd"/>
                <rect x="42" y="14" width="12" height="10" rx="2" fill="#93c5fd"/>
                <rect x="9" y="30" width="8" height="14" rx="1" fill="#3b82f6"/>
                <circle cx="18" cy="54" r="6" fill="#475569"/>
                <circle cx="52" cy="54" r="6" fill="#475569"/>
                <rect x="5" y="35" width="60" height="3" fill="#f59e0b"/>
              </g>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">SmartTicket Bus</h1>
          <p className="text-blue-200 text-sm mt-1">Contrôle de tickets</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Connexion Contrôleur</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-bus-navy
                           focus:ring-2 focus:ring-bus-navy/20 outline-none transition-all text-sm"
                placeholder="control@smartticket.bus"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-bus-navy
                           focus:ring-2 focus:ring-bus-navy/20 outline-none transition-all text-sm"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Connexion...
                </>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-blue-300/50 text-xs mt-6">
          SmartTicket Bus v1.0 — Contrôleur
        </p>
      </div>
    </div>
  );
}
