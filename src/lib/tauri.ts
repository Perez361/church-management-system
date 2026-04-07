import { invoke } from "@tauri-apps/api/core";

// ── Types mirrored from Rust models ────────────────────────────────────────

export interface MemberSummary {
  id: string;
  member_no: string;
  first_name: string;
  last_name: string;
  gender: string;
  phone?: string;
  email?: string;
  department_id?: string;
  membership_date: string;
  status: string;
}

export interface Member extends MemberSummary {
  date_of_birth?: string;
  address?: string;
  photo_url?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  synced_at?: string;
}

export interface TithePayment {
  id: string;
  member_id: string;
  amount: number;
  payment_date: string;
  period_month: number;
  period_year: number;
  payment_mode: string;
  reference_no?: string;
  received_by: string;
  notes?: string;
  created_at: string;
  synced_at?: string;
}

export interface Offering {
  id: string;
  service_date: string;
  service_type: string;
  category: string;
  total_amount: number;
  currency: string;
  notes?: string;
  counted_by?: string;
  created_at: string;
  synced_at?: string;
}

export interface WelfareContribution {
  id: string;
  member_id: string;
  amount: number;
  contribution_date: string;
  payment_mode: string;
  reference_no?: string;
  received_by: string;
  created_at: string;
  synced_at?: string;
}

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

// ── Member commands ─────────────────────────────────────────────────────────

export const tauriGetMembers = (search?: string, status?: string) =>
  invoke<MemberSummary[]>("get_members", { search, status });

export const tauriGetMember = (id: string) =>
  invoke<Member>("get_member", { id });

export interface CreateMemberInput {
  first_name: string;
  last_name: string;
  gender: string;
  date_of_birth?: string;
  phone?: string;
  email?: string;
  address?: string;
  department_id?: string;
  membership_date: string;
  status?: string;
}

export const tauriCreateMember = (input: CreateMemberInput) =>
  invoke<Member>("create_member", { input });

export const tauriUpdateMember = (id: string, input: Partial<CreateMemberInput>) =>
  invoke<Member>("update_member", { id, input });

export const tauriDeleteMember = (id: string) =>
  invoke<boolean>("delete_member", { id });

// ── Tithe commands ──────────────────────────────────────────────────────────

export interface CreateTitheInput {
  member_id: string;
  amount: number;
  payment_date: string;
  period_month: number;
  period_year: number;
  payment_mode: string;
  reference_no?: string;
  received_by: string;
  notes?: string;
}

export const tauriGetTithePayments = (month?: number, year?: number, memberId?: string) =>
  invoke<TithePayment[]>("get_tithe_payments", { month, year, memberId });

export const tauriCreateTithePayment = (input: CreateTitheInput) =>
  invoke<TithePayment>("create_tithe_payment", { input });

export const tauriGetTitheSummary = (year: number) =>
  invoke<{ month: number; total: number; payers: number }[]>("get_tithe_summary", { year });

// ── Offering commands ───────────────────────────────────────────────────────

export interface CreateOfferingInput {
  service_date: string;
  service_type: string;
  category: string;
  total_amount: number;
  currency?: string;
  notes?: string;
  counted_by?: string;
}

export const tauriGetOfferings = (fromDate?: string, toDate?: string) =>
  invoke<Offering[]>("get_offerings", { fromDate, toDate });

export const tauriCreateOffering = (input: CreateOfferingInput) =>
  invoke<Offering>("create_offering", { input });

// ── Welfare commands ────────────────────────────────────────────────────────

export interface CreateWelfareInput {
  member_id: string;
  amount: number;
  contribution_date: string;
  payment_mode: string;
  reference_no?: string;
  received_by: string;
}

export const tauriGetWelfareContributions = (memberId?: string) =>
  invoke<WelfareContribution[]>("get_welfare_contributions", { memberId });

export const tauriCreateWelfareContribution = (input: CreateWelfareInput) =>
  invoke<WelfareContribution>("create_welfare_contribution", { input });

export const tauriGetWelfareBalance = () =>
  invoke<number>("get_welfare_balance");

// ── Dashboard commands ──────────────────────────────────────────────────────

export const tauriGetDashboardStats = () =>
  invoke<DashboardStats>("get_dashboard_stats");

export const tauriGetSyncPendingCount = () =>
  invoke<number>("get_sync_pending_count");

// ── Sync ─────────────────────────────────────────────────────────────────────

export interface SyncStats {
  pending: number;
  synced: number;
  failed: number;
  configured: boolean;
}

export const tauriTriggerSync  = () => invoke<string>("trigger_sync");
export const tauriGetSyncStats = () => invoke<SyncStats>("get_sync_stats");

// ── Exports ───────────────────────────────────────────────────────────────────

export const tauriExportMembersExcel   = ()             =>
  invoke<string>("export_members_excel");

export const tauriExportTitheExcel     = (year: number) =>
  invoke<string>("export_tithe_excel", { year });

export const tauriExportOfferingsExcel = (year: number) =>
  invoke<string>("export_offerings_excel", { year });

export const tauriExportWelfareExcel   = (year: number) =>
  invoke<string>("export_welfare_excel", { year });

