import { useState } from 'react';
import {
  Wallet,
  TrendingUp,
  Clock,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  Banknote,
} from 'lucide-react';

export default function CashSessionBanner({ cashHook }) {
  const { session, loading, opening, closing, error, isOpen, openSession, closeSession } = cashHook;
  const [balance, setBalance] = useState('');
  const [actualCash, setActualCash] = useState('');
  const [showClose, setShowClose] = useState(false);
  const [summary, setSummary] = useState(null);

  // ── Loading state ──
  if (loading) {
    return (
      <div className="card animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
        <div className="h-10 bg-gray-200 rounded w-full" />
      </div>
    );
  }

  // ── Session close summary ──
  if (summary) {
    return (
      <div className="card border-accent bg-green-50 animate-scale-in">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="w-5 h-5 text-accent" />
          <h3 className="font-semibold text-gray-900">Session clôturée</h3>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Ventes totales</span>
            <span className="font-semibold">{summary.total_sales || 0} tickets</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Chiffre d'affaires</span>
            <span className="font-bold text-accent">{(summary.total_revenue || 0).toLocaleString('fr-FR')} FCFA</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Espèces en caisse</span>
            <span className="font-semibold">{Number(summary.actual_cash || 0).toLocaleString('fr-FR')} FCFA</span>
          </div>
          {(summary.difference || 0) !== 0 && (
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-600">Écart</span>
              <span className={`font-bold ${(summary.difference || 0) < 0 ? 'text-danger' : 'text-accent'}`}>
                {(summary.difference || 0).toLocaleString('fr-FR')} FCFA
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => setSummary(null)}
          className="btn-primary w-full mt-4 text-sm"
        >
          OK
        </button>
      </div>
    );
  }

  // ── Close session form ──
  if (showClose && isOpen) {
    return (
      <div className="card border-warning bg-amber-50 animate-scale-in">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-5 h-5 text-warning" />
          <h3 className="font-semibold text-gray-900">Clôturer la caisse</h3>
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-2 mb-3 text-xs">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}

        <label className="block text-sm text-gray-700 mb-1">
          Montant réel en caisse (FCFA)
        </label>
        <input
          type="number"
          value={actualCash}
          onChange={(e) => setActualCash(e.target.value)}
          className="input-field mb-3"
          placeholder="Ex: 50000"
          min="0"
          inputMode="numeric"
        />

        <div className="flex gap-2">
          <button
            onClick={() => { setShowClose(false); setActualCash(''); }}
            className="btn-outline flex-1 text-sm"
            disabled={closing}
          >
            Annuler
          </button>
          <button
            onClick={async () => {
              if (!actualCash || Number(actualCash) < 0) return;
              const result = await closeSession(actualCash);
              if (result) {
                setSummary(result);
                setShowClose(false);
                setActualCash('');
              }
            }}
            className="btn-danger flex-1 text-sm flex items-center justify-center gap-1.5"
            disabled={closing || !actualCash}
          >
            {closing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            Confirmer
          </button>
        </div>
      </div>
    );
  }

  // ── Open session form ──
  if (!isOpen) {
    return (
      <div className="card border-warning bg-amber-50 animate-fade-in-up">
        <div className="flex items-center gap-2 mb-3">
          <Unlock className="w-5 h-5 text-warning" />
          <h3 className="font-semibold text-gray-900">Ouvrir la caisse</h3>
        </div>
        <p className="text-sm text-gray-600 mb-3">
          Vous devez ouvrir une session de caisse avant de vendre des tickets.
        </p>

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-2 mb-3 text-xs">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}

        <label className="block text-sm text-gray-700 mb-1">
          Solde d'ouverture (FCFA)
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            className="input-field flex-1"
            placeholder="Ex: 50000"
            min="0"
            inputMode="numeric"
          />
          <button
            onClick={async () => {
              if (!balance || Number(balance) < 0) return;
              const success = await openSession(balance);
              if (success) setBalance('');
            }}
            className="btn-primary text-sm whitespace-nowrap flex items-center gap-1.5"
            disabled={opening || !balance}
          >
            {opening ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
            Ouvrir
          </button>
        </div>
      </div>
    );
  }

  // ── Session open info ──
  return (
    <div className="card animate-fade-in-up">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center">
            <Wallet className="w-4 h-4 text-accent" />
          </div>
          <h3 className="font-semibold text-gray-900">Caisse ouverte</h3>
        </div>
        <span className="badge-success text-xs">Active</span>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-xs text-gray-500 mb-0.5">Ouverture</div>
          <div className="text-xs font-semibold text-gray-900 flex items-center justify-center gap-0.5">
            <Clock className="w-3 h-3" />
            {session?.opened_at ? new Date(session.opened_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-0.5">Ventes</div>
          <div className="text-xs font-semibold text-gray-900">
            {session?.total_sales ?? 0} tickets
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-0.5">Revenu</div>
          <div className="text-xs font-semibold text-accent flex items-center justify-center gap-0.5">
            <TrendingUp className="w-3 h-3" />
            {(session?.total_revenue ?? 0).toLocaleString('fr-FR')}
          </div>
        </div>
      </div>

      <button
        onClick={() => setShowClose(true)}
        className="btn-outline w-full mt-3 text-sm flex items-center justify-center gap-1.5 text-warning border-warning/40 hover:bg-amber-50"
      >
        <Banknote className="w-4 h-4" />
        Clôturer la caisse
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
