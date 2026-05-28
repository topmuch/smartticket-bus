import { useEffect, useCallback } from 'react';

/**
 * Feedback - Overlay fullscreen pour le résultat du scan
 * S'affiche par-dessus tout avec animation
 * Vert = ticket valide, Rouge = ticket invalide
 */
export default function Feedback({ data, onClose }) {
  if (!data) return null;

  const isValid = data.valid === true && !data.offline;
  const isOffline = data.offline === true;

  const handleKey = useCallback((e) => {
    if (e.key === 'Escape' || e.key === 'Enter') {
      onClose?.();
    }
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  // Auto-dismiss after 4s (invalid) or 3s (valid)
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose?.();
    }, isValid ? 3000 : 4000);
    return () => clearTimeout(timer);
  }, [data, isValid, onClose]);

  const getIconColor = () => {
    if (isOffline) return 'bg-amber-100 text-amber-600';
    return isValid ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600';
  };

  const getTitle = () => {
    if (isOffline) return 'ENREGISTRÉ HORS-LIGNE';
    return isValid ? 'TICKET VALIDE' : 'TICKET INVALIDE';
  };

  const getTitleColor = () => {
    if (isOffline) return 'text-amber-700';
    return isValid ? 'text-emerald-700' : 'text-red-700';
  };

  const getButtonColor = () => {
    if (isOffline) return 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800';
    return isValid ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800' : 'bg-red-600 hover:bg-red-700 active:bg-red-800';
  };

  const getIcon = () => {
    if (isOffline) return (
      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
    if (isValid) return (
      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
    return (
      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl animate-[scaleIn_0.2s_ease-out]">
        {/* Icon */}
        <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4 ${getIconColor()}`}>
          {getIcon()}
        </div>

        {/* Title */}
        <h2 className={`text-2xl font-bold mb-2 ${getTitleColor()}`}>
          {getTitle()}
        </h2>

        {/* Message */}
        <p className="text-gray-600 mb-6 text-sm">{data.message || data.reason || ''}</p>

        {/* Offline badge */}
        {isOffline && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 mb-4 inline-flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829" />
            </svg>
            <span className="text-sm text-amber-700 font-medium">Synchronisé automatiquement quand internet revient</span>
          </div>
        )}

        {/* Passenger details (valid ticket) */}
        {isValid && data.details && (
          <div className="bg-gray-50 p-4 rounded-xl mb-4 text-left space-y-2">
            {data.details.passenger_name && (
              <div className="flex justify-between">
                <span className="text-xs text-gray-400 uppercase">Passager</span>
                <span className="text-sm font-semibold text-gray-800">{data.details.passenger_name}</span>
              </div>
            )}
            {data.details.zones && (
              <div className="flex justify-between">
                <span className="text-xs text-gray-400 uppercase">Trajet</span>
                <span className="text-sm font-semibold text-gray-800">{data.details.zones}</span>
              </div>
            )}
            {data.details.type && (
              <div className="flex justify-between">
                <span className="text-xs text-gray-400 uppercase">Type</span>
                <span className="text-sm font-semibold text-gray-800">
                  {data.details.type === 'single' ? 'Ticket unitaire' : 'Abonnement'}
                </span>
              </div>
            )}
            {data.details.price && (
              <div className="flex justify-between">
                <span className="text-xs text-gray-400 uppercase">Prix</span>
                <span className="text-sm font-semibold text-gray-800">{data.details.price} FCFA</span>
              </div>
            )}
          </div>
        )}

        {/* Already used info */}
        {!isValid && data.reason === 'already_used' && data.details && (
          <div className="bg-red-50 p-3 rounded-xl mb-4 text-left text-sm text-gray-600 space-y-1">
            {data.details.first_validated_at && (
              <p>Premier contrôle : <span className="font-medium">{formatDate(data.details.first_validated_at)}</span></p>
            )}
            {data.details.validated_by && (
              <p>Contrôlé par : <span className="font-medium">{data.details.validated_by}</span></p>
            )}
          </div>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg active:scale-95 transition-transform ${getButtonColor()}`}
        >
          Scanner un autre ticket
        </button>
      </div>
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
}
