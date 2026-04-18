import { useState, useEffect, useCallback, useRef } from 'react';
import { getCashSessions, openCashSession, closeCashSession } from '../services/api';

export default function useCashSession() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [closing, setClosing] = useState(false);
  const [opening, setOpening] = useState(false);
  const intervalRef = useRef(null);

  const fetchSession = useCallback(async () => {
    try {
      const res = await getCashSessions();
      if (res.success && Array.isArray(res.data)) {
        // Find the active (open) session
        const active = res.data.find(
          (s) => s.status === 'open' || s.status === 'active'
        );
        setSession(active || null);
      }
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const open = useCallback(async (openingBalance) => {
    setOpening(true);
    setError(null);
    try {
      const res = await openCashSession(openingBalance);
      if (res.success) {
        setSession(res.data);
        return true;
      }
      setError('Impossible d\'ouvrir la session');
      return false;
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'ouverture');
      return false;
    } finally {
      setOpening(false);
    }
  }, []);

  const close = useCallback(async (actualCash) => {
    if (!session?.id) return false;
    setClosing(true);
    setError(null);
    try {
      const res = await closeCashSession(session.id, actualCash);
      if (res.success) {
        setSession(null);
        return res.data; // return summary
      }
      setError('Impossible de clôturer la session');
      return false;
    } catch (err) {
      setError(err.message || 'Erreur lors de la clôture');
      return false;
    } finally {
      setClosing(false);
    }
  }, [session?.id]);

  // Fetch on mount and set up polling
  useEffect(() => {
    fetchSession();
    intervalRef.current = setInterval(fetchSession, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchSession]);

  return {
    session,
    loading,
    error,
    opening,
    closing,
    isOpen: !!session,
    openSession: open,
    closeSession: close,
    refresh: fetchSession,
  };
}
