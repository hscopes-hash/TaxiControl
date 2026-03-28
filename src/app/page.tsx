'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuthStore, useNavStore } from '@/lib/store';
import LoginPage from '@/components/login/LoginPage';
import DriverLayout from '@/components/driver/DriverLayout';
import AdminLayout from '@/components/admin/AdminLayout';

export default function HomePage() {
  const { isAuthenticated, user } = useAuthStore();
  const { currentView, setView } = useNavStore();

  // Auto-redirect based on auth state
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'ADMINISTRADOR' && currentView === 'login') {
        setView('admin');
      } else if (user.role === 'MOTORISTA' && currentView === 'login') {
        setView('driver');
      }
    } else if (!isAuthenticated) {
      setView('login');
    }
  }, [isAuthenticated, user, currentView, setView]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentView}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="min-h-screen"
      >
        {currentView === 'login' && <LoginPage />}
        {currentView === 'driver' && <DriverLayout />}
        {currentView === 'admin' && <AdminLayout />}
      </motion.div>
    </AnimatePresence>
  );
}
