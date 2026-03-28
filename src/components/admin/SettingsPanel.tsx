'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  DollarSign,
  Calculator,
  Save,
  Car,
  Route,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

// ── Formatters ─────────────────────────────────────────
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

// ── Main Component ─────────────────────────────────────
export default function SettingsPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [flagRate, setFlagRate] = useState<number>(5.5);
  const [pricePerKm, setPricePerKm] = useState<number>(3.2);

  // ── Fetch settings ─────────────────────────────────
  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.settings) {
          setFlagRate(data.settings.flagRate);
          setPricePerKm(data.settings.pricePerKm);
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error);
        toast.error('Erro ao carregar configurações');
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  // ── Calculate fare example ─────────────────────────
  const fareExample = useMemo(() => {
    const exampleKm = 10;
    const total = flagRate + exampleKm * pricePerKm;
    return {
      km: exampleKm,
      total,
      formatted: formatCurrency(total),
      flagFormatted: formatCurrency(flagRate),
      perKmFormatted: formatCurrency(pricePerKm),
    };
  }, [flagRate, pricePerKm]);

  // ── Save settings ──────────────────────────────────
  const handleSave = async () => {
    if (flagRate <= 0 || pricePerKm <= 0) {
      toast.error('Os valores devem ser maiores que zero');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flagRate, pricePerKm }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Erro ao salvar');

      toast.success('Configurações salvas com sucesso!');
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : 'Erro ao salvar configurações';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Configurações
        </h2>
        <p className="text-sm text-muted-foreground">
          Gerencie os valores de tarifação da frota
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Pricing Settings ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-border/50 relative overflow-hidden">
            {/* Amber accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-amber-400" />

            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="h-4 w-4 text-amber-500" />
                Tarifação
              </CardTitle>
              <CardDescription>
                Defina os valores base para o cálculo das corridas
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Flag Rate */}
              <div className="space-y-2">
                <Label htmlFor="flag-rate" className="text-sm font-medium">
                  Valor da Bandeirada (R$)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    R$
                  </span>
                  <Input
                    id="flag-rate"
                    type="number"
                    step="0.10"
                    min="0"
                    value={flagRate}
                    onChange={(e) =>
                      setFlagRate(parseFloat(e.target.value) || 0)
                    }
                    className="pl-9 text-lg font-semibold"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Valor fixo cobrado no início de cada corrida
                </p>
              </div>

              <Separator />

              {/* Price per KM */}
              <div className="space-y-2">
                <Label htmlFor="price-per-km" className="text-sm font-medium">
                  Valor por Km (R$)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    R$
                  </span>
                  <Input
                    id="price-per-km"
                    type="number"
                    step="0.10"
                    min="0"
                    value={pricePerKm}
                    onChange={(e) =>
                      setPricePerKm(parseFloat(e.target.value) || 0)
                    }
                    className="pl-9 text-lg font-semibold"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Valor cobrado por quilômetro rodado
                </p>
              </div>

              <Separator />

              {/* Save Button */}
              <Button
                className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-white"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Salvar Configurações
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Fare Calculator Preview ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="border-border/50 h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calculator className="h-4 w-4 text-amber-500" />
                Simulador de Tarifa
              </CardTitle>
              <CardDescription>
                Veja como o valor da corrida é calculado em tempo real
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Interactive simulation */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Simulação de Corrida
                </Label>
                <div className="rounded-xl bg-muted/50 p-5 space-y-4">
                  {/* Route visualization */}
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center gap-1">
                      <div className="h-3 w-3 rounded-full bg-emerald-500" />
                      <div className="h-8 w-0.5 bg-gradient-to-b from-emerald-500 to-amber-500" />
                      <div className="h-3 w-3 rounded-full bg-amber-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground">
                          Origem
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {fareExample.km} km
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Destino
                        </span>
                      </div>
                      {/* Visual route bar */}
                      <div className="h-2 rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-amber-500" />
                    </div>
                  </div>

                  <Separator />

                  {/* Fare breakdown */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Settings className="h-3.5 w-3.5" />
                        Bandeirada
                      </span>
                      <span className="font-medium text-foreground">
                        {fareExample.flagFormatted}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Route className="h-3.5 w-3.5" />
                        {fareExample.km} km ×{' '}
                        {fareExample.perKmFormatted}/km
                      </span>
                      <span className="font-medium text-foreground">
                        {formatCurrency(fareExample.km * pricePerKm)}
                      </span>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Car className="h-4 w-4 text-amber-500" />
                        Total da Corrida
                      </span>
                      <motion.span
                        key={fareExample.total}
                        initial={{ scale: 1.1, color: '#f59e0b' }}
                        animate={{ scale: 1, color: 'inherit' }}
                        className="text-lg font-bold text-amber-500"
                      >
                        {fareExample.formatted}
                      </motion.span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Formula explanation */}
              <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
                <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <Calculator className="h-3.5 w-3.5 text-amber-500" />
                  Fórmula Utilizada
                </p>
                <div className="bg-background rounded-lg p-3 font-mono text-xs text-muted-foreground">
                  <p>
                    <span className="text-amber-500">Total</span> = Bandeirada +
                    (Distância × Valor/Km)
                  </p>
                  <p className="mt-1 text-foreground">
                    {fareExample.flagFormatted} + {fareExample.km}km ×{' '}
                    {fareExample.perKmFormatted}/km ={' '}
                    <span className="text-amber-500 font-semibold">
                      {fareExample.formatted}
                    </span>
                  </p>
                </div>
              </div>

              {/* Quick examples */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground">
                  Referência de Valores
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[5, 10, 20].map((km) => {
                    const total = flagRate + km * pricePerKm;
                    return (
                      <div
                        key={km}
                        className="rounded-lg border border-border/40 bg-muted/20 p-2.5 text-center"
                      >
                        <p className="text-xs text-muted-foreground">{km} km</p>
                        <p className="text-sm font-bold text-amber-500">
                          {formatCurrency(total)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
