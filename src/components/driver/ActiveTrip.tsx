'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  MapPin,
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  Navigation,
  Loader2,
  Receipt,
  ArrowRight,
  Printer,
  Route,
} from 'lucide-react';
import { useAuthStore, useNavStore, useTripStore } from '@/lib/store';
import type { Trip } from '@/lib/store';
import { toast } from 'sonner';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
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

export default function ActiveTrip() {
  const { user } = useAuthStore();
  const { setDriverTab } = useNavStore();
  const { currentTrip, setCurrentTrip } = useTripStore();

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [finalizing, setFinalizing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [finalizedTrip, setFinalizedTrip] = useState<Trip | null>(null);

  // Elapsed time counter
  useEffect(() => {
    if (!currentTrip) {
      setElapsedSeconds(0);
      return;
    }

    const start = new Date(currentTrip.startedAt).getTime();
    const now = Date.now();
    setElapsedSeconds(Math.floor((now - start) / 1000));

    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - start) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [currentTrip]);

  const handleFinalize = useCallback(async () => {
    if (!currentTrip) return;

    setFinalizing(true);
    try {
      const res = await fetch('/api/trips', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId: currentTrip.id, status: 'FINALIZADA' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erro ao finalizar');

      const trip = data.trip as Trip;
      setFinalizedTrip(trip);
      setCurrentTrip(null);
      toast.success('Corrida finalizada com sucesso!');
      setDriverTab('dashboard');
      setReceiptOpen(true);
    } catch (err) {
      console.error('Erro ao finalizar:', err);
      toast.error(err instanceof Error ? err.message : 'Erro ao finalizar corrida');
    } finally {
      setFinalizing(false);
    }
  }, [currentTrip, setCurrentTrip, setDriverTab]);

  const handleCancel = useCallback(async () => {
    if (!currentTrip) return;

    setCancelling(true);
    try {
      const res = await fetch('/api/trips', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId: currentTrip.id, status: 'CANCELADA' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erro ao cancelar');

      setCurrentTrip(null);
      toast.info('Corrida cancelada.');
      setDriverTab('dashboard');
    } catch (err) {
      console.error('Erro ao cancelar:', err);
      toast.error(err instanceof Error ? err.message : 'Erro ao cancelar corrida');
    } finally {
      setCancelling(false);
    }
  }, [currentTrip, setCurrentTrip, setDriverTab]);

  // No active trip state
  if (!currentTrip) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-400">
              <Navigation className="size-8" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                Nenhuma corrida ativa
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Toque em &quot;Nova Corrida&quot; para iniciar uma viagem.
              </p>
            </div>
            <Button
              onClick={() => setDriverTab('new')}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              <Navigation className="size-4" />
              Nova Corrida
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* ── Header ───────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-600">
          <Navigation className="size-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Corrida em Andamento</h2>
          <p className="text-xs text-gray-500">
            Acompanhe sua corrida em tempo real
          </p>
        </div>
      </div>

      {/* ── GPS Tracking Map Placeholder ────────────── */}
      <Card className="overflow-hidden border-0 shadow-sm">
        <div className="relative h-48 bg-gradient-to-br from-green-50 to-blue-50">
          {/* Road grid lines */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute left-1/4 top-0 bottom-0 w-px bg-gray-500" />
            <div className="absolute left-2/4 top-0 bottom-0 w-px bg-gray-500" />
            <div className="absolute left-3/4 top-0 bottom-0 w-px bg-gray-500" />
            <div className="absolute top-1/3 left-0 right-0 h-px bg-gray-500" />
            <div className="absolute top-2/3 left-0 right-0 h-px bg-gray-500" />
          </div>

          {/* Route line */}
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 300 192"
            fill="none"
          >
            <path
              d="M 60 160 Q 150 40 240 50"
              stroke="#f59e0b"
              strokeWidth="3"
              strokeDasharray="8 4"
              className="animate-pulse"
            />
          </svg>

          {/* Origin marker */}
          <div className="absolute bottom-8 left-12 flex flex-col items-center">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-white shadow-md">
              <MapPin className="size-3" />
            </div>
            <span className="mt-1 rounded bg-green-500 px-1.5 py-0.5 text-[10px] font-medium text-white">
              Partida
            </span>
          </div>

          {/* Pulsing current position */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="absolute -inset-4 rounded-full bg-amber-400/30 animate-ping" />
            <div className="absolute -inset-2 rounded-full bg-amber-400/50 animate-pulse" />
            <div className="relative flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 shadow-lg">
              <Navigation className="size-3 text-white" />
            </div>
          </div>

          {/* Destination marker */}
          <div className="absolute right-12 top-6 flex flex-col items-center">
            <span className="mb-1 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-medium text-white">
              Destino
            </span>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-md">
              <MapPin className="size-3" />
            </div>
          </div>

          {/* Elapsed time overlay */}
          <div className="absolute right-3 bottom-3 rounded-lg bg-black/60 px-3 py-1.5 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 text-white">
              <Clock className="size-3.5" />
              <span className="font-mono text-sm font-bold">
                {formatElapsed(elapsedSeconds)}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Trip Details Card ────────────────────────── */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Route className="size-4 text-amber-500" />
            Detalhes da Corrida
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Route */}
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center gap-1 pt-1">
              <div className="h-2.5 w-2.5 rounded-full border-2 border-green-500 bg-white" />
              <div className="h-8 w-px bg-gray-300" />
              <div className="h-2.5 w-2.5 rounded-full border-2 border-red-500 bg-white" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-xs text-gray-500">Origem</p>
                <p className="text-sm font-medium text-gray-900">
                  {currentTrip.origin}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Destino</p>
                <p className="text-sm font-medium text-gray-900">
                  {currentTrip.destination}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Info grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-gray-50 p-2.5 text-center">
              <p className="text-[10px] text-gray-500 uppercase">Distância</p>
              <p className="mt-0.5 text-sm font-bold text-gray-900">
                {currentTrip.distanceKm.toFixed(1)} km
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-2.5 text-center">
              <p className="text-[10px] text-gray-500 uppercase">Tarifa</p>
              <p className="mt-0.5 text-sm font-bold text-green-600">
                R$ {currentTrip.fareAmount.toFixed(2)}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-2.5 text-center">
              <p className="text-[10px] text-gray-500 uppercase">Tempo</p>
              <p className="mt-0.5 text-sm font-bold text-gray-900">
                {formatElapsed(elapsedSeconds)}
              </p>
            </div>
          </div>

          <Separator />

          {/* Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                Em andamento
              </Badge>
            </div>
            <p className="text-xs text-gray-400">
              Partida: {formatDateTime(currentTrip.startedAt)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Action Buttons ──────────────────────────── */}
      <div className="space-y-3">
        <Button
          onClick={handleFinalize}
          disabled={finalizing}
          className="w-full h-14 text-base font-bold bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-200 transition-all"
          size="lg"
        >
          {finalizing ? (
            <>
              <Loader2 className="size-5 animate-spin" />
              Finalizando...
            </>
          ) : (
            <>
              <CheckCircle className="size-5" />
              Finalizar Corrida
            </>
          )}
        </Button>

        <Button
          onClick={handleCancel}
          disabled={cancelling}
          variant="outline"
          className="w-full h-11 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          {cancelling ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Cancelando...
            </>
          ) : (
            <>
              <XCircle className="size-4" />
              Cancelar Corrida
            </>
          )}
        </Button>
      </div>

      {/* ── Receipt Dialog ──────────────────────────── */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="print:hidden sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="size-5 text-green-600" />
              Recibo da Corrida
            </DialogTitle>
            <DialogDescription>
              Sua corrida foi finalizada com sucesso.
            </DialogDescription>
          </DialogHeader>

          {finalizedTrip && (
            <div className="rounded-lg border bg-gray-50 p-4 space-y-3">
              <div className="text-center">
                <p className="text-xs text-gray-500">Valor Total</p>
                <p className="text-3xl font-bold text-green-600">
                  R$ {finalizedTrip.fareAmount.toFixed(2)}
                </p>
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Origem</span>
                  <span className="font-medium text-gray-900 truncate ml-4 text-right">
                    {finalizedTrip.origin}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Destino</span>
                  <span className="font-medium text-gray-900 truncate ml-4 text-right">
                    {finalizedTrip.destination}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Distância</span>
                  <span className="font-medium text-gray-900">
                    {finalizedTrip.distanceKm.toFixed(1)} km
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Partida</span>
                  <span className="font-medium text-gray-900">
                    {formatDateTime(finalizedTrip.startedAt)}
                  </span>
                </div>
                {finalizedTrip.endedAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Chegada</span>
                    <span className="font-medium text-gray-900">
                      {formatDateTime(finalizedTrip.endedAt)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Motorista</span>
                  <span className="font-medium text-gray-900">
                    {user?.name ?? '—'}
                  </span>
                </div>
              </div>

              <Separator />

              <p className="text-center text-[10px] text-gray-400">
                TaxiControl Pro — Gerado em {new Date().toLocaleString('pt-BR')}
              </p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setReceiptOpen(false)}
              className="flex-1"
            >
              Fechar
            </Button>
            <Button
              onClick={() => window.print()}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
            >
              <Printer className="size-4" />
              Imprimir Recibo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Print-only receipt ──────────────────────── */}
      {finalizedTrip && (
        <div className="hidden print:block p-8">
          <div className="mx-auto max-w-sm space-y-4 border p-6">
            <div className="text-center">
              <h1 className="text-xl font-bold">TaxiControl Pro</h1>
              <p className="text-xs text-gray-500">Recibo de Corrida</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">
                R$ {finalizedTrip.fareAmount.toFixed(2)}
              </p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between border-b pb-1">
                <span>Origem</span>
                <span className="font-medium">{finalizedTrip.origin}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span>Destino</span>
                <span className="font-medium">{finalizedTrip.destination}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span>Distância</span>
                <span className="font-medium">{finalizedTrip.distanceKm.toFixed(1)} km</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span>Partida</span>
                <span className="font-medium">{formatDateTime(finalizedTrip.startedAt)}</span>
              </div>
              {finalizedTrip.endedAt && (
                <div className="flex justify-between border-b pb-1">
                  <span>Chegada</span>
                  <span className="font-medium">{formatDateTime(finalizedTrip.endedAt)}</span>
                </div>
              )}
              <div className="flex justify-between border-b pb-1">
                <span>Motorista</span>
                <span className="font-medium">{user?.name ?? '—'}</span>
              </div>
            </div>
            <p className="text-center text-[10px] text-gray-400">
              TaxiControl Pro — {new Date().toLocaleString('pt-BR')}
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}
