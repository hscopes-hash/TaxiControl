'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Plus,
  Trash2,
  Phone,
  Mail,
  Car,
  Search,
  UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

// ── Types ──────────────────────────────────────────────
interface Driver {
  id: string;
  name: string;
  email: string;
  phone?: string;
  licensePlate?: string;
  createdAt: string;
  _count?: { trips: number };
}

// ── Empty State ────────────────────────────────────────
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
        <Users className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">
        Nenhum motorista cadastrado
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        Adicione motoristas para começar a gerenciar sua frota de táxis.
      </p>
    </motion.div>
  );
}

// ── Main Component ─────────────────────────────────────
export default function DriverManagement() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // New driver dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newDriver, setNewDriver] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    licensePlate: '',
  });

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Driver | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Fetch drivers ──────────────────────────────────
  const fetchDrivers = useCallback(async () => {
    try {
      const res = await fetch('/api/users?role=MOTORISTA');
      const data = await res.json();
      setDrivers(data.users || []);
    } catch (error) {
      console.error('Failed to fetch drivers:', error);
      toast.error('Erro ao carregar motoristas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  // ── Filter ────────────────────────────────────────
  const filteredDrivers = drivers.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.email.toLowerCase().includes(search.toLowerCase()) ||
      d.licensePlate?.toLowerCase().includes(search.toLowerCase())
  );

  // ── Create driver ──────────────────────────────────
  const handleCreateDriver = async () => {
    if (!newDriver.name || !newDriver.email || !newDriver.password) {
      toast.error('Preencha nome, email e senha');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newDriver,
          role: 'MOTORISTA',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao criar motorista');
      }

      toast.success(`Motorista "${data.user.name}" criado com sucesso!`);
      setDialogOpen(false);
      setNewDriver({
        name: '',
        email: '',
        password: '',
        phone: '',
        licensePlate: '',
      });
      fetchDrivers();
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : 'Erro ao criar motorista';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete driver ──────────────────────────────────
  const handleDeleteDriver = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/users?id=${deleteTarget.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao remover motorista');
      }

      toast.success(`Motorista "${deleteTarget.name}" removido com sucesso`);
      setDeleteTarget(null);
      fetchDrivers();
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : 'Erro ao remover motorista';
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  // ── Format date ────────────────────────────────────
  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(dateStr));
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Motoristas
          </h2>
          <p className="text-sm text-muted-foreground">
            Gerencie a frota de motoristas cadastrados
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-amber-500 hover:bg-amber-600 text-white">
              <UserPlus className="h-4 w-4" />
              Novo Motorista
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Novo Motorista</DialogTitle>
              <DialogDescription>
                Preencha os dados para cadastrar um novo motorista no sistema.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="driver-name">Nome completo *</Label>
                <Input
                  id="driver-name"
                  placeholder="João da Silva"
                  value={newDriver.name}
                  onChange={(e) =>
                    setNewDriver({ ...newDriver, name: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="driver-email">Email *</Label>
                <Input
                  id="driver-email"
                  type="email"
                  placeholder="motorista@email.com"
                  value={newDriver.email}
                  onChange={(e) =>
                    setNewDriver({ ...newDriver, email: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="driver-password">Senha *</Label>
                <Input
                  id="driver-password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={newDriver.password}
                  onChange={(e) =>
                    setNewDriver({ ...newDriver, password: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="driver-phone">Telefone</Label>
                  <Input
                    id="driver-phone"
                    placeholder="(11) 99999-9999"
                    value={newDriver.phone}
                    onChange={(e) =>
                      setNewDriver({ ...newDriver, phone: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="driver-plate">Placa do Veículo</Label>
                  <Input
                    id="driver-plate"
                    placeholder="ABC-1234"
                    value={newDriver.licensePlate}
                    onChange={(e) =>
                      setNewDriver({
                        ...newDriver,
                        licensePlate: e.target.value.toUpperCase(),
                      })
                    }
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                className="bg-amber-500 hover:bg-amber-600 text-white"
                onClick={handleCreateDriver}
                disabled={submitting}
              >
                {submitting ? 'Criando...' : 'Criar Motorista'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar motoristas..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : filteredDrivers.length === 0 ? (
        drivers.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="p-0">
              <EmptyState />
            </CardContent>
          </Card>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              Nenhum motorista encontrado para &quot;{search}&quot;
            </p>
          </div>
        )
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block">
            <Card className="border-border/50 overflow-hidden">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead>Motorista</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Placa</TableHead>
                      <TableHead className="text-center">Corridas</TableHead>
                      <TableHead>Cadastro</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {filteredDrivers.map((driver) => (
                        <motion.tr
                          key={driver.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="group border-b transition-colors hover:bg-muted/30"
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
                                <Car className="h-4 w-4 text-amber-500" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">
                                  {driver.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {driver.email}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {driver.phone && (
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {driver.phone}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {driver.licensePlate ? (
                              <Badge
                                variant="secondary"
                                className="font-mono text-xs"
                              >
                                {driver.licensePlate}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-xs">
                              {driver._count?.trips || 0}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(driver.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => setDeleteTarget(driver)}
                              title="Remover motorista"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            <AnimatePresence>
              {filteredDrivers.map((driver) => (
                <motion.div
                  key={driver.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <Card className="border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
                            <Car className="h-4 w-4 text-amber-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {driver.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {driver.email}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-red-500 h-8 w-8"
                          onClick={() => setDeleteTarget(driver)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {driver.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {driver.phone}
                          </span>
                        )}
                        {driver.licensePlate && (
                          <Badge
                            variant="secondary"
                            className="font-mono text-xs h-5"
                          >
                            {driver.licensePlate}
                          </Badge>
                        )}
                        <span>{driver._count?.trips || 0} corridas</span>
                      </div>

                      <div className="mt-2 text-xs text-muted-foreground/70">
                        Cadastrado em {formatDate(driver.createdAt)}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </>
      )}

      {/* Summary count */}
      {!loading && drivers.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {filteredDrivers.length} de {drivers.length} motorista
          {drivers.length !== 1 ? 's' : ''}
          {search ? ` encontrado${filteredDrivers.length !== 1 ? 's' : ''} para "${search}"` : ''}
        </p>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o motorista{' '}
              <span className="font-semibold text-foreground">
                {deleteTarget?.name}
              </span>
              ? Esta ação não pode ser desfeita e todos os dados associados
              serão perdidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDriver}
              disabled={deleting}
              className="bg-red-500 text-white hover:bg-red-600 focus:ring-red-500/20"
            >
              {deleting ? 'Removendo...' : 'Remover Motorista'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
