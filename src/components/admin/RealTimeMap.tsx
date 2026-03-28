'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, RefreshCw, Wifi, WifiOff, Car } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/lib/store';

// ── Types ──────────────────────────────────────────────
interface DriverLocation {
  id: string;
  latitude: number;
  longitude: number;
  driverId: string;
  driver: {
    id: string;
    name: string;
    licensePlate?: string;
  };
  updatedAt: string;
}

// ── CSS for map grid background ───────────────────────
const mapGridStyle: React.CSSProperties = {
  backgroundColor: '#1a1a2e',
  backgroundImage:
    'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
  backgroundSize: '30px 30px',
};

// ── Time formatter ────────────────────────────────────
function timeAgo(dateStr: string): string {
  const now = new Date();
  const updated = new Date(dateStr);
  const diffMs = now.getTime() - updated.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);

  if (diffSec < 10) return 'agora';
  if (diffSec < 60) return `${diffSec}s atrás`;
  if (diffMin < 60) return `${diffMin}min atrás`;
  return `${Math.floor(diffMin / 60)}h atrás`;
}

function formatTime(dateStr: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(dateStr));
}

// ── Map Marker ────────────────────────────────────────
function MapMarker({
  location,
  index,
  onClick,
}: {
  location: DriverLocation;
  index: number;
  onClick: () => void;
}) {
  // Distribute markers in a visually appealing way on the SVG canvas
  // Use latitude/longitude to determine position (normalized)
  const baseLat = -23.55; // São Paulo center as reference
  const baseLng = -46.63;
  const latOffset = (location.latitude - baseLat) * 5000;
  const lngOffset = (location.longitude - baseLng) * 5000;

  // Clamp to visible area with some randomness based on index
  const x = 10 + ((index * 137.5) % 80) + (latOffset % 15);
  const y = 10 + ((index * 97.3) % 70) + (lngOffset % 15);

  return (
    <g
      className="cursor-pointer"
      onClick={onClick}
    >
      {/* Pulse ring */}
      <motion.circle
        cx={x}
        cy={y}
        r={12}
        fill="rgba(245, 158, 11, 0.15)"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{
          scale: [1, 1.8, 1],
          opacity: [0.6, 0, 0.6],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: index * 0.3,
        }}
        style={{ transformOrigin: `${x}px ${y}px` }}
      />
      {/* Outer glow */}
      <circle
        cx={x}
        cy={y}
        r={10}
        fill="rgba(245, 158, 11, 0.2)"
        stroke="rgba(245, 158, 11, 0.4)"
        strokeWidth={1}
      />
      {/* Inner dot */}
      <circle
        cx={x}
        cy={y}
        r={5}
        fill="#f59e0b"
        stroke="#fbbf24"
        strokeWidth={2}
      />
      {/* Car icon indicator */}
      <text
        x={x}
        y={y + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        className="pointer-events-none"
        fontSize={7}
        fill="white"
        fontWeight="bold"
      >
        🚕
      </text>
    </g>
  );
}

// ── Info Tooltip ──────────────────────────────────────
function DriverInfoPanel({
  location,
  onClose,
}: {
  location: DriverLocation;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 5 }}
      className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-72 bg-card border border-border/50 rounded-xl p-4 shadow-xl z-10"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10">
            <Car className="h-4 w-4 text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {location.driver.name}
            </p>
            {location.driver.licensePlate && (
              <p className="text-xs text-muted-foreground font-mono">
                {location.driver.licensePlate}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-muted/50 rounded-lg p-2">
          <p className="text-muted-foreground">Latitude</p>
          <p className="font-mono font-medium text-foreground">
            {location.latitude.toFixed(6)}
          </p>
        </div>
        <div className="bg-muted/50 rounded-lg p-2">
          <p className="text-muted-foreground">Longitude</p>
          <p className="font-mono font-medium text-foreground">
            {location.longitude.toFixed(6)}
          </p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Última atualização: {formatTime(location.updatedAt)} ({timeAgo(location.updatedAt)})
      </p>
    </motion.div>
  );
}

// ── Main Component ─────────────────────────────────────
export default function RealTimeMap() {
  const { token } = useAuthStore();
  const [locations, setLocations] = useState<DriverLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<DriverLocation | null>(
    null
  );
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // ── Fetch locations ───────────────────────────────
  const fetchLocations = useCallback(async () => {
    try {
      const res = await fetch('/api/location');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setLocations(data.locations || []);
      setLastUpdate(new Date());
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Poll every 5 seconds ──────────────────────────
  useEffect(() => {
    fetchLocations();
    intervalRef.current = setInterval(fetchLocations, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchLocations]);

  // ── Refresh countdown visual ──────────────────────
  const [refreshProgress, setRefreshProgress] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshProgress((prev) => (prev >= 100 ? 0 : prev + 2));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Mapa em Tempo Real
          </h2>
          <p className="text-sm text-muted-foreground">
            Acompanhe a posição dos motoristas ativos
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Connection status */}
          <div className="flex items-center gap-2 text-xs">
            {error ? (
              <>
                <WifiOff className="h-3.5 w-3.5 text-red-500" />
                <span className="text-red-500 font-medium">Desconectado</span>
              </>
            ) : (
              <>
                <Wifi className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-emerald-500 font-medium">Conectado</span>
              </>
            )}
          </div>

          {/* Refresh button */}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLocations}
            className="gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Map Card */}
      <Card className="border-border/50 overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <Skeleton className="h-[500px] w-full rounded-none" />
          ) : (
            <div className="relative">
              {/* Map visualization */}
              <div
                className="relative overflow-hidden"
                style={{ height: '500px', ...mapGridStyle }}
              >
                {/* Decorative road lines */}
                <svg
                  className="absolute inset-0 w-full h-full"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Horizontal roads */}
                  <line
                    x1="0"
                    y1="25%"
                    x2="100%"
                    y2="25%"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth={2}
                    strokeDasharray="10 5"
                  />
                  <line
                    x1="0"
                    y1="50%"
                    x2="100%"
                    y2="50%"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth={2}
                    strokeDasharray="10 5"
                  />
                  <line
                    x1="0"
                    y1="75%"
                    x2="100%"
                    y2="75%"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth={2}
                    strokeDasharray="10 5"
                  />
                  {/* Vertical roads */}
                  <line
                    x1="25%"
                    y1="0"
                    x2="25%"
                    y2="100%"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth={2}
                    strokeDasharray="10 5"
                  />
                  <line
                    x1="50%"
                    y1="0"
                    x2="50%"
                    y2="100%"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth={2}
                    strokeDasharray="10 5"
                  />
                  <line
                    x1="75%"
                    y1="0"
                    x2="75%"
                    y2="100%"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth={2}
                    strokeDasharray="10 5"
                  />
                  {/* Decorative blocks */}
                  <rect
                    x="27%"
                    y="27%"
                    width="21%"
                    height="21%"
                    rx={4}
                    fill="rgba(255,255,255,0.02)"
                    stroke="rgba(255,255,255,0.04)"
                    strokeWidth={1}
                  />
                  <rect
                    x="52%"
                    y="27%"
                    width="21%"
                    height="21%"
                    rx={4}
                    fill="rgba(255,255,255,0.02)"
                    stroke="rgba(255,255,255,0.04)"
                    strokeWidth={1}
                  />
                  <rect
                    x="27%"
                    y="52%"
                    width="21%"
                    height="21%"
                    rx={4}
                    fill="rgba(255,255,255,0.02)"
                    stroke="rgba(255,255,255,0.04)"
                    strokeWidth={1}
                  />
                  <rect
                    x="52%"
                    y="52%"
                    width="21%"
                    height="21%"
                    rx={4}
                    fill="rgba(255,255,255,0.02)"
                    stroke="rgba(255,255,255,0.04)"
                    strokeWidth={1}
                  />
                </svg>

                {/* Driver markers */}
                {locations.length > 0 && (
                  <svg
                    className="absolute inset-0 w-full h-full"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    <AnimatePresence>
                      {locations.map((loc, i) => (
                        <MapMarker
                          key={loc.driverId}
                          location={loc}
                          index={i}
                          onClick={() => setSelectedDriver(loc)}
                        />
                      ))}
                    </AnimatePresence>
                  </svg>
                )}

                {/* Empty state overlay */}
                {locations.length === 0 && !error && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/5 mb-4 mx-auto">
                        <Car className="h-10 w-10 text-white/20" />
                      </div>
                      <h3 className="text-lg font-semibold text-white/60 mb-1">
                        Nenhum motorista ativo
                      </h3>
                      <p className="text-sm text-white/30 max-w-xs mx-auto">
                        Motoristas aparecerão no mapa quando estiverem online e
                        compartilhando sua localização.
                      </p>
                    </motion.div>
                  </div>
                )}

                {/* Error state overlay */}
                {error && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 mb-4 mx-auto">
                        <WifiOff className="h-10 w-10 text-red-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-white/60 mb-1">
                        Erro de conexão
                      </h3>
                      <p className="text-sm text-white/30 max-w-xs mx-auto">
                        Não foi possível carregar os dados de localização. Tente
                        novamente.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchLocations}
                        className="mt-4 gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Tentar Novamente
                      </Button>
                    </motion.div>
                  </div>
                )}

                {/* Selected driver info panel */}
                <AnimatePresence>
                  {selectedDriver && (
                    <DriverInfoPanel
                      location={selectedDriver}
                      onClose={() => setSelectedDriver(null)}
                    />
                  )}
                </AnimatePresence>
              </div>

              {/* Bottom status bar */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm border-t border-white/10 px-4 py-2">
                <div className="flex items-center justify-between text-xs text-white/70">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                      {locations.length} motorista
                      {locations.length !== 1 ? 's' : ''} ativo
                      {locations.length !== 1 ? 's' : ''}
                    </span>
                    <span className="hidden sm:inline">|</span>
                    <span className="hidden sm:inline">
                      Atualização automática a cada 5s
                    </span>
                  </div>
                  {lastUpdate && (
                    <span>
                      Última atualização:{' '}
                      {lastUpdate.toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  )}
                </div>
                {/* Refresh progress bar */}
                <div className="absolute top-0 left-0 h-0.5 bg-amber-500/40 transition-all duration-100"
                  style={{ width: `${refreshProgress}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Driver list below map */}
      {locations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-border/50">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-amber-500" />
                Motoristas Ativos
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {locations.map((loc) => (
                  <button
                    key={loc.driverId}
                    onClick={() => setSelectedDriver(loc)}
                    className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 ${
                      selectedDriver?.driverId === loc.driverId
                        ? 'border-amber-500/50 bg-amber-500/5'
                        : 'border-border/40'
                    }`}
                  >
                    <div className="relative">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10">
                        <Car className="h-4 w-4 text-amber-500" />
                      </div>
                      <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-card" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-foreground">
                        {loc.driver.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {loc.driver.licensePlate || 'Sem placa'} ·{' '}
                        {timeAgo(loc.updatedAt)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
