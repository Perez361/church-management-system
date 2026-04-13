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
  photo_url?: string;
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

export interface OfferingsSummary {
  monthly:     { month: number; total: number }[];
  by_category: { category: string; total: number }[];
}

export const tauriGetOfferingsSummary = (year: number) =>
  invoke<OfferingsSummary>("get_offerings_summary", { year });

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

export interface WelfareDisbursement {
  id: string;
  beneficiary_id: string;
  amount: number;
  reason: string;
  disbursement_date: string;
  approved_by: string;
  status: string;
  created_at: string;
  synced_at?: string;
}

export interface CreateDisbursementInput {
  beneficiary_id: string;
  amount: number;
  reason: string;
  disbursement_date: string;
  approved_by: string;
}

export const tauriGetWelfareDisbursements = () =>
  invoke<WelfareDisbursement[]>("get_welfare_disbursements");

export const tauriCreateWelfareDisbursement = (input: CreateDisbursementInput) =>
  invoke<WelfareDisbursement>("create_welfare_disbursement", { input });

export const tauriUpdateDisbursementStatus = (id: string, status: "approved" | "rejected") =>
  invoke<WelfareDisbursement>("update_disbursement_status", { id, status });

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

export interface SyncQueueItem {
  id:          number;
  table_name:  string;
  record_id:   string;
  operation:   string;
  status:      string;
  retry_count: number;
  created_at:  string;
}

export const tauriGetSyncQueueItems = () => invoke<SyncQueueItem[]>("get_sync_queue_items");

// ── Exports ───────────────────────────────────────────────────────────────────

export const tauriExportMembersExcel   = ()             =>
  invoke<string>("export_members_excel");

export const tauriExportTitheExcel     = (year: number) =>
  invoke<string>("export_tithe_excel", { year });

export const tauriExportOfferingsExcel = (year: number) =>
  invoke<string>("export_offerings_excel", { year });

export const tauriExportWelfareExcel   = (year: number) =>
  invoke<string>("export_welfare_excel", { year });

export interface ExportSummary {
  total_members:           number;
  active_members:          number;
  total_tithe_year:        number;
  total_offerings_year:    number;
  total_welfare_contrib:   number;
  total_welfare_disbursed: number;
  net_welfare_balance:     number;
  tithe_20_pct:            number;
  tithe_60_pct:            number;
  tithe_20_balance:        number;
}

export const tauriGetExportSummary = (year: number) =>
  invoke<ExportSummary>("get_export_summary", { year });

// ── Settings ──────────────────────────────────────────────────────────────────

export interface AppSettings {
  currency:          string;
  date_format:       string;
  language:          string;
  notifications:     boolean;
  auto_sync:         boolean;
  show_sync_badge:   boolean;
  weekly_summary:    boolean;
  church_name:       string;
  supabase_url:      string;
  supabase_anon_key: string;
}

export const tauriGetAppSettings  = () => invoke<AppSettings>("get_app_settings");
export const tauriSaveAppSettings = (settings: AppSettings) => invoke<void>("save_app_settings", { settings });

// ── Departments ───────────────────────────────────────────────────────────────

export interface Department {
  id:          string;
  name:        string;
  description?: string;
  leader_id?:  string;
  created_at:  string;
}

export interface CreateDepartmentInput {
  name:        string;
  description?: string;
  leader_id?:  string;
}

export const tauriGetDepartments    = ()                                         => invoke<Department[]>("get_departments");
export const tauriCreateDepartment  = (input: CreateDepartmentInput)             => invoke<Department>("create_department", { input });
export const tauriUpdateDepartment  = (id: string, input: CreateDepartmentInput) => invoke<Department>("update_department", { id, input });
export const tauriDeleteDepartment  = (id: string)                               => invoke<boolean>("delete_department", { id });

// ── Member lifecycle events ───────────────────────────────────────────────────

export interface MemberEvent {
  id:         string;
  member_id:  string;
  event_type: string;
  event_date: string;
  notes?:     string;
  created_at: string;
}

export interface CreateMemberEventInput {
  member_id:  string;
  event_type: string;
  event_date: string;
  notes?:     string;
}

export const tauriGetMemberEvents    = (memberId: string)                   => invoke<MemberEvent[]>("get_member_events", { memberId: memberId });
export const tauriCreateMemberEvent  = (input: CreateMemberEventInput)      => invoke<MemberEvent>("create_member_event", { input });
export const tauriDeleteMemberEvent  = (id: string)                         => invoke<boolean>("delete_member_event", { id });

// ── Notifications persistence ─────────────────────────────────────────────────

export interface DbNotification {
  id:         number;
  title:      string;
  message:    string;
  kind:       string;
  read:       boolean;
  created_at: string;
}

export const tauriGetNotifications       = ()                                              => invoke<DbNotification[]>("get_notifications");
export const tauriSaveNotification       = (title: string, message: string, kind: string) => invoke<DbNotification>("save_notification", { input: { title, message, kind } });
export const tauriMarkNotificationsRead  = ()                                              => invoke<void>("mark_notifications_read");
export const tauriClearNotifications     = ()                                              => invoke<void>("clear_notifications");

// ── Backup / restore ──────────────────────────────────────────────────────────

export const tauriBackupDatabase  = ()                      => invoke<string>("backup_database");
export const tauriRestoreDatabase = (backupPath: string)    => invoke<string>("restore_database", { backupPath });

