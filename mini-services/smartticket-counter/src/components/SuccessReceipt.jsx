import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  QrCode,
  Ticket,
  ArrowRight,
  Clock,
  User,
  Banknote,
} from 'lucide-react';

export default function SuccessReceipt({ data, onDismiss }) {
  const [copied, setCopied] = useState(false);
  const [particles, setParticles] = useState([]);

  // Generate confetti particles
  useEffect(() => {
    const colors = ['#00b894', '#f39c12', '#0f4c75', '#e74c3c', '#6c5ce7', '#00cec9'];
    const newParticles = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 1.5,
      duration: 2 + Math.random() * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 4 + Math.random() * 8,
    }));
    setParticles(newParticles);
  }, []);

  const handleCopy = async () => {
    if (data?.qr_code) {
      try {
        await navigator.clipboard.writeText(data.qr_code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Clipboard not available
      }
    }
  };

  if (!data) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onDismiss} />

      {/* Confetti */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-sm"
            style={{
              left: `${p.x}%`,
              top: '-5%',
              width: `${p.size}px`,
              height: `${p.size * 0.6}px`,
              backgroundColor: p.color,
              animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s infinite`,
              opacity: 0.8,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden animate-scale-in">
        {/* Green header */}
        <div className="bg-accent text-white p-6 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 animate-scale-in" style={{ animationDelay: '0.2s' }}>
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <h2 className="text-xl font-bold">Ticket vendu avec succès !</h2>
          <p className="text-accent-100 text-sm mt-1">Le ticket a été enregistré</p>
        </div>

        {/* Receipt body */}
        <div className="p-5 space-y-4">
          {/* Ticket number */}
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Ticket className="w-4 h-4 text-primary" />
              <span className="text-xs text-gray-500 font-medium">Numéro de ticket</span>
            </div>
            <div className="text-2xl font-bold text-primary font-mono tracking-wide">
              {data.ticket_number || data.id || '—'}
            </div>
          </div>

          {/* Ticket details */}
          <div className="space-y-2.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 flex items-center gap-1.5">
                <ArrowRight className="w-3.5 h-3.5" />
                Trajet
              </span>
              <span className="font-semibold text-right">
                {data.from_zone || '—'} → {data.to_zone || '—'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-500 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                Passager
              </span>
              <span className="font-semibold">{data.passenger_name || '—'}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-500 flex items-center gap-1.5">
                <Banknote className="w-3.5 h-3.5" />
                Prix
              </span>
              <span className="font-bold text-lg text-accent">
                {(data.price || 0).toLocaleString('fr-FR')} FCFA
              </span>
            </div>

            {data.valid_until && (
              <div className="flex items-center justify-between">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Valide jusqu'au
                </span>
                <span className="font-medium text-xs">
                  {new Date(data.valid_until).toLocaleString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
          </div>

          {/* QR Code section */}
          {data.qr_code && (
            <div className="border border-dashed border-gray-300 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <QrCode className="w-4 h-4 text-gray-500" />
                <span className="text-xs text-gray-500 font-medium">Code QR du ticket</span>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 break-all text-xs font-mono text-gray-600 max-h-20 overflow-y-auto leading-relaxed">
                {data.qr_code}
              </div>
              <button
                onClick={handleCopy}
                className="mt-2 flex items-center gap-1.5 text-xs text-primary font-medium mx-auto active:opacity-70"
              >
                <Copy className="w-3.5 h-3.5" />
                {copied ? 'Copié !' : 'Copier le code'}
              </button>
            </div>
          )}

          {/* Dismiss button */}
          <button
            onClick={onDismiss}
            className="btn-accent w-full flex items-center justify-center gap-2"
          >
            <Ticket className="w-5 h-5" />
            Nouvelle vente
          </button>
        </div>
      </div>
    </div>
  );
}
