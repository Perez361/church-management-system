import { invoke } from "@tauri-apps/api/core";
import type {
  Member, TithePayment, Offering,
  WelfareContribution
} from "@/types";

// ── Members ──────────────────────────────────────────────────────────────────
export const tauriGetMembers = (search?: string, status?: string) =>
  invoke<Member[]>("get_members", { search, status });

export const tauriGetMember = (id: string) =>
  invoke<Member>("get_member", { id });

export const tauriCreateMember = (input: Omit<Member, "id" | "member_no" | "created_at" | "updated_at" | "deleted_at" | "synced_at">) =>
  invoke<Member>("create_member", { input });

export const tauriUpdateMember = (id: string, input: Partial<Member>) =>
  invoke<Member>("update_member", { id, input });

export const tauriDeleteMember = (id: string) =>
  invoke<boolean>("delete_member", { id });

// ── Tithe ─────────────────────────────────────────────────────────────────────
export const tauriGetTithePayments = (month?: number, year?: number, memberId?: string) =>
  invoke<TithePayment[]>("get_tithe_payments", { month, year, memberId });

export const tauriCreateTithePayment = (input: Omit<TithePayment, "id" | "created_at" | "synced_at">) =>
  invoke<TithePayment>("create_tithe_payment", { input });

export const tauriGetTitheSummary = (year: number) =>
  invoke<{ month: number; total: number; payers: number }[]>("get_tithe_summary", { year });

// ── Offerings ─────────────────────────────────────────────────────────────────
export const tauriGetOfferings = (fromDate?: string, toDate?: string) =>
  invoke<Offering[]>("get_offerings", { fromDate, toDate });

export const tauriCreateOffering = (input: Omit<Offering, "id" | "created_at" | "synced_at">) =>
  invoke<Offering>("create_offering", { input });

// ── Welfare ───────────────────────────────────────────────────────────────────
export const tauriGetWelfareContributions = (memberId?: string) =>
  invoke<WelfareContribution[]>("get_welfare_contributions", { memberId });

export const tauriCreateWelfareContribution = (input: Omit<WelfareContribution, "id" | "created_at" | "synced_at">) =>
  invoke<WelfareContribution>("create_welfare_contribution", { input });

export const tauriGetWelfareBalance = () =>
  invoke<number>("get_welfare_balance");

// ── Dashboard ─────────────────────────────────────────────────────────────────
export interface DashboardStats {
  total_members: number;
  active_members: number;
  tithe_this_month: number;
  offerings_this_month: number;
  welfare_balance: number;
  welfare_disbursed_month: number;
  tithe_payers_month: number;
  welfare_contributors_month: number;
}

export const tauriGetDashboardStats = () =>
  invoke<DashboardStats>("get_dashboard_stats");

export const tauriGetSyncPendingCount = () =>
  invoke<number>("get_sync_pending_count");