import { create } from "zustand";
import { User, SyncStatus, AppNotification } from "@/types";
import {
  tauriGetNotifications,
  tauriSaveNotification,
  tauriMarkNotificationsRead,
  tauriClearNotifications,
} from "@/lib/tauri";

interface AppState {
  user: User | null;
  syncStatus: SyncStatus;
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
  notifications: AppNotification[];

  setUser: (user: User | null) => void;
  setSyncStatus: (status: SyncStatus) => void;
  toggleSidebar: () => void;
  setMobileMenuOpen: (open: boolean) => void;
  loadNotifications: () => Promise<void>;
  addNotification: (n: Omit<AppNotification, "id" | "time" | "read">) => void;
  markAllRead: () => void;
  dismissNotification: (id: string) => void;
  clearAllNotifications: () => void;
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
  mobileMenuOpen: false,
  notifications: [],

  setUser: (user) => set({ user }),
  setSyncStatus: (syncStatus) => set({ syncStatus }),
  toggleSidebar: () =>
    set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),

  loadNotifications: async () => {
    try {
      const rows = await tauriGetNotifications();
      const notifications: AppNotification[] = rows.map((r) => ({
        id:      String(r.id),
        title:   r.title,
        message: r.message,
        type:    (r.kind as AppNotification["type"]) ?? "info",
        time:    r.created_at,
        read:    r.read,
      }));
      set({ notifications });
    } catch {
      // silently ignore — DB may not be ready yet on first launch
    }
  },

  addNotification: (n) => {
    // Optimistically update local state first
    const localId = `local-${Date.now()}`;
    const now = new Date().toISOString();
    set((s) => ({
      notifications: [
        { ...n, id: localId, time: now, read: false },
        ...s.notifications,
      ].slice(0, 50),
    }));
    // Persist to SQLite (fire-and-forget, update id when done)
    tauriSaveNotification(n.title, n.message, n.type)
      .then((saved) => {
        set((s) => ({
          notifications: s.notifications.map((notif) =>
            notif.id === localId
              ? { ...notif, id: String(saved.id), time: saved.created_at }
              : notif,
          ),
        }));
      })
      .catch(() => { /* keep local entry even if DB save fails */ });
  },

  markAllRead: () => {
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
    }));
    tauriMarkNotificationsRead().catch(() => {});
  },

  dismissNotification: (id) =>
    set((s) => ({
      notifications: s.notifications.filter((n) => n.id !== id),
    })),

  clearAllNotifications: () => {
    set({ notifications: [] });
    tauriClearNotifications().catch(() => {});
  },
}));
