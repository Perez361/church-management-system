/**
 * Auth / Roles stub
 *
 * This module is intentionally NOT activated yet.  Wire it up as the final
 * step before production:
 *
 *  1. Create a `users` table in Supabase (or SQLite) with columns:
 *       id, email, password_hash, name, role, created_at
 *  2. Add Tauri commands: login, logout, get_current_user
 *  3. Import `useAuthStore` in App.tsx and wrap routes with <RequireAuth>
 *  4. Remove the hard-coded user from appStore.ts
 *
 * Nothing in this file is imported anywhere — it compiles cleanly but has
 * zero runtime effect until you activate it.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type UserRole = "admin" | "pastor" | "treasurer" | "clerk" | "viewer";

export interface AuthUser {
  id:    string;
  email: string;
  name:  string;
  role:  UserRole;
}

export interface LoginInput {
  email:    string;
  password: string;
}

// ── Role permission matrix ────────────────────────────────────────────────────

/** Which actions each role can perform. */
export const ROLE_PERMISSIONS: Record<UserRole, {
  canManageMembers:    boolean;
  canRecordTithe:      boolean;
  canRecordOfferings:  boolean;
  canManageWelfare:    boolean;
  canApproveDisbursements: boolean;
  canExportData:       boolean;
  canManageSettings:   boolean;
  canViewReports:      boolean;
}> = {
  admin: {
    canManageMembers:        true,
    canRecordTithe:          true,
    canRecordOfferings:      true,
    canManageWelfare:        true,
    canApproveDisbursements: true,
    canExportData:           true,
    canManageSettings:       true,
    canViewReports:          true,
  },
  pastor: {
    canManageMembers:        true,
    canRecordTithe:          true,
    canRecordOfferings:      true,
    canManageWelfare:        true,
    canApproveDisbursements: true,
    canExportData:           true,
    canManageSettings:       false,
    canViewReports:          true,
  },
  treasurer: {
    canManageMembers:        false,
    canRecordTithe:          true,
    canRecordOfferings:      true,
    canManageWelfare:        true,
    canApproveDisbursements: true,
    canExportData:           true,
    canManageSettings:       false,
    canViewReports:          true,
  },
  clerk: {
    canManageMembers:        true,
    canRecordTithe:          true,
    canRecordOfferings:      true,
    canManageWelfare:        false,
    canApproveDisbursements: false,
    canExportData:           false,
    canManageSettings:       false,
    canViewReports:          false,
  },
  viewer: {
    canManageMembers:        false,
    canRecordTithe:          false,
    canRecordOfferings:      false,
    canManageWelfare:        false,
    canApproveDisbursements: false,
    canExportData:           false,
    canManageSettings:       false,
    canViewReports:          true,
  },
};

// ── Zustand store (stub — NOT wired into App.tsx yet) ─────────────────────────

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  user:    AuthUser | null;
  token:   string | null;
  loading: boolean;
  error:   string | null;

  login:   (input: LoginInput) => Promise<void>;
  logout:  () => void;
  can:     (action: keyof typeof ROLE_PERMISSIONS[UserRole]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user:    null,
      token:   null,
      loading: false,
      error:   null,

      login: async (_input: LoginInput) => {
        set({ loading: true, error: null });
        try {
          // TODO: Replace with actual Tauri invoke once backend is ready.
          // const result = await invoke<{ user: AuthUser; token: string }>("login", { input });
          // set({ user: result.user, token: result.token, loading: false });
          throw new Error("Auth not yet implemented. Activate in src/lib/auth.ts.");
        } catch (e) {
          set({ loading: false, error: String(e) });
          throw e;
        }
      },

      logout: () => {
        set({ user: null, token: null });
        // TODO: invoke("logout").catch(console.error);
      },

      can: (action) => {
        const { user } = get();
        if (!user) return false;
        return ROLE_PERMISSIONS[user.role]?.[action] ?? false;
      },
    }),
    {
      name: "cms-auth",
      partialize: (s) => ({ user: s.user, token: s.token }),
    },
  ),
);

// ── Route guard component (stub — NOT used in App.tsx yet) ───────────────────

import { Navigate, useLocation } from "react-router-dom";

interface RequireAuthProps {
  children: React.ReactNode;
  roles?: UserRole[];
}

/**
 * Wrap protected routes with this component once auth is activated.
 *
 * Usage in App.tsx:
 *   <Route path="/settings" element={
 *     <RequireAuth roles={["admin"]}>
 *       <SettingsPage />
 *     </RequireAuth>
 *   } />
 */
export function RequireAuth({ children, roles }: RequireAuthProps) {
  const user     = useAuthStore((s) => s.user);
  const location = useLocation();

  // Auth is not activated — always render children
  // Remove the next line when activating auth:
  return <>{children}</>;

  // ── Uncomment below to activate ──────────────────────────────────────────
  // if (!user) {
  //   return <Navigate to="/login" state={{ from: location }} replace />;
  // }
  // if (roles && !roles.includes(user.role)) {
  //   return <Navigate to="/" replace />;
  // }
  // return <>{children}</>;
}

// ── Login page (stub) ─────────────────────────────────────────────────────────

import { useState } from "react";

/**
 * Minimal login page stub. Add route in App.tsx:
 *   <Route path="/login" element={<LoginPage />} />
 */
export function LoginPage() {
  const { login, loading, error } = useAuthStore();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await login({ email, password });
    } catch { /* error shown via store */ }
  }

  return (
    <div className="min-h-screen bg-[#0F0C18] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#1C1828] border border-[#2E2840] rounded-2xl shadow-2xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-amber-400/15 border-2 border-amber-400/30 flex items-center justify-center text-amber-400 text-3xl font-bold mx-auto">✝</div>
          <h1 className="text-xl font-bold text-white">Church CMS</h1>
          <p className="text-sm text-[#9490A8]">Sign in to continue</p>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl bg-rose-400/10 border border-rose-400/30 text-rose-400 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#9490A8] uppercase tracking-wider">Email</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@church.org" required
              className="w-full bg-[#211D30] border border-[#2E2840] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-[#9490A8]/50 outline-none focus:border-amber-400/50 transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#9490A8] uppercase tracking-wider">Password</label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" required
              className="w-full bg-[#211D30] border border-[#2E2840] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-[#9490A8]/50 outline-none focus:border-amber-400/50 transition-colors"
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full py-2.5 rounded-xl bg-amber-400 text-black text-sm font-semibold hover:bg-amber-300 transition-colors disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
