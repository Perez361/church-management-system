import type { Member, TithePayment, Offering, WelfareContribution } from "@/types";

export const mockMembers: Member[] = [
  { id: "1", member_no: "CHR-001", first_name: "Kwame", last_name: "Mensah", gender: "male", phone: "0244123456", email: "kwame@example.com", department_id: "choir", membership_date: "2019-03-12", status: "active", created_at: "2019-03-12T00:00:00Z" },
  { id: "2", member_no: "CHR-002", first_name: "Abena", last_name: "Boateng", gender: "female", phone: "0277654321", email: "abena@example.com", department_id: "ushers", membership_date: "2020-07-05", status: "active", created_at: "2020-07-05T00:00:00Z" },
  { id: "3", member_no: "CHR-003", first_name: "Kofi", last_name: "Asante", gender: "male", phone: "0201987654", department_id: "youth", membership_date: "2021-01-18", status: "active", created_at: "2021-01-18T00:00:00Z" },
  { id: "4", member_no: "CHR-004", first_name: "Ama", last_name: "Owusu", gender: "female", phone: "0244765432", email: "ama@example.com", department_id: "choir", membership_date: "2018-09-22", status: "active", created_at: "2018-09-22T00:00:00Z" },
  { id: "5", member_no: "CHR-005", first_name: "Yaw", last_name: "Darko", gender: "male", phone: "0277345678", department_id: "elders", membership_date: "2015-05-30", status: "active", created_at: "2015-05-30T00:00:00Z" },
  { id: "6", member_no: "CHR-006", first_name: "Akosua", last_name: "Frimpong", gender: "female", phone: "0204567890", email: "akosua@example.com", department_id: "sunday_school", membership_date: "2022-02-14", status: "active", created_at: "2022-02-14T00:00:00Z" },
  { id: "7", member_no: "CHR-007", first_name: "Emmanuel", last_name: "Osei", gender: "male", phone: "0243210987", department_id: "youth", membership_date: "2023-06-01", status: "inactive", created_at: "2023-06-01T00:00:00Z" },
  { id: "8", member_no: "CHR-008", first_name: "Adjoa", last_name: "Acheampong", gender: "female", phone: "0276543210", email: "adjoa@example.com", department_id: "ushers", membership_date: "2020-11-09", status: "active", created_at: "2020-11-09T00:00:00Z" },
  { id: "9", member_no: "CHR-009", first_name: "Isaac", last_name: "Amponsah", gender: "male", phone: "0244001122", department_id: "elders", membership_date: "2017-04-15", status: "transferred", created_at: "2017-04-15T00:00:00Z" },
  { id: "10", member_no: "CHR-010", first_name: "Efua", last_name: "Mensah", gender: "female", phone: "0277889900", email: "efua@example.com", department_id: "choir", membership_date: "2024-01-20", status: "active", created_at: "2024-01-20T00:00:00Z" },
  { id: "11", member_no: "CHR-011", first_name: "Bright", last_name: "Tetteh", gender: "male", phone: "0201334455", department_id: "youth", membership_date: "2023-09-10", status: "active", created_at: "2023-09-10T00:00:00Z" },
  { id: "12", member_no: "CHR-012", first_name: "Serwa", last_name: "Antwi", gender: "female", phone: "0244667788", email: "serwa@example.com", department_id: "sunday_school", membership_date: "2019-12-03", status: "inactive", created_at: "2019-12-03T00:00:00Z" },
];

export const departmentNames: Record<string, string> = {
  choir: "Choir",
  ushers: "Ushers",
  youth: "Youth",
  elders: "Elders",
  sunday_school: "Sunday School",
};

export const mockTithePayments: TithePayment[] = [
  { id: "t1", member_id: "1", amount: 500, payment_date: "2026-04-06", period_month: 4, period_year: 2026, payment_mode: "mobile_money", reference_no: "MM-20260406-001", received_by: "Treasurer", created_at: "2026-04-06T10:00:00Z" },
  { id: "t2", member_id: "2", amount: 200, payment_date: "2026-04-05", period_month: 4, period_year: 2026, payment_mode: "cash", received_by: "Treasurer", created_at: "2026-04-05T14:30:00Z" },
  { id: "t3", member_id: "4", amount: 750, payment_date: "2026-04-05", period_month: 4, period_year: 2026, payment_mode: "mobile_money", reference_no: "MM-20260405-003", received_by: "Clerk", created_at: "2026-04-05T15:15:00Z" },
  { id: "t4", member_id: "5", amount: 1200, payment_date: "2026-04-04", period_month: 4, period_year: 2026, payment_mode: "bank_transfer", reference_no: "BNK-042026-004", received_by: "Treasurer", created_at: "2026-04-04T09:00:00Z" },
  { id: "t5", member_id: "6", amount: 350, payment_date: "2026-04-03", period_month: 4, period_year: 2026, payment_mode: "cash", received_by: "Clerk", created_at: "2026-04-03T11:45:00Z" },
  { id: "t6", member_id: "8", amount: 480, payment_date: "2026-04-03", period_month: 4, period_year: 2026, payment_mode: "mobile_money", reference_no: "MM-20260403-006", received_by: "Treasurer", created_at: "2026-04-03T13:00:00Z" },
  { id: "t7", member_id: "10", amount: 300, payment_date: "2026-04-02", period_month: 4, period_year: 2026, payment_mode: "cash", received_by: "Clerk", created_at: "2026-04-02T10:30:00Z" },
  { id: "t8", member_id: "11", amount: 220, payment_date: "2026-04-01", period_month: 4, period_year: 2026, payment_mode: "mobile_money", reference_no: "MM-20260401-008", received_by: "Treasurer", created_at: "2026-04-01T16:00:00Z" },
  { id: "t9", member_id: "3", amount: 600, payment_date: "2026-04-01", period_month: 4, period_year: 2026, payment_mode: "cheque", reference_no: "CHQ-0042", received_by: "Treasurer", created_at: "2026-04-01T09:30:00Z" },
  { id: "t10", member_id: "12", amount: 400, payment_date: "2026-04-01", period_month: 4, period_year: 2026, payment_mode: "cash", received_by: "Clerk", created_at: "2026-04-01T11:00:00Z" },
];

export const mockOfferings: Offering[] = [
  { id: "o1", service_date: "2026-04-06", service_type: "Sunday Service", category: "General Offering", total_amount: 2150, currency: "GHS", created_at: "2026-04-06T12:00:00Z" },
  { id: "o2", service_date: "2026-04-06", service_type: "Sunday Service", category: "Thanksgiving", total_amount: 850, currency: "GHS", created_at: "2026-04-06T12:00:00Z" },
  { id: "o3", service_date: "2026-04-03", service_type: "Midweek Service", category: "General Offering", total_amount: 620, currency: "GHS", created_at: "2026-04-03T20:00:00Z" },
  { id: "o4", service_date: "2026-03-30", service_type: "Sunday Service", category: "General Offering", total_amount: 1980, currency: "GHS", created_at: "2026-03-30T12:00:00Z" },
  { id: "o5", service_date: "2026-03-30", service_type: "Sunday Service", category: "Building Fund", total_amount: 1200, currency: "GHS", created_at: "2026-03-30T12:00:00Z" },
  { id: "o6", service_date: "2026-03-27", service_type: "Midweek Service", category: "General Offering", total_amount: 540, currency: "GHS", created_at: "2026-03-27T20:00:00Z" },
  { id: "o7", service_date: "2026-03-23", service_type: "Sunday Service", category: "General Offering", total_amount: 2300, currency: "GHS", created_at: "2026-03-23T12:00:00Z" },
  { id: "o8", service_date: "2026-03-23", service_type: "Sunday Service", category: "Missions", total_amount: 730, currency: "GHS", created_at: "2026-03-23T12:00:00Z" },
];

export const mockWelfareContributions: WelfareContribution[] = [
  { id: "w1", member_id: "2", amount: 200, contribution_date: "2026-04-05", payment_mode: "mobile_money", reference_no: "MM-W-001", received_by: "Treasurer", created_at: "2026-04-05T14:30:00Z" },
  { id: "w2", member_id: "5", amount: 500, contribution_date: "2026-04-04", payment_mode: "bank_transfer", reference_no: "BNK-W-002", received_by: "Treasurer", created_at: "2026-04-04T09:00:00Z" },
  { id: "w3", member_id: "1", amount: 150, contribution_date: "2026-04-03", payment_mode: "cash", received_by: "Clerk", created_at: "2026-04-03T11:00:00Z" },
  { id: "w4", member_id: "8", amount: 200, contribution_date: "2026-04-02", payment_mode: "mobile_money", reference_no: "MM-W-004", received_by: "Treasurer", created_at: "2026-04-02T13:30:00Z" },
  { id: "w5", member_id: "4", amount: 300, contribution_date: "2026-04-01", payment_mode: "cash", received_by: "Clerk", created_at: "2026-04-01T10:00:00Z" },
  { id: "w6", member_id: "10", amount: 100, contribution_date: "2026-03-30", payment_mode: "mobile_money", reference_no: "MM-W-006", received_by: "Clerk", created_at: "2026-03-30T14:00:00Z" },
  { id: "w7", member_id: "6", amount: 250, contribution_date: "2026-03-27", payment_mode: "cash", received_by: "Treasurer", created_at: "2026-03-27T11:00:00Z" },
];
