'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Download,
  Filter,
  DollarSign,
  Car,
  Route,
  Receipt,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

// ── Types ──────────────────────────────────────────────
interface Driver {
  id: string;
  name: string;
  licensePlate?: string;
}

interface Summary {
  totalFare: number;
  totalDistance: number;
  totalTrips: number;
  avgFare: number;
}

interface DriverBreakdown {
  driverId: string;
  driverName: string;
  licensePlate: string;
  totalFare: number;
  totalDistance: number;
  tripCount: number;
}

interface TripDetail {
  id: string;
  origin: string;
  destination: string;
  distanceKm: number;
  fareAmount: number;
  startedAt: string;
  driver: {
    id: string;
    name: string;
    licensePlate?: string;
  };
}

// ── Formatters ─────────────────────────────────────────
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

const formatNumber = (value: number, decimals = 1) =>
  new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);

const formatDate = (dateStr: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));

// ── Helpers ────────────────────────────────────────────
function getFirstDayOfMonth(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0];
}

function getLastDayOfMonth(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split('T')[0];
}

// ── Summary Card ───────────────────────────────────────
function SummaryCard({
  title,
  value,
  icon,
  description,
  delay,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  description?: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <Card className="border-border/50 bg-card relative overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                {title}
              </p>
              <p className="text-xl font-bold tracking-tight text-foreground">
                {value}
              </p>
              {description && (
                <p className="text-xs text-muted-foreground">{description}</p>
              )}
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
              {icon}
            </div>
          </div>
        </CardContent>
        <div className="absolute bottom-0 left-0 h-0.5 w-full bg-gradient-to-r from-amber-500/60 to-amber-500/0" />
      </Card>
    </motion.div>
  );
}

// ── Main Component ─────────────────────────────────────
export default function Reports() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  // Filters
  const [startDate, setStartDate] = useState(getFirstDayOfMonth());
  const [endDate, setEndDate] = useState(getLastDayOfMonth());
  const [driverId, setDriverId] = useState<string>('all');

  // Report data
  const [summary, setSummary] = useState<Summary | null>(null);
  const [byDriver, setByDriver] = useState<DriverBreakdown[]>([]);
  const [trips, setTrips] = useState<TripDetail[]>([]);

  // ── Fetch drivers for filter ───────────────────────
  useEffect(() => {
    async function fetchDrivers() {
      try {
        const res = await fetch('/api/users?role=MOTORISTA');
        const data = await res.json();
        setDrivers(data.users || []);
      } catch {
        // silent
      }
    }
    fetchDrivers();
  }, []);

  // ── Generate report ────────────────────────────────
  const generateReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
      });
      if (driverId && driverId !== 'all') {
        params.set('driverId', driverId);
      }

      const res = await fetch(`/api/reports?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Erro ao gerar relatório');

      setSummary(data.summary);
      setByDriver(data.byDriver || []);
      setTrips(data.trips || []);
      setGenerated(true);
      toast.success('Relatório gerado com sucesso!');
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : 'Erro ao gerar relatório';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, driverId]);

  // ── Export CSV ─────────────────────────────────────
  const handleExportCSV = () => {
    if (!trips.length) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    const headers = [
      'Motorista',
      'Placa',
      'Origem',
      'Destino',
      'Distância (km)',
      'Valor (R$)',
      'Data',
    ];
    const rows = trips.map((t) => [
      t.driver?.name || '',
      t.driver?.licensePlate || '',
      t.origin,
      t.destination,
      t.distanceKm.toFixed(2),
      t.fareAmount.toFixed(2),
      new Date(t.startedAt).toLocaleString('pt-BR'),
    ]);

    const csv = [
      headers.join(';'),
      ...rows.map((r) => r.map((c) => `"${c}"`).join(';')),
    ].join('\n');

    const blob = new Blob(['\ufeff' + csv], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio_${startDate}_${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado com sucesso!');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Relatórios
          </h2>
          <p className="text-sm text-muted-foreground">
            Análise financeira e operacional detalhada
          </p>
        </div>
        {generated && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleExportCSV}
          >
            <Download className="h-3.5 w-3.5" />
            Exportar CSV
          </Button>
        )}
      </div>

      {/* Filters Card */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-foreground">
              Filtros do Relatório
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="start-date" className="text-xs">
                Data Início
              </Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end-date" className="text-xs">
                Data Fim
              </Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Motorista</Label>
              <Select
                value={driverId}
                onValueChange={setDriverId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Motoristas</SelectItem>
                  {drivers.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4">
            <Button
              className="gap-2 bg-amber-500 hover:bg-amber-600 text-white"
              onClick={generateReport}
              disabled={loading || !startDate || !endDate}
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Gerando...
                </>
              ) : (
                <>
                  <BarChart3 className="h-4 w-4" />
                  Gerar Relatório
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Results */}
      {generated && summary && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              title="Total Faturado"
              value={formatCurrency(summary.totalFare)}
              icon={<DollarSign className="h-4 w-4 text-amber-500" />}
              description="Receita no período"
              delay={0}
            />
            <SummaryCard
              title="Total de Corridas"
              value={summary.totalTrips.toString()}
              icon={<Receipt className="h-4 w-4 text-emerald-500" />}
              description="Corridas finalizadas"
              delay={0.1}
            />
            <SummaryCard
              title="Distância Total"
              value={`${formatNumber(summary.totalDistance)} km`}
              icon={<Route className="h-4 w-4 text-blue-500" />}
              description="Quilômetros percorridos"
              delay={0.2}
            />
            <SummaryCard
              title="Ticket Médio"
              value={formatCurrency(summary.avgFare)}
              icon={<TrendingUp className="h-4 w-4 text-amber-500" />}
              description="Valor médio por corrida"
              delay={0.3}
            />
          </div>

          {/* Breakdown by Driver */}
          {byDriver.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border-border/50 overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Car className="h-4 w-4 text-amber-500" />
                    Resumo por Motorista
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead>Motorista</TableHead>
                          <TableHead>Placa</TableHead>
                          <TableHead className="text-center">Corridas</TableHead>
                          <TableHead className="text-right">
                            Distância
                          </TableHead>
                          <TableHead className="text-right">
                            Total Faturado
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {byDriver.map((d) => (
                          <TableRow
                            key={d.driverId}
                            className="hover:bg-muted/30"
                          >
                            <TableCell className="font-medium">
                              {d.driverName}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className="font-mono text-xs"
                              >
                                {d.licensePlate}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="text-xs">
                                {d.tripCount}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {formatNumber(d.totalDistance)} km
                            </TableCell>
                            <TableCell className="text-right font-semibold text-amber-500">
                              {formatCurrency(d.totalFare)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Detailed Trip List */}
          {trips.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="border-border/50 overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Receipt className="h-4 w-4 text-amber-500" />
                      Detalhamento de Corridas
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs font-normal">
                      {trips.length} corrida{trips.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="max-h-96">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50 hover:bg-muted/50">
                            <TableHead>Data</TableHead>
                            <TableHead>Motorista</TableHead>
                            <TableHead className="hidden sm:table-cell">
                              Origem
                            </TableHead>
                            <TableHead className="hidden sm:table-cell">
                              Destino
                            </TableHead>
                            <TableHead className="text-right">Km</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {trips.map((trip) => (
                            <TableRow
                              key={trip.id}
                              className="hover:bg-muted/30"
                            >
                              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                {formatDate(trip.startedAt)}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="text-sm font-medium">
                                    {trip.driver?.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground sm:hidden">
                                    {trip.origin} → {trip.destination}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell text-sm text-muted-foreground max-w-[150px] truncate">
                                {trip.origin}
                              </TableCell>
                              <TableCell className="hidden sm:table-cell text-sm text-muted-foreground max-w-[150px] truncate">
                                {trip.destination}
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {trip.distanceKm.toFixed(1)}
                              </TableCell>
                              <TableCell className="text-right font-semibold text-amber-500 text-sm">
                                {formatCurrency(trip.fareAmount)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* No results */}
          {summary.totalTrips === 0 && (
            <Card className="border-border/50">
              <CardContent className="py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-3 mx-auto">
                  <BarChart3 className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  Nenhuma corrida encontrada no período selecionado
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Tente ajustar as datas ou o filtro de motorista
                </p>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}
    </div>
  );
}
