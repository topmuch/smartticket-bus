'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, RefreshCw, Clock, Bus, AlertTriangle, CheckCircle, XCircle, ArrowRightLeft, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

interface Departure {
  id: string;
  lineId: string;
  direction: string;
  departureDate: string;
  scheduledTime: string;
  originStationId?: string | null;
  destinationStationId?: string | null;
  platform?: string | null;
  status: string;
  delayMinutes: number;
  maxSeats: number;
  availableSeats: number;
  price: number;
  notes?: string | null;
  line?: { id: string; number: string; name: string; color: string };
  originStation?: { id: string; name: string; code: string } | null;
  destinationStation?: { id: string; name: string; code: string } | null;
  _count?: { tickets: number };
}

interface Line {
  id: string;
  number: string;
  name: string;
  color: string;
}

interface Stop {
  id: string;
  name: string;
  code: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  SCHEDULED: { label: 'Programmé', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300', icon: <Clock className="w-3 h-3" /> },
  BOARDING: { label: 'Embarquement', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300', icon: <CheckCircle className="w-3 h-3" /> },
  DELAYED: { label: 'Retardé', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300', icon: <AlertTriangle className="w-3 h-3" /> },
  DEPARTED: { label: 'Parti', color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400', icon: <CheckCircle className="w-3 h-3" /> },
  CANCELLED: { label: 'Annulé', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300', icon: <XCircle className="w-3 h-3" /> },
};

const DIRECTION_LABELS: Record<string, string> = { ALLER: 'aller', RETOUR: 'retour' };

export function DeparturesManager() {
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterLine, setFilterLine] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    lineId: '',
    direction: 'ALLER',
    departureDate: new Date().toISOString().split('T')[0],
    scheduledTime: '07:00',
    originStationId: '',
    destinationStationId: '',
    platform: '',
    maxSeats: 45,
    price: 2500,
  });

  const refreshDepartures = () => {
    const params = new URLSearchParams();
    if (filterDate) params.set('date', filterDate);
    if (filterLine && filterLine !== 'all') params.set('lineId', filterLine);
    if (filterStatus && filterStatus !== 'all') params.set('status', filterStatus);
    fetch(`/api/departures?${params}`)
      .then(r => r.json())
      .then(json => setDepartures(json.data || []))
      .catch(() => {});
  };

  useEffect(() => {
    fetch('/api/lines').then(r => r.json()).then(d => setLines(d || [])).catch(() => {});
    fetch('/api/public/stops').then(r => r.json()).then(d => setStops(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filterDate) params.set('date', filterDate);
        if (filterLine && filterLine !== 'all') params.set('lineId', filterLine);
        if (filterStatus && filterStatus !== 'all') params.set('status', filterStatus);
        const res = await fetch(`/api/departures?${params}`);
        if (!cancelled) {
          const json = await res.json();
          setDepartures(json.data || []);
        }
      } catch (e) { console.error(e); }
      if (!cancelled) setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [filterDate, filterLine, filterStatus]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = editingId ? `/api/departures/${editingId}` : '/api/departures';
      const method = editingId ? 'PUT' : 'POST';
      const body = editingId
        ? { status: 'SCHEDULED', maxSeats: form.maxSeats, platform: form.platform, notes: '' }
        : form;
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) { setDialogOpen(false); refreshDepartures(); resetForm(); }
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce départ ?')) return;
    try {
      await fetch(`/api/departures/${id}`, { method: 'DELETE' });
      refreshDepartures();
    } catch (e) { console.error(e); }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await fetch(`/api/departures/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      refreshDepartures();
    } catch (e) { console.error(e); }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({
      lineId: lines[0]?.id || '',
      direction: 'ALLER',
      departureDate: filterDate,
      scheduledTime: '07:00',
      originStationId: '',
      destinationStationId: '',
      platform: '',
      maxSeats: 45,
      price: 2500,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setForm({ lineId: '', direction: 'ALLER', departureDate: '', scheduledTime: '07:00', originStationId: '', destinationStationId: '', platform: '', maxSeats: 45, price: 2500 });
    setEditingId(null);
  };

  const filtered = departures;

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bus className="w-6 h-6 text-primary" />
            Gestion des Départs
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Planifiez et gérez les départs fixes aller/retour
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Nouveau Départ
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Date</Label>
            <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="w-44" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Ligne</Label>
            <Select value={filterLine} onValueChange={setFilterLine}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Toutes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                {lines.map(l => <SelectItem key={l.id} value={l.id}>{l.number} — {l.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Statut</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Tous" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="icon" onClick={refreshDepartures} className="ml-auto">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardContent>
      </Card>

      {/* Departures List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Aucun départ trouvé pour cette date</p>
            <Button variant="outline" className="mt-3" onClick={openCreate}>Créer un départ</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(d => {
            const cfg = STATUS_CONFIG[d.status] || STATUS_CONFIG.SCHEDULED;
            const pct = d.maxSeats > 0 ? ((d.maxSeats - d.availableSeats) / d.maxSeats) * 100 : 0;
            return (
              <Card key={d.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                    {/* Time */}
                    <div className="flex items-center gap-3 lg:w-28 shrink-0">
                      <div className="text-2xl font-bold tabular-nums">
                        {d.scheduledTime}
                        {d.delayMinutes > 0 && <span className="text-sm font-normal text-amber-600 ml-1">+{d.delayMinutes}min</span>}
                      </div>
                    </div>

                    {/* Line */}
                    <div className="flex items-center gap-2 lg:w-48 shrink-0">
                      <div className="w-3 h-8 rounded-full" style={{ backgroundColor: d.line?.color || '#666' }} />
                      <div>
                        <p className="font-semibold text-sm">{d.line?.number}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[140px]">{d.line?.name}</p>
                      </div>
                    </div>

                    {/* Direction + Route */}
                    <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2">
                      <Badge variant="outline" className="w-fit gap-1">
                        <ArrowRightLeft className="w-3 h-3" />
                        {DIRECTION_LABELS[d.direction] || d.direction}
                      </Badge>
                      <span className="text-sm">
                        {d.originStation?.name || '?'} → {d.destinationStation?.name || '?'}
                      </span>
                      {d.platform && <Badge variant="secondary" className="w-fit text-xs">Quai {d.platform}</Badge>}
                    </div>

                    {/* Seats */}
                    <div className="flex items-center gap-2 lg:w-40 shrink-0">
                      <div className="flex-1">
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-green-500'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{d.availableSeats}/{d.maxSeats} places</p>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="lg:w-24 text-right shrink-0">
                      <p className="font-semibold">{d.price.toLocaleString()} F</p>
                      <p className="text-xs text-muted-foreground">{d._count?.tickets || 0} vendus</p>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-2 lg:w-36 shrink-0">
                      <Badge className={`${cfg.color} gap-1`}>
                        {cfg.icon}
                        {cfg.label}
                      </Badge>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {d.status === 'SCHEDULED' && (
                        <Button size="sm" variant="outline" className="text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleStatusChange(d.id, 'BOARDING')}>
                          Embarquer
                        </Button>
                      )}
                      {d.status === 'BOARDING' && (
                        <Button size="sm" variant="outline" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => handleStatusChange(d.id, 'DEPARTED')}>
                          Parti
                        </Button>
                      )}
                      {d.status === 'SCHEDULED' && (
                        <Button size="sm" variant="outline" className="text-amber-600 hover:text-amber-700 hover:bg-amber-50" onClick={() => handleStatusChange(d.id, 'DELAYED')}>
                          Retard
                        </Button>
                      )}
                      {(d.status === 'SCHEDULED' || d.status === 'DELAYED') && (
                        <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleStatusChange(d.id, 'CANCELLED')}>
                          Annuler
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(d.id)} className="text-red-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Modifier le départ' : 'Nouveau Départ'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Ligne *</Label>
                <Select value={form.lineId} onValueChange={v => setForm({ ...form, lineId: v })}>
                  <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                  <SelectContent>{lines.map(l => <SelectItem key={l.id} value={l.id}>{l.number} — {l.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Sens *</Label>
                <Select value={form.direction} onValueChange={v => setForm({ ...form, direction: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALLER">Aller</SelectItem>
                    <SelectItem value="RETOUR">Retour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Date *</Label>
                <Input type="date" value={form.departureDate} onChange={e => setForm({ ...form, departureDate: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Heure *</Label>
                <Input type="time" value={form.scheduledTime} onChange={e => setForm({ ...form, scheduledTime: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Gare départ</Label>
                <Select value={form.originStationId} onValueChange={v => setForm({ ...form, originStationId: v })}>
                  <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                  <SelectContent>{stops.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Gare arrivée</Label>
                <Select value={form.destinationStationId} onValueChange={v => setForm({ ...form, destinationStationId: v })}>
                  <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                  <SelectContent>{stops.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Quai</Label>
                <Input value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })} placeholder="Quai 1" />
              </div>
              <div className="space-y-1">
                <Label>Places *</Label>
                <Input type="number" value={form.maxSeats} onChange={e => setForm({ ...form, maxSeats: parseInt(e.target.value) || 45 })} min={1} />
              </div>
              <div className="space-y-1">
                <Label>Prix (F) *</Label>
                <Input type="number" value={form.price} onChange={e => setForm({ ...form, price: parseInt(e.target.value) || 0 })} min={0} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving || !form.lineId || !form.departureDate || !form.scheduledTime}>
              {saving ? 'Enregistrement...' : editingId ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
