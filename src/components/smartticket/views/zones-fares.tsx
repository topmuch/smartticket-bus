'use client';

import { useState, useEffect } from 'react';
import { apiFetch, formatCurrency } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, MapPin, Search } from 'lucide-react';

// ── Types ──────────────────────────────────────────────
interface Zone {
  id: string;
  code: string;
  name: string;
  description: string | null;
  color: string;
  isActive: boolean;
  _count?: { stops: number };
}

interface Fare {
  id: string;
  fromZoneId: string;
  toZoneId: string;
  price: number;
  isActive: boolean;
  fromZone: { id: string; code: string; name: string; color: string };
  toZone: { id: string; code: string; name: string; color: string };
}

// ── Zone Form State ────────────────────────────────────
interface ZoneFormData {
  code: string;
  name: string;
  description: string;
  color: string;
  isActive: boolean;
}

const emptyZoneForm: ZoneFormData = {
  code: '',
  name: '',
  description: '',
  color: '#16a34a',
  isActive: true,
};

// ── Fare Form State ────────────────────────────────────
interface FareFormData {
  fromZoneId: string;
  toZoneId: string;
  price: string;
}

const emptyFareForm: FareFormData = {
  fromZoneId: '',
  toZoneId: '',
  price: '',
};

// ── Loading Skeleton ───────────────────────────────────
function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Zones & Fares View ─────────────────────────────────
export default function ZonesFaresView() {
  const [activeTab, setActiveTab] = useState('zones');

  // ── Zones State ───────────────────────────────────────
  const [zones, setZones] = useState<Zone[]>([]);
  const [zonesLoading, setZonesLoading] = useState(true);
  const [zoneSearch, setZoneSearch] = useState('');
  const [zoneDialogOpen, setZoneDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [zoneForm, setZoneForm] = useState<ZoneFormData>(emptyZoneForm);
  const [zoneSaving, setZoneSaving] = useState(false);
  const [deleteZoneDialogOpen, setDeleteZoneDialogOpen] = useState(false);
  const [deletingZone, setDeletingZone] = useState<Zone | null>(null);
  const [zoneDeleting, setZoneDeleting] = useState(false);

  // ── Fares State ───────────────────────────────────────
  const [fares, setFares] = useState<Fare[]>([]);
  const [faresLoading, setFaresLoading] = useState(true);
  const [fareDialogOpen, setFareDialogOpen] = useState(false);
  const [editingFare, setEditingFare] = useState<Fare | null>(null);
  const [fareForm, setFareForm] = useState<FareFormData>(emptyFareForm);
  const [fareSaving, setFareSaving] = useState(false);
  const [deleteFareDialogOpen, setDeleteFareDialogOpen] = useState(false);
  const [deletingFare, setDeletingFare] = useState<Fare | null>(null);
  const [fareDeleting, setFareDeleting] = useState(false);

  // ── Fetch Zones (initial + on search change) ─────────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const params = new URLSearchParams();
      if (zoneSearch) params.set('search', zoneSearch);
      const res = await apiFetch<Zone[]>(`/api/zones?${params.toString()}`);
      if (!cancelled) {
        if (res.success && res.data) setZones(res.data);
        setZonesLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [zoneSearch]);

  // ── Refresh zones (called after CRUD) ────────────────
  function refreshZones() {
    setZonesLoading(true);
    const params = new URLSearchParams();
    if (zoneSearch) params.set('search', zoneSearch);
    apiFetch<Zone[]>(`/api/zones?${params.toString()}`).then((res) => {
      if (res.success && res.data) setZones(res.data);
      setZonesLoading(false);
    });
  }

  // ── Fetch Fares (on tab switch) ──────────────────────
  useEffect(() => {
    if (activeTab !== 'fares') return;
    let cancelled = false;
    const load = async () => {
      const res = await apiFetch<Fare[]>('/api/fares');
      if (!cancelled) {
        if (res.success && res.data) setFares(res.data);
        setFaresLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [activeTab]);

  // ── Refresh fares (called after CRUD) ────────────────
  function refreshFares() {
    setFaresLoading(true);
    apiFetch<Fare[]>('/api/fares').then((res) => {
      if (res.success && res.data) setFares(res.data);
      setFaresLoading(false);
    });
  }

  // ── Zone CRUD Handlers ───────────────────────────────
  function openAddZone() {
    setEditingZone(null);
    setZoneForm(emptyZoneForm);
    setZoneDialogOpen(true);
  }

  function openEditZone(zone: Zone) {
    setEditingZone(zone);
    setZoneForm({
      code: zone.code,
      name: zone.name,
      description: zone.description || '',
      color: zone.color,
      isActive: zone.isActive,
    });
    setZoneDialogOpen(true);
  }

  async function saveZone() {
    setZoneSaving(true);
    if (editingZone) {
      const res = await apiFetch<Zone>(`/api/zones/${editingZone.id}`, {
        method: 'PUT',
        body: JSON.stringify(zoneForm),
      });
      if (res.success) {
        setZoneDialogOpen(false);
        refreshZones();
      }
    } else {
      const res = await apiFetch<Zone>('/api/zones', {
        method: 'POST',
        body: JSON.stringify(zoneForm),
      });
      if (res.success) {
        setZoneDialogOpen(false);
        refreshZones();
      }
    }
    setZoneSaving(false);
  }

  function confirmDeleteZone(zone: Zone) {
    setDeletingZone(zone);
    setDeleteZoneDialogOpen(true);
  }

  async function deleteZone() {
    if (!deletingZone) return;
    setZoneDeleting(true);
    const res = await apiFetch(`/api/zones/${deletingZone.id}`, { method: 'DELETE' });
    if (res.success) {
      setDeleteZoneDialogOpen(false);
      setDeletingZone(null);
      refreshZones();
    }
    setZoneDeleting(false);
  }

  // ── Fare CRUD Handlers ───────────────────────────────
  function openAddFare() {
    setEditingFare(null);
    setFareForm(emptyFareForm);
    setFareDialogOpen(true);
  }

  function openEditFare(fare: Fare) {
    setEditingFare(fare);
    setFareForm({
      fromZoneId: fare.fromZoneId,
      toZoneId: fare.toZoneId,
      price: String(fare.price),
    });
    setFareDialogOpen(true);
  }

  async function saveFare() {
    setFareSaving(true);
    const payload = {
      fromZoneId: fareForm.fromZoneId,
      toZoneId: fareForm.toZoneId,
      price: parseFloat(fareForm.price),
    };
    if (editingFare) {
      const res = await apiFetch<Fare>(`/api/fares/${editingFare.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      if (res.success) {
        setFareDialogOpen(false);
        refreshFares();
      }
    } else {
      const res = await apiFetch<Fare>('/api/fares', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (res.success) {
        setFareDialogOpen(false);
        refreshFares();
      }
    }
    setFareSaving(false);
  }

  function confirmDeleteFare(fare: Fare) {
    setDeletingFare(fare);
    setDeleteFareDialogOpen(true);
  }

  async function deleteFare() {
    if (!deletingFare) return;
    setFareDeleting(true);
    const res = await apiFetch(`/api/fares/${deletingFare.id}`, { method: 'DELETE' });
    if (res.success) {
      setDeleteFareDialogOpen(false);
      setDeletingFare(null);
      refreshFares();
    }
    setFareDeleting(false);
  }

  // ── Build Fare Matrix ────────────────────────────────
  const activeZones = zones.filter((z) => z.isActive);
  const fareMatrix: Record<string, Record<string, number>> = {};
  fares.forEach((f) => {
    if (!fareMatrix[f.fromZoneId]) fareMatrix[f.fromZoneId] = {};
    fareMatrix[f.fromZoneId][f.toZoneId] = f.price;
  });

  // ── Render ───────────────────────────────────────────
  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="zones">
            <MapPin className="mr-1 size-4" />
            Zones
          </TabsTrigger>
          <TabsTrigger value="fares">
            Tarifs
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════ ZONES TAB ═══════════════════ */}
        <TabsContent value="zones" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher une zone..."
                value={zoneSearch}
                onChange={(e) => setZoneSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={openAddZone}>
              <Plus className="mr-1 size-4" />
              Ajouter une zone
            </Button>
          </div>

          {zonesLoading ? (
            <TableSkeleton />
          ) : zones.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
              <MapPin className="mb-3 size-10 text-muted-foreground" />
              <p className="text-lg font-medium">Aucune zone trouvée</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Commencez par ajouter votre première zone
              </p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead className="hidden md:table-cell">Description</TableHead>
                    <TableHead>Couleur</TableHead>
                    <TableHead>Arrêts</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {zones.map((zone) => (
                    <TableRow key={zone.id}>
                      <TableCell className="font-medium">{zone.code}</TableCell>
                      <TableCell>{zone.name}</TableCell>
                      <TableCell className="hidden max-w-[200px] truncate md:table-cell">
                        {zone.description || '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block size-4 rounded-full border"
                            style={{ backgroundColor: zone.color }}
                          />
                          <span className="text-xs text-muted-foreground">{zone.color}</span>
                        </div>
                      </TableCell>
                      <TableCell>{zone._count?.stops ?? 0}</TableCell>
                      <TableCell>
                        <Badge variant={zone.isActive ? 'default' : 'secondary'}>
                          {zone.isActive ? 'Actif' : 'Inactif'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditZone(zone)}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => confirmDeleteZone(zone)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ═══════════════════ FARES TAB ═══════════════════ */}
        <TabsContent value="fares" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {fares.length} tarif{fares.length > 1 ? 's' : ''} configuré{fares.length > 1 ? 's' : ''}
            </p>
            <Button onClick={openAddFare}>
              <Plus className="mr-1 size-4" />
              Ajouter un tarif
            </Button>
          </div>

          {/* Fare Matrix Grid */}
          {activeZones.length > 0 && (
            <div className="rounded-lg border p-4">
              <h3 className="mb-3 text-sm font-semibold">Matrice des tarifs</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="p-2 text-left font-medium text-muted-foreground">Départ →</th>
                      {activeZones.map((z) => (
                        <th key={z.id} className="p-2 text-center font-medium">
                          <span
                            className="inline-block mb-1 size-3 rounded-full"
                            style={{ backgroundColor: z.color }}
                          />
                          <br />
                          {z.code}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeZones.map((rowZone) => (
                      <tr key={rowZone.id}>
                        <td className="p-2 font-medium whitespace-nowrap">
                          <span
                            className="mr-2 inline-block size-3 rounded-full"
                            style={{ backgroundColor: rowZone.color }}
                          />
                          {rowZone.code}
                        </td>
                        {activeZones.map((colZone) => {
                          const price = fareMatrix[rowZone.id]?.[colZone.id];
                          return (
                            <td key={colZone.id} className="p-2 text-center">
                              {price != null ? (
                                <span className="text-xs font-medium">{formatCurrency(price)}</span>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Fare Table */}
          {faresLoading ? (
            <TableSkeleton />
          ) : fares.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
              <p className="text-lg font-medium">Aucun tarif configuré</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ajoutez des tarifs entre les zones
              </p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Zone Départ</TableHead>
                    <TableHead>Zone Arrivée</TableHead>
                    <TableHead>Prix (FCFA)</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fares.map((fare) => (
                    <TableRow key={fare.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block size-3 rounded-full"
                            style={{ backgroundColor: fare.fromZone.color }}
                          />
                          <span>{fare.fromZone.name}</span>
                          <span className="text-xs text-muted-foreground">({fare.fromZone.code})</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block size-3 rounded-full"
                            style={{ backgroundColor: fare.toZone.color }}
                          />
                          <span>{fare.toZone.name}</span>
                          <span className="text-xs text-muted-foreground">({fare.toZone.code})</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(fare.price)}</TableCell>
                      <TableCell>
                        <Badge variant={fare.isActive ? 'default' : 'secondary'}>
                          {fare.isActive ? 'Actif' : 'Inactif'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditFare(fare)}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => confirmDeleteFare(fare)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ═══════════════ ZONE DIALOG ═══════════════ */}
      <Dialog open={zoneDialogOpen} onOpenChange={setZoneDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingZone ? 'Modifier la zone' : 'Nouvelle zone'}
            </DialogTitle>
            <DialogDescription>
              {editingZone
                ? 'Modifiez les informations de la zone.'
                : 'Renseignez les informations de la nouvelle zone.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="zone-code">Code</Label>
              <Input
                id="zone-code"
                placeholder="Ex: Z1"
                value={zoneForm.code}
                onChange={(e) => setZoneForm({ ...zoneForm, code: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="zone-name">Nom</Label>
              <Input
                id="zone-name"
                placeholder="Ex: Centre-ville"
                value={zoneForm.name}
                onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="zone-desc">Description</Label>
              <Input
                id="zone-desc"
                placeholder="Description optionnelle"
                value={zoneForm.description}
                onChange={(e) => setZoneForm({ ...zoneForm, description: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="zone-color">Couleur</Label>
              <div className="flex items-center gap-3">
                <input
                  id="zone-color"
                  type="color"
                  value={zoneForm.color}
                  onChange={(e) => setZoneForm({ ...zoneForm, color: e.target.value })}
                  className="h-9 w-14 cursor-pointer rounded-md border"
                />
                <Input
                  value={zoneForm.color}
                  onChange={(e) => setZoneForm({ ...zoneForm, color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="zone-active">Zone active</Label>
              <Switch
                id="zone-active"
                checked={zoneForm.isActive}
                onCheckedChange={(checked) => setZoneForm({ ...zoneForm, isActive: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setZoneDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={saveZone} disabled={zoneSaving || !zoneForm.code || !zoneForm.name}>
              {zoneSaving ? 'Enregistrement...' : editingZone ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════ DELETE ZONE DIALOG ═══════════════ */}
      <AlertDialog open={deleteZoneDialogOpen} onOpenChange={setDeleteZoneDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la zone ?</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous vraiment supprimer la zone <strong>{deletingZone?.name}</strong> ?{' '}
              Cette action est irréversible si la zone n&apos;a pas d&apos;arrêts ou de tarifs liés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteZone}
              disabled={zoneDeleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {zoneDeleting ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ═══════════════ FARE DIALOG ═══════════════ */}
      <Dialog open={fareDialogOpen} onOpenChange={setFareDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingFare ? 'Modifier le tarif' : 'Nouveau tarif'}
            </DialogTitle>
            <DialogDescription>
              {editingFare
                ? 'Modifiez le prix entre les deux zones.'
                : 'Définissez le tarif entre deux zones.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Zone de départ</Label>
              <Select
                value={fareForm.fromZoneId}
                onValueChange={(v) => setFareForm({ ...fareForm, fromZoneId: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionner la zone de départ" />
                </SelectTrigger>
                <SelectContent>
                  {activeZones.map((z) => (
                    <SelectItem key={z.id} value={z.id}>
                      <span className="mr-2 inline-block size-3 rounded-full" style={{ backgroundColor: z.color }} />
                      {z.name} ({z.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Zone d&apos;arrivée</Label>
              <Select
                value={fareForm.toZoneId}
                onValueChange={(v) => setFareForm({ ...fareForm, toZoneId: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionner la zone d'arrivée" />
                </SelectTrigger>
                <SelectContent>
                  {activeZones.map((z) => (
                    <SelectItem key={z.id} value={z.id}>
                      <span className="mr-2 inline-block size-3 rounded-full" style={{ backgroundColor: z.color }} />
                      {z.name} ({z.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fare-price">Prix (FCFA)</Label>
              <Input
                id="fare-price"
                type="number"
                placeholder="Ex: 250"
                value={fareForm.price}
                onChange={(e) => setFareForm({ ...fareForm, price: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFareDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={saveFare}
              disabled={
                fareSaving ||
                !fareForm.fromZoneId ||
                !fareForm.toZoneId ||
                !fareForm.price ||
                parseFloat(fareForm.price) <= 0
              }
            >
              {fareSaving ? 'Enregistrement...' : editingFare ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════ DELETE FARE DIALOG ═══════════════ */}
      <AlertDialog open={deleteFareDialogOpen} onOpenChange={setDeleteFareDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le tarif ?</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous vraiment supprimer le tarif de{' '}
              <strong>{deletingFare?.fromZone.name}</strong> vers{' '}
              <strong>{deletingFare?.toZone.name}</strong> ({formatCurrency(deletingFare?.price ?? 0)}) ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteFare}
              disabled={fareDeleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {fareDeleting ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
