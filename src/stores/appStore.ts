import { create } from "zustand";
import { User, SyncStatus, AppNotification } from "@/types";

interface AppState {
  user: User | null;
  syncStatus: SyncStatus;
  sidebarCollapsed: boolean;
  notifications: AppNotification[];

  setUser: (user: User | null) => void;
  setSyncStatus: (status: SyncStatus) => void;
  toggleSidebar: () => void;
  addNotification: (n: Omit<AppNotification, "id" | "time" | "read">) => void;
  markAllRead: () => void;
  dismissNotification: (id: string) => void;
}

let _notifCounter = 0;

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
  notifications: [],

  setUser: (user) => set({ user }),
  setSyncStatus: (syncStatus) => set({ syncStatus }),
  toggleSidebar: () =>
    set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  addNotification: (n) =>
    set((s) => ({
      notifications: [
        {
          ...n,
          id: String(++_notifCounter),
          time: new Date().toISOString(),
          read: false,
        },
        ...s.notifications,
      ].slice(0, 50), // keep at most 50
    })),

  markAllRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
    })),

  dismissNotification: (id) =>
    set((s) => ({
      notifications: s.notifications.filter((n) => n.id !== id),
    })),
}));
