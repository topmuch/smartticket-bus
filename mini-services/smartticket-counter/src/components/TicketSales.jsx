import { useState, useEffect, useMemo } from 'react';
import {
  MapPin,
  User,
  Phone,
  Banknote,
  Smartphone,
  CreditCard,
  Calculator,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ChevronDown,
  ShoppingCart,
  ArrowRight,
  Minus,
  Plus,
  RotateCcw,
} from 'lucide-react';
import { getZones, getFares, sellTicket } from '../services/api';

const PAYMENT_METHODS = [
  { key: 'cash', label: 'Espèces', icon: Banknote },
  { key: 'mobile_money', label: 'Mobile Money', icon: Smartphone },
  { key: 'card', label: 'Carte', icon: CreditCard },
];

export default function TicketSales({ sessionOpen, onSold }) {
  // Data
  const [zones, setZones] = useState([]);
  const [fares, setFares] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Form
  const [fromZone, setFromZone] = useState('');
  const [toZone, setToZone] = useState('');
  const [passengerName, setPassengerName] = useState('');
  const [passengerPhone, setPassengerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');

  // UI state
  const [selling, setSelling] = useState(false);
  const [error, setError] = useState('');

  // Fetch zones & fares on mount
  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        const [zonesRes, faresRes] = await Promise.all([getZones(), getFares()]);
        if (!cancelled) {
          if (zonesRes.success) setZones(Array.isArray(zonesRes.data) ? zonesRes.data : []);
          if (faresRes.success) setFares(Array.isArray(faresRes.data) ? faresRes.data : []);
        }
      } catch {
        // Silently handle – zones/fares might not be available
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, []);

  // Calculate price
  const price = useMemo(() => {
    if (!fromZone || !toZone || fromZone === toZone) return 0;
    const fare = fares.find(
      (f) => String(f.from_zone_id) === String(fromZone) && String(f.to_zone_id) === String(toZone)
    );
    return fare?.price ? Number(fare.price) : 0;
  }, [fromZone, toZone, fares]);

  const change = useMemo(() => {
    const paid = Number(amountPaid) || 0;
    return paid > price ? paid - price : 0;
  }, [amountPaid, price]);

  const paidAmount = Number(amountPaid) || 0;
  const isFormValid = fromZone && toZone && fromZone !== toZone && price > 0 && passengerName.trim();

  // Numpad button helper
  const numpadValue = (val) => {
    if (val === 'clear') return setAmountPaid('');
    if (val === 'backspace') return setAmountPaid((p) => p.slice(0, -1));
    setAmountPaid((p) => {
      const next = p + val;
      // Limit to 8 digits
      return next.length > 8 ? p : next;
    });
  };

  const handleSell = async () => {
    if (!sessionOpen) {
      setError('Veuillez ouvrir une session de caisse');
      return;
    }
    if (!isFormValid) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setError('');
    setSelling(true);
    try {
      const res = await sellTicket({
        from_zone_id: Number(fromZone),
        to_zone_id: Number(toZone),
        passenger_name: passengerName.trim(),
        passenger_phone: passengerPhone.trim() || undefined,
        payment_method: paymentMethod,
        amount_paid: paidAmount,
      });

      if (res.success && res.data) {
        // Reset form
        setFromZone('');
        setToZone('');
        setPassengerName('');
        setPassengerPhone('');
        setPaymentMethod('cash');
        setAmountPaid('');
        onSold(res.data);
      } else {
        setError(res.message || 'Erreur lors de la vente');
      }
    } catch (err) {
      setError(err.message || 'Erreur réseau');
    } finally {
      setSelling(false);
    }
  };

  const fromZoneName = zones.find((z) => String(z.id) === String(fromZone))?.name || '';
  const toZoneName = zones.find((z) => String(z.id) === String(toZone))?.name || '';

  if (dataLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="card h-32 bg-gray-100" />
        <div className="card h-24 bg-gray-100" />
        <div className="card h-40 bg-gray-100" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 animate-fade-in">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-red-400 text-lg leading-none">&times;</button>
        </div>
      )}

      {/* Session warning */}
      {!sessionOpen && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-sm">Caisse fermée</p>
            <p className="text-xs mt-0.5">Ouvrez une session de caisse dans l'onglet « Caisse » pour activer les ventes.</p>
          </div>
        </div>
      )}

      {/* Step 1: Route Selection */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center">
            <MapPin className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-semibold text-gray-900">Sélection du trajet</h3>
        </div>

        <div className="space-y-3">
          {/* From zone */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Zone de départ
            </label>
            <div className="relative">
              <select
                value={fromZone}
                onChange={(e) => setFromZone(e.target.value)}
                className="select-field"
                disabled={selling}
              >
                <option value="">Choisir une zone...</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Arrow icon */}
          <div className="flex justify-center">
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </div>
          </div>

          {/* To zone */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Zone d'arrivée
            </label>
            <div className="relative">
              <select
                value={toZone}
                onChange={(e) => setToZone(e.target.value)}
                className="select-field"
                disabled={selling}
              >
                <option value="">Choisir une zone...</option>
                {zones
                  .filter((z) => String(z.id) !== String(fromZone))
                  .map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name}
                    </option>
                  ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Price display */}
        {fromZone && toZone && fromZone !== toZone && (
          <div className={`mt-4 p-4 rounded-xl text-center animate-scale-in ${price > 0 ? 'bg-accent/10 border border-accent/20' : 'bg-gray-100'}`}>
            {price > 0 ? (
              <>
                <div className="text-xs text-accent/80 font-medium mb-0.5">Tarif</div>
                <div className="text-3xl font-bold text-accent">{price.toLocaleString('fr-FR')}</div>
                <div className="text-sm text-accent/80 font-medium">FCFA</div>
              </>
            ) : (
              <div className="text-sm text-gray-500">Aucun tarif trouvé pour ce trajet</div>
            )}
          </div>
        )}

        {/* Zone names summary */}
        {fromZoneName && toZoneName && (
          <div className="mt-3 text-center text-xs text-gray-500">
            {fromZoneName} → {toZoneName}
          </div>
        )}
      </div>

      {/* Step 2: Passenger Info */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-semibold text-gray-900">Passager</h3>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Nom du passager *
            </label>
            <input
              type="text"
              value={passengerName}
              onChange={(e) => setPassengerName(e.target.value)}
              className="input-field"
              placeholder="Nom complet"
              disabled={selling}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Téléphone <span className="text-gray-400">(optionnel)</span>
            </label>
            <input
              type="tel"
              value={passengerPhone}
              onChange={(e) => setPassengerPhone(e.target.value)}
              className="input-field"
              placeholder="+221 XX XXX XX XX"
              disabled={selling}
              inputMode="tel"
            />
          </div>
        </div>
      </div>

      {/* Step 2b: Payment */}
      {price > 0 && (
        <div className="card animate-fade-in-up">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center">
              <Banknote className="w-4 h-4 text-primary" />
            </div>
            <h3 className="font-semibold text-gray-900">Paiement</h3>
          </div>

          {/* Payment method toggle */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {PAYMENT_METHODS.map((method) => (
              <button
                key={method.key}
                onClick={() => setPaymentMethod(method.key)}
                className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all active:scale-95 ${
                  paymentMethod === method.key
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
                disabled={selling}
              >
                <method.icon className="w-5 h-5" />
                <span className="text-xs font-medium">{method.label}</span>
              </button>
            ))}
          </div>

          {/* Amount paid (especially for cash) */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Montant reçu <span className="text-gray-400">(FCFA)</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="input-field flex-1 text-xl font-bold"
                placeholder="0"
                inputMode="numeric"
                disabled={selling}
              />
              <button
                onClick={() => setAmountPaid(String(price))}
                className="bg-primary/10 text-primary font-semibold text-xs px-3 py-3 rounded-xl active:scale-95 transition-transform"
                title="Monnaie exacte"
              >
                Exact
              </button>
            </div>

            {/* Quick amount buttons */}
            <div className="flex flex-wrap gap-2 mt-2">
              {[100, 200, 500, 1000, 2000, 5000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setAmountPaid(String(amt))}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all active:scale-95 ${
                    Number(amountPaid) === amt
                      ? 'border-primary bg-primary/10 text-primary font-semibold'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                  disabled={selling}
                >
                  {amt}
                </button>
              ))}
            </div>

            {/* Change display */}
            {paidAmount > 0 && (
              <div className={`mt-3 p-3 rounded-xl flex items-center justify-between ${
                paidAmount >= price
                  ? 'bg-accent/10 border border-accent/20'
                  : 'bg-red-50 border border-red-200'
              }`}>
                <span className="text-sm text-gray-600">Monnaie à rendre</span>
                <span className={`font-bold text-lg ${paidAmount >= price ? 'text-accent' : 'text-danger'}`}>
                  {paidAmount >= price
                    ? `${change.toLocaleString('fr-FR')} FCFA`
                    : `Manque ${(price - paidAmount).toLocaleString('fr-FR')} FCFA`
                  }
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Summary & Sell */}
      {isFormValid && (
        <div className="card border-primary/20 bg-primary/[0.02] animate-slide-up">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-primary" />
            </div>
            <h3 className="font-semibold text-gray-900">Récapitulatif</h3>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Trajet</span>
              <span className="font-medium">{fromZoneName} → {toZoneName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Passager</span>
              <span className="font-medium">{passengerName.trim()}</span>
            </div>
            {passengerPhone.trim() && (
              <div className="flex justify-between">
                <span className="text-gray-500">Téléphone</span>
                <span className="font-medium">{passengerPhone.trim()}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Paiement</span>
              <span className="font-medium">{PAYMENT_METHODS.find(m => m.key === paymentMethod)?.label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Tarif</span>
              <span className="font-bold text-lg text-primary">{price.toLocaleString('fr-FR')} FCFA</span>
            </div>
            {paidAmount > 0 && paidAmount >= price && (
              <div className="flex justify-between text-accent">
                <span>Monnaie</span>
                <span className="font-semibold">{change.toLocaleString('fr-FR')} FCFA</span>
              </div>
            )}
          </div>

          <button
            onClick={handleSell}
            disabled={selling || !sessionOpen || (paymentMethod === 'cash' && paidAmount < price)}
            className="btn-accent w-full mt-4 flex items-center justify-center gap-2"
          >
            {selling ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Vente en cours...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                VENDRE LE TICKET
              </>
            )}
          </button>
        </div>
      )}

      {/* Empty state hint when nothing selected */}
      {!fromZone && !toZone && (
        <div className="text-center py-8 text-gray-400">
          <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Sélectionnez les zones de départ et d'arrivée pour commencer</p>
        </div>
      )}
    </div>
  );
}
