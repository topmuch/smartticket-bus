import { useState, useCallback } from 'react';
import {
  ShoppingCart,
  History,
  Wallet,
} from 'lucide-react';
import { getAccessToken, getStoredUser, logout } from './services/api';
import useCashSession from './hooks/useCashSession';
import LoginForm from './components/LoginForm';
import CounterHeader from './components/CounterHeader';
import CashSessionBanner from './components/CashSessionBanner';
import TicketSales from './components/TicketSales';
import SalesHistory from './components/SalesHistory';
import SuccessReceipt from './components/SuccessReceipt';
import LogoutDialog from './components/LogoutDialog';

const TABS = [
  { key: 'sell', label: 'Vendre', icon: ShoppingCart },
  { key: 'history', label: 'Historique', icon: History },
  { key: 'session', label: 'Caisse', icon: Wallet },
];

export default function App() {
  const [user, setUser] = useState(() => getStoredUser());
  const [view, setView] = useState('sell');
  const [showLogout, setShowLogout] = useState(false);
  const [soldTicket, setSoldTicket] = useState(null);
  const [historyKey, setHistoryKey] = useState(0);

  const cashHook = useCashSession();

  // ── Auth state ──
  const isAuthenticated = !!getAccessToken() && !!user;

  const handleLogin = useCallback((userData) => {
    setUser(userData);
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    setUser(null);
    setView('sell');
    setSoldTicket(null);
    setShowLogout(false);
  }, []);

  const handleSold = useCallback((ticketData) => {
    setSoldTicket(ticketData);
    // Refresh cash session to update totals
    cashHook.refresh();
    // Refresh history when switching to it
    setHistoryKey((k) => k + 1);
  }, [cashHook]);

  const handleDismissReceipt = useCallback(() => {
    setSoldTicket(null);
  }, []);

  // ── Not authenticated → Login ──
  if (!isAuthenticated) {
    return <LoginForm onSuccess={handleLogin} />;
  }

  // ── Main App ──
  const currentTab = TABS.find((t) => t.key === view);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <CounterHeader
        user={user}
        sessionOpen={cashHook.isOpen}
        onLogout={() => setShowLogout(true)}
      />

      {/* Main content */}
      <main className="flex-1 px-4 py-4 pb-24 overflow-y-auto">
        {view === 'sell' && (
          <TicketSales
            sessionOpen={cashHook.isOpen}
            onSold={handleSold}
          />
        )}

        {view === 'history' && (
          <SalesHistory key={historyKey} />
        )}

        {view === 'session' && (
          <CashSessionBanner cashHook={cashHook} />
        )}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-area-bottom">
        <div className="max-w-lg mx-auto flex items-center">
          {TABS.map((tab) => {
            const isActive = view === tab.key;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setView(tab.key)}
                className={`flex-1 flex flex-col items-center justify-center py-3 px-2 transition-colors active:bg-gray-50 ${
                  isActive ? 'text-primary' : 'text-gray-400'
                }`}
              >
                <div className={`relative ${isActive ? 'scale-110' : ''} transition-transform`}>
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                  {isActive && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                  )}
                </div>
                <span className={`text-[10px] mt-1 font-medium ${isActive ? 'text-primary' : 'text-gray-400'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
        {/* Safe area spacer for iOS */}
        <div className="h-[env(safe-area-inset-bottom,0px)]" />
      </nav>

      {/* Success receipt overlay */}
      {soldTicket && (
        <SuccessReceipt data={soldTicket} onDismiss={handleDismissReceipt} />
      )}

      {/* Logout dialog */}
      {showLogout && (
        <LogoutDialog
          onConfirm={handleLogout}
          onCancel={() => setShowLogout(false)}
        />
      )}
    </div>
  );
}
