export type UserRole = "admin" | "pastor" | "treasurer" | "clerk";

export interface User {
  id: string;
  name: string;
  role: UserRole;
}

export type MemberStatus = "active" | "inactive" | "transferred";
export type Gender = "male" | "female";
export type PaymentMode = "cash" | "mobile_money" | "bank_transfer" | "cheque";

export interface Member {
  id: string;
  member_no: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  gender: Gender;
  phone?: string;
  email?: string;
  address?: string;
  department_id?: string;
  membership_date: string;
  status: MemberStatus;
  photo_url?: string;
  created_at: string;
}

export interface TithePayment {
  id: string;
  member_id: string;
  amount: number;
  payment_date: string;
  period_month: number;
  period_year: number;
  payment_mode: PaymentMode;
  reference_no?: string;
  received_by: string;
  notes?: string;
  created_at: string;
}

export interface Offering {
  id: string;
  service_date: string;
  service_type: string;
  category: string;
  total_amount: number;
  currency: string;
  notes?: string;
  created_at: string;
}

export interface WelfareContribution {
  id: string;
  member_id: string;
  amount: number;
  contribution_date: string;
  payment_mode: PaymentMode;
  reference_no?: string;
  received_by: string;
  created_at: string;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
}

export interface SyncStatus {
  pending: number;
  last_synced?: string;
  is_online: boolean;
}