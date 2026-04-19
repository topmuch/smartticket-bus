'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Plus,
  Pencil,
  Trash2,
  Clock,
  Upload,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';

// ── Types ──────────────────────────────────────────────
interface Station {
  id: string;
  name: string;
  city: string;
  timezone: string;
  slug: string;
  isActive?: boolean;
  departuresCount?: number;
  messagesCount?: number;
}

interface Line {
  id: string;
  number: number;
  name: string;
  color: string;
}

interface Departure {
  id: string;
  stationId: string;
  lineId: string;
  scheduledTime: string;
  platform: string | number;
  scheduleType: string;
  dayOfWeek: number;
  destination: string;
  delayMinutes: number;
  status: string;
  line?: Line;
}

interface Message {
  id: string;
  stationId: string | null;
  message: string;
  priority: string;
  startDate: string;
  endDate: string;
  station?: Station;
}

interface ImportResult {
  created: number;
  updated: number;
  errors: string[];
  total: number;
}

// ── Constants ──────────────────────────────────────────
const DAY_LABELS_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const DAY_LABELS_FULL = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  on_time: { label: 'À l\'heure', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  delayed: { label: 'Retardé', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
  cancelled: { label: 'Annulé', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  departed: { label: 'Parti', className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
};

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  urgent: { label: 'Urgent', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  normal: { label: 'Normal', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
  info: { label: 'Info', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
};

// ── Skeletons ──────────────────────────────────────────
function CardSkeleton() {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

function TableSkeleton({ rows = 5, cols = 7 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-lg border p-4 space-y-3">
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

// ── Station Form State ────────────────────────────────
interface StationFormData {
  name: string;
  city: string;
  timezone: string;
  slug: string;
}

const emptyStationForm: StationFormData = {
  name: '',
  city: '',
  timezone: 'Africa/Douala',
  slug: '',
};

// ── Departure Form State ──────────────────────────────
interface DepartureFormData {
  stationId: string;
  lineId: string;
  scheduledTime: string;
  platform: string;
  scheduleType: string;
  dayOfWeek: string;
  destination: string;
}

const emptyDepartureForm: DepartureFormData = {
  stationId: '',
  lineId: '',
  scheduledTime: '',
  platform: '',
  scheduleType: 'departure',
  dayOfWeek: '1',
  destination: '',
};

// ── Message Form State ────────────────────────────────
interface MessageFormData {
  stationId: string;
  message: string;
  priority: string;
  startDate: string;
  endDate: string;
}

const emptyMessageForm: MessageFormData = {
  stationId: '',
  message: '',
  priority: 'info',
  startDate: '',
  endDate: '',
};

// ═══════════════════════════════════════════════════════
// Station Manager View
// ═══════════════════════════════════════════════════════
export default function StationManager() {
  const [activeTab, setActiveTab] = useState('stations');

  // ── Stations State ───────────────────────────────────
  const [stations, setStations] = useState<Station[]>([]);
  const [stationsLoading, setStationsLoading] = useState(true);
  const [stationDialogOpen, setStationDialogOpen] = useState(false);
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [stationForm, setStationForm] = useState<StationFormData>(emptyStationForm);
  const [stationSaving, setStationSaving] = useState(false);
  const [deleteStationDialogOpen, setDeleteStationDialogOpen] = useState(false);
  const [deletingStation, setDeletingStation] = useState<Station | null>(null);
  const [stationDeleting, setStationDeleting] = useState(false);

  // ── Departures State ─────────────────────────────────
  const [selectedStationId, setSelectedStationId] = useState<string>('');
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<number | null>(null);
  const [selectedScheduleType, setSelectedScheduleType] = useState<string>('all');
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [departuresLoading, setDeparturesLoading] = useState(false);
  const [departureDialogOpen, setDepartureDialogOpen] = useState(false);
  const [editingDeparture, setEditingDeparture] = useState<Departure | null>(null);
  const [departureForm, setDepartureForm] = useState<DepartureFormData>(emptyDepartureForm);
  const [departureSaving, setDepartureSaving] = useState(false);
  const [deleteDepartureDialogOpen, setDeleteDepartureDialogOpen] = useState(false);
  const [deletingDeparture, setDeletingDeparture] = useState<Departure | null>(null);
  const [departureDeleting, setDepartureDeleting] = useState(false);
  const [delayDialogOpen, setDelayDialogOpen] = useState(false);
  const [delayTarget, setDelayTarget] = useState<Departure | null>(null);
  const [delayForm, setDelayForm] = useState({ delayMinutes: '0', status: 'on_time' });
  const [delaySaving, setDelaySaving] = useState(false);

  // ── CSV Import State ─────────────────────────────────
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvStationId, setCsvStationId] = useState<string>('');
  const [csvResult, setCsvResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // ── Messages State ───────────────────────────────────
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [messageForm, setMessageForm] = useState<MessageFormData>(emptyMessageForm);
  const [messageSaving, setMessageSaving] = useState(false);
  const [deleteMessageDialogOpen, setDeleteMessageDialogOpen] = useState(false);
  const [deletingMessage, setDeletingMessage] = useState<Message | null>(null);
  const [messageDeleting, setMessageDeleting] = useState(false);

  // ── Lines (for dropdowns) ────────────────────────────
  const [lines, setLines] = useState<Line[]>([]);

  // ── Fetch Stations ───────────────────────────────────
  const refreshStations = useCallback(async () => {
    setStationsLoading(true);
    const res = await apiFetch<Station[]>('/api/v1/admin/stations');
    if (res.success && res.data) {
      setStations(res.data);
    }
    setStationsLoading(false);
  }, []);

  useEffect(() => {
    refreshStations();
  }, [refreshStations]);

  // ── Fetch Lines (for dropdowns) ─────────────────────
  useEffect(() => {
    apiFetch<Line[]>('/api/v1/lines').then((res) => {
      if (res.success && res.data) {
        setLines(res.data);
      }
    });
  }, []);

  // ── Fetch Departures ─────────────────────────────────
  const refreshDepartures = useCallback(async () => {
    if (!selectedStationId) {
      setDepartures([]);
      return;
    }
    setDeparturesLoading(true);
    const params = new URLSearchParams();
    params.set('station_id', selectedStationId);
    if (selectedDayOfWeek !== null) params.set('day_of_week', String(selectedDayOfWeek));
    const res = await apiFetch<Departure[]>(`/api/v1/admin/departures?${params.toString()}`);
    if (res.success && res.data) {
      let data = res.data;
      if (selectedScheduleType !== 'all') {
        data = data.filter((d) => d.scheduleType === selectedScheduleType);
      }
      setDepartures(data);
    } else {
      setDepartures([]);
    }
    setDeparturesLoading(false);
  }, [selectedStationId, selectedDayOfWeek, selectedScheduleType]);

  useEffect(() => {
    if (activeTab === 'departures') {
      refreshDepartures();
    }
  }, [activeTab, refreshDepartures]);

  // ── Fetch Messages ───────────────────────────────────
  const refreshMessages = useCallback(async () => {
    setMessagesLoading(true);
    const params = new URLSearchParams();
    // Fetch all messages (no station filter for the messages tab)
    const res = await apiFetch<Message[]>(`/api/v1/admin/messages?${params.toString()}`);
    if (res.success && res.data) {
      setMessages(res.data);
    } else {
      setMessages([]);
    }
    setMessagesLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab === 'messages') {
      refreshMessages();
    }
  }, [activeTab, refreshMessages]);

  // ═══════════════════════════════════════════════════════
  // STATION CRUD
  // ═══════════════════════════════════════════════════════
  function openAddStation() {
    setEditingStation(null);
    setStationForm(emptyStationForm);
    setStationDialogOpen(true);
  }

  function openEditStation(station: Station) {
    setEditingStation(station);
    setStationForm({
      name: station.name,
      city: station.city,
      timezone: station.timezone || 'Africa/Douala',
      slug: station.slug,
    });
    setStationDialogOpen(true);
  }

  function handleStationNameChange(name: string) {
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setStationForm({ ...stationForm, name, slug });
  }

  async function saveStation() {
    setStationSaving(true);
    const url = editingStation
      ? `/api/v1/admin/stations/${editingStation.id}`
      : '/api/v1/admin/stations';
    const method = editingStation ? 'PUT' : 'POST';
    const res = await apiFetch(url, { method, body: JSON.stringify(stationForm) });
    if (res.success) {
      setStationDialogOpen(false);
      toast.success(editingStation ? 'Gare modifiée avec succès' : 'Gare créée avec succès');
      refreshStations();
    } else {
      toast.error(res.error || "Erreur lors de l'enregistrement");
    }
    setStationSaving(false);
  }

  function confirmDeleteStation(station: Station) {
    setDeletingStation(station);
    setDeleteStationDialogOpen(true);
  }

  async function deleteStation() {
    if (!deletingStation) return;
    setStationDeleting(true);
    const res = await apiFetch(`/api/v1/admin/stations/${deletingStation.id}`, { method: 'DELETE' });
    if (res.success) {
      setDeleteStationDialogOpen(false);
      setDeletingStation(null);
      toast.success('Gare supprimée avec succès');
      refreshStations();
    } else {
      toast.error(res.error || 'Erreur lors de la suppression');
    }
    setStationDeleting(false);
  }

  function handleStationClick(station: Station) {
    setSelectedStationId(station.id);
    setActiveTab('departures');
  }

  // ═══════════════════════════════════════════════════════
  // DEPARTURE CRUD
  // ═══════════════════════════════════════════════════════
  function openAddDeparture() {
    setEditingDeparture(null);
    setDepartureForm({
      ...emptyDepartureForm,
      stationId: selectedStationId,
    });
    setDepartureDialogOpen(true);
  }

  function openEditDeparture(dep: Departure) {
    setEditingDeparture(dep);
    setDepartureForm({
      stationId: dep.stationId,
      lineId: dep.lineId,
      scheduledTime: dep.scheduledTime,
      platform: String(dep.platform),
      scheduleType: dep.scheduleType,
      dayOfWeek: String(dep.dayOfWeek),
      destination: dep.destination,
    });
    setDepartureDialogOpen(true);
  }

  async function saveDeparture() {
    setDepartureSaving(true);
    const payload = {
      ...departureForm,
      platform: parseInt(departureForm.platform, 10) || departureForm.platform,
      dayOfWeek: parseInt(departureForm.dayOfWeek, 10),
    };
    const url = editingDeparture
      ? `/api/v1/admin/departures/${editingDeparture.id}`
      : '/api/v1/admin/departures';
    const method = editingDeparture ? 'PUT' : 'POST';
    const res = await apiFetch(url, { method, body: JSON.stringify(payload) });
    if (res.success) {
      setDepartureDialogOpen(false);
      toast.success(editingDeparture ? 'Départ modifié avec succès' : 'Départ créé avec succès');
      refreshDepartures();
    } else {
      toast.error(res.error || "Erreur lors de l'enregistrement");
    }
    setDepartureSaving(false);
  }

  function confirmDeleteDeparture(dep: Departure) {
    setDeletingDeparture(dep);
    setDeleteDepartureDialogOpen(true);
  }

  async function deleteDeparture() {
    if (!deletingDeparture) return;
    setDepartureDeleting(true);
    const res = await apiFetch(`/api/v1/admin/departures/${deletingDeparture.id}`, { method: 'DELETE' });
    if (res.success) {
      setDeleteDepartureDialogOpen(false);
      setDeletingDeparture(null);
      toast.success('Départ supprimé avec succès');
      refreshDepartures();
    } else {
      toast.error(res.error || 'Erreur lors de la suppression');
    }
    setDepartureDeleting(false);
  }

  function openDelayDialog(dep: Departure) {
    setDelayTarget(dep);
    setDelayForm({
      delayMinutes: String(dep.delayMinutes || 0),
      status: dep.status || 'on_time',
    });
    setDelayDialogOpen(true);
  }

  async function saveDelay() {
    if (!delayTarget) return;
    setDelaySaving(true);
    const res = await apiFetch(`/api/v1/admin/departures/${delayTarget.id}/delay`, {
      method: 'PUT',
      body: JSON.stringify({
        delayMinutes: parseInt(delayForm.delayMinutes, 10),
        status: delayForm.status,
      }),
    });
    if (res.success) {
      setDelayDialogOpen(false);
      setDelayTarget(null);
      toast.success('Retard mis à jour avec succès');
      refreshDepartures();
    } else {
      toast.error(res.error || "Erreur lors de la mise à jour du retard");
    }
    setDelaySaving(false);
  }

  // ═══════════════════════════════════════════════════════
  // CSV IMPORT
  // ═══════════════════════════════════════════════════════
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
        toast.error('Veuillez sélectionner un fichier CSV.');
        return;
      }
      setCsvFile(file);
      setCsvResult(null);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
        toast.error('Veuillez sélectionner un fichier CSV.');
        return;
      }
      setCsvFile(file);
      setCsvResult(null);
    }
  }

  async function uploadCsv() {
    if (!csvFile || !csvStationId) return;
    setCsvUploading(true);
    setCsvResult(null);
    const formData = new FormData();
    formData.append('file', csvFile);

    try {
      const { accessToken } = (await import('@/stores/auth-store')).useAuthStore.getState();
      const headers: Record<string, string> = {};
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

      const res = await fetch(
        `/api/v1/admin/stations/${csvStationId}/departures/import-csv`,
        { method: 'POST', headers, body: formData }
      );
      const data = await res.json();
      if (data.success) {
        setCsvResult(data.data as ImportResult);
        toast.success(`Import terminé : ${data.data?.created || 0} départs créés`);
        // Refresh departures if on same station
        if (selectedStationId === csvStationId) {
          refreshDepartures();
        }
      } else {
        toast.error(data.message || data.error || "Erreur lors de l'import CSV");
        setCsvResult({
          created: 0,
          updated: 0,
          total: 0,
          errors: [data.message || data.error || "Erreur inconnue"],
        });
      }
    } catch {
      toast.error('Erreur réseau lors de l\'import');
      setCsvResult({
        created: 0,
        updated: 0,
        total: 0,
        errors: ['Erreur réseau'],
      });
    }
    setCsvUploading(false);
  }

  // ═══════════════════════════════════════════════════════
  // MESSAGE CRUD
  // ═══════════════════════════════════════════════════════
  function openAddMessage() {
    setEditingMessage(null);
    setMessageForm(emptyMessageForm);
    setMessageDialogOpen(true);
  }

  function openEditMessage(msg: Message) {
    setEditingMessage(msg);
    setMessageForm({
      stationId: msg.stationId || '',
      message: msg.message,
      priority: msg.priority,
      startDate: msg.startDate ? msg.startDate.slice(0, 16) : '',
      endDate: msg.endDate ? msg.endDate.slice(0, 16) : '',
    });
    setMessageDialogOpen(true);
  }

  async function saveMessage() {
    setMessageSaving(true);
    const url = editingMessage
      ? `/api/v1/admin/messages/${editingMessage.id}`
      : '/api/v1/admin/messages';
    const method = editingMessage ? 'PUT' : 'POST';
    const payload = {
      ...messageForm,
      stationId: messageForm.stationId || null,
    };
    const res = await apiFetch(url, { method, body: JSON.stringify(payload) });
    if (res.success) {
      setMessageDialogOpen(false);
      toast.success(editingMessage ? 'Message modifié avec succès' : 'Message créé avec succès');
      refreshMessages();
    } else {
      toast.error(res.error || "Erreur lors de l'enregistrement");
    }
    setMessageSaving(false);
  }

  function confirmDeleteMessage(msg: Message) {
    setDeletingMessage(msg);
    setDeleteMessageDialogOpen(true);
  }

  async function deleteMessage() {
    if (!deletingMessage) return;
    setMessageDeleting(true);
    const res = await apiFetch(`/api/v1/admin/messages/${deletingMessage.id}`, { method: 'DELETE' });
    if (res.success) {
      setDeleteMessageDialogOpen(false);
      setDeletingMessage(null);
      toast.success('Message supprimé avec succès');
      refreshMessages();
    } else {
      toast.error(res.error || 'Erreur lors de la suppression');
    }
    setMessageDeleting(false);
  }

  // ── Helper: get station name by id ───────────────────
  function getStationName(stationId: string | null | undefined): string {
    if (!stationId) return 'Global';
    const station = stations.find((s) => s.id === stationId);
    return station?.name || stationId;
  }

  // ── Helper: get line info by id ──────────────────────
  function getLineInfo(lineId: string): { number: number; name: string; color: string } | null {
    const line = lines.find((l) => l.id === lineId);
    return line || null;
  }

  // ═══════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="stations">
            <span className="mr-1">🚏</span>
            Gares
          </TabsTrigger>
          <TabsTrigger value="departures">
            <span className="mr-1">⏰</span>
            Départs
          </TabsTrigger>
          <TabsTrigger value="csv-import">
            <span className="mr-1">📤</span>
            Import CSV
          </TabsTrigger>
          <TabsTrigger value="messages">
            <span className="mr-1">💬</span>
            Messages
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════ */}
        {/* TAB 1: STATIONS                                */}
        {/* ═══════════════════════════════════════════════ */}
        <TabsContent value="stations" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openAddStation}>
              <Plus className="mr-1 size-4" />
              Ajouter une gare
            </Button>
          </div>

          {stationsLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : stations.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
              <FileText className="mb-3 size-10 text-muted-foreground" />
              <p className="text-lg font-medium">Aucune gare trouvée</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Commencez par ajouter votre première gare
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {stations.map((station) => (
                <Card
                  key={station.id}
                  className="cursor-pointer transition-shadow hover:shadow-md"
                  onClick={() => handleStationClick(station)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{station.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{station.city}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditStation(station);
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
                            confirmDeleteStation(station);
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <Badge variant="outline" className="font-mono text-xs">
                        {station.slug}
                      </Badge>
                      <span>🚌 {station.departuresCount ?? 0} départs</span>
                      <span>💬 {station.messagesCount ?? 0} messages</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════ */}
        {/* TAB 2: DEPARTURES                              */}
        {/* ═══════════════════════════════════════════════ */}
        <TabsContent value="departures" className="space-y-4">
          {/* Station selector */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Select
              value={selectedStationId}
              onValueChange={(v) => {
                setSelectedStationId(v);
                setCsvStationId(v);
              }}
            >
              <SelectTrigger className="w-full sm:max-w-xs">
                <SelectValue placeholder="Sélectionner une gare" />
              </SelectTrigger>
              <SelectContent>
                {stations.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} — {s.city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedStationId && (
              <Button onClick={openAddDeparture}>
                <Plus className="mr-1 size-4" />
                Ajouter un départ
              </Button>
            )}
          </div>

          {selectedStationId && (
            <>
              {/* Day of week filter */}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={selectedDayOfWeek === null ? 'default' : 'outline'}
                  onClick={() => setSelectedDayOfWeek(null)}
                >
                  Tous
                </Button>
                {DAY_LABELS_SHORT.map((label, idx) => (
                  <Button
                    key={idx}
                    size="sm"
                    variant={selectedDayOfWeek === idx ? 'default' : 'outline'}
                    onClick={() => setSelectedDayOfWeek(idx)}
                  >
                    {label}
                  </Button>
                ))}
                <Separator orientation="vertical" className="h-8 mx-1" />
                <Button
                  size="sm"
                  variant={selectedScheduleType === 'all' ? 'default' : 'outline'}
                  onClick={() => setSelectedScheduleType('all')}
                >
                  Tous
                </Button>
                <Button
                  size="sm"
                  variant={selectedScheduleType === 'departure' ? 'default' : 'outline'}
                  onClick={() => setSelectedScheduleType('departure')}
                >
                  Départs
                </Button>
                <Button
                  size="sm"
                  variant={selectedScheduleType === 'arrival' ? 'default' : 'outline'}
                  onClick={() => setSelectedScheduleType('arrival')}
                >
                  Arrivées
                </Button>
              </div>

              {/* Departures table */}
              {departuresLoading ? (
                <TableSkeleton />
              ) : departures.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
                  <Clock className="mb-3 size-10 text-muted-foreground" />
                  <p className="text-lg font-medium">Aucun départ trouvé</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Ajoutez des départs pour cette gare
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Heure</TableHead>
                        <TableHead>Ligne</TableHead>
                        <TableHead>Destination</TableHead>
                        <TableHead>Quai</TableHead>
                        <TableHead className="hidden md:table-cell">Jour</TableHead>
                        <TableHead className="hidden sm:table-cell">Type</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {departures.map((dep) => {
                        const lineInfo = dep.line || getLineInfo(dep.lineId);
                        const statusCfg = STATUS_CONFIG[dep.status] || STATUS_CONFIG.on_time;
                        return (
                          <TableRow key={dep.id}>
                            <TableCell className="font-mono font-medium">
                              {dep.scheduledTime}
                              {dep.delayMinutes && dep.delayMinutes > 0 && (
                                <span className="ml-1 text-xs text-amber-600">
                                  +{dep.delayMinutes}min
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {lineInfo ? (
                                <Badge
                                  className="text-white border-0"
                                  style={{ backgroundColor: lineInfo.color }}
                                >
                                  {lineInfo.number} — {lineInfo.name}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">{dep.lineId}</span>
                              )}
                            </TableCell>
                            <TableCell>{dep.destination}</TableCell>
                            <TableCell>{dep.platform || '—'}</TableCell>
                            <TableCell className="hidden md:table-cell">
                              {DAY_LABELS_SHORT[dep.dayOfWeek]}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <Badge variant="outline">
                                {dep.scheduleType === 'departure' ? 'Départ' : 'Arrivée'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={statusCfg.className} variant="secondary">
                                {statusCfg.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7"
                                  title="Modifier le retard"
                                  onClick={() => openDelayDialog(dep)}
                                >
                                  <AlertCircle className="size-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7"
                                  onClick={() => openEditDeparture(dep)}
                                >
                                  <Pencil className="size-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7 text-destructive hover:text-destructive"
                                  onClick={() => confirmDeleteDeparture(dep)}
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}

          {!selectedStationId && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
              <FileText className="mb-3 size-10 text-muted-foreground" />
              <p className="text-lg font-medium">Sélectionnez une gare</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Choisissez une gare pour voir et gérer ses départs
              </p>
            </div>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════ */}
        {/* TAB 3: CSV IMPORT                              */}
        {/* ═══════════════════════════════════════════════ */}
        <TabsContent value="csv-import" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="size-5" />
                Importer des départs via CSV
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Importez un fichier CSV pour créer ou mettre à jour des départs en masse pour une gare.
                Le fichier doit contenir un en-tête avec les colonnes suivantes :
              </p>

              <div className="rounded-md bg-muted p-4 font-mono text-xs overflow-x-auto">
                <pre className="whitespace-pre">{`LineNumber,LineName,Color,DayOfWeek,ScheduledTime,Platform,Type,Destination
1,Centre-Aéroport,#16a34a,1,06:00,1,Départ,Aéroport
2,Marché-Gare,#2563eb,1,06:15,2,Départ,Marché Central
1,Centre-Aéroport,#16a34a,1,06:30,1,Arrivée,Centre-Ville`}</pre>
              </div>

              <Separator />

              {/* Station selector for CSV import */}
              <div className="grid gap-2 max-w-sm">
                <Label>Gare cible</Label>
                <Select value={csvStationId} onValueChange={setCsvStationId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une gare" />
                  </SelectTrigger>
                  <SelectContent>
                    {stations.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} — {s.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Drag & drop zone */}
              <div
                className={`
                  relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8
                  transition-colors cursor-pointer
                  ${isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'}
                `}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="size-10 text-muted-foreground mb-3" />
                <p className="text-sm font-medium">
                  {csvFile ? csvFile.name : 'Glissez-déposez votre fichier CSV ici'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  ou cliquez pour sélectionner un fichier
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>

              {csvFile && csvStationId && (
                <div className="flex items-center gap-3">
                  <Button onClick={uploadCsv} disabled={csvUploading}>
                    {csvUploading ? (
                      <>Import en cours...</>
                    ) : (
                      <>
                        <Upload className="mr-1 size-4" />
                        Importer le fichier
                      </>
                    )}
                  </Button>
                  {csvFile && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setCsvFile(null);
                        setCsvResult(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                    >
                      Supprimer le fichier
                    </Button>
                  )}
                </div>
              )}

              {/* Import result */}
              {csvResult && (
                <div className="rounded-lg border p-4 space-y-3">
                  <h4 className="text-sm font-semibold">Rapport d&apos;import</h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="flex items-center justify-center gap-1">
                        <CheckCircle2 className="size-4 text-green-600" />
                        <span className="text-2xl font-bold">{csvResult.created}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Créés</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-1">
                        <Pencil className="size-4 text-amber-600" />
                        <span className="text-2xl font-bold">{csvResult.updated}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Mis à jour</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-1">
                        <XCircle className="size-4 text-red-600" />
                        <span className="text-2xl font-bold">{csvResult.errors?.length ?? 0}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Erreurs</p>
                    </div>
                  </div>
                  {csvResult.errors && csvResult.errors.length > 0 && (
                    <div className="space-y-1">
                      {csvResult.errors.map((err, idx) => (
                        <p key={idx} className="text-xs text-destructive flex items-center gap-1">
                          <XCircle className="size-3 shrink-0" />
                          {err}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════ */}
        {/* TAB 4: MESSAGES                                */}
        {/* ═══════════════════════════════════════════════ */}
        <TabsContent value="messages" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openAddMessage}>
              <Plus className="mr-1 size-4" />
              Ajouter un message
            </Button>
          </div>

          {messagesLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-lg border p-4 space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-60" />
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
              <FileText className="mb-3 size-10 text-muted-foreground" />
              <p className="text-lg font-medium">Aucun message</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ajoutez des messages d&apos;information pour les gares
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => {
                const priorityCfg = PRIORITY_CONFIG[msg.priority] || PRIORITY_CONFIG.info;
                return (
                  <Card key={msg.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={priorityCfg.className} variant="secondary">
                              {priorityCfg.label}
                            </Badge>
                            <Badge variant="outline">
                              {msg.station ? msg.station.name : 'Global'}
                            </Badge>
                          </div>
                          <p className="text-sm">{msg.message}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {msg.startDate ? `${new Date(msg.startDate).toLocaleDateString('fr-FR')} — ` : ''}
                            {msg.endDate ? new Date(msg.endDate).toLocaleDateString('fr-FR') : 'Pas de date de fin'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => openEditMessage(msg)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-destructive hover:text-destructive"
                            onClick={() => confirmDeleteMessage(msg)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ═══════════════════════════════════════════════ */}
      {/* STATION DIALOG                                  */}
      {/* ═══════════════════════════════════════════════ */}
      <Dialog open={stationDialogOpen} onOpenChange={setStationDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingStation ? 'Modifier la gare' : 'Nouvelle gare'}
            </DialogTitle>
            <DialogDescription>
              {editingStation
                ? 'Modifiez les informations de la gare.'
                : 'Renseignez les informations de la nouvelle gare.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="station-name">Nom de la gare</Label>
              <Input
                id="station-name"
                placeholder="Ex: Gare Routière de Douala"
                value={stationForm.name}
                onChange={(e) => handleStationNameChange(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="station-city">Ville</Label>
              <Input
                id="station-city"
                placeholder="Ex: Douala"
                value={stationForm.city}
                onChange={(e) => setStationForm({ ...stationForm, city: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="station-slug">Slug (URL)</Label>
              <Input
                id="station-slug"
                placeholder="Ex: gare-routiere-douala"
                value={stationForm.slug}
                onChange={(e) => setStationForm({ ...stationForm, slug: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="station-tz">Fuseau horaire</Label>
              <Select
                value={stationForm.timezone}
                onValueChange={(v) => setStationForm({ ...stationForm, timezone: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Africa/Douala">Africa/Douala</SelectItem>
                  <SelectItem value="Africa/Yaounde">Africa/Yaoundé</SelectItem>
                  <SelectItem value="Africa/Lagos">Africa/Lagos</SelectItem>
                  <SelectItem value="Africa/Kinshasa">Africa/Kinshasa</SelectItem>
                  <SelectItem value="Africa/Abidjan">Africa/Abidjan</SelectItem>
                  <SelectItem value="Europe/Paris">Europe/Paris</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStationDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={saveStation}
              disabled={stationSaving || !stationForm.name || !stationForm.city || !stationForm.slug}
            >
              {stationSaving ? 'Enregistrement...' : editingStation ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════ */}
      {/* DELETE STATION DIALOG                           */}
      {/* ═══════════════════════════════════════════════ */}
      <AlertDialog open={deleteStationDialogOpen} onOpenChange={setDeleteStationDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la gare ?</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous vraiment supprimer la gare <strong>{deletingStation?.name}</strong> ?
              Cette action supprimera également tous les départs et messages associés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteStation}
              disabled={stationDeleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {stationDeleting ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ═══════════════════════════════════════════════ */}
      {/* DEPARTURE DIALOG                                */}
      {/* ═══════════════════════════════════════════════ */}
      <Dialog open={departureDialogOpen} onOpenChange={setDepartureDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingDeparture ? 'Modifier le départ' : 'Nouveau départ'}
            </DialogTitle>
            <DialogDescription>
              {editingDeparture
                ? 'Modifiez les informations du départ.'
                : 'Ajoutez un nouveau départ pour la gare.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Ligne</Label>
              <Select
                value={departureForm.lineId}
                onValueChange={(v) => setDepartureForm({ ...departureForm, lineId: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionner une ligne" />
                </SelectTrigger>
                <SelectContent>
                  {lines.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      <span className="mr-1 inline-block size-3 rounded-full" style={{ backgroundColor: l.color }} />
                      {l.number} — {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="dep-time">Heure programmée</Label>
                <Input
                  id="dep-time"
                  type="time"
                  value={departureForm.scheduledTime}
                  onChange={(e) => setDepartureForm({ ...departureForm, scheduledTime: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dep-platform">Quai</Label>
                <Input
                  id="dep-platform"
                  placeholder="Ex: 1"
                  value={departureForm.platform}
                  onChange={(e) => setDepartureForm({ ...departureForm, platform: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dep-destination">Destination</Label>
              <Input
                id="dep-destination"
                placeholder="Ex: Aéroport"
                value={departureForm.destination}
                onChange={(e) => setDepartureForm({ ...departureForm, destination: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Jour de la semaine</Label>
                <Select
                  value={departureForm.dayOfWeek}
                  onValueChange={(v) => setDepartureForm({ ...departureForm, dayOfWeek: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAY_LABELS_FULL.map((label, idx) => (
                      <SelectItem key={idx} value={String(idx)}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select
                  value={departureForm.scheduleType}
                  onValueChange={(v) => setDepartureForm({ ...departureForm, scheduleType: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="departure">Départ</SelectItem>
                    <SelectItem value="arrival">Arrivée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDepartureDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={saveDeparture}
              disabled={
                departureSaving ||
                !departureForm.lineId ||
                !departureForm.scheduledTime ||
                !departureForm.dayOfWeek
              }
            >
              {departureSaving ? 'Enregistrement...' : editingDeparture ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════ */}
      {/* DELETE DEPARTURE DIALOG                         */}
      {/* ═══════════════════════════════════════════════ */}
      <AlertDialog open={deleteDepartureDialogOpen} onOpenChange={setDeleteDepartureDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le départ ?</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous vraiment supprimer le départ de <strong>{deletingDeparture?.scheduledTime}</strong>
              {' '}vers <strong>{deletingDeparture?.destination}</strong> ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteDeparture}
              disabled={departureDeleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {departureDeleting ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ═══════════════════════════════════════════════ */}
      {/* DELAY DIALOG                                    */}
      {/* ═══════════════════════════════════════════════ */}
      <Dialog open={delayDialogOpen} onOpenChange={setDelayDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Modifier le retard</DialogTitle>
            <DialogDescription>
              Départ de <strong>{delayTarget?.scheduledTime}</strong> vers{' '}
              <strong>{delayTarget?.destination}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="delay-minutes">Retard (minutes)</Label>
              <Input
                id="delay-minutes"
                type="number"
                min="0"
                placeholder="Ex: 5"
                value={delayForm.delayMinutes}
                onChange={(e) => setDelayForm({ ...delayForm, delayMinutes: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Statut</Label>
              <Select
                value={delayForm.status}
                onValueChange={(v) => setDelayForm({ ...delayForm, status: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="on_time">À l&apos;heure</SelectItem>
                  <SelectItem value="delayed">Retardé</SelectItem>
                  <SelectItem value="cancelled">Annulé</SelectItem>
                  <SelectItem value="departed">Parti</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDelayDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={saveDelay} disabled={delaySaving}>
              {delaySaving ? 'Mise à jour...' : 'Appliquer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════ */}
      {/* MESSAGE DIALOG                                  */}
      {/* ═══════════════════════════════════════════════ */}
      <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingMessage ? 'Modifier le message' : 'Nouveau message'}
            </DialogTitle>
            <DialogDescription>
              {editingMessage
                ? 'Modifiez le contenu du message.'
                : 'Créez un message d\'information ou d\'alerte.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Gare (optionnel)</Label>
              <Select
                value={messageForm.stationId}
                onValueChange={(v) => setMessageForm({ ...messageForm, stationId: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Global (toutes les gares)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Global (toutes les gares)</SelectItem>
                  {stations.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} — {s.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="msg-text">Message</Label>
              <Textarea
                id="msg-text"
                placeholder="Ex: Fermeture temporaire du quai 3..."
                rows={3}
                value={messageForm.message}
                onChange={(e) => setMessageForm({ ...messageForm, message: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Priorité</Label>
              <Select
                value={messageForm.priority}
                onValueChange={(v) => setMessageForm({ ...messageForm, priority: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">🚨 Urgent</SelectItem>
                  <SelectItem value="normal">⚡ Normal</SelectItem>
                  <SelectItem value="info">ℹ️ Info</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="msg-start">Date de début</Label>
                <Input
                  id="msg-start"
                  type="datetime-local"
                  value={messageForm.startDate}
                  onChange={(e) => setMessageForm({ ...messageForm, startDate: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="msg-end">Date de fin</Label>
                <Input
                  id="msg-end"
                  type="datetime-local"
                  value={messageForm.endDate}
                  onChange={(e) => setMessageForm({ ...messageForm, endDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMessageDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={saveMessage}
              disabled={messageSaving || !messageForm.message}
            >
              {messageSaving ? 'Enregistrement...' : editingMessage ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════ */}
      {/* DELETE MESSAGE DIALOG                           */}
      {/* ═══════════════════════════════════════════════ */}
      <AlertDialog open={deleteMessageDialogOpen} onOpenChange={setDeleteMessageDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le message ?</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous vraiment supprimer ce message ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteMessage}
              disabled={messageDeleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {messageDeleting ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
