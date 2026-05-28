import { useState } from 'react';
import { Ticket, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { login } from '../services/api';

export default function LoginForm({ onSuccess }) {
  const [email, setEmail] = useState('guichet1@smartticket.bus');
  const [password, setPassword] = useState('Oper@123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      const res = await login(email.trim(), password);
      if (res.success && res.data) {
        onSuccess(res.data.user);
      } else {
        setError(res.message || 'Identifiants incorrects');
      }
    } catch (err) {
      setError(err.message || 'Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary flex flex-col items-center justify-center px-6 py-10">
      {/* Logo */}
      <div className="animate-fade-in-up mb-8 text-center">
        <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
          <Ticket className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">SmartTicket</h1>
        <p className="text-primary-200 text-sm mt-1">Guichet de vente</p>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-sm animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-5">Connexion opérateur</h2>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 animate-fade-in">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="email@smartticket.bus"
                autoComplete="email"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-11"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 p-1"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-accent w-full flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Se connecter'
              )}
            </button>
          </form>
        </div>

        {/* Test credentials hint */}
        <div className="mt-4 bg-white/10 rounded-xl p-3 backdrop-blur-sm">
          <p className="text-primary-200 text-xs text-center">
            Compte test pré-rempli ci-dessus
          </p>
        </div>
      </div>
    </div>
  );
}
