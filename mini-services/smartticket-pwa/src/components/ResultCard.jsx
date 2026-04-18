import { useEffect } from 'react';

export default function ResultCard({ data, onDismiss }) {
  if (!data) return null;

  const isValid = data.valid === true;
  const isOffline = data.offline === true;

  useEffect(() => {
    const timer = setTimeout(() => {
      if (onDismiss) onDismiss();
    }, 4000);
    return () => clearTimeout(timer);
  }, [data, onDismiss]);

  return (
    <div className={`mx-4 mb-24 rounded-2xl p-5 shadow-xl border-2 transition-all duration-300 ${
      isValid
        ? 'bg-emerald-50 border-emerald-400'
        : 'bg-red-50 border-red-400'
    }`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-14 h-14 rounded-full flex items-center justify-center text-3xl shrink-0 ${
          isValid ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {isValid ? '✅' : '❌'}
        </div>
        <div className="min-w-0">
          <h2 className={`text-xl font-bold ${isValid ? 'text-emerald-800' : 'text-red-800'}`}>
            {isValid ? 'TICKET VALIDE' : 'TICKET INVALIDE'}
          </h2>
          {isOffline && (
            <span className="inline-block mt-0.5 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
              Vérification hors-ligne
            </span>
          )}
        </div>
      </div>

      {/* Reason (invalid only) */}
      {!isValid && data.reason && (
        <div className="bg-red-100 rounded-lg px-3 py-2 mb-3">
          <p className="text-sm text-red-700 font-medium">
            {data.reason === 'already_used' && '🔁 Ticket déjà utilisé'}
            {data.reason === 'falsified' && '🚫 Ticket falsifié'}
            {data.reason === 'expired' && '⏰ Ticket expiré'}
            {data.reason === 'cancelled' && '⛔ Ticket annulé'}
            {data.reason === 'not_found_db' && '❓ Ticket non reconnu'}
            {!['already_used', 'falsified', 'expired', 'cancelled', 'not_found_db'].includes(data.reason) && data.message}
          </p>
        </div>
      )}

      {/* Details (valid only) */}
      {isValid && data.details && (
        <div className="space-y-2">
          <DetailRow label="Passager" value={data.details.passenger_name || 'Anonyme'} />
          <DetailRow label="Trajet" value={data.details.zones} />
          <DetailRow label="Type" value={data.details.type === 'single' ? 'Ticket unitaire' : 'Abonnement'} />
          {data.details.price && <DetailRow label="Prix" value={`${data.details.price} FCFA`} />}
          {data.details.sold_at && <DetailRow label="Vendu le" value={formatDate(data.details.sold_at)} />}
          {data.details.seller && <DetailRow label="Guichet" value={data.details.seller} />}
          {data.details.valid_until && <DetailRow label="Valide jusqu'au" value={formatDate(data.details.valid_until)} />}
        </div>
      )}

      {/* Already used details */}
      {!isValid && data.reason === 'already_used' && data.details && (
        <div className="space-y-1 mt-2 text-sm text-gray-600">
          {data.details.first_validated_at && (
            <p> Premier contrôle : <span className="font-medium">{formatDate(data.details.first_validated_at)}</span></p>
          )}
          {data.details.validated_by && (
            <p> Contrôlé par : <span className="font-medium">{data.details.validated_by}</span></p>
          )}
        </div>
      )}

      {/* Message */}
      {data.message && !data.details && (
        <p className="text-sm text-gray-600 mt-2">{data.message}</p>
      )}
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-800 text-right ml-4">{value}</span>
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
