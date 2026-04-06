import { create } from "zustand";
import { User, SyncStatus } from "@/types";

interface AppState {
  user: User | null;
  syncStatus: SyncStatus;
  sidebarCollapsed: boolean;
  setUser: (user: User | null) => void;
  setSyncStatus: (status: SyncStatus) => void;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: {
    id: "1",
    name: "Admin User",
    role: "admin",
  },
  syncStatus: {
    pending: 0,
    is_online: true,
    last_synced: new Date().toISOString(),
  },
  sidebarCollapsed: false,
  setUser: (user) => set({ user }),
  setSyncStatus: (syncStatus) => set({ syncStatus }),
  toggleSidebar: () =>
    set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));