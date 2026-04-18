'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { Switch } from '@/components/ui/switch';
import {
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Search,
  Clock,
  ChevronDown,
  ChevronUp,
  Bus,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────
interface Zone {
  id: string;
  code: string;
  name: string;
  color: string;
}

interface Stop {
  id: string;
  code: string;
  name: string;
  zoneId: string;
  lat: number;
  lng: number;
  isActive: boolean;
  zone?: Zone;
}

interface Schedule {
  id: string;
  lineId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  frequency: number;
}

interface LineStop {
  id: string;
  lineId: string;
  stopId: string;
  direction: string;
  order: number;
  fromZone?: Zone;
  toZone?: Zone;
  stop?: Stop;
}

interface Line {
  id: string;
  number: number;
  name: string;
  color: string;
  isActive: boolean;
  _count?: { lineStops: number; schedules: number };
}

interface LineDetail {
  id: string;
  number: number;
  name: string;
  color: string;
  isActive: boolean;
  lineStops: LineStop[];
  schedules: Schedule[];
}

// ── Loading Skeleton ───────────────────────────────────
function CardSkeleton() {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

// ── Day Names ──────────────────────────────────────────
const DAY_LABELS = [
  'Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi',
];

// ═══════════════════════════════════════════════════════
// Lines & Stops View
// ═══════════════════════════════════════════════════════
export default function LinesStopsView() {
  const [activeTab, setActiveTab] = useState('lines');

  // ── Zones (for stop dialog) ──────────────────────────
  const [zones, setZones] = useState<Zone[]>([]);

  // ── Lines State ──────────────────────────────────────
  const [lines, setLines] = useState<Line[]>([]);
  const [linesLoading, setLinesLoading] = useState(true);
  const [expandedLine, setExpandedLine] = useState<string | null>(null);
  const [lineDetail, setLineDetail] = useState<LineDetail | null>(null);
  const [lineDetailLoading, setLineDetailLoading] = useState(false);
  const [lineDialogOpen, setLineDialogOpen] = useState(false);
  const [editingLine, setEditingLine] = useState<Line | null>(null);
  const [lineForm, setLineForm] = useState({ number: '', name: '', color: '#16a34a', isActive: true });
  const [lineSaving, setLineSaving] = useState(false);
  const [deleteLineDialogOpen, setDeleteLineDialogOpen] = useState(false);
  const [deletingLine, setDeletingLine] = useState<Line | null>(null);
  const [lineDeleting, setLineDeleting] = useState(false);

  // ── Stops State ──────────────────────────────────────
  const [stops, setStops] = useState<Stop[]>([]);
  const [stopsLoading, setStopsLoading] = useState(true);
  const [stopSearch, setStopSearch] = useState('');
  const [stopDialogOpen, setStopDialogOpen] = useState(false);
  const [editingStop, setEditingStop] = useState<Stop | null>(null);
  const [stopForm, setStopForm] = useState({ code: '', name: '', zoneId: '', lat: '', lng: '', isActive: true });
  const [stopSaving, setStopSaving] = useState(false);
  const [deleteStopDialogOpen, setDeleteStopDialogOpen] = useState(false);
  const [deletingStop, setDeletingStop] = useState<Stop | null>(null);
  const [stopDeleting, setStopDeleting] = useState(false);

  // ── Schedule State ───────────────────────────────────
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [scheduleForm, setScheduleForm] = useState({ dayOfWeek: '1', startTime: '', endTime: '', frequency: '' });
  const [scheduleSaving, setScheduleSaving] = useState(false);

  // ── Load Zones (once on mount) ────────────────────────
  useEffect(() => {
    apiFetch<Zone[]>('/api/zones?active=true').then((res) => {
      if (res.success && res.data) setZones(res.data);
    });
  }, []);

  // ── Load Lines (initial) ─────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const res = await apiFetch<Line[]>('/api/lines');
      if (!cancelled) {
        if (res.success && res.data) setLines(res.data);
        setLinesLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // ── Load Stops (when tab switches to stops) ──────────
  useEffect(() => {
    if (activeTab !== 'stops') return;
    let cancelled = false;
    const load = async () => {
      const params = new URLSearchParams();
      if (stopSearch) params.set('search', stopSearch);
      const res = await apiFetch<Stop[]>(`/api/stops?${params.toString()}`);
      if (!cancelled) {
        if (res.success && res.data) setStops(res.data);
        setStopsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [activeTab, stopSearch]);

  // ── Refresh helpers (called after CRUD) ──────────────
  function refreshLines() {
    setLinesLoading(true);
    apiFetch<Line[]>('/api/lines').then((res) => {
      if (res.success && res.data) setLines(res.data);
      setLinesLoading(false);
    });
  }

  function refreshStops() {
    setStopsLoading(true);
    const params = new URLSearchParams();
    if (stopSearch) params.set('search', stopSearch);
    apiFetch<Stop[]>(`/api/stops?${params.toString()}`).then((res) => {
      if (res.success && res.data) setStops(res.data);
      setStopsLoading(false);
    });
  }

  async function refreshLineDetail() {
    if (!expandedLine) return;
    setLineDetailLoading(true);
    const res = await apiFetch<LineDetail>(`/api/lines/${expandedLine}`);
    if (res.success && res.data) setLineDetail(res.data);
    setLineDetailLoading(false);
  }

  // ── Expand Line Detail ───────────────────────────────
  function toggleLineDetail(lineId: string) {
    if (expandedLine === lineId) {
      setExpandedLine(null);
      setLineDetail(null);
      return;
    }
    setExpandedLine(lineId);
    setLineDetailLoading(true);
    apiFetch<LineDetail>(`/api/lines/${lineId}`).then((res) => {
      if (res.success && res.data) setLineDetail(res.data);
      setLineDetailLoading(false);
    });
  }

  // ── Line CRUD ────────────────────────────────────────
  function openAddLine() {
    setEditingLine(null);
    setLineForm({ number: '', name: '', color: '#16a34a', isActive: true });
    setLineDialogOpen(true);
  }

  function openEditLine(line: Line) {
    setEditingLine(line);
    setLineForm({
      number: String(line.number),
      name: line.name,
      color: line.color,
      isActive: line.isActive,
    });
    setLineDialogOpen(true);
  }

  async function saveLine() {
    setLineSaving(true);
    const payload = {
      number: parseInt(lineForm.number, 10),
      name: lineForm.name,
      color: lineForm.color,
      isActive: lineForm.isActive,
    };
    const url = editingLine ? `/api/lines/${editingLine.id}` : '/api/lines';
    const method = editingLine ? 'PUT' : 'POST';
    const res = await apiFetch(url, { method, body: JSON.stringify(payload) });
    if (res.success) {
      setLineDialogOpen(false);
      refreshLines();
    }
    setLineSaving(false);
  }

  function confirmDeleteLine(line: Line) {
    setDeletingLine(line);
    setDeleteLineDialogOpen(true);
  }

  async function deleteLine() {
    if (!deletingLine) return;
    setLineDeleting(true);
    const res = await apiFetch(`/api/lines/${deletingLine.id}`, { method: 'DELETE' });
    if (res.success) {
      setDeleteLineDialogOpen(false);
      setDeletingLine(null);
      if (expandedLine === deletingLine.id) {
        setExpandedLine(null);
        setLineDetail(null);
      }
      refreshLines();
    }
    setLineDeleting(false);
  }

  // ── Stop CRUD ────────────────────────────────────────
  function openAddStop() {
    setEditingStop(null);
    setStopForm({ code: '', name: '', zoneId: '', lat: '', lng: '', isActive: true });
    setStopDialogOpen(true);
  }

  function openEditStop(stop: Stop) {
    setEditingStop(stop);
    setStopForm({
      code: stop.code,
      name: stop.name,
      zoneId: stop.zoneId,
      lat: String(stop.lat),
      lng: String(stop.lng),
      isActive: stop.isActive,
    });
    setStopDialogOpen(true);
  }

  async function saveStop() {
    setStopSaving(true);
    const payload = {
      code: stopForm.code,
      name: stopForm.name,
      zoneId: stopForm.zoneId,
      lat: parseFloat(stopForm.lat),
      lng: parseFloat(stopForm.lng),
      isActive: stopForm.isActive,
    };
    const url = editingStop ? `/api/stops/${editingStop.id}` : '/api/stops';
    const method = editingStop ? 'PUT' : 'POST';
    const res = await apiFetch(url, { method, body: JSON.stringify(payload) });
    if (res.success) {
      setStopDialogOpen(false);
      refreshStops();
    }
    setStopSaving(false);
  }

  function confirmDeleteStop(stop: Stop) {
    setDeletingStop(stop);
    setDeleteStopDialogOpen(true);
  }

  async function deleteStop() {
    if (!deletingStop) return;
    setStopDeleting(true);
    const res = await apiFetch(`/api/stops/${deletingStop.id}`, { method: 'DELETE' });
    if (res.success) {
      setDeleteStopDialogOpen(false);
      setDeletingStop(null);
      refreshStops();
    }
    setStopDeleting(false);
  }

  // ── Schedule CRUD ────────────────────────────────────
  function openAddSchedule() {
    setEditingSchedule(null);
    setScheduleForm({ dayOfWeek: '1', startTime: '06:00', endTime: '22:00', frequency: '15' });
    setScheduleDialogOpen(true);
  }

  function openEditSchedule(schedule: Schedule) {
    setEditingSchedule(schedule);
    setScheduleForm({
      dayOfWeek: String(schedule.dayOfWeek),
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      frequency: String(schedule.frequency),
    });
    setScheduleDialogOpen(true);
  }

  async function saveSchedule() {
    if (!expandedLine) return;
    setScheduleSaving(true);
    const payload = {
      lineId: expandedLine,
      dayOfWeek: parseInt(scheduleForm.dayOfWeek, 10),
      startTime: scheduleForm.startTime,
      endTime: scheduleForm.endTime,
      frequency: parseInt(scheduleForm.frequency, 10),
    };
    const url = editingSchedule ? `/api/schedules/${editingSchedule.id}` : '/api/schedules';
    const method = editingSchedule ? 'PUT' : 'POST';
    const res = await apiFetch(url, { method, body: JSON.stringify(payload) });
    if (res.success) {
      setScheduleDialogOpen(false);
      refreshLineDetail();
    }
    setScheduleSaving(false);
  }

  // ── Schedules grouped by day ─────────────────────────
  const schedulesByDay: Record<number, Schedule[]> = {};
  if (lineDetail?.schedules) {
    lineDetail.schedules.forEach((s) => {
      if (!schedulesByDay[s.dayOfWeek]) schedulesByDay[s.dayOfWeek] = [];
      schedulesByDay[s.dayOfWeek].push(s);
    });
  }

  // ── Render ───────────────────────────────────────────
  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="lines">
            <Bus className="mr-1 size-4" />
            Lignes
          </TabsTrigger>
          <TabsTrigger value="stops">
            <MapPin className="mr-1 size-4" />
            Arrêts
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════ LINES TAB ═══════════════════ */}
        <TabsContent value="lines" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openAddLine}>
              <Plus className="mr-1 size-4" />
              Ajouter une ligne
            </Button>
          </div>

          {linesLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : lines.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
              <Bus className="mb-3 size-10 text-muted-foreground" />
              <p className="text-lg font-medium">Aucune ligne trouvée</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Commencez par ajouter votre première ligne
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {lines.map((line) => (
                <div key={line.id} className="space-y-0">
                  <Card
                    className="cursor-pointer transition-shadow hover:shadow-md"
                    onClick={() => toggleLineDetail(line.id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="flex size-9 items-center justify-center rounded-lg text-sm font-bold text-white"
                            style={{ backgroundColor: line.color }}
                          >
                            {line.number}
                          </span>
                          <div>
                            <CardTitle className="text-base">{line.name}</CardTitle>
                            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                              <MapPin className="size-3" />
                              {line._count?.lineStops ?? 0} arrêt{(line._count?.lineStops ?? 0) > 1 ? 's' : ''}
                              <span className="text-muted-foreground">•</span>
                              <Clock className="size-3" />
                              {line._count?.schedules ?? 0} horaire{(line._count?.schedules ?? 0) > 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant={line.isActive ? 'default' : 'secondary'}>
                            {line.isActive ? 'Actif' : 'Inactif'}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditLine(line);
                            }}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              confirmDeleteLine(line);
                            }}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                          {expandedLine === line.id ? (
                            <ChevronUp className="size-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="size-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </Card>

                  {/* Expanded Line Detail */}
                  {expandedLine === line.id && (
                    <div className="rounded-b-lg border border-t-0 bg-muted/30 p-4 space-y-4">
                      {lineDetailLoading ? (
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-6 w-full" />
                        </div>
                      ) : lineDetail ? (
                        <>
                          {/* Stops List */}
                          <div>
                            <div className="mb-2 flex items-center justify-between">
                              <h4 className="text-sm font-semibold">
                                <MapPin className="mr-1 inline size-3.5" />
                                Arrêts de la ligne
                              </h4>
                            </div>
                            {lineDetail.lineStops.length === 0 ? (
                              <p className="text-xs text-muted-foreground">Aucun arrêt assigné</p>
                            ) : (
                              <div className="space-y-1">
                                {lineDetail.lineStops
                                  .sort((a, b) => a.order - b.order)
                                  .map((ls) => (
                                    <div
                                      key={ls.id}
                                      className="flex items-center gap-2 rounded-md bg-background px-3 py-1.5 text-sm"
                                    >
                                      <span className="font-medium text-muted-foreground">{ls.order + 1}.</span>
                                      <span className="font-medium">{ls.stop?.name || ls.stopId}</span>
                                      {ls.stop?.zone && (
                                        <Badge variant="outline" className="text-xs">
                                          <span
                                            className="mr-1 inline-block size-2 rounded-full"
                                            style={{ backgroundColor: ls.stop.zone.color }}
                                          />
                                          {ls.stop.zone.name}
                                        </Badge>
                                      )}
                                      <Badge variant="secondary" className="text-xs">
                                        {ls.direction === 'forward' ? 'Aller' : 'Retour'}
                                      </Badge>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>

                          {/* Schedules by Day */}
                          <div>
                            <div className="mb-2 flex items-center justify-between">
                              <h4 className="text-sm font-semibold">
                                <Clock className="mr-1 inline size-3.5" />
                                Horaires
                              </h4>
                              <Button size="sm" variant="outline" onClick={openAddSchedule}>
                                <Plus className="mr-1 size-3" />
                                Ajouter
                              </Button>
                            </div>
                            {Object.keys(schedulesByDay).length === 0 ? (
                              <p className="text-xs text-muted-foreground">Aucun horaire configuré</p>
                            ) : (
                              <div className="grid gap-2 sm:grid-cols-2">
                                {Object.entries(schedulesByDay)
                                  .sort(([a], [b]) => Number(a) - Number(b))
                                  .map(([day, daySchedules]) => (
                                    <div key={day} className="rounded-md bg-background p-3">
                                      <p className="mb-1 text-xs font-semibold text-muted-foreground">
                                        {DAY_LABELS[Number(day)]}
                                      </p>
                                      {daySchedules.map((s) => (
                                        <div
                                          key={s.id}
                                          className="flex items-center justify-between text-sm"
                                        >
                                          <span>
                                            {s.startTime} – {s.endTime}
                                          </span>
                                          <div className="flex items-center gap-1">
                                            <span className="text-xs text-muted-foreground">
                                              {s.frequency} min
                                            </span>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="size-6"
                                              onClick={() => openEditSchedule(s)}
                                            >
                                              <Pencil className="size-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">Impossible de charger les détails</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ═══════════════════ STOPS TAB ═══════════════════ */}
        <TabsContent value="stops" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher un arrêt..."
                value={stopSearch}
                onChange={(e) => setStopSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={openAddStop}>
              <Plus className="mr-1 size-4" />
              Ajouter un arrêt
            </Button>
          </div>

          {stopsLoading ? (
            <div className="rounded-lg border p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <Skeleton key={j} className="h-8 flex-1" />
                  ))}
                </div>
              ))}
            </div>
          ) : stops.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
              <MapPin className="mb-3 size-10 text-muted-foreground" />
              <p className="text-lg font-medium">Aucun arrêt trouvé</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Commencez par ajouter votre premier arrêt
              </p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Zone</TableHead>
                    <TableHead className="hidden md:table-cell">Latitude</TableHead>
                    <TableHead className="hidden md:table-cell">Longitude</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stops.map((stop) => (
                    <TableRow key={stop.id}>
                      <TableCell className="font-medium">{stop.code}</TableCell>
                      <TableCell>{stop.name}</TableCell>
                      <TableCell>
                        {stop.zone ? (
                          <Badge variant="outline">
                            <span
                              className="mr-1 inline-block size-2 rounded-full"
                              style={{ backgroundColor: stop.zone.color }}
                            />
                            {stop.zone.name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{stop.lat}</TableCell>
                      <TableCell className="hidden md:table-cell">{stop.lng}</TableCell>
                      <TableCell>
                        <Badge variant={stop.isActive ? 'default' : 'secondary'}>
                          {stop.isActive ? 'Actif' : 'Inactif'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditStop(stop)}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => confirmDeleteStop(stop)}
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

      {/* ═══════════════ LINE DIALOG ═══════════════ */}
      <Dialog open={lineDialogOpen} onOpenChange={setLineDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingLine ? 'Modifier la ligne' : 'Nouvelle ligne'}</DialogTitle>
            <DialogDescription>
              {editingLine ? 'Modifiez les informations de la ligne.' : 'Créez une nouvelle ligne de bus.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="line-number">Numéro de ligne</Label>
              <Input
                id="line-number"
                type="number"
                placeholder="Ex: 1"
                value={lineForm.number}
                onChange={(e) => setLineForm({ ...lineForm, number: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="line-name">Nom</Label>
              <Input
                id="line-name"
                placeholder="Ex: Centre - Aéroport"
                value={lineForm.name}
                onChange={(e) => setLineForm({ ...lineForm, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="line-color">Couleur</Label>
              <div className="flex items-center gap-3">
                <input
                  id="line-color"
                  type="color"
                  value={lineForm.color}
                  onChange={(e) => setLineForm({ ...lineForm, color: e.target.value })}
                  className="h-9 w-14 cursor-pointer rounded-md border"
                />
                <Input
                  value={lineForm.color}
                  onChange={(e) => setLineForm({ ...lineForm, color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="line-active">Ligne active</Label>
              <Switch
                id="line-active"
                checked={lineForm.isActive}
                onCheckedChange={(checked) => setLineForm({ ...lineForm, isActive: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLineDialogOpen(false)}>Annuler</Button>
            <Button
              onClick={saveLine}
              disabled={lineSaving || !lineForm.number || !lineForm.name}
            >
              {lineSaving ? 'Enregistrement...' : editingLine ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════ DELETE LINE DIALOG ═══════════════ */}
      <AlertDialog open={deleteLineDialogOpen} onOpenChange={setDeleteLineDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la ligne ?</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous vraiment supprimer la ligne <strong>{deletingLine?.number} - {deletingLine?.name}</strong> ?
              Cette action est irréversible si la ligne n&apos;a pas de tickets liés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteLine}
              disabled={lineDeleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {lineDeleting ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ═══════════════ STOP DIALOG ═══════════════ */}
      <Dialog open={stopDialogOpen} onOpenChange={setStopDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingStop ? "Modifier l'arrêt" : 'Nouvel arrêt'}</DialogTitle>
            <DialogDescription>
              {editingStop ? "Modifiez les informations de l'arrêt." : 'Créez un nouvel arrêt de bus.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="stop-code">Code</Label>
              <Input
                id="stop-code"
                placeholder="Ex: AR001"
                value={stopForm.code}
                onChange={(e) => setStopForm({ ...stopForm, code: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="stop-name">Nom</Label>
              <Input
                id="stop-name"
                placeholder="Ex: Gare Routière"
                value={stopForm.name}
                onChange={(e) => setStopForm({ ...stopForm, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Zone</Label>
              <Select
                value={stopForm.zoneId}
                onValueChange={(v) => setStopForm({ ...stopForm, zoneId: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionner une zone" />
                </SelectTrigger>
                <SelectContent>
                  {zones.map((z) => (
                    <SelectItem key={z.id} value={z.id}>
                      <span className="mr-2 inline-block size-3 rounded-full" style={{ backgroundColor: z.color }} />
                      {z.name} ({z.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="stop-lat">Latitude</Label>
                <Input
                  id="stop-lat"
                  type="number"
                  step="any"
                  placeholder="Ex: 4.0511"
                  value={stopForm.lat}
                  onChange={(e) => setStopForm({ ...stopForm, lat: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="stop-lng">Longitude</Label>
                <Input
                  id="stop-lng"
                  type="number"
                  step="any"
                  placeholder="Ex: 9.7679"
                  value={stopForm.lng}
                  onChange={(e) => setStopForm({ ...stopForm, lng: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="stop-active">Arrêt actif</Label>
              <Switch
                id="stop-active"
                checked={stopForm.isActive}
                onCheckedChange={(checked) => setStopForm({ ...stopForm, isActive: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStopDialogOpen(false)}>Annuler</Button>
            <Button
              onClick={saveStop}
              disabled={stopSaving || !stopForm.code || !stopForm.name || !stopForm.zoneId}
            >
              {stopSaving ? 'Enregistrement...' : editingStop ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════ DELETE STOP DIALOG ═══════════════ */}
      <AlertDialog open={deleteStopDialogOpen} onOpenChange={setDeleteStopDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l&apos;arrêt ?</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous vraiment supprimer l&apos;arrêt <strong>{deletingStop?.name}</strong> ({deletingStop?.code}) ?
              Cette action est irréversible si l&apos;arrêt n&apos;est pas utilisé par des lignes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteStop}
              disabled={stopDeleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {stopDeleting ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ═══════════════ SCHEDULE DIALOG ═══════════════ */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSchedule ? "Modifier l'horaire" : 'Nouvel horaire'}</DialogTitle>
            <DialogDescription>
              Définissez un créneau horaire pour cette ligne.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Jour de la semaine</Label>
              <Select
                value={scheduleForm.dayOfWeek}
                onValueChange={(v) => setScheduleForm({ ...scheduleForm, dayOfWeek: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionner un jour" />
                </SelectTrigger>
                <SelectContent>
                  {DAY_LABELS.map((label, idx) => (
                    <SelectItem key={idx} value={String(idx)}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="sched-start">Heure début</Label>
                <Input
                  id="sched-start"
                  type="time"
                  value={scheduleForm.startTime}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, startTime: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sched-end">Heure fin</Label>
                <Input
                  id="sched-end"
                  type="time"
                  value={scheduleForm.endTime}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, endTime: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sched-freq">Fréquence (minutes)</Label>
              <Input
                id="sched-freq"
                type="number"
                placeholder="Ex: 15"
                value={scheduleForm.frequency}
                onChange={(e) => setScheduleForm({ ...scheduleForm, frequency: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>Annuler</Button>
            <Button
              onClick={saveSchedule}
              disabled={
                scheduleSaving ||
                !scheduleForm.startTime ||
                !scheduleForm.endTime ||
                !scheduleForm.frequency ||
                parseInt(scheduleForm.frequency, 10) < 1
              }
            >
              {scheduleSaving ? 'Enregistrement...' : editingSchedule ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
