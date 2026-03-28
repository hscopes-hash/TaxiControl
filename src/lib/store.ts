import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── Types ──────────────────────────────────────────────
export type Role = 'ADMINISTRADOR' | 'MOTORISTA';
export type TripStatus = 'EM_ANDAMENTO' | 'FINALIZADA' | 'CANCELADA';
export type AppView = 'login' | 'driver' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  licensePlate?: string;
}

export interface Trip {
  id: string;
  origin: string;
  destination: string;
  distanceKm: number;
  fareAmount: number;
  status: TripStatus;
  startedAt: string;
  endedAt?: string;
  driverId: string;
  driver?: User;
}

export interface DriverLocation {
  id: string;
  latitude: number;
  longitude: number;
  driverId: string;
  driver: {
    id: string;
    name: string;
    licensePlate?: string;
  };
  updatedAt: string;
}

export interface AppSettings {
  id: string;
  flagRate: number;
  pricePerKm: number;
}

// ── Auth Store ─────────────────────────────────────────
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: 'taxi-auth',
    }
  )
);

// ── Navigation Store ───────────────────────────────────
interface NavState {
  currentView: AppView;
  driverTab: string;
  adminTab: string;
  setView: (view: AppView) => void;
  setDriverTab: (tab: string) => void;
  setAdminTab: (tab: string) => void;
}

export const useNavStore = create<NavState>()((set) => ({
  currentView: 'login',
  driverTab: 'dashboard',
  adminTab: 'overview',
  setView: (view) => set({ currentView: view }),
  setDriverTab: (tab) => set({ driverTab: tab }),
  setAdminTab: (tab) => set({ adminTab: tab }),
}));

// ── Trip Store ─────────────────────────────────────────
interface TripState {
  currentTrip: Trip | null;
  isTracking: boolean;
  setCurrentTrip: (trip: Trip | null) => void;
  setTracking: (tracking: boolean) => void;
}

export const useTripStore = create<TripState>()((set) => ({
  currentTrip: null,
  isTracking: false,
  setCurrentTrip: (trip) => set({ currentTrip: trip }),
  setTracking: (tracking) => set({ isTracking: tracking }),
}));
