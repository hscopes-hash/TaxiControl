'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  MapPin,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  Car,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useAuthStore, useNavStore } from '@/lib/store';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';

import AdminDashboard from './AdminDashboard';
import DriverManagement from './DriverManagement';
import RealTimeMap from './RealTimeMap';
import Reports from './Reports';
import SettingsPanel from './SettingsPanel';
import CoPilotChat from '@/components/copilot/CoPilotChat';

// ── Navigation Items ────────────────────────────────────
const navItems = [
  { key: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
  { key: 'drivers', label: 'Motoristas', icon: Users },
  { key: 'map', label: 'Mapa em Tempo Real', icon: MapPin },
  { key: 'reports', label: 'Relatórios', icon: BarChart3 },
  { key: 'settings', label: 'Configurações', icon: Settings },
];

// ── Sidebar Content (shared between desktop & mobile) ───
function SidebarNav({
  currentTab,
  onTabChange,
  onLogout,
  userName,
}: {
  currentTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  userName: string;
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500">
          <Car className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight text-foreground">
            TaxiControl
          </h1>
          <p className="text-xs font-medium text-amber-500">Pro Admin</p>
        </div>
      </div>

      <Separator />

      {/* Nav links */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = currentTab === item.key;
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => {
                  onTabChange(item.key);
                }}
                className={`
                  group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all
                  ${
                    isActive
                      ? 'bg-amber-500/10 text-amber-500 shadow-sm'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }
                `}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    isActive
                      ? 'text-amber-500'
                      : 'text-muted-foreground group-hover:text-accent-foreground'
                  }`}
                />
                <span>{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-500"
                  />
                )}
              </button>
            );
          })}
        </nav>
      </ScrollArea>

      <Separator />

      {/* User + Logout */}
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-amber-500/10 text-amber-500 text-xs font-bold">
              {userName?.charAt(0)?.toUpperCase() || 'A'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-foreground">
              {userName}
            </p>
            <p className="text-xs text-muted-foreground">Administrador</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-red-500"
          onClick={onLogout}
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </div>
  );
}

// ── Main Admin Layout ───────────────────────────────────
export default function AdminLayout() {
  const { user, logout } = useAuthStore();
  const { adminTab, setAdminTab, setView } = useNavStore();
  const isMobile = useIsMobile();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user || user.role !== 'ADMINISTRADOR') {
      setView('login');
    }
  }, [user, setView]);

  const handleLogout = () => {
    logout();
    setView('login');
    toast.success('Sessão encerrada com sucesso');
  };

  // Render active tab component
  const renderContent = () => {
    switch (adminTab) {
      case 'overview':
        return <AdminDashboard />;
      case 'drivers':
        return <DriverManagement />;
      case 'map':
        return <RealTimeMap />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <SettingsPanel />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* ── Desktop Sidebar ── */}
      {!isMobile && (
        <aside className="hidden md:flex w-64 flex-col border-r bg-card">
          <SidebarNav
            currentTab={adminTab}
            onTabChange={setAdminTab}
            onLogout={handleLogout}
            userName={user?.name || 'Admin'}
          />
        </aside>
      )}

      {/* ── Mobile Sidebar (Sheet) ── */}
      {isMobile && (
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="fixed top-3 left-3 z-40 md:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Menu de Navegação</SheetTitle>
            </SheetHeader>
            <SidebarNav
              currentTab={adminTab}
              onTabChange={setAdminTab}
              onLogout={handleLogout}
              userName={user?.name || 'Admin'}
            />
          </SheetContent>
        </Sheet>
      )}

      {/* ── Main Content Area ── */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 py-3 md:px-6">
          <div className="flex items-center gap-3 md:hidden ml-10">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500">
              <Car className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold text-foreground">
              TaxiControl Pro
            </span>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500">
              <Car className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground">
                TaxiControl Pro
              </h1>
            </div>
          </div>

          {/* Current page title */}
          <div className="flex-1" />

          {/* Admin info (desktop) */}
          <div className="hidden md:flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-amber-500/10 text-amber-500 text-xs font-bold">
                {user?.name?.charAt(0)?.toUpperCase() || 'A'}
              </AvatarFallback>
            </Avatar>
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">
                {user?.name || 'Admin'}
              </p>
              <p className="text-xs text-muted-foreground">Administrador</p>
            </div>
            <Separator orientation="vertical" className="h-8" />
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-red-500"
              onClick={handleLogout}
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 md:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={adminTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* ── Co-Piloto IA ─────────────────────────────────── */}
      <CoPilotChat />
    </div>
  );
}
