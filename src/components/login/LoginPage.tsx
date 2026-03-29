'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Car, Eye, EyeOff, LogIn, Shield, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuthStore, useNavStore } from '@/lib/store';
import type { User as UserType } from '@/lib/store';
import { VERSION } from '@/lib/version';

const DEMO_CREDENTIALS = [
  {
    label: 'Administrador',
    email: 'admin@taxicontrol.com',
    password: 'admin123',
    icon: Shield,
    color: 'text-amber-500',
    bgAccent: 'bg-amber-500/10 border-amber-500/20 hover:border-amber-500/40',
  },
  {
    label: 'Motorista',
    email: 'motorista@taxicontrol.com',
    password: 'motorista123',
    icon: Car,
    color: 'text-amber-400',
    bgAccent: 'bg-amber-400/10 border-amber-400/20 hover:border-amber-400/40',
  },
] as const;

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const login = useAuthStore((s) => s.login);
  const setView = useNavStore((s) => s.setView);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Preencha todos os campos');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erro ao fazer login');
        return;
      }

      const user = data.user as UserType;
      const token = data.token as string;

      login(user, token);

      toast.success(`Bem-vindo, ${user.name}!`, {
        description: 'Login realizado com sucesso.',
      });

      // Navigate based on role
      if (user.role === 'ADMINISTRADOR') {
        setView('admin');
      } else {
        setView('driver');
      }
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillCredentials = (credEmail: string, credPassword: string) => {
    setEmail(credEmail);
    setPassword(credPassword);
    setError('');
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 px-4 py-12">
      {/* Background decorative elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Amber glow top-left */}
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-amber-500/10 blur-[120px]" />
        {/* Amber glow bottom-right */}
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-yellow-500/8 blur-[120px]" />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(245,158,11,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,0.5) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo / Brand Area */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mb-8 flex flex-col items-center gap-3"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/25">
            <Car className="h-10 w-10 text-gray-900" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              TaxiControl{' '}
              <span className="bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent">
                Pro
              </span>
            </h1>
            <p className="mt-1 text-sm text-gray-400">
              Gestão inteligente de frota
            </p>
            <span className="mt-1 inline-block text-[11px] font-mono text-gray-600">
              v{VERSION}
            </span>
          </div>
        </motion.div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="border-gray-800 bg-gray-900/80 shadow-2xl backdrop-blur-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl text-white">
                Entrar na plataforma
              </CardTitle>
              <CardDescription>
                Use suas credenciais para acessar o painel
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400"
                  >
                    {error}
                  </motion.div>
                )}

                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-300">
                    E-mail
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="border-gray-700 bg-gray-800/50 pl-10 text-white placeholder:text-gray-500 focus-visible:border-amber-500/50 focus-visible:ring-amber-500/20"
                      disabled={isLoading}
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-300">
                    Senha
                  </Label>
                  <div className="relative">
                    <LogIn className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="border-gray-700 bg-gray-800/50 pl-10 pr-10 text-white placeholder:text-gray-500 focus-visible:border-amber-500/50 focus-visible:ring-amber-500/20"
                      disabled={isLoading}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-gray-300"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 font-semibold text-gray-900 shadow-lg shadow-amber-500/25 transition-all hover:from-amber-400 hover:to-amber-500 hover:shadow-amber-500/40 disabled:opacity-50"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <svg
                        className="h-4 w-4 animate-spin"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Entrando...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <LogIn className="h-4 w-4" />
                      Entrar
                    </span>
                  )}
                </Button>
              </form>

              {/* Demo Credentials */}
              <div className="mt-6">
                <div className="mb-3 flex items-center gap-2">
                  <div className="h-px flex-1 bg-gray-800" />
                  <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
                    Credenciais de demonstração
                  </span>
                  <div className="h-px flex-1 bg-gray-800" />
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {DEMO_CREDENTIALS.map((cred) => {
                    const Icon = cred.icon;
                    return (
                      <button
                        key={cred.label}
                        type="button"
                        onClick={() => fillCredentials(cred.email, cred.password)}
                        className={`group flex items-center gap-3 rounded-lg border p-3 text-left transition-all ${cred.bgAccent}`}
                      >
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${cred.color} bg-current/10`}
                        >
                          <Icon className="h-4 w-4" style={{ color: 'inherit' }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-gray-200">
                            {cred.label}
                          </p>
                          <p className="truncate text-[11px] text-gray-500">
                            {cred.email}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-6 text-center text-xs text-gray-600"
        >
          &copy; {new Date().getFullYear()} TaxiControl Pro &middot; Todos os direitos
          reservados
        </motion.p>
      </motion.div>
    </div>
  );
}
