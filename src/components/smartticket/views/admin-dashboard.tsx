'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Wallet,
  Ticket,
  CheckCircle,
  ScanLine,
  LayoutDashboard,
  MapPin,
  Settings,
  Users,
  BarChart3,
  Monitor,
  ClipboardList,
  Bus,
  Bell,
  Menu,
  X,
  Loader2,
  RefreshCw,
  LogOut,
  TrendingUp,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { apiFetch, formatCurrency } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { getRoleLabel, getRoleColor } from '@/lib/api';
import type { ViewId } from '../app-shell';

// ─── Data Types (unchanged) ────────────────────────────────────

interface DashboardData {
  totalRevenue: number;
  totalTicketsSold: number;
  totalControls: number;
  validControlRate: number;
  activeSubscriptions: number;
  openCashSessions: number;
  revenueByDay: { date: string; revenue: number }[];
  ticketsByType: Record<string, number>;
  topLines: { lineId: string; lineName: string; lineNumber: string; revenue: number; tickets: number }[];
  topZones: { zoneId: string; zoneName: string; zoneCode: string; revenue: number; tickets: number }[];
}

type Period = 'today' | 'week' | 'month' | 'year';

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'today', label: "Aujourd'hui" },
  { value: 'week', label: 'Semaine' },
  { value: 'month', label: 'Mois' },
  { value: 'year', label: 'Année' },
];

// ─── Sidebar Navigation ────────────────────────────────────────

interface NavItem {
  id: ViewId | 'audit';
  label: string;
  icon: React.ReactNode;
}

const SIDEBAR_NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'lines', label: 'Lignes', icon: <MapPin className="w-5 h-5" /> },
  { id: 'zones', label: 'Zones', icon: <Settings className="w-5 h-5" /> },
  { id: 'users', label: 'Utilisateurs', icon: <Users className="w-5 h-5" /> },
  { id: 'tickets', label: 'Billetterie', icon: <Ticket className="w-5 h-5" /> },
  { id: 'controls', label: 'Contrôles', icon: <ScanLine className="w-5 h-5" /> },
  { id: 'reports', label: 'Rapports', icon: <BarChart3 className="w-5 h-5" /> },
  { id: 'display', label: 'Affichage', icon: <Monitor className="w-5 h-5" /> },
  { id: 'audit', label: 'Audit', icon: <ClipboardList className="w-5 h-5" /> },
];

// ─── Circular Progress Ring (SVG) ─────────────────────────────

function CircularProgress({
  value,
  max,
  size = 120,
  strokeWidth = 8,
  color,
  label,
  sublabel,
}: {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  label: string;
  sublabel: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted/30"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-foreground">
            {Math.round(pct)}%
          </span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{sublabel}</p>
      </div>
    </div>
  );
}

// ─── Sidebar Content (shared between desktop & mobile) ────────

function SidebarNav({
  activeView,
  onNavigate,
  onNavClick,
}: {
  activeView: ViewId | 'audit';
  onNavigate: (view: ViewId) => void;
  onNavClick?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1 px-3">
      {SIDEBAR_NAV.map((item) => {
        const isActive = activeView === item.id;
        return (
          <button
            key={item.id}
            onClick={() => {
              onNavigate(item.id as ViewId);
              onNavClick?.();
            }}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer
              ${
                isActive
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }
            `}
          >
            <span className={isActive ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

// ─── Main Component ────────────────────────────────────────────

export function AdminDashboard({ onNavigate }: { onNavigate: (view: ViewId) => void }) {
  const { user, logout } = useAuthStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState<Period>('today');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Data fetching (same logic as before)
  useEffect(() => {
    let active = true;

    const loadData = async (showRefresh: boolean) => {
      if (!active) return;
      if (showRefresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');

      const result = await apiFetch<DashboardData>(
        `/api/reports/dashboard?period=${period}`,
      );

      if (!active) return;

      if (result.success && result.data) {
        setData(result.data);
        setLastUpdated(new Date());
      } else {
        setError(result.error || 'Erreur de chargement');
      }

      if (showRefresh) {
        setIsRefreshing(false);
      } else {
        setLoading(false);
      }
    };

    loadData(false);

    intervalRef.current = setInterval(() => {
      loadData(true);
    }, 30_000);

    return () => {
      active = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [period]);

  const handlePeriodChange = (p: Period) => {
    if (p === period) return;
    setPeriod(p);
  };

  const getInitials = (name: string) =>
    name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  // Revenue chart bar data (last 7 days)
  const chartData = data?.revenueByDay?.slice(-7) || [];
  const maxRevenue = chartData.length > 0 ? Math.max(...chartData.map((d) => d.revenue), 1) : 1;

  return (
    <div className="flex h-[calc(100vh-3.5rem-2.75rem)] -m-4 lg:-m-6 overflow-hidden">
      {/* ─── Desktop Sidebar ─── */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-slate-900 text-white">
        {/* Sidebar Header */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500">
            <Bus className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-base leading-tight">SmartTicket</h2>
            <p className="text-[11px] text-slate-400">Panneau Admin</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-4">
          <SidebarNav activeView="dashboard" onNavigate={onNavigate} />
        </div>

        {/* Sidebar Footer - User */}
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-emerald-600 text-white text-xs font-bold">
                {user ? getInitials(user.name) : 'SA'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name || 'Admin'}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email || ''}</p>
            </div>
            <button
              onClick={logout}
              className="text-slate-400 hover:text-white transition-colors p-1"
              aria-label="Se déconnecter"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ─── Main Content Area ─── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-muted/30">
        {/* Top Header Bar */}
        <header className="flex items-center justify-between px-4 lg:px-6 py-3 bg-white dark:bg-slate-950 border-b shrink-0">
          {/* Left: Mobile hamburger + Title */}
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden -ml-2">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 bg-slate-900 text-white border-none p-0 [&>button]:hidden">
                <SheetHeader className="px-5 py-5 border-b border-white/10 space-y-0">
                  <SheetTitle className="text-white text-left flex items-center gap-3">
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500">
                      <Bus className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <span className="font-bold text-base leading-tight block">SmartTicket</span>
                      <span className="text-[11px] text-slate-400 font-normal">Panneau Admin</span>
                    </div>
                  </SheetTitle>
                </SheetHeader>
                <div className="py-4">
                  <SidebarNav
                    activeView="dashboard"
                    onNavigate={onNavigate}
                    onNavClick={() => setSidebarOpen(false)}
                  />
                </div>
              </SheetContent>
            </Sheet>

            <div>
              <h1 className="text-lg font-bold text-foreground">Tableau de Bord</h1>
              <div className="flex items-center gap-2 mt-0.5">
                {(isRefreshing || loading) && (
                  <Loader2 className="w-3 h-3 text-muted-foreground animate-spin" />
                )}
                {lastUpdated && !loading && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Mis à jour à{' '}
                    {lastUpdated.toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: User */}
          <div className="flex items-center gap-3">
            <Badge variant="outline" className={`text-xs hidden sm:inline-flex ${getRoleColor(user?.role || '')}`}>
              {getRoleLabel(user?.role || '')}
            </Badge>
            <button
              className="relative p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4 text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                  {user ? getInitials(user.name) : 'SA'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block">
                <p className="text-sm font-medium leading-tight">{user?.name || 'Admin'}</p>
                <p className="text-xs text-muted-foreground">{user?.email || ''}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6 space-y-6">
            {/* Period Selector */}
            <div className="flex items-center gap-2">
              {PERIOD_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  size="sm"
                  variant={period === opt.value ? 'default' : 'outline'}
                  onClick={() => handlePeriodChange(opt.value)}
                  disabled={loading || isRefreshing}
                  className="text-xs"
                >
                  {opt.label}
                </Button>
              ))}
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* ─── Row 1: KPI Gradient Cards ─── */}
            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-xl p-5 bg-muted">
                    <Skeleton className="h-4 w-20 mb-3" />
                    <Skeleton className="h-8 w-28 mb-1" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Revenus */}
                <div className="rounded-xl bg-gradient-to-br from-red-500 to-red-600 p-5 text-white shadow-lg shadow-red-500/20">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-red-100">Revenus</span>
                    <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <p className="text-2xl lg:text-3xl font-bold">
                    {data ? formatCurrency(data.totalRevenue) : '—'}
                  </p>
                  <p className="text-xs text-red-100 mt-1">
                    Chiffre d&apos;affaires
                  </p>
                </div>

                {/* Tickets Vendus */}
                <div className="rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 p-5 text-white shadow-lg shadow-orange-500/20">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-orange-100">Tickets Vendus</span>
                    <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
                      <Ticket className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <p className="text-2xl lg:text-3xl font-bold">
                    {data?.totalTicketsSold?.toLocaleString('fr-FR') ?? '—'}
                  </p>
                  <p className="text-xs text-orange-100 mt-1">Billets émis</p>
                </div>

                {/* Taux de Validation */}
                <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 p-5 text-white shadow-lg shadow-emerald-500/20">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-emerald-100">Taux Validation</span>
                    <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <p className="text-2xl lg:text-3xl font-bold">
                    {data ? `${Number(data.validControlRate || 0).toFixed(1)}%` : '—'}
                  </p>
                  <p className="text-xs text-emerald-100 mt-1">Contrôles valides</p>
                </div>

                {/* Contrôles */}
                <div className="rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-5 text-white shadow-lg shadow-blue-500/20">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-blue-100">Contrôles</span>
                    <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
                      <ScanLine className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <p className="text-2xl lg:text-3xl font-bold">
                    {data?.totalControls?.toLocaleString('fr-FR') ?? '—'}
                  </p>
                  <p className="text-xs text-blue-100 mt-1">Contrôles effectués</p>
                </div>
              </div>
            )}

            {/* ─── Row 2: Revenue Chart + Quick Stats ─── */}
            {!loading && data && (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                {/* Revenue Bar Chart */}
                <Card className="lg:col-span-3">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      Revenus
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {chartData.length > 0 ? (
                      <div className="flex items-end gap-2 h-48">
                        {chartData.map((day) => {
                          const pct = (day.revenue / maxRevenue) * 100;
                          return (
                            <div key={day.date} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                              <span className="text-[10px] font-medium text-muted-foreground">
                                {day.revenue > 0 ? formatCurrency(day.revenue).replace(' FCFA', '') : ''}
                              </span>
                              <div
                                className="w-full rounded-t-md bg-gradient-to-t from-blue-600 to-blue-400 transition-all duration-500 min-h-[4px]"
                                style={{ height: `${Math.max(pct, 3)}%` }}
                              />
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(day.date).toLocaleDateString('fr-FR', {
                                  day: '2-digit',
                                  month: 'short',
                                })}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
                        Aucune donnée disponible
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <Card className="lg:col-span-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold">
                      Statistiques Rapides
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Tickets par type */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                        Tickets par Type
                      </p>
                      {data.ticketsByType && Object.keys(data.ticketsByType).length > 0 ? (
                        <div className="space-y-1.5">
                          {Object.entries(data.ticketsByType).map(([type, count]) => (
                            <div key={type} className="flex items-center justify-between">
                              <span className="text-sm">
                                {type === 'UNIT' ? 'Unité' : type === 'SUBSCRIPTION' ? 'Abonnement' : type}
                              </span>
                              <Badge variant="secondary" className="font-mono">{count}</Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Aucune donnée</p>
                      )}
                    </div>

                    <Separator />

                    {/* Top Lignes */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                        Lignes Populaires
                      </p>
                      {data.topLines && data.topLines.length > 0 ? (
                        <div className="space-y-1.5">
                          {data.topLines.slice(0, 3).map((line, idx) => (
                            <div key={line.lineId || `line-${idx}`} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold bg-primary/10 text-primary">
                                  {idx + 1}
                                </span>
                                <span className="text-sm truncate max-w-[120px]">
                                  {line.lineName || line.lineNumber || '—'}
                                </span>
                              </div>
                              <Badge variant="secondary" className="font-mono text-xs">
                                {line.tickets || 0}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Aucune donnée</p>
                      )}
                    </div>

                    <Separator />

                    {/* Sessions actives */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Caisses ouvertes</span>
                      <Badge
                        variant="outline"
                        className="font-mono border-green-300 text-green-700 dark:border-green-700 dark:text-green-400"
                      >
                        {data.openCashSessions}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ─── Row 3: Circular Progress Indicators ─── */}
            {!loading && data && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="flex items-center justify-center py-6">
                  <CircularProgress
                    value={data.validControlRate}
                    max={100}
                    size={120}
                    strokeWidth={8}
                    color="#16a34a"
                    label="Taux de Validation"
                    sublabel={`${Number(data.validControlRate || 0).toFixed(1)}% des contrôles`}
                  />
                </Card>

                <Card className="flex items-center justify-center py-6">
                  <CircularProgress
                    value={data.totalTicketsSold}
                    max={Math.max(data.totalTicketsSold * 1.5, 100)}
                    size={120}
                    strokeWidth={8}
                    color="#2563eb"
                    label="Tickets Vendus"
                    sublabel={`${data.totalTicketsSold} billets`}
                  />
                </Card>

                <Card className="flex items-center justify-center py-6">
                  <CircularProgress
                    value={data.openCashSessions}
                    max={Math.max(data.openCashSessions + 2, 5)}
                    size={120}
                    strokeWidth={8}
                    color="#d97706"
                    label="Caisses Ouvertes"
                    sublabel={`${data.openCashSessions} active(s)`}
                  />
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
