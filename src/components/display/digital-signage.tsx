'use client';

import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import {
  Bus,
  Clock,
  Wifi,
  WifiOff,
  Maximize2,
  Minimize2,
  Monitor,
} from 'lucide-react';

// ============================================================
// Types
// ============================================================
interface Station {
  id: string;
  name: string;
  city: string;
  timezone?: string;
}

interface Departure {
  id: string;
  lineNumber: string;
  lineName?: string;
  lineColor: string;
  destination: string;
  scheduledTime: string;
  estimatedTime: string;
  platform: string;
  status: 'on-time' | 'delayed' | 'cancelled' | 'departed';
  type: string;
  delayMinutes: number;
  minutesUntil: number;
  isImminent: boolean;
  isPast: boolean;
}

interface Message {
  id: string;
  text: string;
  priority: 'urgent' | 'normal' | 'info';
}

interface DisplayData {
  station: Station;
  currentTime: string;
  dayName: string;
  departures: Departure[];
  messages: Message[];
}

// ============================================================
// Custom Hooks
// ============================================================

/** Real-time clock updating every second */
function useRealTimeClock() {
  const [clock, setClock] = useState('');
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return clock;
}

/** Poll display data every 30s, auto-retry every 5s on failure */
function useDisplayPolling(
  stationId: string | null,
  type: string
) {
  const [displayData, setDisplayData] = useState<DisplayData | null>(null);
  const [connectionLost, setConnectionLost] = useState(false);
  const [loading, setLoading] = useState(true);
  const lastGoodRef = useRef<DisplayData | null>(null);
  const [lastGoodData, setLastGoodData] = useState<DisplayData | null>(null);

  const fetchData = useCallback(async () => {
    if (!stationId) return;
    try {
      const result = await apiFetch<DisplayData>(
        `/api/v1/public/display/${stationId}?type=${type}&limit=30`
      );
      if (result.success && result.data) {
        lastGoodRef.current = result.data;
        setDisplayData(result.data);
        setLastGoodData(result.data);
        setConnectionLost(false);
        setLoading(false);
      } else {
        setConnectionLost(true);
        if (!lastGoodRef.current) setLoading(false);
      }
    } catch {
      setConnectionLost(true);
      if (!lastGoodRef.current) setLoading(false);
    }
  }, [stationId, type]);

  // Main polling every 30s
  useEffect(() => {
    if (!stationId) return;
    let cancelled = false;
    const poll = async () => { if (!cancelled) await fetchData(); };
    poll();
    const id = setInterval(poll, 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, [stationId, fetchData]);

  // Auto-retry every 5s when connection lost
  useEffect(() => {
    if (!connectionLost || !stationId) return;
    let cancelled = false;
    const poll = async () => { if (!cancelled) await fetchData(); };
    const id = setInterval(poll, 5000);
    return () => { cancelled = true; clearInterval(id); };
  }, [connectionLost, stationId, fetchData]);

  return {
    displayData: displayData || lastGoodData,
    connectionLost,
    loading,
  };
}

/** Toggle fullscreen via Fullscreen API */
function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggle = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, []);

  return {
    isFullscreen,
    toggle,
    supported: typeof document !== 'undefined' && !!document.fullscreenEnabled,
  };
}

/** Hide cursor after 10s inactivity, show on mousemove */
function useKioskMode() {
  const [hidden, setHidden] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const reset = () => {
      setHidden(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setHidden(true), 10000);
    };
    window.addEventListener('mousemove', reset);
    window.addEventListener('mousedown', reset);
    window.addEventListener('touchstart', reset);
    reset();
    return () => {
      window.removeEventListener('mousemove', reset);
      window.removeEventListener('mousedown', reset);
      window.removeEventListener('touchstart', reset);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return hidden;
}

// ============================================================
// Animation Styles
// ============================================================
function AnimationStyles() {
  return (
    <style>{`
      @keyframes marquee {
        0% { transform: translateX(100%); }
        100% { transform: translateX(-100%); }
      }
      .animate-marquee {
        display: inline-block;
        white-space: nowrap;
        animation: marquee 30s linear infinite;
      }
      .animate-marquee:hover {
        animation-play-state: paused;
      }
      @keyframes pulse-colon {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.2; }
      }
      .animate-pulse-colon {
        animation: pulse-colon 1s ease-in-out infinite;
      }
      @keyframes fadeInRow {
        0% { opacity: 0; transform: translateY(-6px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      .animate-fade-in-row {
        animation: fadeInRow 0.4s ease-out forwards;
      }
      @keyframes livePulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.4; transform: scale(1.4); }
      }
      .animate-live-dot {
        animation: livePulse 2s ease-in-out infinite;
      }
      .kiosk-cursor-hidden {
        cursor: none !important;
      }
      .kiosk-cursor-hidden * {
        cursor: none !important;
      }
    `}</style>
  );
}

// ============================================================
// 1. Station Selector Overlay
// ============================================================
function StationSelector({
  stations,
  onSelect,
  loadingStations,
}: {
  stations: Station[];
  onSelect: (station: Station) => void;
  loadingStations: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A] p-6">
      <div className="w-full max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10">
              <Bus className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-wide mb-2">
            SmartTicket Bus
          </h1>
          <h2 className="text-lg md:text-2xl text-white/60">
            Sélectionnez votre gare
          </h2>
        </div>

        {/* Station grid */}
        {loadingStations ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            <p className="mt-4 text-white/50 text-lg">Chargement des gares...</p>
          </div>
        ) : stations.length === 0 ? (
          <div className="text-center py-20">
            <WifiOff className="w-16 h-16 text-white/30 mx-auto mb-4" />
            <p className="text-white/50 text-xl">Aucune gare disponible</p>
            <p className="text-white/30 text-base mt-2">Vérifiez votre connexion internet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {stations.map((station) => (
              <button
                key={station.id}
                onClick={() => onSelect(station)}
                className="group flex flex-col items-start gap-3 p-6 lg:p-8 bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/30 rounded-2xl transition-all duration-200 text-left"
              >
                <div>
                  <h3 className="text-lg lg:text-2xl font-bold text-white group-hover:text-emerald-300 transition-colors">
                    {station.name}
                  </h3>
                  <p className="text-sm lg:text-base text-white/40 mt-1">
                    {station.city}
                  </p>
                </div>
                <span className="text-emerald-400/70 group-hover:text-emerald-300 text-sm font-medium">
                  Ouvrir l&apos;affichage →
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 2. Header
// ============================================================
function StationHeader({
  stationName,
  clock,
  dayName,
}: {
  stationName: string;
  clock: string;
  dayName: string;
}) {
  const [hours, minutes, seconds] = clock ? clock.split(':') : ['--', '--', '--'];

  return (
    <header className="flex items-center justify-between px-4 py-3 md:px-8 md:py-4 bg-[#0F172A] text-white select-none shrink-0">
      {/* Left: Logo */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center justify-center w-11 h-11 md:w-14 md:h-14 rounded-xl bg-white/10 shrink-0">
          <Bus className="w-6 h-6 md:w-8 md:h-8 text-white" />
        </div>
        <div className="hidden sm:block">
          <span className="text-base md:text-xl font-bold tracking-tight">SmartTicket</span>
        </div>
      </div>

      {/* Center: Station name */}
      <div className="absolute left-1/2 -translate-x-1/2 text-center px-4">
        <p className="text-xs md:text-sm text-white/50 font-medium uppercase tracking-widest">
          {dayName}
        </p>
        <h1 className="text-2xl md:text-3xl lg:text-5xl font-bold uppercase tracking-wide leading-tight truncate max-w-[55vw]">
          {stationName || 'Gare Routière'}
        </h1>
      </div>

      {/* Right: Clock + Live indicator */}
      <div className="flex items-center gap-3 md:gap-4 min-w-0">
        {/* Live dot + EN DIRECT */}
        <div className="hidden md:flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/30 rounded-full px-3 py-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-live-dot" />
          <span className="text-xs md:text-sm font-semibold text-emerald-300 uppercase tracking-wide">
            EN DIRECT
          </span>
        </div>

        {/* Clock with blinking colon */}
        <div className="flex items-center gap-0.5 bg-white/5 rounded-lg px-3 py-2 md:px-4 md:py-2.5 font-mono">
          <Clock className="w-4 h-4 md:w-5 md:h-5 text-white/40 mr-1.5" />
          <span className="text-xl md:text-2xl lg:text-4xl font-bold tabular-nums">{hours}</span>
          <span className="text-xl md:text-2xl lg:text-4xl font-bold animate-pulse-colon">:</span>
          <span className="text-xl md:text-2xl lg:text-4xl font-bold tabular-nums">{minutes}</span>
          <span className="text-xl md:text-2xl lg:text-4xl font-bold animate-pulse-colon">:</span>
          <span className="text-xl md:text-2xl lg:text-4xl font-bold tabular-nums text-white/70">{seconds}</span>
        </div>
      </div>
    </header>
  );
}

// ============================================================
// 3. Ticker / Bandeau Défilant
// ============================================================
function ScrollingTicker({ messages }: { messages: Message[] }) {
  if (!messages || messages.length === 0) return null;

  const priorityStyles: Record<string, string> = {
    urgent: 'bg-red-600 text-white',
    normal: 'bg-amber-500 text-white',
    info: 'bg-blue-600 text-white',
  };

  // Determine highest priority for background color
  const order = ['urgent', 'normal', 'info'];
  const highest = messages.reduce((h, m) => {
    return order.indexOf(m.priority) < order.indexOf(h) ? m.priority : h;
  }, 'info');

  // Join messages with "  •  " and duplicate for continuous scroll
  const text = messages.map((m) => m.text).join('  •  ');
  const duplicated = `${text}  •  ${text}`;

  return (
    <div className={`overflow-hidden shrink-0 ${priorityStyles[highest] || 'bg-blue-600 text-white'}`}>
      <div className="animate-marquee py-2.5 md:py-3">
        <span className="text-base md:text-xl font-semibold px-4">{duplicated}</span>
      </div>
    </div>
  );
}

// ============================================================
// Status Badge
// ============================================================
function StatusBadge({ status, delayMinutes }: { status: string; delayMinutes: number }) {
  if (status === 'on-time') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 md:px-4 md:py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-sm md:text-lg font-bold">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        À l&apos;heure
      </span>
    );
  }
  if (status === 'delayed') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 md:px-4 md:py-1.5 rounded-full bg-amber-100 text-amber-700 text-sm md:text-lg font-bold">
        Retard {delayMinutes}min
      </span>
    );
  }
  if (status === 'cancelled') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 md:px-4 md:py-1.5 rounded-full bg-red-100 text-red-600 text-sm md:text-lg font-bold">
        Annulé
      </span>
    );
  }
  if (status === 'departed') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 md:px-4 md:py-1.5 rounded-full bg-gray-100 text-gray-500 text-sm md:text-lg font-bold">
        Terminé
      </span>
    );
  }
  return null;
}

// ============================================================
// 4. Departures Table
// ============================================================
function DeparturesTable({
  departures,
  activeTab,
  onTabChange,
}: {
  departures: Departure[];
  activeTab: 'departure' | 'arrival';
  onTabChange: (tab: 'departure' | 'arrival') => void;
}) {
  return (
    <section className="flex-1 flex flex-col bg-white min-h-0 overflow-hidden">
      {/* Tab toggle */}
      <div className="flex items-center border-b-2 border-gray-200 px-4 md:px-8 shrink-0">
        <button
          onClick={() => onTabChange('departure')}
          className={`flex items-center gap-2 px-5 py-3 md:px-6 md:py-4 text-lg md:text-xl lg:text-2xl font-bold uppercase tracking-wide transition-colors ${
            activeTab === 'departure'
              ? 'text-[#0F172A] border-b-[3px] border-[#0F172A]'
              : 'text-gray-400 border-b-[3px] border-transparent hover:text-gray-600'
          }`}
        >
          <Bus className="w-5 h-5 md:w-6 md:h-6" />
          Départs
        </button>
        <button
          onClick={() => onTabChange('arrival')}
          className={`flex items-center gap-2 px-5 py-3 md:px-6 md:py-4 text-lg md:text-xl lg:text-2xl font-bold uppercase tracking-wide transition-colors ${
            activeTab === 'arrival'
              ? 'text-[#0F172A] border-b-[3px] border-[#0F172A]'
              : 'text-gray-400 border-b-[3px] border-transparent hover:text-gray-600'
          }`}
        >
          <Monitor className="w-5 h-5 md:w-6 md:h-6" />
          Arrivées
        </button>
      </div>

      {/* Table fills available space */}
      <div className="flex-1 overflow-auto">
        {departures.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 lg:py-24 text-gray-400">
            <Bus className="w-16 h-16 lg:w-20 lg:h-20 mb-4 opacity-30" />
            <p className="text-xl md:text-2xl lg:text-3xl font-semibold">
              Aucun départ prévu
            </p>
            <p className="text-base md:text-lg mt-2">
              Aucun {activeTab === 'arrival' ? 'arrivée' : 'départ'} prévu pour le moment
            </p>
          </div>
        ) : (
          <table className="w-full">
            {/* Header */}
            <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0 z-10">
              <tr>
                <th className="text-left px-4 md:px-6 py-3 md:py-4 text-sm md:text-base font-bold uppercase tracking-wider text-gray-500 border-b-2 border-gray-200 w-[14%]">
                  Heure
                </th>
                <th className="text-left px-4 md:px-6 py-3 md:py-4 text-sm md:text-base font-bold uppercase tracking-wider text-gray-500 border-b-2 border-gray-200 w-[12%]">
                  Ligne
                </th>
                <th className="text-left px-4 md:px-6 py-3 md:py-4 text-sm md:text-base font-bold uppercase tracking-wider text-gray-500 border-b-2 border-gray-200">
                  Destination
                </th>
                <th className="text-left px-4 md:px-6 py-3 md:py-4 text-sm md:text-base font-bold uppercase tracking-wider text-gray-500 border-b-2 border-gray-200 w-[13%]">
                  Quai
                </th>
                <th className="text-left px-4 md:px-6 py-3 md:py-4 text-sm md:text-base font-bold uppercase tracking-wider text-gray-500 border-b-2 border-gray-200 w-[18%]">
                  Statut
                </th>
              </tr>
            </thead>

            {/* Body */}
            <tbody>
              {departures.map((dep, index) => {
                const isCancelled = dep.status === 'cancelled';
                const isPast = dep.isPast || dep.status === 'departed';
                const isImminent = dep.isImminent && !isPast && !isCancelled;

                // Row classes
                let rowClasses = 'animate-fade-in-row';
                if (isCancelled) {
                  rowClasses += ' bg-red-100 text-red-600 line-through';
                } else if (isPast) {
                  rowClasses += ' opacity-40';
                } else if (isImminent) {
                  rowClasses += ' border-l-4 border-blue-500 bg-blue-50/50';
                } else {
                  rowClasses += ' hover:bg-gray-50';
                }

                const textMuted = isPast ? 'text-gray-400' : isCancelled ? 'text-red-600' : 'text-gray-900';

                return (
                  <tr
                    key={dep.id || `${dep.lineNumber}-${dep.scheduledTime}-${index}`}
                    className={`${rowClasses} transition-colors`}
                    style={{
                      animationDelay: `${index * 0.04}s`,
                      animationFillMode: 'both',
                    }}
                  >
                    {/* Time */}
                    <td className={`px-4 md:px-6 py-4 md:py-5 ${textMuted}`}>
                      <span className="text-lg md:text-xl lg:text-3xl font-bold font-mono tabular-nums">
                        {dep.estimatedTime}
                      </span>
                    </td>

                    {/* Line badge */}
                    <td className="px-4 md:px-6 py-4 md:py-5">
                      <span
                        className="inline-flex items-center justify-center w-9 h-9 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-lg text-white text-sm md:text-lg lg:text-xl font-black shrink-0"
                        style={{ backgroundColor: dep.lineColor || '#6b7280' }}
                      >
                        {dep.lineNumber}
                      </span>
                    </td>

                    {/* Destination */}
                    <td className={`px-4 md:px-6 py-4 md:py-5 ${textMuted}`}>
                      <span className="text-base md:text-lg lg:text-2xl font-semibold">
                        {dep.destination}
                      </span>
                    </td>

                    {/* Platform */}
                    <td className={`px-4 md:px-6 py-4 md:py-5 ${textMuted}`}>
                      <span className="text-base md:text-lg lg:text-2xl font-bold">
                        {dep.platform}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 md:px-6 py-4 md:py-5">
                      <StatusBadge status={dep.status} delayMinutes={dep.delayMinutes} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

// ============================================================
// 5. Footer
// ============================================================
function SignageFooter() {
  return (
    <footer className="flex items-center justify-between px-4 py-2.5 md:px-8 md:py-3.5 bg-[#0F172A] text-white/70 select-none shrink-0">
      {/* Left: Weather + WiFi */}
      <div className="flex items-center gap-3 md:gap-5">
        <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5 md:px-3 md:py-2">
          <span className="text-lg md:text-xl">🌤️</span>
          <span className="text-sm md:text-xl font-bold">28°C</span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-white/50">
          <Wifi className="w-4 h-4" />
          <span className="text-xs md:text-sm">WiFi Gratuit</span>
        </div>
      </div>

      {/* Center: Services + Welcome */}
      <div className="hidden md:flex flex-col items-center gap-0.5 text-center">
        <div className="flex items-center gap-4 md:gap-5 text-white/60">
          {/* WC */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs md:text-sm font-bold uppercase bg-white/10 rounded px-1.5 py-0.5">WC</span>
          </div>
          {/* Utensils */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs md:text-sm font-medium uppercase">🍽️ Restaurant</span>
          </div>
          {/* Phone */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs md:text-sm font-medium">📞 +221 77 XXX XX XX</span>
          </div>
        </div>
        <p className="text-[10px] md:text-xs text-white/40 italic">
          Bienvenue à bord des lignes SmartTicket Bus
        </p>
      </div>

      {/* Right placeholder for balance */}
      <div className="hidden lg:block w-32" />
    </footer>
  );
}

// ============================================================
// 6. Connection Lost Banner
// ============================================================
function ConnectionLostBanner() {
  return (
    <div className="flex items-center justify-center gap-3 px-4 py-2.5 md:py-3 bg-amber-500 text-white shrink-0">
      <WifiOff className="w-5 h-5 md:w-6 md:h-6" />
      <span className="text-sm md:text-lg font-bold">
        Connexion perdue — Dernières données connues
      </span>
    </div>
  );
}

// ============================================================
// 7. Fullscreen Button (bottom-right)
// ============================================================
function FullscreenButton() {
  const { isFullscreen, toggle, supported } = useFullscreen();

  if (!supported) return null;

  return (
    <button
      onClick={toggle}
      className="fixed bottom-6 right-6 z-40 flex items-center justify-center w-11 h-11 md:w-12 md:h-12 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-white/70 hover:text-white transition-all duration-200 shadow-lg border border-white/10 hover:border-white/20"
      aria-label={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
    >
      {isFullscreen ? (
        <Minimize2 className="w-5 h-5" />
      ) : (
        <Maximize2 className="w-5 h-5" />
      )}
    </button>
  );
}

// ============================================================
// Main Export
// ============================================================
export function DigitalSignage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center bg-[#0F172A]">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      }
    >
      <DigitalSignageInner />
    </Suspense>
  );
}

// ============================================================
// Inner Component (uses useSearchParams)
// ============================================================
function DigitalSignageInner() {
  const searchParams = useSearchParams();

  // State
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [activeTab, setActiveTab] = useState<'departure' | 'arrival'>('departure');
  const [loadingStations, setLoadingStations] = useState(true);

  // Hooks
  const clock = useRealTimeClock();
  const kioskHidden = useKioskMode();

  const stationId = selectedStation?.id || null;
  const { displayData, connectionLost, loading } = useDisplayPolling(stationId, activeTab);

  // ============================================================
  // Fetch stations list
  // ============================================================
  useEffect(() => {
    const fetchStations = async () => {
      try {
        const result = await apiFetch<Station[]>('/api/v1/public/stations');
        if (result.success && result.data) {
          setStations(result.data);
        }
      } catch {
        // stations unavailable
      } finally {
        setLoadingStations(false);
      }
    };
    fetchStations();
  }, []);

  // ============================================================
  // Determine station from URL param or localStorage
  // ============================================================
  useEffect(() => {
    // Priority 1: URL query param
    const urlStationId = searchParams.get('stationId');
    if (urlStationId && stations.length > 0) {
      const found = stations.find((s) => s.id === urlStationId);
      if (found) {
        setSelectedStation(found);
        localStorage.setItem('signage-station-id', found.id);
        return;
      }
    }

    // Priority 2: localStorage
    const savedId = localStorage.getItem('signage-station-id');
    if (savedId) {
      const found = stations.find((s) => s.id === savedId);
      if (found) {
        setSelectedStation(found);
        return;
      }
      // ID no longer valid, clear it
      localStorage.removeItem('signage-station-id');
    }
  }, [searchParams, stations]);

  // ============================================================
  // Station selection handler
  // ============================================================
  const handleStationSelect = useCallback((station: Station) => {
    setSelectedStation(station);
    localStorage.setItem('signage-station-id', station.id);
  }, []);

  // ============================================================
  // Show station selector if no station selected
  // ============================================================
  if (!selectedStation) {
    return (
      <>
        <AnimationStyles />
        <StationSelector
          stations={stations}
          onSelect={handleStationSelect}
          loadingStations={loadingStations}
        />
      </>
    );
  }

  // ============================================================
  // Loading state (no data yet)
  // ============================================================
  if (loading && !displayData) {
    return (
      <div className={`h-screen flex flex-col bg-[#0F172A] ${kioskHidden ? 'kiosk-cursor-hidden' : ''}`}>
        <AnimationStyles />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            <p className="text-white/60 text-lg md:text-2xl font-semibold">
              Chargement des départs...
            </p>
          </div>
        </div>
        <FullscreenButton />
      </div>
    );
  }

  // Derive data
  const stationName = displayData?.station?.name || selectedStation.name;
  const dayName = displayData?.dayName || (() => {
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    return days[new Date().getDay()];
  })();
  const departures = displayData?.departures || [];
  const messages = displayData?.messages || [];

  return (
    <div
      className={`h-screen max-h-screen overflow-hidden flex flex-col bg-white ${kioskHidden ? 'kiosk-cursor-hidden' : ''}`}
    >
      <AnimationStyles />

      {/* Connection Lost Banner */}
      {connectionLost && <ConnectionLostBanner />}

      {/* 2. Header */}
      <StationHeader stationName={stationName} clock={clock} dayName={dayName} />

      {/* 3. Ticker */}
      <ScrollingTicker messages={messages} />

      {/* 4. Departures Table */}
      <DeparturesTable
        departures={departures}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* 5. Footer */}
      <SignageFooter />

      {/* 7. Fullscreen Button */}
      <FullscreenButton />
    </div>
  );
}
