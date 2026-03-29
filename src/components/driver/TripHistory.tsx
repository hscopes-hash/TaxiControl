'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Calendar,
  DollarSign,
  Route,
  Filter,
  Inbox,
  ArrowRight,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import type { Trip, TripStatus } from '@/lib/store';

import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

type FilterStatus = 'ALL' | 'FINALIZADA' | 'CANCELADA' | 'EM_ANDAMENTO';

const filterOptions: { value: FilterStatus; label: string }[] = [
  { value: 'ALL', label: 'Todas' },
  { value: 'FINALIZADA', label: 'Finalizadas' },
  { value: 'CANCELADA', label: 'Canceladas' },
  { value: 'EM_ANDAMENTO', label: 'Em Andamento' },
];

function getStatusBadge(status: TripStatus) {
  switch (status) {
    case 'FINALIZADA':
      return (
        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
          Finalizada
        </Badge>
      );
    case 'CANCELADA':
      return (
        <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200">
          Cancelada
        </Badge>
      );
    case 'EM_ANDAMENTO':
      return (
        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200">
          Em Andamento
        </Badge>
      );
    default:
      return null;
  }
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTimeOnly(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function TripHistory() {
  const { user } = useAuthStore();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('ALL');

  useEffect(() => {
    async function fetchTrips() {
      if (!user?.id) return;

      try {
        const res = await fetch(`/api/trips?driverId=${user.id}`);
        const data = await res.json();
        setTrips(data.trips ?? []);
      } catch (err) {
        console.error('Erro ao carregar histórico:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchTrips();
  }, [user?.id]);

  const filteredTrips = useMemo(() => {
    if (activeFilter === 'ALL') return trips;
    return trips.filter((t) => t.status === activeFilter);
  }, [trips, activeFilter]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* ── Header ───────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
          <Calendar className="size-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Histórico</h2>
          <p className="text-xs text-gray-500">
            {trips.length} corrida{trips.length !== 1 ? 's' : ''} registrada{trips.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* ── Filter Tabs ─────────────────────────────── */}
      <Card className="border-0 shadow-sm py-3 px-4">
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-gray-400 shrink-0" />
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {filterOptions.map((opt) => (
              <Button
                key={opt.value}
                variant={activeFilter === opt.value ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveFilter(opt.value)}
                className={`text-xs shrink-0 ${
                  activeFilter === opt.value
                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* ── Loading State ───────────────────────────── */}
      {loading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      )}

      {/* ── Empty State ─────────────────────────────── */}
      {!loading && filteredTrips.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="border-0 shadow-sm">
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                <Inbox className="size-7" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  {activeFilter === 'ALL'
                    ? 'Nenhuma corrida encontrada'
                    : `Nenhuma corrida ${
                        activeFilter === 'FINALIZADA'
                          ? 'finalizada'
                          : activeFilter === 'CANCELADA'
                          ? 'cancelada'
                          : 'em andamento'
                      }`}
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  Suas corridas aparecerão aqui.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Trip List ───────────────────────────────── */}
      {!loading && filteredTrips.length > 0 && (
        <div className="max-h-[calc(100vh-12rem)] overflow-y-auto space-y-3 pr-1">
          <AnimatePresence mode="popLayout">
            {filteredTrips.map((trip, index) => (
              <motion.div
                key={trip.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25, delay: index * 0.03 }}
              >
                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="py-4 space-y-3">
                    {/* Route */}
                    <div className="flex items-start gap-2.5">
                      <div className="flex flex-col items-center gap-1 pt-0.5">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <div className="h-6 w-px bg-gray-200" />
                        <div className="h-2 w-2 rounded-full bg-red-500" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {trip.origin}
                        </p>
                        <div className="flex items-center gap-1 text-gray-300">
                          <ArrowRight className="size-3" />
                        </div>
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {trip.destination}
                        </p>
                      </div>
                    </div>

                    <Separator />

                    {/* Meta row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Route className="size-3" />
                          <span>{trip.distanceKm.toFixed(1)} km</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs font-semibold text-green-600">
                          <DollarSign className="size-3" />
                          <span>R$ {trip.fareAmount.toFixed(2)}</span>
                        </div>
                      </div>
                      {getStatusBadge(trip.status)}
                    </div>

                    {/* Departure / Arrival */}
                    <div className="flex items-center gap-4 text-[11px] text-gray-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        <span>Partida: {formatTimeOnly(trip.startedAt)}</span>
                      </div>
                      {trip.endedAt && (
                        <div className="flex items-center gap-1">
                          <Calendar className="size-3" />
                          <span>Chegada: {formatTimeOnly(trip.endedAt)}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
