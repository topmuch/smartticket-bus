import { Ticket, LogOut, Wifi, WifiOff, ChevronDown } from 'lucide-react';
import { logout, getStoredUser } from '../services/api';

export default function CounterHeader({ user, sessionOpen, onLogout }) {
  const handleLogout = () => {
    onLogout();
  };

  const displayName = user?.name || user?.email || 'Opérateur';

  return (
    <header className="bg-primary text-white sticky top-0 z-40 shadow-md">
      {/* Status banner when no session */}
      {!sessionOpen && (
        <div className="bg-warning text-amber-900 text-center text-xs font-semibold py-1.5 px-4 flex items-center justify-center gap-1.5">
          <WifiOff className="w-3 h-3" />
          Session de caisse non ouverte — Les ventes sont désactivées
        </div>
      )}

      {/* Main header bar */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/15 rounded-lg flex items-center justify-center">
            <Ticket className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold leading-tight">SmartTicket</h1>
            <p className="text-primary-200 text-xs">{displayName}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {sessionOpen && (
            <div className="badge-success bg-green-500/20 text-green-100 flex items-center gap-1">
              <Wifi className="w-3 h-3" />
              <span className="text-xs">Caisse ouverte</span>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-primary-200 hover:text-white active:text-white transition-colors p-2 rounded-lg hover:bg-white/10 active:bg-white/15"
            title="Déconnexion"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-xs font-medium hidden sm:inline">Déconnexion</span>
          </button>
        </div>
      </div>
    </header>
  );
}
