'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  CheckCircle,
  DollarSign,
  MapPin,
  TrendingUp,
  Activity,
  Car,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  description?: string;
  delay?: number;
}

function StatCard({ title, value, icon, description, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className="relative overflow-hidden border-border/50 bg-card">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                {title}
              </p>
              <p className="text-2xl font-bold tracking-tight text-foreground">
                {value}
              </p>
              {description && (
                <p className="text-xs text-muted-foreground">{description}</p>
              )}
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
              {icon}
            </div>
          </div>
        </CardContent>
        {/* Subtle amber accent bar */}
        <div className="absolute bottom-0 left-0 h-0.5 w-full bg-gradient-to-r from-amber-500/60 to-amber-500/0" />
      </Card>
    </motion.div>
  );
}

function StatCardSkeleton() {
  return (
    <Card className="border-border/50 bg-card">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}

interface CompletedTrip {
  id: string;
  origin: string;
  destination: string;
  distanceKm: number;
  fareAmount: number;
  startedAt: string;
  driver?: {
    id: string;
    name: string;
    licensePlate?: string;
  };
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDrivers: 0,
    completedTrips: 0,
    totalRevenue: 0,
    activeDrivers: 0,
  });
  const [recentTrips, setRecentTrips] = useState<CompletedTrip[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch all data in parallel
        const [usersRes, tripsRes, locationsRes, reportsRes] = await Promise.all([
          fetch('/api/users'),
          fetch('/api/trips?status=FINALIZADA'),
          fetch('/api/location'),
          fetch('/api/reports'),
        ]);

        // Parse responses
        const [usersData, tripsData, locationsData, reportsData] = await Promise.all([
          usersRes.json(),
          tripsRes.json(),
          locationsRes.json(),
          reportsRes.json(),
        ]);

        const totalDrivers = usersData.users?.length || 0;
        const completedTrips = tripsData.trips?.length || 0;
        const totalRevenue = reportsData.summary?.totalFare || 0;
        const activeDrivers = locationsData.locations?.length || 0;

        setStats({
          totalDrivers,
          completedTrips,
          totalRevenue,
          activeDrivers,
        });

        // Last 5 completed trips
        const lastTrips = (tripsData.trips || []).slice(0, 5) as CompletedTrip[];
        setRecentTrips(lastTrips);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Visão Geral
          </h2>
          <p className="text-sm text-muted-foreground">
            Resumo em tempo real da sua frota
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Visão Geral
        </h2>
        <p className="text-sm text-muted-foreground">
          Resumo em tempo real da sua frota
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Total de Motoristas"
          value={stats.totalDrivers.toString()}
          icon={<Users className="h-5 w-5 text-amber-500" />}
          description={`${stats.activeDrivers} ativos agora`}
          delay={0}
        />
        <StatCard
          title="Corridas Finalizadas"
          value={stats.completedTrips.toString()}
          icon={<CheckCircle className="h-5 w-5 text-emerald-500" />}
          description="Todas as corridas concluídas"
          delay={0.1}
        />
        <StatCard
          title="Faturamento Total"
          value={formatCurrency(stats.totalRevenue)}
          icon={<DollarSign className="h-5 w-5 text-amber-500" />}
          description="Receita total acumulada"
          delay={0.2}
        />
        <StatCard
          title="Motoristas Ativos"
          value={stats.activeDrivers.toString()}
          icon={<MapPin className="h-5 w-5 text-blue-500" />}
          description="Online no momento"
          delay={0.3}
        />
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Activity className="h-4 w-4 text-amber-500" />
                Atividade Recente
              </CardTitle>
              <Badge variant="secondary" className="text-xs font-normal">
                Últimas 5 corridas
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {recentTrips.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-3">
                  <TrendingUp className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  Nenhuma corrida finalizada ainda
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  As corridas concluídas aparecerão aqui
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTrips.map((trip) => (
                  <motion.div
                    key={trip.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-4 rounded-lg border border-border/40 bg-muted/30 p-3 transition-colors hover:bg-muted/50"
                  >
                    {/* Driver avatar */}
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
                      <Car className="h-4 w-4 text-amber-500" />
                    </div>

                    {/* Trip details */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-foreground">
                        {trip.driver?.name || 'Motorista'}
                        {trip.driver?.licensePlate && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {trip.driver.licensePlate}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {trip.origin} → {trip.destination}
                      </p>
                    </div>

                    {/* Trip meta */}
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-amber-500">
                        {formatCurrency(trip.fareAmount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {trip.distanceKm.toFixed(1)} km
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
