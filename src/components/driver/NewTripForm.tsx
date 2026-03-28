'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  MapPin,
  Navigation,
  DollarSign,
  Play,
  Route,
  Loader2,
  ArrowRight,
  Calculator,
} from 'lucide-react';
import { useAuthStore, useNavStore, useTripStore } from '@/lib/store';
import type { AppSettings, Trip } from '@/lib/store';
import { toast } from 'sonner';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

export default function NewTripForm() {
  const { user } = useAuthStore();
  const { setDriverTab } = useNavStore();
  const { setCurrentTrip } = useTripStore();

  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [distanceKm, setDistanceKm] = useState('');
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingSettings, setFetchingSettings] = useState(true);

  // Fetch settings on mount
  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        setSettings(data.settings ?? null);
      } catch (err) {
        console.error('Erro ao carregar configurações:', err);
        toast.error('Erro ao carregar tarifa atual');
      } finally {
        setFetchingSettings(false);
      }
    }
    fetchSettings();
  }, []);

  // Calculate fare
  const fare = useMemo(() => {
    if (!settings || !distanceKm) return null;
    const km = parseFloat(distanceKm);
    if (isNaN(km) || km <= 0) return null;
    return Math.round((settings.flagRate + km * settings.pricePerKm) * 100) / 100;
  }, [settings, distanceKm]);

  const canSubmit =
    origin.trim().length > 0 &&
    destination.trim().length > 0 &&
    distanceKm &&
    parseFloat(distanceKm) > 0 &&
    fare !== null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id || !canSubmit) return;

    setLoading(true);

    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: user.id,
          origin: origin.trim(),
          destination: destination.trim(),
          distanceKm: parseFloat(distanceKm),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? 'Erro ao criar corrida');
      }

      const trip = data.trip as Trip;
      setCurrentTrip(trip);
      toast.success('Corrida iniciada com sucesso!');
      setDriverTab('active');
    } catch (err) {
      console.error('Erro ao criar corrida:', err);
      toast.error(err instanceof Error ? err.message : 'Erro ao criar corrida');
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* ── Page Title ───────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
          <Navigation className="size-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Nova Corrida</h2>
          <p className="text-xs text-gray-500">
            Preencha os dados para iniciar uma nova corrida
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ── Route Info Card ────────────────────────── */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MapPin className="size-4 text-amber-500" />
              Informações da Rota
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Origin */}
            <div className="space-y-2">
              <Label htmlFor="origin" className="text-xs font-medium text-gray-600">
                Ponto de Partida
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-green-500" />
                <Input
                  id="origin"
                  type="text"
                  placeholder="Ex: Rua Augusta, 1200"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            {/* Destination */}
            <div className="space-y-2">
              <Label htmlFor="destination" className="text-xs font-medium text-gray-600">
                Destino
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-red-500" />
                <Input
                  id="destination"
                  type="text"
                  placeholder="Ex: Aeroporto de Congonhas"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            {/* Distance */}
            <div className="space-y-2">
              <Label htmlFor="distance" className="text-xs font-medium text-gray-600">
                Distância (km)
              </Label>
              <div className="relative">
                <Route className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-blue-500" />
                <Input
                  id="distance"
                  type="number"
                  step="0.1"
                  min="0.1"
                  placeholder="Ex: 12.5"
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Fare Preview Card ──────────────────────── */}
        {canSubmit && fare !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
          >
            <Card className="border-2 border-amber-300 bg-amber-50 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-800">
                  <Calculator className="size-4 text-amber-600" />
                  Previsão de Tarifa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Route visualization */}
                <div className="flex items-center gap-2 rounded-lg bg-white/70 p-3">
                  <div className="flex flex-col items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <div className="h-6 w-px bg-gray-300" />
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="text-xs text-gray-600 truncate">{origin}</p>
                    <ArrowRight className="size-3 text-gray-400" />
                    <p className="text-xs text-gray-600 truncate">{destination}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      {parseFloat(distanceKm).toFixed(1)} km
                    </p>
                  </div>
                </div>

                <Separator className="bg-amber-200" />

                {/* Fare breakdown */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Bandeirada</span>
                    <span className="font-medium text-gray-900">
                      R$ {settings?.flagRate.toFixed(2) ?? '—'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">
                      Distância ({parseFloat(distanceKm).toFixed(1)} km × R${' '}
                      {settings?.pricePerKm.toFixed(2) ?? '—'}/km)
                    </span>
                    <span className="font-medium text-gray-900">
                      R$ {(parseFloat(distanceKm) * (settings?.pricePerKm ?? 0)).toFixed(2)}
                    </span>
                  </div>
                  <Separator className="bg-amber-200" />
                  <div className="flex justify-between">
                    <span className="text-sm font-semibold text-amber-800">
                      Total Estimado
                    </span>
                    <div className="flex items-center gap-1">
                      <DollarSign className="size-4 text-amber-600" />
                      <span className="text-xl font-bold text-amber-700">
                        {fare.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── Settings Loading ───────────────────────── */}
        {fetchingSettings && (
          <Card className="border-0 shadow-sm">
            <CardContent className="flex items-center gap-2 py-4 text-sm text-gray-500">
              <Loader2 className="size-4 animate-spin" />
              Carregando tarifas...
            </CardContent>
          </Card>
        )}

        {/* ── Submit Button ──────────────────────────── */}
        <Button
          type="submit"
          disabled={!canSubmit || loading || fetchingSettings}
          className="w-full h-12 text-base font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-200 transition-all"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="size-5 animate-spin" />
              Iniciando...
            </>
          ) : (
            <>
              <Play className="size-5" />
              Iniciar Corrida
            </>
          )}
        </Button>
      </form>
    </motion.div>
  );
}
