'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  PlusCircle,
  Navigation,
  History,
  LogOut,
  User,
} from 'lucide-react';
import { useAuthStore, useNavStore, useTripStore } from '@/lib/store';
import type { User as UserType, Trip, AppSettings } from '@/lib/store';
import { VERSION } from '@/lib/version';

import DriverDashboard from './DriverDashboard';
import NewTripForm from './NewTripForm';
import ActiveTrip from './ActiveTrip';
import TripHistory from './TripHistory';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import CoPilotChat from '@/components/copilot/CoPilotChat';

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'new', label: 'Nova Corrida', icon: PlusCircle },
  { id: 'active', label: 'Corrida Ativa', icon: Navigation },
  { id: 'history', label: 'Histórico', icon: History },
] as const;

export default function DriverLayout() {
  const { user, logout } = useAuthStore();
  const { driverTab, setDriverTab } = useNavStore();
  const { currentTrip } = useTripStore();

  const renderTab = () => {
    switch (driverTab) {
      case 'new':
        return <NewTripForm />;
      case 'active':
        return <ActiveTrip />;
      case 'history':
        return <TripHistory />;
      case 'dashboard':
      default:
        return <DriverDashboard />;
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* ── Top Header ─────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-amber-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 text-white">
              <User className="size-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-900 leading-tight">
                {user?.name ?? 'Motorista'}
              </span>
              <Badge
                variant="secondary"
                className="mt-0.5 h-4 w-fit bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-700 hover:bg-amber-100"
              >
                MOTORISTA
              </Badge>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            className="text-gray-500 hover:bg-red-50 hover:text-red-600"
            aria-label="Sair"
          >
            <LogOut className="size-5" />
          </Button>
          <span className="text-[10px] text-gray-400 font-mono">v{VERSION}</span>
        </div>
      </header>

      {/* ── Main Content ───────────────────────────────── */}
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pt-4 pb-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={driverTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
            {renderTab()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Bottom Navigation ──────────────────────────── */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-lg items-center justify-around">
          {tabs.map((tab) => {
            const isActive = driverTab === tab.id;
            const Icon = tab.icon;
            const showBadge = tab.id === 'active' && currentTrip;

            return (
              <button
                key={tab.id}
                onClick={() => setDriverTab(tab.id)}
                className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors ${
                  isActive
                    ? 'text-amber-600'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {showBadge && (
                  <span className="absolute right-1/2 top-1.5 h-2 w-2 -translate-y-1/2 translate-x-3 rounded-full bg-amber-500" />
                )}
                <Icon className="size-5" strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium leading-none">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── Co-Piloto IA ─────────────────────────────────── */}
      <CoPilotChat />
    </div>
  );
}
