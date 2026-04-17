'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch, formatCurrency } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Ticket,
  CreditCard,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Wallet,
  Smartphone,
  Banknote,
  User,
  Phone,
  CalendarDays,
  Search,
  MapPin,
  Loader2,
  Camera,
  QrCode,
  Bus,
} from 'lucide-react';

interface Stop {
  id: string;
  name: string;
  code: string;
  zoneId: string;
  zone?: { id: string; name: string; code: string; color: string };
}

interface Line {
  id: string;
  name: string;
  number: number;
  color: string;
}

interface FareCalcResult {
  price: number;
  fareId: string | null;
  fromZone: string;
  toZone: string;
  message: string;
}

type TicketType = 'UNIT' | 'SUBSCRIPTION';
type PaymentMethod = 'ESPECES' | 'MOBILE_MONEY' | 'CARTE';

const STEPS = ['Type', 'Trajet', 'Passager', 'Paiement'];

export default function TicketSalesView() {
  const user = useAuthStore((s) => s.user);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [stops, setStops] = useState<Stop[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [searchDepart, setSearchDepart] = useState('');
  const [searchArrivee, setSearchArrivee] = useState('');
  const [fareResult, setFareResult] = useState<FareCalcResult | null>(null);
  const [fareLoading, setFareLoading] = useState(false);

  // Form state
  const [ticketType, setTicketType] = useState<TicketType>('UNIT');
  const [fromStopId, setFromStopId] = useState('');
  const [toStopId, setToStopId] = useState('');
  const [lineId, setLineId] = useState('');
  const [passengerName, setPassengerName] = useState('');
  const [passengerPhone, setPassengerPhone] = useState('');
  const [passengerPhoto, setPassengerPhoto] = useState('');
  const [durationDays, setDurationDays] = useState(30);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('ESPECES');
  const [amountPaid, setAmountPaid] = useState('');
  const [notes, setNotes] = useState('');

  // Success state
  const [showSuccess, setShowSuccess] = useState(false);
  const [soldTicket, setSoldTicket] = useState<any>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch stops
  useEffect(() => {
    apiFetch<Stop[]>('/api/stops?active=true').then((res) => {
      if (res.success && res.data) setStops(res.data);
    });
    apiFetch<Line[]>('/api/lines?active=true').then((res) => {
      if (res.success && res.data) setLines(res.data);
    });
  }, []);

  // Calculate fare when stops change
  const calculateFare = useCallback(async () => {
    if (!fromStopId || !toStopId) {
      setFareResult(null);
      return;
    }
    if (fromStopId === toStopId) {
      setError('Les arrêts de départ et d\'arrivée doivent être différents.');
      setFareResult(null);
      return;
    }
    setError('');
    setFareLoading(true);

    const fromStop = stops.find((s) => s.id === fromStopId);
    const toStop = stops.find((s) => s.id === toStopId);

    if (!fromStop?.zoneId || !toStop?.zoneId) {
      setFareLoading(false);
      return;
    }

    const res = await apiFetch<FareCalcResult>('/api/pricing/calculate', {
      method: 'POST',
      body: JSON.stringify({ fromZoneId: fromStop.zoneId, toZoneId: toStop.zoneId }),
    });

    if (res.success && res.data) {
      setFareResult(res.data);
    } else {
      setFareResult(null);
      setError(res.error || 'Tarif non trouvé');
    }
    setFareLoading(false);
  }, [fromStopId, toStopId, stops]);

  useEffect(() => {
    if (currentStep >= 1) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      calculateFare();
    }
  }, [fromStopId, toStopId, currentStep, calculateFare]);

  const price = ticketType === 'SUBSCRIPTION' && fareResult
    ? fareResult.price * (durationDays / 30)
    : fareResult?.price || 0;

  const change = Math.max(0, Number(amountPaid) - price);

  const canGoNext = () => {
    switch (currentStep) {
      case 0: return !!ticketType;
      case 1: return !!fromStopId && !!toStopId && !!fareResult;
      case 2: {
        if (ticketType === 'SUBSCRIPTION') return !!passengerName && !!passengerPhone;
        return true;
      }
      default: return false;
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setPassengerPhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSell = async () => {
    if (paymentMethod === 'ESPECES' && Number(amountPaid) < price) {
      setError('Le montant reçu est insuffisant.');
      return;
    }
    setLoading(true);
    setError('');

    const body: any = {
      type: ticketType,
      fromStopId,
      toStopId,
      price,
      amountPaid: paymentMethod === 'ESPECES' ? Number(amountPaid) : price,
      paymentMethod,
      passengerName: passengerName || null,
      passengerPhone: passengerPhone || null,
      passengerPhoto: passengerPhoto || null,
    };

    if (lineId) body.lineId = lineId;
    if (fareResult?.fareId) body.fareId = fareResult.fareId;
    if (ticketType === 'SUBSCRIPTION') body.durationDays = durationDays;
    if (notes) body.notes = notes;

    const res = await apiFetch('/api/tickets', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    setLoading(false);

    if (res.success && res.data) {
      // Generate QR image
      const qrRes = await apiFetch<{ qrImage: string }>('/api/tickets/generate-qr', {
        method: 'POST',
        body: JSON.stringify({ ticketId: res.data.id }),
      });
      if (qrRes.success && qrRes.data) {
        res.data.qrImage = qrRes.data.qrImage;
      }
      setSoldTicket(res.data);
      setShowSuccess(true);
    } else {
      setError(res.error || 'Erreur lors de la vente');
    }
  };

  const resetForm = () => {
    setCurrentStep(0);
    setTicketType('UNIT');
    setFromStopId('');
    setToStopId('');
    setLineId('');
    setPassengerName('');
    setPassengerPhone('');
    setPassengerPhoto('');
    setDurationDays(30);
    setPaymentMethod('ESPECES');
    setAmountPaid('');
    setNotes('');
    setFareResult(null);
    setError('');
    setShowSuccess(false);
    setSoldTicket(null);
  };

  const filteredDepartStops = stops.filter(
    (s) =>
      s.name.toLowerCase().includes(searchDepart.toLowerCase()) ||
      s.code.toLowerCase().includes(searchDepart.toLowerCase())
  );
  const filteredArriveeStops = stops.filter(
    (s) =>
      s.name.toLowerCase().includes(searchArrivee.toLowerCase()) ||
      s.code.toLowerCase().includes(searchArrivee.toLowerCase())
  );
  const fromStop = stops.find((s) => s.id === fromStopId);
  const toStop = stops.find((s) => s.id === toStopId);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Step indicator */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            {STEPS.map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-colors ${
                    i < currentStep
                      ? 'bg-green-600 text-white'
                      : i === currentStep
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {i < currentStep ? <CheckCircle className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-sm hidden sm:inline ${i === currentStep ? 'font-semibold' : 'text-muted-foreground'}`}>
                  {step}
                </span>
                {i < STEPS.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-muted-foreground mx-1 hidden sm:block" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      {/* Step 0: Ticket Type */}
      {currentStep === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="w-5 h-5" /> Type de Ticket
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Sélectionnez le type de ticket à vendre.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Unit Ticket */}
              <button
                onClick={() => setTicketType('UNIT')}
                className={`relative p-6 rounded-xl border-2 text-left transition-all hover:shadow-md ${
                  ticketType === 'UNIT'
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'border-muted hover:border-primary/50'
                }`}
              >
                {ticketType === 'UNIT' && (
                  <div className="absolute top-3 right-3">
                    <CheckCircle className="w-5 h-5 text-primary" />
                  </div>
                )}
                <Bus className="w-10 h-10 text-primary mb-3" />
                <h3 className="font-bold text-lg">Unité</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Ticket à usage unique, valide 3 heures.
                </p>
                <Badge variant="secondary" className="mt-2">Trajet simple</Badge>
              </button>

              {/* Subscription */}
              <button
                onClick={() => setTicketType('SUBSCRIPTION')}
                className={`relative p-6 rounded-xl border-2 text-left transition-all hover:shadow-md ${
                  ticketType === 'SUBSCRIPTION'
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'border-muted hover:border-primary/50'
                }`}
              >
                {ticketType === 'SUBSCRIPTION' && (
                  <div className="absolute top-3 right-3">
                    <CheckCircle className="w-5 h-5 text-primary" />
                  </div>
                )}
                <CalendarDays className="w-10 h-10 text-primary mb-3" />
                <h3 className="font-bold text-lg">Abonnement</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Pass mensuel pour trajets illimités sur la zone.
                </p>
                <Badge variant="secondary" className="mt-2">30 / 60 / 90 jours</Badge>
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setCurrentStep(1)} disabled={!ticketType} size="lg">
                Suivant <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Trajet */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" /> Sélection du Trajet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Departure */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-green-600" /> Départ
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher un arrêt..."
                    value={searchDepart}
                    onChange={(e) => setSearchDepart(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={fromStopId} onValueChange={setFromStopId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionner l'arrêt de départ" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredDepartStops.map((stop) => (
                      <SelectItem key={stop.id} value={stop.id}>
                        <span className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{stop.code}</span>
                          {stop.name}
                          {stop.zone && (
                            <Badge variant="outline" className="text-xs ml-1">
                              {stop.zone.name}
                            </Badge>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Arrival */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-red-600" /> Arrivée
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher un arrêt..."
                    value={searchArrivee}
                    onChange={(e) => setSearchArrivee(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={toStopId} onValueChange={setToStopId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionner l'arrêt d'arrivée" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredArriveeStops.map((stop) => (
                      <SelectItem key={stop.id} value={stop.id}>
                        <span className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{stop.code}</span>
                          {stop.name}
                          {stop.zone && (
                            <Badge variant="outline" className="text-xs ml-1">
                              {stop.zone.name}
                            </Badge>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Line selector (optional) */}
            <div className="space-y-2">
              <Label className="text-sm">Ligne (optionnel)</Label>
              <Select value={lineId} onValueChange={setLineId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionner une ligne" />
                </SelectTrigger>
                <SelectContent>
                  {lines.map((line) => (
                    <SelectItem key={line.id} value={line.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: line.color }}
                        />
                        Ligne {line.number} - {line.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fare result */}
            {fareLoading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Calcul du tarif...
                </span>
              </div>
            )}

            {fareResult && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Trajet</span>
                  <span className="font-medium text-sm">
                    {fromStop?.name} → {toStop?.name}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Zones</span>
                  <span className="font-medium text-sm">
                    {fareResult.fromZone} → {fareResult.toZone}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Tarif</span>
                  <span className="text-xl font-bold text-primary">
                    {formatCurrency(price)}
                  </span>
                </div>
                {ticketType === 'SUBSCRIPTION' && (
                  <p className="text-xs text-muted-foreground">
                    * Tarif abonnement ({durationDays} jours) calculé sur la base mensuelle
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setCurrentStep(0)}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Retour
              </Button>
              <Button onClick={() => setCurrentStep(2)} disabled={!canGoNext()} size="lg">
                Suivant <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Passenger Info */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" /> Informations Passager
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {ticketType === 'UNIT' && (
              <p className="text-sm text-muted-foreground bg-blue-50 border border-blue-200 rounded-lg p-3">
                Les informations passager sont optionnelles pour un ticket unité.
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="passengerName" className="flex items-center gap-1">
                  <User className="w-4 h-4" /> Nom du passager
                  {ticketType === 'SUBSCRIPTION' && (
                    <span className="text-red-500">*</span>
                  )}
                </Label>
                <Input
                  id="passengerName"
                  placeholder="Nom complet"
                  value={passengerName}
                  onChange={(e) => setPassengerName(e.target.value)}
                  required={ticketType === 'SUBSCRIPTION'}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="passengerPhone" className="flex items-center gap-1">
                  <Phone className="w-4 h-4" /> Téléphone
                  {ticketType === 'SUBSCRIPTION' && (
                    <span className="text-red-500">*</span>
                  )}
                </Label>
                <Input
                  id="passengerPhone"
                  type="tel"
                  placeholder="06 XX XX XX XX"
                  value={passengerPhone}
                  onChange={(e) => setPassengerPhone(e.target.value)}
                  required={ticketType === 'SUBSCRIPTION'}
                />
              </div>
            </div>

            {/* Subscription-specific fields */}
            {ticketType === 'SUBSCRIPTION' && (
              <>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <CalendarDays className="w-4 h-4" /> Durée de l&apos;abonnement
                  </Label>
                  <div className="grid grid-cols-3 gap-3">
                    {[30, 60, 90].map((days) => (
                      <button
                        key={days}
                        onClick={() => setDurationDays(days)}
                        className={`p-3 rounded-lg border-2 text-center transition-all ${
                          durationDays === days
                            ? 'border-primary bg-primary/5'
                            : 'border-muted hover:border-primary/50'
                        }`}
                      >
                        <div className="font-bold text-lg">{days}</div>
                        <div className="text-xs text-muted-foreground">jours</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Camera className="w-4 h-4" /> Photo du passager
                    <span className="text-red-500">*</span>
                  </Label>
                  <div
                    className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {passengerPhoto ? (
                      <div className="space-y-2">
                        <img
                          src={passengerPhoto}
                          alt="Photo passager"
                          className="w-24 h-24 rounded-full object-cover mx-auto"
                        />
                        <p className="text-sm text-muted-foreground">Cliquer pour changer</p>
                      </div>
                    ) : (
                      <div className="space-y-2 py-2">
                        <Camera className="w-8 h-8 text-muted-foreground mx-auto" />
                        <p className="text-sm text-muted-foreground">
                          Cliquer pour ajouter une photo
                        </p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </div>
              </>
            )}

            {/* Trip summary */}
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Trajet:</span>
                <span className="font-medium">
                  {fromStop?.name} → {toStop?.name}
                </span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-muted-foreground">Type:</span>
                <span className="font-medium">
                  {ticketType === 'UNIT' ? 'Unité' : `Abonnement ${durationDays}j`}
                </span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between">
                <span className="font-semibold">Total:</span>
                <span className="font-bold text-primary text-lg">
                  {formatCurrency(price)}
                </span>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Retour
              </Button>
              <Button onClick={() => setCurrentStep(3)} disabled={!canGoNext()} size="lg">
                Suivant <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Payment */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" /> Paiement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Price summary */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Trajet</span>
                <span className="font-medium">{fromStop?.name} → {toStop?.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Type</span>
                <Badge variant={ticketType === 'UNIT' ? 'default' : 'secondary'}>
                  {ticketType === 'UNIT' ? 'Unité' : `Abonnement ${durationDays}j`}
                </Badge>
              </div>
              {passengerName && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Passager</span>
                  <span className="font-medium">{passengerName}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Montant à payer</span>
                <span className="text-2xl font-bold text-primary">
                  {formatCurrency(price)}
                </span>
              </div>
            </div>

            {/* Payment method */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Mode de paiement</Label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'ESPECES' as PaymentMethod, icon: Banknote, label: 'Espèces' },
                  { value: 'MOBILE_MONEY' as PaymentMethod, icon: Smartphone, label: 'Mobile Money' },
                  { value: 'CARTE' as PaymentMethod, icon: CreditCard, label: 'Carte' },
                ].map((method) => (
                  <button
                    key={method.value}
                    onClick={() => {
                      setPaymentMethod(method.value);
                      if (method.value !== 'ESPECES') setAmountPaid(String(price));
                    }}
                    className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all gap-2 ${
                      paymentMethod === method.value
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-muted hover:border-primary/50'
                    }`}
                  >
                    <method.icon className="w-6 h-6" />
                    <span className="text-xs font-medium">{method.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Cash payment */}
            {paymentMethod === 'ESPECES' && (
              <div className="space-y-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
                <Label htmlFor="amountPaid" className="text-sm font-semibold flex items-center gap-1">
                  <Banknote className="w-4 h-4" /> Montant reçu (FCFA)
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="amountPaid"
                  type="number"
                  placeholder="0"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  className="text-2xl font-bold text-center h-14"
                  min={price}
                  step={50}
                />

                {/* Quick amount buttons */}
                <div className="flex flex-wrap gap-2">
                  {[
                    Math.ceil(price / 50) * 50,
                    Math.ceil(price / 100) * 100,
                    Math.ceil(price / 500) * 500,
                    Math.ceil(price / 1000) * 1000,
                  ]
                    .filter((v, i, a) => a.indexOf(v) === i && v >= price)
                    .slice(0, 4)
                    .map((amount) => (
                      <Button
                        key={amount}
                        variant="outline"
                        size="sm"
                        onClick={() => setAmountPaid(String(amount))}
                        className="text-xs"
                      >
                        {formatCurrency(amount)}
                      </Button>
                    ))}
                </div>

                {/* Change calculator */}
                {Number(amountPaid) >= price && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <p className="text-sm text-green-600 font-medium">Monnaie à rendre</p>
                    <p className="text-3xl font-bold text-green-700">
                      {formatCurrency(change)}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Mobile Money / Card confirmation */}
            {paymentMethod !== 'ESPECES' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                <p className="text-sm text-blue-600">
                  Le montant de <strong>{formatCurrency(price)}</strong> sera encaissé via{' '}
                  {paymentMethod === 'MOBILE_MONEY' ? 'Mobile Money' : 'Carte bancaire'}.
                </p>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-sm">Notes (optionnel)</Label>
              <Input
                placeholder="Notes internes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setCurrentStep(2)}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Retour
              </Button>
              <Button
                onClick={handleSell}
                disabled={loading || (paymentMethod === 'ESPECES' && Number(amountPaid) < price)}
                size="lg"
                className="bg-green-600 hover:bg-green-700 text-white font-bold text-lg h-14 px-8"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Wallet className="w-5 h-5" />
                    Vendre le Ticket — {formatCurrency(price)}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-green-600 flex items-center justify-center gap-2">
              <CheckCircle className="w-6 h-6" /> Ticket Vendu !
            </DialogTitle>
            <DialogDescription className="text-center">
              Le ticket a été vendu avec succès.
            </DialogDescription>
          </DialogHeader>

          {soldTicket && (
            <div className="space-y-4">
              {/* QR Code */}
              {soldTicket.qrImage && (
                <div className="flex justify-center">
                  <div className="bg-white p-3 rounded-xl border shadow-sm">
                    <img
                      src={soldTicket.qrImage}
                      alt="QR Code du ticket"
                      className="w-48 h-48"
                    />
                  </div>
                </div>
              )}

              <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">N° Ticket</span>
                  <span className="font-mono font-bold">{soldTicket.ticketNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <Badge>{soldTicket.type === 'UNIT' ? 'Unité' : 'Abonnement'}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Trajet</span>
                  <span className="font-medium">
                    {soldTicket.fromStop?.name} → {soldTicket.toStop?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prix</span>
                  <span className="font-bold text-primary">{formatCurrency(soldTicket.price)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payé</span>
                  <span>{formatCurrency(soldTicket.amountPaid)}</span>
                </div>
                {soldTicket.changeGiven > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monnaie</span>
                    <span className="font-bold text-green-600">
                      {formatCurrency(soldTicket.changeGiven)}
                    </span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Opérateur</span>
                  <span>{user?.name}</span>
                </div>
              </div>

              <Button onClick={resetForm} className="w-full" size="lg">
                Nouvelle Vente
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
