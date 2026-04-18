import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useOfflineSync } from '../hooks/useOfflineSync';
import OfflineBanner from './OfflineBanner';

export default function Dashboard({ user, onLogout, onStartScan }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { pendingCount, syncStatus, syncPending, isOffline } = useOfflineSync();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await api.getControlStats();
      if (res.success) setStats(res.data);
    } catch (err) {
      console.error('Stats error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-bus-navy text-white px-4 py-4 safe-area-top">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-300" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g transform="translate(15, 20)">
                  <rect x="5" y="10" width="60" height="40" rx="6" fill="#60a5fa"/>
                  <rect x="10" y="14" width="12" height="10" rx="2" fill="#93c5fd"/>
                  <rect x="26" y="14" width="12" height="10" rx="2" fill="#93c5fd"/>
                  <rect x="42" y="14" width="12" height="10" rx="2" fill="#93c5fd"/>
                  <circle cx="18" cy="54" r="6" fill="#475569"/>
                  <circle cx="52" cy="54" r="6" fill="#475569"/>
                  <rect x="5" y="35" width="60" height="3" fill="#f59e0b"/>
                </g>
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold">SmartTicket Bus</h1>
              <p className="text-blue-200 text-xs">{user?.name || 'Contrôleur'}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="text-blue-200 hover:text-white text-sm font-medium px-3 py-1.5
                       rounded-lg hover:bg-white/10 transition-all"
          >
            Déconnexion
          </button>
        </div>
      </header>

      {isOffline && <OfflineBanner />}

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Scan Button - PRIMARY ACTION */}
        <button
          onClick={onStartScan}
          className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98]
                     text-white py-6 rounded-2xl shadow-lg shadow-emerald-500/30
                     flex items-center justify-center gap-3 transition-all text-lg font-bold"
        >
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
          Scanner un Ticket
        </button>

        {/* Stats */}
        {loading ? (
          <div className="card animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="h-20 bg-gray-200 rounded-xl"></div>
              <div className="h-20 bg-gray-200 rounded-xl"></div>
              <div className="h-20 bg-gray-200 rounded-xl"></div>
            </div>
          </div>
        ) : stats ? (
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Statistiques du jour</h3>
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Total" value={stats.today?.total || 0} color="gray" />
              <StatCard label="Valides" value={stats.today?.valid || 0} color="emerald" />
              <StatCard label="Invalides" value={stats.today?.invalid || 0} color="red" />
            </div>
          </div>
        ) : (
          <div className="card text-center text-gray-400 text-sm py-6">
            Aucune statistique disponible
          </div>
        )}

        {/* Offline Sync Status */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isOffline ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
              <span className="text-sm font-medium">{isOffline ? 'Hors-ligne' : 'En ligne'}</span>
            </div>
            {pendingCount > 0 && (
              <span className="text-sm text-amber-600 font-semibold">{pendingCount} en attente</span>
            )}
          </div>
          {pendingCount > 0 && (
            <button
              onClick={syncPending}
              disabled={syncStatus === 'syncing' || isOffline}
              className="w-full mt-3 text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200
                         px-4 py-2 rounded-xl hover:bg-amber-100 active:scale-[0.98] transition-all
                         disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {syncStatus === 'syncing' ? '⏳ Synchronisation...' : '📤 Synchroniser les contrôles'}
            </button>
          )}
        </div>

        {/* Role badge */}
        <div className="text-center text-xs text-gray-400 mt-4">
          Rôle : {user?.role} • SmartTicket Bus v1.0
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  const colors = {
    gray: 'bg-gray-50 text-gray-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-700'
  };
  return (
    <div className={`${colors[color]} rounded-xl p-3 text-center`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs opacity-70 mt-0.5">{label}</div>
    </div>
  );
}
