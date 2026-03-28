'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  Route,
  MapPin,
  TrendingUp,
  Car,
  Clock,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import type { Trip, AppSettings } from '@/lib/store';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface DashboardStats {
  tripsToday: number;
  revenueToday: number;
  distanceToday: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function DriverDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats>({
    tripsToday: 0,
    revenueToday: 0,
    distanceToday: 0,
  });
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!user?.id) return;

      try {
        // Fetch today's finalized trips
        const tripsRes = await fetch(
          `/api/trips?driverId=${user.id}&status=FINALIZADA`
        );
        const tripsData = await tripsRes.json();

        const today = new Date().toISOString().split('T')[0];
        const todayTrips = (tripsData.trips ?? []).filter(
          (t: Trip) => t.startedAt?.split('T')[0] === today
        );

        setStats({
          tripsToday: todayTrips.length,
          revenueToday: todayTrips.reduce(
            (acc: number, t: Trip) => acc + (t.fareAmount ?? 0),
            0
          ),
          distanceToday: todayTrips.reduce(
            (acc: number, t: Trip) => acc + (t.distanceKm ?? 0),
            0
          ),
        });

        // Fetch settings
        const settingsRes = await fetch('/api/settings');
        const settingsData = await settingsRes.json();
        setSettings(settingsData.settings ?? null);
      } catch (err) {
        console.error('Erro ao carregar dados do dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user?.id]);

  const firstName = user?.name?.split(' ')[0] ?? 'Motorista';

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const statCards = [
    {
      title: 'Corridas Hoje',
      value: stats.tripsToday,
      icon: Car,
      color: 'bg-amber-500',
      lightColor: 'bg-amber-50 text-amber-700',
    },
    {
      title: 'Faturamento Hoje',
      value: `R$ ${stats.revenueToday.toFixed(2)}`,
      icon: DollarSign,
      color: 'bg-green-500',
      lightColor: 'bg-green-50 text-green-700',
    },
    {
      title: 'Distância Percorrida',
      value: `${stats.distanceToday.toFixed(1)} km`,
      icon: Route,
      color: 'bg-blue-500',
      lightColor: 'bg-blue-50 text-blue-700',
    },
    {
      title: 'Tarifa Atual',
      value: settings
        ? `R$ ${settings.flagRate.toFixed(2)} + R$ ${settings.pricePerKm.toFixed(2)}/km`
        : '—',
      icon: TrendingUp,
      color: 'bg-purple-500',
      lightColor: 'bg-purple-50 text-purple-700',
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Welcome Message ──────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 p-5 text-white shadow-lg">
          <div className="flex items-center gap-2 text-amber-100">
            <Clock className="size-4" />
            <span className="text-sm">{greeting()}</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold">
            {firstName} 👋
          </h1>
          <p className="mt-1 text-sm text-amber-100">
            Aqui está o resumo do seu dia.
          </p>
        </div>
      </motion.div>

      {/* ── Stat Cards Grid ──────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-2 gap-3"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <motion.div key={card.title} variants={itemVariants}>
                <Card className="h-full border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="pb-0 pt-4 px-4">
                    <CardTitle className="text-xs font-medium text-gray-500">
                      {card.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-lg font-bold text-gray-900 leading-tight">
                        {card.value}
                      </p>
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${card.lightColor}`}
                      >
                        <Icon className="size-4" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* ── Quick Info ───────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.35 }}
      >
        <Card className="border-0 shadow-sm">
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <MapPin className="size-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                TaxiControl Pro
              </p>
              <p className="text-xs text-gray-500">
                Gerencie suas corridas de forma inteligente.
              </p>
            </div>
            <Badge
              variant="secondary"
              className="bg-amber-100 text-amber-700 hover:bg-amber-100"
            >
              v1.0
            </Badge>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
