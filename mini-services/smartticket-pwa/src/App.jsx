import { useState, useEffect } from 'react';
import LoginForm from './components/LoginForm';
import Dashboard from './components/Dashboard';
import Scanner from './components/Scanner';
import api from './services/api';

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('login'); // login | dashboard | scanner
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    if (api.authenticated && api.user) {
      if (api.user.role === 'CONTROLLER' || api.user.role === 'SUPERADMIN') {
        setUser(api.user);
        setView('dashboard');
      } else {
        api.logout();
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    setView('dashboard');
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setView('login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bus-navy flex items-center justify-center">
        <div className="text-center">
          <svg className="w-16 h-16 text-blue-300 mx-auto" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
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
          <p className="text-blue-200 mt-3 text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  if (view === 'login' || !user) {
    return <LoginForm onLogin={handleLogin} />;
  }

  if (view === 'scanner') {
    return <Scanner />;
  }

  return <Dashboard user={user} onLogout={handleLogout} onStartScan={() => setView('scanner')} />;
}
